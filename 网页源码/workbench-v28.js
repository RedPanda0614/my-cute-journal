/* v28:线稿换颜色(v30 起用统一取色器,纸底不透明);贴纸效果下拉跟着选中的图显示 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

 /* ---------- 线稿颜色 ---------- */
 // 把线条换成一种颜色:越深的地方越接近新颜色,纸底(浅色)保持原样,透明度不变,不会挖出窟窿
 function recolor(src,hex){const W=src.width,H=src.height,o=document.createElement('canvas');o.width=W;o.height=H;const x=o.getContext('2d');x.drawImage(src,0,0);
  const id=x.getImageData(0,0,W,H),d=id.data,n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,L=[];
  for(let p=0;p<d.length;p+=16)if(d[p+3]>200)L.push(d[p]*.299+d[p+1]*.587+d[p+2]*.114);L.sort((a,b)=>a-b);
  const lo=L[Math.floor(L.length*.03)]??0,hi=L[Math.floor(L.length*.97)]??255,span=Math.max(30,hi-lo);
  for(let p=0;p<d.length;p+=4){const l=d[p]*.299+d[p+1]*.587+d[p+2]*.114,k=Math.min(1,Math.max(0,(hi-l)/span));d[p]=d[p]+(r-d[p])*k;d[p+1]=d[p+1]+(g-d[p+1])*k;d[p+2]=d[p+2]+(b-d[p+2])*k}
  x.putImageData(id,0,0);return o}
 async function applyInk(hex){const it=sel();if(!it||it.type!=='image'||it.locked)return toast('先点选一张图片');
  const baseId=it.inkBase&&assets[it.inkBase]?it.inkBase:it.asset,c=await toCanvas(assets[baseId]);
  await replaceAsset(it,recolor(c,hex),'');it.inkBase=baseId;it.ink=hex;save();renderPanel()}
 function resetInk(){const it=sel();if(!it?.inkBase||!assets[it.inkBase])return;commit();const a=assets[it.asset],b=assets[it.inkBase];it.w=it.w*b.w/a.w;it.h=it.h*b.h/a.h;it.asset=it.inkBase;it.inkBase=null;it.ink=null;renderItems();save();renderPanel()}
 const sec=document.createElement('details');sec.className='edit-section';sec.id='editInkSection';sec.open=true;
 sec.innerHTML=`<summary>线稿颜色</summary><div class="edit-body"><p class="mini">把线条换成一种颜色,纸底保持不变。适合版画、木刻、印章。</p>${UIKit.colorField({value:'#3a2e24',label:'颜色'})}<button type="button" class="tool" id="inkReset">恢复原来的颜色</button></div>`;
 const inkField=UIKit.bindColor(sec.querySelector('.cf'),(v,from,dragging)=>{if(!dragging)applyInk(v)});
 const fxSec=$('.fx-pick')?.closest('.edit-section');if(fxSec)fxSec.after(sec);
 $('#inkReset').onclick=resetInk;

 /* ---------- 面板挂钩 ---------- */
 const old=renderPanel;renderPanel=function(){old.apply(this,arguments);const it=sel(),img=it&&it.type==='image'&&!it.card&&!it.photoPlaceholder;
  sec.hidden=!img;if(img){inkField.paint(it.ink||'#3a2e24');$('#inkReset').disabled=!it.inkBase;sec.querySelectorAll('input,.swatch').forEach(e=>{e.disabled=!!it.locked})}
  // 粗细下拉:选中的图做过这个效果,就显示它用的粗细
  if(typeof paintFxW==='function')paintFxW()};
 renderPanel();
})();
