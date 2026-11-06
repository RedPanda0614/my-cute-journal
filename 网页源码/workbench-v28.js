/* v28:线稿换颜色;贴纸效果下拉跟着选中的图显示 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const INKS=[['墨黑','#2b2520'],['深棕','#3a2e24'],['赭红','#b8453a'],['砖红','#c8644b'],['芥黄','#d39a2e'],['橄榄绿','#6f8f6f'],['雾蓝','#6f8fb5'],['藏青','#2b3550'],['藕粉','#d98e8a'],['米白','#fffaf0']];

 /* ---------- 线稿颜色 ---------- */
 // 把线条换成一种颜色:越深的地方越不透明,白底会变透明。适合线稿、手绘、印章、扫描的画。
 function recolor(src,hex){const W=src.width,H=src.height,o=document.createElement('canvas');o.width=W;o.height=H;const x=o.getContext('2d');x.drawImage(src,0,0);
  const id=x.getImageData(0,0,W,H),d=id.data,n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;let maxd=0;
  for(let p=0;p<d.length;p+=4)if(d[p+3]>40){const k=1-(d[p]*.299+d[p+1]*.587+d[p+2]*.114)/255;if(k>maxd)maxd=k}
  maxd=Math.max(maxd,.2);
  for(let p=0;p<d.length;p+=4){const k=1-(d[p]*.299+d[p+1]*.587+d[p+2]*.114)/255;d[p+3]=Math.round(d[p+3]*Math.min(1,k/maxd/.85));d[p]=r;d[p+1]=g;d[p+2]=b}
  x.putImageData(id,0,0);return o}
 async function applyInk(hex){const it=sel();if(!it||it.type!=='image'||it.locked)return toast('先点选一张图片');
  const baseId=it.inkBase&&assets[it.inkBase]?it.inkBase:it.asset,c=await toCanvas(assets[baseId]);
  await replaceAsset(it,recolor(c,hex),'');it.inkBase=baseId;it.ink=hex;save();renderPanel()}
 function resetInk(){const it=sel();if(!it?.inkBase||!assets[it.inkBase])return;commit();const a=assets[it.asset],b=assets[it.inkBase];it.w=it.w*b.w/a.w;it.h=it.h*b.h/a.h;it.asset=it.inkBase;it.inkBase=null;it.ink=null;renderItems();save();renderPanel()}
 const sec=document.createElement('details');sec.className='edit-section';sec.id='editInkSection';sec.open=true;
 sec.innerHTML=`<summary>线稿颜色</summary><div class="edit-body"><p class="mini ink-tip">把线条换成一种颜色,白底会变透明。适合线稿、手绘图标、印章。</p>
  <div class="ink-row">${INKS.map(([n,c])=>`<button type="button" class="ink-sw" data-ink="${c}" title="${n}" style="background:${c}"></button>`).join('')}<input type="color" id="inkPick" value="#3a2e24" title="自己选颜色"></div>
  <button type="button" class="tool" id="inkReset">恢复原来的颜色</button></div>`;
 const fxSec=$('.fx-row')?.closest('.edit-section');if(fxSec)fxSec.after(sec);
 sec.querySelectorAll('[data-ink]').forEach(b=>b.onclick=()=>applyInk(b.dataset.ink));
 $('#inkPick').onchange=e=>applyInk(e.target.value);$('#inkReset').onclick=resetInk;

 /* ---------- 面板挂钩 ---------- */
 const old=renderPanel;renderPanel=function(){old.apply(this,arguments);const it=sel(),img=it&&it.type==='image'&&!it.card&&!it.photoPlaceholder;
  sec.hidden=!img;if(img){sec.querySelectorAll('[data-ink]').forEach(b=>b.classList.toggle('on',b.dataset.ink===it.ink));$('#inkReset').disabled=!it.inkBase;sec.querySelectorAll('button,input').forEach(e=>{if(e.id!=='inkReset')e.disabled=!!it.locked})}
  // 粗细下拉:选中的图做过这个效果,就显示它用的粗细
  $$('.fx-w').forEach(e=>{e.value=it&&it.fx===e.dataset.fx&&it.fxW?it.fxW:fxW[e.dataset.fx]})};
 renderPanel();
})();
