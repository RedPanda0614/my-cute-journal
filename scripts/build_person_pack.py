#!/usr/bin/env python3
"""把人物分割运行库(wasm)和模型(tflite)打包成 person-pack.js,
让双击打开 index.html(file://)时也能用人物提取。换模型后重新运行一次。"""
import base64, pathlib
d = pathlib.Path(__file__).resolve().parents[1] / "网页源码" / "vendor" / "mediapipe"
w = (d / "wasm" / "vision_wasm_internal.wasm").read_bytes()
m = (d / "person_multiclass.tflite").read_bytes()
l = (d / "wasm" / "vision_wasm_internal.js").read_bytes()
(d / "person-pack.js").write_text(
    "/* 人物模型打包:双击打开(file://)时浏览器不让读文件,所以把运行库和模型放进脚本里。"
    "由 scripts/build_person_pack.py 生成,不要手改。 */\n"
    'window.__PERSON_PACK={wasm:"' + base64.b64encode(w).decode() + '",model:"' + base64.b64encode(m).decode() + '",loader:"' + base64.b64encode(l).decode() + '"};\n')
print("ok", (d / "person-pack.js").stat().st_size)
