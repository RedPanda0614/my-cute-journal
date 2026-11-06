/* 本地 CPU 人像分割；照片只在 worker 内存中处理。 */
importScripts('vendor/mediapipe/vision_bundle.js');
let model;
self.onmessage=async ({data})=>{
 const {id,bitmap}=data;
 try{
  if(!model)model=Vision.ImageSegmenter.createFromOptions({wasmLoaderPath:new URL('vendor/mediapipe/wasm/vision_wasm_internal.js',location.href).href,wasmBinaryPath:new URL('vendor/mediapipe/wasm/vision_wasm_internal.wasm',location.href).href},{baseOptions:{modelAssetPath:new URL('vendor/mediapipe/person_multiclass.tflite',location.href).href,delegate:'CPU'},runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false,canvas:new OffscreenCanvas(1,1)}).catch(e=>{model=null;throw e});
  const engine=await model,result=engine.segment(bitmap);
  try{const masks=result.confidenceMasks;if(!masks?.length)throw new Error('模型没有返回人物轮廓');const m=masks[0],values=new Float32Array(m.getAsFloat32Array());for(let i=0;i<values.length;i++)values[i]=1-values[i];self.postMessage({id,width:m.width,height:m.height,values},[values.buffer])}finally{result.close()}
 }catch(e){self.postMessage({id,error:e.message||'人物识别失败'})}finally{bitmap?.close()}
};
