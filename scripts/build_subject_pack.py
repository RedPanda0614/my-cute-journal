"""把「提取主体」要用的运行库和模型打包成一个本地脚本(双击打开 index.html 也能用)。
用法: python3 scripts/build_subject_pack.py <onnxruntime-web 的 dist 目录> <silueta.onnx>
- onnxruntime-web 1.20.1(MIT):npm pack onnxruntime-web@1.20.1
- silueta.onnx(U²-Net 压缩版,Apache-2.0):https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx
"""
import base64, json, os, shutil, sys
dist, model = sys.argv[1], sys.argv[2]
out = os.path.join(os.path.dirname(__file__), '..', '网页源码', 'vendor', 'u2net')
os.makedirs(out, exist_ok=True)
shutil.copy(os.path.join(dist, 'ort.wasm.min.js'), os.path.join(out, 'ort.wasm.min.js'))
b = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
pack = {'mjs': b(os.path.join(dist, 'ort-wasm-simd-threaded.mjs')), 'wasm': b(os.path.join(dist, 'ort-wasm-simd-threaded.wasm')), 'model': b(model)}
with open(os.path.join(out, 'subject-pack.js'), 'w') as f:
    f.write('/* 提取主体:onnxruntime-web 1.20.1 运行库 + U²-Net(silueta)模型,base64。由 scripts/build_subject_pack.py 生成 */\nwindow.__SUBJECT_PACK=' + json.dumps(pack) + ';\n')
print(os.path.getsize(os.path.join(out, 'subject-pack.js')) // 1024 // 1024, 'MB')
