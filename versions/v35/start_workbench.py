#!/usr/bin/env python3
"""仅在本机运行；每本作品独立保存，保留最近 40 个不同时间点。"""
import argparse
import datetime as dt
import functools
import hashlib
import http.server
import json
import os
import pathlib
import re
import threading
import urllib.parse
import urllib.request
import webbrowser

ROOT = pathlib.Path(__file__).resolve().parents[1]
MAX_BODY = 512 * 1024 * 1024
KEEP_HISTORY = 40
WRITE_LOCK = threading.RLock()


def write_atomic(target, data):
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + '.tmp')
    with tmp.open('wb') as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, target)


def work_key(project):
    # 用户名称不参与路径，防止改名、同名和路径字符影响文件。
    identity = str((project.get('workInfo') or {}).get('id') or project.get('draftId') or 'legacy-draft')
    return hashlib.sha256(identity.encode()).hexdigest()[:24]


class Handler(http.server.SimpleHTTPRequestHandler):
    works = ROOT / '作品'

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store' if self.path.startswith('/api/') else 'no-cache')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '/api/' not in self.path:
            super().log_message(fmt, *args)

    def reply(self, code, obj):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def read_json(self, path):
        return json.loads(path.read_bytes())

    def listing(self):
        result = []
        for path in (self.works / '项目').glob('*.json'):
            try:
                p = self.read_json(path)
                info = p.get('workInfo') or {}
                history = sorted((self.works / '历史' / path.stem).glob('*.json'), reverse=True)
                result.append(dict(key=path.stem, name=info.get('name') or '未命名草稿',
                                   id=info.get('id') or p.get('draftId'), updated=path.stat().st_mtime * 1000,
                                   pages=len(p.get('pages', [])), history=[f.stem for f in history]))
            except (OSError, ValueError):
                continue
        return sorted(result, key=lambda r: r['updated'], reverse=True)

    def do_GET(self):
        route = urllib.parse.urlsplit(self.path)
        try:
            if route.path == '/api/ping':
                return self.reply(200, dict(ok=True, folder=str(self.works), version=35))
            if route.path == '/api/works':
                return self.reply(200, dict(ok=True, works=self.listing()))
            if route.path == '/api/work':
                q = urllib.parse.parse_qs(route.query)
                key = q.get('key', [''])[0]
                revision = q.get('revision', [''])[0]
                if not re.fullmatch(r'[a-f0-9]{24}', key):
                    return self.reply(400, dict(ok=False, error='作品编号无效'))
                if revision and revision != '0000-legacy' and not re.fullmatch(r'[0-9T-]+', revision):
                    return self.reply(400, dict(ok=False, error='历史编号无效'))
                target = self.works / '历史' / key / (revision + '.json') if revision else self.works / '项目' / (key + '.json')
                return self.reply(200, self.read_json(target))
            if route.path == '/api/autosave':
                return self.reply(200, self.read_json(self.works / '自动保存.json'))
        except FileNotFoundError:
            return self.reply(404, dict(ok=False, error='没有找到保存文件'))
        except (OSError, ValueError):
            return self.reply(500, dict(ok=False, error='保存文件暂时无法读取'))
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/autosave':
            return self.reply(404, dict(ok=False))
        if self.client_address[0] not in ('127.0.0.1', '::1'):
            return self.reply(403, dict(ok=False))
        try:
            size = int(self.headers.get('Content-Length') or 0)
            if not 0 < size <= MAX_BODY:
                return self.reply(413, dict(ok=False, error='作品大小超限'))
            data = self.rfile.read(size)
            p = json.loads(data)
            if not isinstance(p, dict) or not isinstance(p.get('pages'), list):
                return self.reply(400, dict(ok=False, error='不是完整的作品'))
            with WRITE_LOCK:
                key = work_key(p)
                target = self.works / '项目' / (key + '.json')
                history = self.works / '历史' / key
                # 旧版自动保存也先迁移，绝不在第一次升级时直接覆盖唯一副本。
                legacy = self.works / '自动保存.json'
                if legacy.exists() and not any((self.works / '项目').glob('*.json')):
                    old = legacy.read_bytes()
                    try:
                        old_key = work_key(json.loads(old))
                        write_atomic(self.works / '项目' / (old_key + '.json'), old)
                        write_atomic(self.works / '历史' / old_key / '0000-legacy.json', old)
                    except ValueError:
                        write_atomic(self.works / '升级前自动保存.json', old)
                if not target.exists() or target.read_bytes() != data:
                    stamp = dt.datetime.now().strftime('%Y-%m-%dT%H-%M-%S-%f')
                    write_atomic(history / (stamp + '.json'), data)
                    write_atomic(target, data)
                    for old in sorted(history.glob('*.json'))[:-KEEP_HISTORY]:
                        old.unlink()
                write_atomic(legacy, data)  # 保持旧入口兼容
            return self.reply(200, dict(ok=True, key=key, time=dt.datetime.now().strftime('%H:%M:%S'), bytes=size))
        except (ValueError, TypeError):
            return self.reply(400, dict(ok=False, error='数据不完整'))
        except OSError:
            return self.reply(500, dict(ok=False, error='磁盘写入失败，请检查空间和文件夹权限'))


class WorkbenchServer(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--works-dir', type=pathlib.Path, default=ROOT / '作品')
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    Handler.works = args.works_dir.resolve()
    url = f'http://127.0.0.1:{args.port}/%E7%BD%91%E9%A1%B5%E6%BA%90%E7%A0%81/index.html'
    try:
        server = WorkbenchServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(ROOT)))
        server.daemon_threads = True
    except OSError:
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{args.port}/api/ping', timeout=2) as r:
                if not json.load(r).get('version', 0) >= 35:
                    raise ValueError()
            if not args.no_browser:
                webbrowser.open(url)
            return
        except (OSError, ValueError):
            raise SystemExit(f'{args.port} 端口被占用或旧服务未关闭，请关闭之前的服务窗口后重新启动。')
    print('工作台正在本地运行：' + url, flush=True)
    print('作品会自动存进：' + str(Handler.works), flush=True)
    if not args.no_browser:
        threading.Timer(.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
