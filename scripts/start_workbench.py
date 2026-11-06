#!/usr/bin/env python3
"""在本机启动工作台,并把作品自动存进「作品」文件夹。

- 打开 http://127.0.0.1:8765/网页源码/index.html
- 网页每次改动后会把整个作品发过来,存成 作品/自动保存.json
- 每天另存一份到 作品/备份/年-月-日.json,保留最近 30 天
- 只接受本机(127.0.0.1)的请求,不对外开放
"""
import datetime
import functools
import http.server
import json
import os
import pathlib
import threading
import urllib.error
import urllib.request
import webbrowser

root = pathlib.Path(__file__).resolve().parents[1]
works = root / "作品"
backups = works / "备份"
port = 8765
path = "/%E7%BD%91%E9%A1%B5%E6%BA%90%E7%A0%81/index.html"
url = f"http://127.0.0.1:{port}{path}"
MAX_BODY = 512 * 1024 * 1024  # 作品里有图片,允许大一点
KEEP_DAYS = 30


def write_atomic(target: pathlib.Path, data: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, target)


def prune_backups() -> None:
    files = sorted(backups.glob("*.json"))
    for old in files[:-KEEP_DAYS]:
        try:
            old.unlink()
        except OSError:
            pass


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):  # 安静一点,只打印保存信息
        if "/api/" in (self.path or ""):
            return
        super().log_message(fmt, *args)

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/ping":
            return self._json(200, {"ok": True, "folder": str(works)})
        if self.path == "/api/autosave":
            f = works / "自动保存.json"
            if not f.exists():
                return self._json(404, {"ok": False})
            data = f.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)
            return
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/autosave":
            return self._json(404, {"ok": False})
        if self.client_address[0] not in ("127.0.0.1", "::1"):
            return self._json(403, {"ok": False})
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 0 or size > MAX_BODY:
            return self._json(413, {"ok": False, "error": "作品太大"})
        data = self.rfile.read(size)
        try:
            json.loads(data)  # 确认是完整的作品文件再写
        except ValueError:
            return self._json(400, {"ok": False, "error": "数据不完整"})
        write_atomic(works / "自动保存.json", data)
        today = datetime.date.today().isoformat()
        write_atomic(backups / f"{today}.json", data)
        prune_backups()
        stamp = datetime.datetime.now().strftime("%H:%M")
        print(f"{stamp} 已自动保存到 作品/自动保存.json ({size // 1024} KB)")
        return self._json(200, {"ok": True, "time": stamp, "bytes": size})


try:
    handler = functools.partial(Handler, directory=str(root))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
except OSError:
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            if response.status != 200:
                raise RuntimeError("端口被其他程序占用")
        webbrowser.open(url)
        print("工作台已打开。")
    except (OSError, urllib.error.URLError, RuntimeError):
        print("8765端口被占用，请关闭之前的本地服务后重试。")
        raise SystemExit(1)
else:
    works.mkdir(exist_ok=True)
    print("工作台正在本地运行，关闭此窗口会停止服务。\n" + url)
    print("作品会自动存进：" + str(works))
    threading.Timer(.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
