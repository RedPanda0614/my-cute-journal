/* v47 裁切并进「变换与图层」:正方形 / 矩形 / 圆形 / 不规则 / 拆分(文字只有 矩形)
   固定形状裁切用一个小窗口:拖框移动,拖四角缩放,正方形和圆形锁 1:1 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const SHAPES=[['square','正方形'],['rect','矩形'],['circle','圆形']];
 async function openFixedCrop(it,shape){
  const isT=it.type==='text',src=isT?await renderText(it):await toCanvas(assets[it.asset]),W=src.width,H=src.height;// 文字:在完整的字上框,存成比例,之后改字还能保留裁切
  const maxW=Math.min(640,innerWidth*.8),maxH=Math.min(440,innerHeight*.55),k=Math.min(maxW/W,maxH/H,1),dw=Math.round(W*k),dh=Math.round(H*k);
  $('#mbox').innerHTML=`<h3>形状裁切</h3><div class="seg" id="fcShape">${SHAPES.map(([v,l])=>`<button type="button" data-v="${v}">${l}</button>`).join('')}</div>
   <div class="mini">拖框移动,拖四个角改大小</div>
   <div id="fcStage" style="width:${dw}px;height:${dh}px"><canvas id="fcCv" width="${dw}" height="${dh}"></canvas><div id="fcBox"><i data-c="nw"></i><i data-c="ne"></i><i data-c="sw"></i><i data-c="se"></i></div></div>
   <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="tag" id="fcCancel">取消</button><button class="tag red" id="fcOk">裁好了</button></div>`;
  openModal(true);$('#fcCv').getContext('2d').drawImage(src,0,0,dw,dh);
  const box=$('#fcBox');let r;
  const fit=()=>{const lock=shape!=='rect';if(lock){const s=Math.min(dw,dh)*.8;r={x:(dw-s)/2,y:(dh-s)/2,w:s,h:s}}else r={x:dw*.1,y:dh*.1,w:dw*.8,h:dh*.8};paint()};
  const paint=()=>{Object.assign(box.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'});box.classList.toggle('round',shape==='circle');$$('#fcShape button').forEach(b=>b.classList.toggle('on',b.dataset.v===shape))};
  $$('#fcShape button').forEach(b=>b.onclick=()=>{shape=b.dataset.v;fit()});fit();
  box.onpointerdown=e=>{e.preventDefault();const c=e.target.dataset.c,x0=e.clientX,y0=e.clientY,r0={...r},lock=shape!=='rect',MIN=16;
   const mv=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;
    if(!c){r.x=Math.max(0,Math.min(dw-r.w,r0.x+dx));r.y=Math.max(0,Math.min(dh-r.h,r0.y+dy))}
    else{let x1=r0.x,y1=r0.y,x2=r0.x+r0.w,y2=r0.y+r0.h;if(c.includes('w'))x1=Math.min(x2-MIN,Math.max(0,x1+dx));if(c.includes('e'))x2=Math.max(x1+MIN,Math.min(dw,x2+dx));if(c.includes('n'))y1=Math.min(y2-MIN,Math.max(0,y1+dy));if(c.includes('s'))y2=Math.max(y1+MIN,Math.min(dh,y2+dy));
     if(lock){let s=Math.min(x2-x1,y2-y1);if(c.includes('w'))x1=x2-s;else x2=x1+s;if(c.includes('n'))y1=y2-s;else y2=y1+s;
      if(x1<0||y1<0||x2>dw||y2>dh){s=Math.min(c.includes('w')?r0.x+r0.w:dw-r0.x,c.includes('n')?r0.y+r0.h:dh-r0.y,s);if(c.includes('w'))x1=x2-s;else x2=x1+s;if(c.includes('n'))y1=y2-s;else y2=y1+s}}
     r={x:x1,y:y1,w:x2-x1,h:y2-y1}}paint()};
   const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up)};addEventListener('pointermove',mv);addEventListener('pointerup',up)};
  $('#fcCancel').onclick=closeModal;
  $('#fcOk').onclick=async()=>{const sx=r.x/k,sy=r.y/k,sw=Math.max(2,Math.round(r.w/k)),sh=Math.max(2,Math.round(r.h/k)),c=cv(sw,sh),x=c.getContext('2d');
   if(shape==='circle'){x.beginPath();x.ellipse(sw/2,sh/2,sw/2,sh/2,0,0,Math.PI*2);x.clip()}
   if(isT){closeModal();commit();it.clip={x:sx/W,y:sy/H,w:sw/W,h:sh/H,shape};await rerenderText(it,true);save();renderPanel();return toast('裁好了')}
   x.drawImage(src,sx,sy,sw,sh,0,0,sw,sh);closeModal();await replaceAsset(it,c,'裁好了');save();renderPanel()}}
 // 文字的裁切记在 it.clip 里,每次重画都按它裁;圆形在矩形裁完后再挖成圆
 const oldClip=clipC;clipC=function(c,f){const r=oldClip.apply(this,arguments);if(f?.shape!=='circle')return r;const o=cv(r.width,r.height),x=o.getContext('2d');x.beginPath();x.ellipse(r.width/2,r.height/2,r.width/2,r.height/2,0,0,Math.PI*2);x.clip();x.drawImage(r,0,0);return o};
 window.openFixedCrop=openFixedCrop;
 const oldPanel=renderPanel;renderPanel=function(){const r=oldPanel.apply(this,arguments),it=sel(),sec=$('#editCropSection');
  if(sec){sec.hidden=true;sec.classList.add('v47-gone')}
  const menu=$('#editTransform .more .menu');if(!it||!menu||it.locked||it.cutLetter)return r;
  menu.querySelectorAll('.v47').forEach(e=>e.remove());
  const add=(label,fn,cls='')=>{const b=document.createElement('button');b.className='cb v47 '+cls;b.type='button';b.textContent=label;b.onclick=fn;menu.append(b)};
  const head=document.createElement('div');head.className='mini v47 v47-h';head.textContent='裁切';menu.append(head);
  if(it.type==='image'){for(const [v,l] of SHAPES)add(l,()=>openFixedCrop(it,v));add('不规则',()=>runOp('shape'));add('拆分素材页',()=>runOp('split'))}
  else if(it.type==='text'){for(const [v,l] of SHAPES)add(l,()=>openFixedCrop(it,v));if(it.clip)add('取消裁切',()=>runOp('uncrop'))}
  return r};
})();
