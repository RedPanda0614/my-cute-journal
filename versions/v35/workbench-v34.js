/* v34:制作胶带改成一个单独的页面
   在图上拖一条框,选哪一段做胶带;可以「重复」平铺或「拉伸」;调长度、透明度、两头锯齿;右边实时预览,生成后放进「胶带」。 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const WB=window.WorkbenchExtras;
 const H=120; // 胶带图高 120px,对应 15mm 宽

 function makeTape(src,band,o){const L=Math.round(H*o.len/o.widthMM),c=cv(L,H),x=c.getContext('2d'),sx=band.x,sy=band.y,sw=band.w,sh=band.h;
  // 1. 选中的那段图铺满胶带
  const seg=Math.max(8,Math.round(sw*H/sh));
  // 胶带要有底:先铺底色,图透明的地方也连成一整条
  if(o.base){x.fillStyle=o.base;x.fillRect(0,0,L,H)}
  if(o.mode==='stretch')x.drawImage(src,sx,sy,sw,sh,0,0,L,H);
  else for(let px=0;px<L;px+=seg)x.drawImage(src,sx,sy,sw,sh,px,0,seg,H);
  // 2. 纸胶带的质感:一点白雾 + 细纹
  x.globalCompositeOperation='source-atop';x.fillStyle='rgba(255,255,255,.12)';x.fillRect(0,0,L,H);
  const R=rng(L+H);x.fillStyle='rgba(255,255,255,.18)';for(let i=0;i<L*.6;i++)x.fillRect(R()*L,R()*H,1+R()*3,1);
  x.globalCompositeOperation='source-over';
  // 3. 两头:锯齿或平直;整体半透明
  const out=cv(L,H),ox=out.getContext('2d'),p=new Path2D();
  if(o.edge==='zig'){const z=H/9,d=H*.06;p.moveTo(d,0);p.lineTo(L-d,0);for(let i=0;i<=9;i++)p.lineTo(L-(i%2?0:d),i*z);p.lineTo(d,H);for(let i=9;i>=0;i--)p.lineTo(i%2?0:d,i*z);p.closePath()}
  else p.rect(0,0,L,H);
  ox.save();ox.clip(p);ox.globalAlpha=o.alpha;ox.drawImage(c,0,0);ox.restore();return out}

 async function openTapeMaker(it,srcCanvas){const src=srcCanvas||await toCanvas(assets[it.asset]),S=src.width,T=src.height;
  const fit=Math.min(1,460/S,340/T),dw=Math.round(S*fit),dh=Math.round(T*fit);
  const o={mode:'repeat',widthMM:15,len:80,alpha:.85,edge:'zig',base:'#f3ead8'};
  // 默认选中间一条:高约四分之一
  const band={x:0,y:Math.round(T*.38),w:S,h:Math.max(8,Math.round(T*.24))};
  $('#mbox').innerHTML=`<h3>制作胶带</h3><p class="mini">在图上拖动框选的那一条:拖中间移动,拖上下边调整取图范围（不改变胶带实际宽度）,拖左右边改取哪一段。</p>
   <div class="tape-maker"><div class="tm-src" style="width:${dw}px;height:${dh}px"><canvas id="tmImg" width="${dw}" height="${dh}"></canvas><div class="tm-band" id="tmBand"><i data-h="t"></i><i data-h="b"></i><i data-h="l"></i><i data-h="r"></i></div></div>
   <div class="tm-side"><div class="mrow"><span>方式</span><div class="seg" id="tmMode"><button type="button" data-v="repeat" class="on">重复</button><button type="button" data-v="stretch">拉伸</button></div></div>
    <label class="mrow"><span>长度</span><input type="range" id="tmLen" min="30" max="180" step="5" value="${o.len}"><output id="tmLenV">${o.len}mm</output></label>
    <label class="mrow"><span>宽度</span><input type="range" id="tmWidth" min="5" max="30" step="1" value="${o.widthMM}"><output id="tmWidthV">${o.widthMM}mm</output></label>
    <label class="mrow"><span>透明度</span><input type="range" id="tmAlpha" min="40" max="100" value="${o.alpha*100}"><output id="tmAlphaV">${o.alpha*100}%</output></label>
    <div class="mrow"><span>两头</span><div class="seg" id="tmEdge"><button type="button" data-v="zig" class="on">锯齿</button><button type="button" data-v="flat">平直</button></div></div>
    ${UIKit.colorField({value:o.base,label:'底色',presets:['#f3ead8','#fffaf0','#e8c36a','#cfe0cf','#d7e1ea','#f0cfc6','#c9a77a','#3b3226']})}
    <div class="tm-prev"><canvas id="tmPrev"></canvas></div></div></div>
   <div class="row" style="justify-content:flex-end;gap:6px;margin-top:10px"><button class="tag" id="tmNo">取消</button><button class="tag red" id="tmOk">生成胶带</button></div>`;
  $('#tmImg').getContext('2d').drawImage(src,0,0,dw,dh);
  const bandEl=$('#tmBand'),prev=$('#tmPrev');
  const paintBand=()=>{Object.assign(bandEl.style,{left:band.x*fit+'px',top:band.y*fit+'px',width:band.w*fit+'px',height:band.h*fit+'px'})};
  let t;const paintPrev=()=>{clearTimeout(t);t=setTimeout(()=>{const tape=makeTape(src,band,o),k=Math.min(1,300/tape.width);prev.width=Math.round(tape.width*k);prev.height=Math.round(tape.height*k);const x=prev.getContext('2d');x.clearRect(0,0,prev.width,prev.height);x.drawImage(tape,0,0,prev.width,prev.height)},40)};
  const all=()=>{paintBand();paintPrev()};
  // 拖框
  bandEl.onpointerdown=e=>{e.preventDefault();const h=e.target.dataset.h||'move',sx=e.clientX,sy=e.clientY,b0={...band};bandEl.setPointerCapture(e.pointerId);
   bandEl.onpointermove=ev=>{const dx=(ev.clientX-sx)/fit,dy=(ev.clientY-sy)/fit,min=8;
    if(h==='move'){band.x=Math.max(0,Math.min(S-b0.w,b0.x+dx));band.y=Math.max(0,Math.min(T-b0.h,b0.y+dy))}
    if(h==='t'){const y=Math.max(0,Math.min(b0.y+b0.h-min,b0.y+dy));band.h=b0.h+(b0.y-y);band.y=y}
    if(h==='b')band.h=Math.max(min,Math.min(T-b0.y,b0.h+dy));
    if(h==='l'){const x=Math.max(0,Math.min(b0.x+b0.w-min,b0.x+dx));band.w=b0.w+(b0.x-x);band.x=x}
    if(h==='r')band.w=Math.max(min,Math.min(S-b0.x,b0.w+dx));all()};
   bandEl.onpointerup=()=>{bandEl.onpointermove=null}};
  const seg=(id,key)=>$$(`#${id} [data-v]`).forEach(b=>b.onclick=()=>{o[key]=b.dataset.v;$$(`#${id} [data-v]`).forEach(x=>x.classList.toggle('on',x===b));paintPrev()});
  seg('tmMode','mode');seg('tmEdge','edge');
  UIKit.bindColor($('#mbox .cf'),v=>{o.base=v;paintPrev()});
  $('#tmLen').oninput=e=>{o.len=+e.target.value;$('#tmLenV').textContent=o.len+'mm';paintPrev()};
  $('#tmWidth').oninput=e=>{o.widthMM=+e.target.value;$('#tmWidthV').textContent=o.widthMM+'mm';paintPrev()};
  $('#tmAlpha').oninput=e=>{o.alpha=e.target.value/100;$('#tmAlphaV').textContent=e.target.value+'%';paintPrev()};
  $('#tmNo').onclick=closeModal;
  $('#tmOk').onclick=async()=>{const tape=makeTape(src,band,o),a=await addAsset(tape.toDataURL('image/png'),{name:it.name+' 胶带',source:'tool',cat:'tape',tags:['胶带','自己做的']});
   closeModal();drawerRender();addItem(a,it.x,it.y+it.h/2,{w:o.len,h:o.widthMM});toast('做好了,也放进了「胶带」')};
  openModal(true);all()}
 WB.openTapeMaker=openTapeMaker;WB.makeTape=makeTape;
})();

/* v34:「相框与纹理」展开就是全部设置(和其他区块一样),不再弹窗;「恢复原图」放到编辑区块最下面 */
(function(){
 const $=s=>document.querySelector(s);
 const WB=window.WorkbenchExtras;
 const FRAMES=[['none','无'],['polaroid','拍立得'],['stamp','邮票'],['film','胶片'],['circle','圆形']],
  EFFECTS=[['original','原色'],['mono','黑白'],['vintage','褪色复古'],['halftone','黑白网点']],
  SLIDERS=[['strength','效果强度',0,1,.05,v=>Math.round(v*100)+'%'],['grain','扫描颗粒',0,1,.05,v=>Math.round(v*100)+'%'],['zoom','照片放大',1,3,.05,v=>(+v).toFixed(2)+'×'],['panX','水平位置',-1,1,.05,v=>Math.round(v*100)],['panY','垂直位置',-1,1,.05,v=>Math.round(v*100)],['shadow','投影',0,.6,.05,v=>Math.round(v/.6*100)+'%']];
 const box=document.createElement('div');box.id='photoInline';box.className='photo-inline';
 const opt=(list,v)=>list.map(([k,n])=>`<option value="${k}" ${k===v?'selected':''}>${n}</option>`).join('');
 function draftOf(it){return it.photoSpec?JSON.parse(JSON.stringify(it.photoSpec)):{source:it.asset,frame:'none',effect:'original',strength:.5,grain:0,zoom:1,panX:0,panY:0,shadow:.2,ratio:it.w/it.h}}
 let current=null,busy=Promise.resolve();
 function render(it){current=it;const d=draftOf(it);
  box.innerHTML=`<div class="f fx-row"><span class="fx-lbl">相框</span><select class="sel" data-k="frame">${opt(FRAMES,d.frame)}</select></div>
   <div class="f fx-row"><span class="fx-lbl">效果</span><select class="sel" data-k="effect">${opt(EFFECTS,d.effect)}</select></div>
   ${SLIDERS.map(([k,n,min,max,step,fmt])=>`<label class="edit-slider"><span>${n}</span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${d[k]}"><output>${fmt(d[k])}</output></label>`).join('')}`;
  box.querySelectorAll('[data-k]').forEach(el=>{const k=el.dataset.k,s=SLIDERS.find(x=>x[0]===k);
   if(s)el.oninput=()=>{el.nextElementSibling.textContent=s[5](el.value)};
   // 松手 / 选好就应用到纸上(可撤销)
   el.onchange=()=>{if(current!==it||it.locked)return;WB.patchImage(it,{photo:{[k]:el.tagName==='SELECT'?el.value:+el.value}}).catch(e=>toast(e.message))}})}
 const old=renderPanel;renderPanel=function(){old.apply(this,arguments);const it=sel(),host=$('#editPhoto');if(!host)return;
  // 旧的两个按钮不显示;「替换照片」留着给双击照片框用
  ['#wbPhotoEdit','#wbPhotoReplace'].forEach(q=>{const b=$(q);if(b)b.hidden=true});
  if(box.parentElement!==host)host.append(box);
  if(it&&it.type==='image')render(it);
  // 「恢复原图」放到编辑区块最下面
  const restore=$('#editRestore'),secs=[...document.querySelectorAll('.pn[data-pane="tidy"] details.edit-section')],last=secs[secs.length-1];
  if(restore&&last&&last.nextElementSibling!==restore)last.after(restore)};
})();
