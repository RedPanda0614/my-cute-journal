/* v37:素材详情卡不被屏幕截掉;标签和素材套加「管理」 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 /* ---------- 1. 详情卡:内容加完以后再放位置,永远在屏幕里 ---------- */
 const info=$('#info');
 function fitInfo(){if(!info||getComputedStyle(info).display==='none')return;const maxH=innerHeight-16;info.style.maxHeight=maxH+'px';info.style.overflowY='auto';
  const r=info.getBoundingClientRect();let top=r.top;if(r.bottom>innerHeight-8)top=innerHeight-8-r.height;info.style.top=Math.max(8,top)+'px'}
 if(info){new ResizeObserver(()=>fitInfo()).observe(info);const old=showInfo;showInfo=function(){const r=old.apply(this,arguments);requestAnimationFrame(fitInfo);return r};addEventListener('resize',fitInfo)}

 /* ---------- 2. 管理:标题行「管理」→ 自己建的标签、素材套后面出现 ✎,点一下改名或删除 ---------- */
 let managing=false;
 function paintManage(){const titles=$$('#dtabs>.row-title');for(const t of titles){let b=t.querySelector('.chip-manage');if(!b){b=document.createElement('button');b.type='button';b.className='chip chip-manage';b.onclick=()=>{managing=!managing;drawerRender()};t.querySelector('.chip-add')?.before(b)}
   b.textContent=managing?'完成':'管理';b.classList.toggle('on',managing)}
  $('#dtabs')?.classList.toggle('managing',managing);
  // 管理时两组全部展开,自己建的都看得到
  if(managing){$$('#catChips .chip,#setChips .chip').forEach(c=>c.hidden=false);$$('#catChips .chip-more,#setChips .chip-more').forEach(c=>c.hidden=true)}
  $$('#catChips .my-tag,#setChips .chip.mine').forEach(c=>{if(!c.querySelector('.ed'))c.insertAdjacentHTML('beforeend','<i class="ed">✎</i>');c.title=managing?'点一下改名或删除':c.title})}
 // 管理模式下点自建标签 / 素材套 = 打开改名删除;点别的不起作用
 document.addEventListener('click',e=>{if(!managing)return;const c=e.target.closest('#catChips .chip.my-tag,#setChips .chip.mine');if(!c)return;e.preventDefault();e.stopImmediatePropagation();
  c.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))},true); // 自带的由 v38 处理
 const oldDR=drawerRender;drawerRender=function(){const r=oldDR.apply(this,arguments);paintManage();return r};
 window.workbenchReady?.then(()=>drawerRender());
})();
