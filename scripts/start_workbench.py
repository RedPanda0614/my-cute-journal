#!/usr/bin/env python3
"""Serve the workbench and bundled person model on localhost."""
import functools
import http.server
import pathlib
import threading
import urllib.error
import urllib.request
import webbrowser

root = pathlib.Path(__file__).resolve().parents[1]
port = 8765
path = "/%E7%BD%91%E9%A1%B5%E6%BA%90%E7%A0%81/index.html"
url = f"http://127.0.0.1:{port}{path}"
try:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
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
    print("工作台正在本地运行，关闭此窗口会停止服务。\n" + url)
    threading.Timer(.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
