/* v56 框选可以从垫板外面、纸的空白处开始拉(不用先点「框选」)。完整框住的素材被选中,Shift 追加,锁定的跳过 */
(function(){
 const $=s=>document.querySelector(s),desk=$('#desk');if(!desk)return;
 const box=document.createElement('div');box.id='deskMarquee';box.hidden=true;document.body.append(box);
 let m=null;
 const boxOn=()=>$('#editBoxQuick')?.classList.contains('on');
 desk.addEventListener('pointerdown',e=>{if(e.button!==0||$('#modal')?.classList.contains('show')||!$('#wbInkCanvas')?.hidden||wand)return;
  const t=e.target;if(t.closest('.item,.h,#editMarquee,button,input,select,textarea'))return;
  const inPage=!!t.closest('#page');if(inPage&&boxOn())return;// 纸上的框选模式交给原来的
  m={id:e.pointerId,x0:e.clientX,y0:e.clientY,x1:e.clientX,y1:e.clientY,moved:false,append:e.shiftKey,prev:new Set(layerPicked)}},true);
 addEventListener('pointermove',e=>{if(!m||e.pointerId!==m.id)return;m.x1=e.clientX;m.y1=e.clientY;
  if(!m.moved&&Math.hypot(m.x1-m.x0,m.y1-m.y0)>5){m.moved=true;box.hidden=false;document.body.classList.add('marqueeing')}
  if(m.moved){e.preventDefault();Object.assign(box.style,{left:Math.min(m.x0,m.x1)+'px',top:Math.min(m.y0,m.y1)+'px',width:Math.abs(m.x1-m.x0)+'px',height:Math.abs(m.y1-m.y0)+'px'})}},true);
 function finish(e){if(!m||(e&&e.pointerId!==m.id))return;const mm=m;m=null;box.hidden=true;document.body.classList.remove('marqueeing');if(!mm.moved)return;
  e?.preventDefault?.();e?.stopImmediatePropagation?.();
  const r=$('#page').getBoundingClientRect(),toMM=(x,y)=>({x:(x-r.left)/S,y:(y-r.top)/S}),a=toMM(mm.x0,mm.y0),b=toMM(mm.x1,mm.y1);
  const L=Math.min(a.x,b.x),R=Math.max(a.x,b.x),T=Math.min(a.y,b.y),B=Math.max(a.y,b.y);
  layerPicked.clear();if(mm.append)mm.prev.forEach(id=>layerPicked.add(id));
  for(const it of state.items){if(it.hidden||it.locked)continue;const an=(it.rot||0)*Math.PI/180,c=Math.cos(an),s=Math.sin(an);
   const cs=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>({x:it.x+u*it.w/2*c-v*it.h/2*s,y:it.y+u*it.w/2*s+v*it.h/2*c}));
   if(cs.every(p=>p.x>=L&&p.x<=R&&p.y>=T&&p.y<=B))layerPicked.add(it.id)}
  selId=null;if(boxOn())$('#editBoxQuick').click();renderItems();if(layerPicked.size)toast('选中 '+layerPicked.size+' 项,按 Delete 删除');
  // 拉完框不要再触发一次「点空白取消选择」
  const eat=ev=>{ev.stopImmediatePropagation();ev.preventDefault()};addEventListener('click',eat,{capture:true,once:true});setTimeout(()=>removeEventListener('click',eat,true),50)}
 addEventListener('pointerup',finish,true);addEventListener('pointercancel',()=>{m=null;box.hidden=true;document.body.classList.remove('marqueeing')},true);
})();
