/* v50 涂鸦单独成一个功能:左边栏「文字」下面多一个「涂鸦」,编辑栏里不再放涂鸦 */
(function(){
 const $=s=>document.querySelector(s);
 const grp=$('#wbInkColor')?.closest('.grp'),old=grp?.closest('details.edit-section');
 if(!grp)return;
 const sec=document.createElement('section');sec.className='pn';sec.dataset.pane='draw';
 sec.innerHTML='<h3>涂鸦</h3><p class="mini">选好笔,直接在纸上画。每画一笔都是一张可以移动的小素材。</p>';
 sec.append(grp);$('#pane').append(sec);old?.remove();
 const b=document.createElement('button');b.className='ri';b.dataset.pane='draw';b.innerHTML='<i>✐</i>涂鸦';b.onclick=()=>setPane('draw');
 $('#rail .ri[data-pane=text]')?.after(b);
 // 在涂鸦面板里画完一笔,留在涂鸦面板继续画(不跳去编辑)
 const WB=window.WorkbenchExtras||{},ed=WB.editNewItem;if(ed)WB.editNewItem=function(it,o={}){if(o.keepDrawing&&$('.ri.on')?.dataset.pane==='draw'){selId=null;renderItems();return it}return ed.apply(this,arguments)};
})();
