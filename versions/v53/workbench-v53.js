/* v53 叠在一起时少互相挡:
   ① 点到上层素材的透明处,会直接点到下面那张(按像素判断,旋转/翻转都算)
   ② 鼠标停在哪张上,哪张出一圈淡淡的虚线,先看清再点
   ③ 按住 ⌥ Option(Alt)点,同一个位置的素材一层层往下轮着选 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const cache=new Map(),MAXP=200,ALPHA=28;
 function alphaMap(id){const a=assets[id];if(!a)return null;if(cache.has(id))return cache.get(id);cache.set(id,null);
  const im=new Image();im.onload=()=>{const k=Math.min(1,MAXP/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.max(1,Math.round(im.naturalWidth*k)),h=Math.max(1,Math.round(im.naturalHeight*k)),c=cv(w,h),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,w,h);try{cache.set(id,{w,h,d:x.getImageData(0,0,w,h).data})}catch(e){cache.set(id,'opaque')}};im.onerror=()=>cache.set(id,'opaque');im.src=a.src;return null}
 function local(it,px,py){const r=-(it.rot||0)*Math.PI/180,dx=px-it.x,dy=py-it.y;let lx=dx*Math.cos(r)-dy*Math.sin(r),ly=dx*Math.sin(r)+dy*Math.cos(r);if(it.flip)lx=-lx;return [lx/it.w+.5,ly/it.h+.5]}
 // 0=不在框里 1=框里但透明 2=实的
 function hit(it,px,py){const [u,v]=local(it,px,py);if(u<0||u>1||v<0||v>1)return 0;const m=alphaMap(it.asset);if(!m||m==='opaque')return 2;
  const x=Math.min(m.w-1,Math.floor(u*m.w)),y=Math.min(m.h-1,Math.floor(v*m.h));
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const xx=x+ox,yy=y+oy;if(xx<0||yy<0||xx>=m.w||yy>=m.h)continue;if(m.d[(yy*m.w+xx)*4+3]>ALPHA)return 2}return 1}
 function pointMM(e){const r=$('#items').getBoundingClientRect();return [(e.clientX-r.left)/S,(e.clientY-r.top)/S]}
 const shown=()=>state.items.filter(it=>!it.hidden&&assets[it.asset]);
 function stackAt(px,py){const out=[];for(const it of shown().reverse()){const h=hit(it,px,py);if(h)out.push({it,h})}return out}
 let raf=0,last=null,busy=false;
 function update(){raf=0;if(!last||busy)return;const [px,py]=pointMM(last),st=stackAt(px,py);
  // 选中的那张整框都能点(方便拖它和用手柄);其他的只认实的地方;锁住的不挡下面
  const pick=st.find(s=>!s.it.locked&&(s.it.id===selId||s.h===2))?.it||null;
  const pass=new Set();for(const s of st){if(s.it===pick)break;pass.add(s.it.id)}
  $$('#items .item').forEach(el=>{el.classList.toggle('pass',pass.has(el.dataset.id));el.classList.toggle('hov',!!pick&&el.dataset.id===pick.id&&pick.id!==selId)})}
 const page=$('#page');
 page.addEventListener('pointermove',e=>{if(e.buttons){busy=true;return}busy=false;last=e;if(!raf)raf=requestAnimationFrame(update)},true);
 page.addEventListener('pointerleave',()=>{last=null;$$('#items .item.hov,#items .item.pass').forEach(el=>el.classList.remove('hov','pass'))});
 addEventListener('pointerup',()=>{busy=false});
 // ⌥ 点:同一位置往下一层
 page.addEventListener('pointerdown',e=>{if(!e.altKey||e.button!==0)return;const [px,py]=pointMM(e),st=stackAt(px,py).filter(s=>!s.it.locked&&s.h===2).map(s=>s.it);if(!st.length)return;
  e.preventDefault();e.stopPropagation();const i=st.findIndex(it=>it.id===selId),next=st[(i+1)%st.length];select(next.id);
  toast(`第 ${st.indexOf(next)+1}/${st.length} 层:${next.name||'素材'}`);last=e;requestAnimationFrame(update)},true);
 // 换图后像素表重算
 const oldRender=renderItems;renderItems=function(){const r=oldRender.apply(this,arguments);for(const it of shown())alphaMap(it.asset);if(last)requestAnimationFrame(update);return r};
 for(const it of shown())alphaMap(it.asset);
 window.LayerHit={stackAt,hit};
})();
