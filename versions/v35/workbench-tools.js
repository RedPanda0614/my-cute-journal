'use strict';
(()=>{
 const WB=window.WorkbenchExtras;
 /* 图层合并使用旋转后的真实边界和原有透明度，输出透明图层。 */
 function selectedLayers(){return state.items.filter(i=>layerPicked.has(i.id)||(layerPicked.size===0&&i.id===selId))}
 function deleteLayers(all=false){const list=(all?state.items:selectedLayers()).filter(i=>!i.locked);if(!list.length)return toast('请选择未锁定图层');const ids=new Set(list.map(i=>i.id));commit();state.items.splice(0,state.items.length,...state.items.filter(i=>!ids.has(i.id)));normalizeLayerGroups();layerPicked.clear();if(ids.has(selId))selId=null;renderItems();save();toast('已删除 '+list.length+' 个图层，可撤销')}
 async function mergeLayers(){const list=selectedLayers(),page=curPage();if(list.length<2)return;if(list.some(i=>i.locked||i.hidden))return toast('请先解锁并显示所选图层');
  const bounds=list.map(i=>{const a=i.rot*Math.PI/180,w=Math.abs(Math.cos(a))*i.w+Math.abs(Math.sin(a))*i.h,h=Math.abs(Math.sin(a))*i.w+Math.abs(Math.cos(a))*i.h;return {l:i.x-w/2,t:i.y-h/2,r:i.x+w/2,b:i.y+h/2}}),left=Math.min(...bounds.map(b=>b.l)),top=Math.min(...bounds.map(b=>b.t)),right=Math.max(...bounds.map(b=>b.r)),bottom=Math.max(...bounds.map(b=>b.b)),w=right-left,h=bottom-top;
  const dpm=Math.min(300/25.4,4096/Math.max(w,h)),c=cv(Math.ceil(w*dpm),Math.ceil(h*dpm)),x=c.getContext('2d');
  for(const i of list){const im=await loadImg(assets[i.asset].src);x.save();x.translate((i.x-left)*dpm,(i.y-top)*dpm);x.rotate(i.rot*Math.PI/180);if(i.flip)x.scale(-1,1);x.globalAlpha=i.opacity;x.drawImage(im,-i.w*dpm/2,-i.h*dpm/2,i.w*dpm,i.h*dpm);x.restore()}
  const a=await addAsset(c.toDataURL(),{name:'合并图层',source:'tool',hidden:true});if(curPage()!==page||!list.every(i=>state.items.includes(i)))return;commit();const ids=new Set(list.map(i=>i.id)),position=Math.max(...list.map(i=>state.items.indexOf(i))),before=state.items.slice(0,position+1).filter(i=>!ids.has(i.id)).length,rest=state.items.filter(i=>!ids.has(i.id)),merged={id:uid(),type:'image',name:'合并图层 · '+list.length,asset:a.id,orig:a.id,x:left+w/2,y:top+h/2,w,h,rot:0,flip:false,opacity:1,hidden:false,locked:false};
  const groups=new Set(list.map(i=>i.groupId));if(groups.size===1&&list[0].groupId)merged.groupId=list[0].groupId;rest.splice(before,0,merged);state.items.splice(0,state.items.length,...rest);normalizeLayerGroups();layerPicked.clear();selId=merged.id;renderItems();save();WB.editNewItem?.(merged);toast('已合并，可撤销恢复独立图层');return merged;
 }
 const originalLayers=renderLayers;renderLayers=function(){originalLayers();const bar=$('#layers .layer-toolbar');if(!bar)return;const list=selectedLayers();const add=(id,label,fn,disabled=false)=>{const b=document.createElement('button');b.id=id;b.className='cb';b.textContent=label;b.disabled=disabled;b.onclick=fn;bar.append(b)};
  add('wbLayerAll',layerPicked.size===state.items.length&&state.items.length?'取消全选':'全选',()=>{if(layerPicked.size===state.items.length)layerPicked.clear();else state.items.forEach(i=>layerPicked.add(i.id));selId=null;renderItems()},!state.items.length);
  add('wbLayerMerge','合并图层',async e=>{const b=e.currentTarget;b.disabled=true;try{await mergeLayers()}catch(e){toast('合并失败：'+e.message)}finally{renderLayers()}},list.length<2||list.some(i=>i.hidden||i.locked));$('#wbLayerMerge').title='合并到最上方所选图层，可撤销';
  add('wbLayerDelete','删除所选',()=>deleteLayers(),!list.some(i=>!i.locked));add('wbLayerClear','清空本页',()=>deleteLayers(true),!state.items.some(i=>!i.locked));$('#wbLayerClear').title='删除本页未锁定图层，可撤销';
 };
 WB.mergeLayers=mergeLayers;WB.deleteLayers=deleteLayers;
 // 提取主体(v34):U²-Net 找照片里最主要的东西(人、花、杯子、动物都行),在页面里本地跑。
 // 运行库和模型从 vendor/u2net/subject-pack.js 读,双击打开 index.html 也能用;第一次用时才载入。
 let subjectModel=null;const loadScript=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('找不到 '+src+',请确认 vendor 文件夹完整'));document.head.appendChild(s)});
 const b64=t=>{const bin=atob(t),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u};
 const SIDE=320;
 function subjectSession(){if(subjectModel)return subjectModel;subjectModel=(async()=>{toast('第一次用提取主体,正在载入模型(约 70MB,本地读取)…');
   if(!window.ort)await loadScript('vendor/u2net/ort.wasm.min.js');if(!window.__SUBJECT_PACK)await loadScript('vendor/u2net/subject-pack.js');
   const P=window.__SUBJECT_PACK,blob=(data,type)=>URL.createObjectURL(new Blob([data],{type}));ort.env.wasm.numThreads=1;
   // 运行库和 wasm 都做成 blob 地址交给 onnxruntime(双击打开时浏览器不让读本地文件,但 blob 可以)
   ort.env.wasm.wasmPaths={mjs:blob(new TextDecoder().decode(b64(P.mjs)),'text/javascript'),wasm:blob(b64(P.wasm),'application/wasm')};
   const model=b64(P.model);P.wasm=P.model=null;return ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'all'})})().catch(e=>{subjectModel=null;throw e});return subjectModel}
 async function segmentPerson(source){const c=cv(SIDE,SIDE),x=c.getContext('2d');x.drawImage(source,0,0,SIDE,SIDE);const d=x.getImageData(0,0,SIDE,SIDE).data,n=SIDE*SIDE,input=new Float32Array(3*n);
  const mean=[.485,.456,.406],std=[.229,.224,.225];for(let i=0;i<n;i++)for(let k=0;k<3;k++)input[k*n+i]=(d[i*4+k]/255-mean[k])/std[k];
  const session=await subjectSession(),feeds={[session.inputNames[0]]:new ort.Tensor('float32',input,[1,3,SIDE,SIDE])},out=await session.run(feeds),m=out[session.outputNames[0]].data;
  let lo=Infinity,hi=-Infinity;for(let i=0;i<n;i++){if(m[i]<lo)lo=m[i];if(m[i]>hi)hi=m[i]}const values=new Float32Array(n),span=Math.max(1e-6,hi-lo);for(let i=0;i<n;i++)values[i]=(m[i]-lo)/span;
  return{width:SIDE,height:SIDE,values}}
 function personCanvas(source,mask,threshold=.5,softness=.15){const m=cv(mask.width,mask.height),mx=m.getContext('2d'),data=mx.createImageData(m.width,m.height);let count=0;
  for(let i=0;i<mask.values.length;i++){const confidence=mask.values[i],t=Math.max(0,Math.min(1,(confidence-threshold+softness/2)/Math.max(.01,softness))),alpha=t*t*(3-2*t);data.data[i*4+3]=Math.round(alpha*255);if(confidence>threshold)count++}mx.putImageData(data,0,0);const out=cv(source.width,source.height),x=out.getContext('2d');x.drawImage(source,0,0);x.globalCompositeOperation='destination-in';x.drawImage(m,0,0,out.width,out.height);return {canvas:out,coverage:count/mask.values.length}}
 async function personEditor(it){if(!it||it.type!=='image')return toast('请先选中照片');if(it.locked)return toast('请先解锁照片');const sourceId=it.personCutout?.source||it.asset,page=curPage();let live=true,mask,source,result;
  $('#mbox').innerHTML='<h3>提取主体</h3><div class="wb-preview wb-person-preview" id="wbPersonPreview"></div><div id="wbPersonStatus" class="wb-photo-status" role="status">正在本地找照片的主体…</div><div class="wb-controls"><label>保留范围<input id="wbPersonThreshold" type="range" min="0.15" max="0.85" step="0.01" value="0.5"></label><label>边缘柔和<input id="wbPersonSoftness" type="range" min="0.02" max="0.4" step="0.01" value="0.15"></label></div><div class="wb-modal-actions"><button class="tag" id="wbPersonCancel">取消</button><button class="tag red" id="wbPersonApply" disabled>应用</button></div>';
  const host=$('#wbPersonPreview'),status=$('#wbPersonStatus'),apply=$('#wbPersonApply'),threshold=$('#wbPersonThreshold'),softness=$('#wbPersonSoftness');const valid=()=>live&&host.isConnected&&curPage()===page&&state.items.includes(it);
  const update=()=>{if(!mask||!valid())return;result=personCanvas(source,mask,+threshold.value,+softness.value);host.replaceChildren(result.canvas);apply.disabled=result.coverage<.001;status.textContent=apply.disabled?'没找到明显的主体，可以调「保留范围」，或用不规则裁切。':'照片在本地处理，调整后应用。'};
  threshold.oninput=softness.oninput=update;$('#wbPersonCancel').onclick=()=>{live=false;closeModal()};apply.onclick=async()=>{if(!valid()||!result||it.locked)return;apply.disabled=true;try{const a=await addAsset(result.canvas.toDataURL(),{name:it.name+' · 主体',source:'tool',hidden:true});if(!valid())return;commit();it.personCutout={source:sourceId,threshold:+threshold.value,softness:+softness.value};it.asset=a.id;for(const key of ['editRecipe','editRenderKey','colorAdjust','fxSrc','fxs'])delete it[key];delete it.photoSpec;delete it.photoOriginalBox;renderItems();save();live=false;closeModal();toast('主体已提取，可撤销')}catch(e){status.textContent='提取失败：'+e.message;apply.disabled=false}};openModal(true);
  try{const original=await toCanvas(assets[sourceId]),scale=Math.min(1,2000/Math.max(original.width,original.height));source=cv(original.width*scale,original.height*scale);source.getContext('2d').drawImage(original,0,0,source.width,source.height);mask=await segmentPerson(source);update()}catch(e){if(valid()){status.textContent=e.message;apply.disabled=true}}
 }
 const button=document.createElement('button');button.id='wbPerson';button.className='tool';button.textContent='提取主体';button.onclick=()=>personEditor(sel());$('#editMatteBody').prepend(button);
 const previousPanel=renderPanel;renderPanel=function(){previousPanel();const it=sel();button.disabled=!it||it.type!=='image'||it.locked;if(it?.type==='image'&&!it.cutLetter&&!it.drawing){const b=document.createElement('button');b.id='wbPersonQuick';b.className='cb';b.textContent='提取主体';b.onclick=()=>personEditor(it);$('#ctx').append(b)}};
 const previousOp=runOp;runOp=async function(op){const it=sel();if(op==='reset'&&it?.personCutout&&!it.locked){await previousOp(op);delete it.personCutout;return}return previousOp(op)};
 WB.segmentPerson=segmentPerson;WB.personCanvas=personCanvas;WB.personEditor=personEditor;
 window.workbenchReady.then(()=>renderPanel());
})();
