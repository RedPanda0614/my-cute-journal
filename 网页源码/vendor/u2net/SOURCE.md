# 提取主体用到的第三方文件

| 文件 | 来源 | 许可 |
|---|---|---|
| ort.wasm.min.js、subject-pack.js 里的运行库 | onnxruntime-web 1.20.1(npm) | MIT |
| subject-pack.js 里的模型 | U²-Net 压缩版 silueta.onnx,来自 rembg 发布页 | Apache-2.0(U²-Net 原作者 Xuebin Qin 等) |

重新生成:`python3 scripts/build_subject_pack.py <onnxruntime-web/dist> <silueta.onnx>`
