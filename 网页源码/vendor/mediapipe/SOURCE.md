# 人物分割依赖

- Runtime: `@mediapipe/tasks-vision` 1.2.2，npm 官方发布 https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-1.2.2.tgz ，Apache-2.0。只保留经典脚本、CPU wasm loader/binary。
- Model: Google MediaPipe SelfieMulticlass 256x256 float32 v1，https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite 。官方模型说明：https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter 。模型卡：https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf 。MediaPipe LICENSE 随目录保存。
- 模型与运行库均随项目本地保存。推理在浏览器 Web Worker 中进行，照片不发往外部服务。
- 合并头发、皮肤、衣服和配饰的置信度得到人物透明蒙版；推理输入最大1024px、结果最大2000px。
- 使用 CPU 避免依赖 WebGPU；适合人像照片，细发丝、遮挡和复杂背景仍可能需要用不规则裁切修整。没有有效人物时不应用空结果。
- 双击打开(file://)时浏览器不允许加载 worker/wasm 文件。所以另外打包了 `person-pack.js`(运行库、loader 和模型的 base64),双击打开时在页面里直接运行。换模型后运行 `scripts/build_person_pack.py` 重新生成。用「启动工作台.command」打开时仍走 Web Worker。
