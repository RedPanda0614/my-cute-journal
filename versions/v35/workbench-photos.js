'use strict';
(()=>{
 const WB=window.WorkbenchExtras;let fillTarget=null,reframe=null,preview=0;
 const controls=document.createElement('div');controls.id='photoWorkflow';controls.className='btn-grid';controls.innerHTML='<button class="tool" id="fillFromLibrary">从素材库填照片</button><button class="tool" id="replaceFromFile">从文件换照片</button><button class="tool" id="startReframe">框内构图</button><button class="tool" id="cancelPhotoFill" hidden>取消填入</button>';
 const reframeBar=document.createElement('div');reframeBar.className='btn-grid';reframeBar.id='reframeBar';reframeBar.hidden=true;reframeBar.innerHTML='<button class="tool" id="finishReframe">完成构图</button><button class="tool" id="cancelReframe">取消构图</button>';
 $('#editPhoto').append(controls,reframeBar);
 const hint=document.createElement('p');hint.className='mini';hint.id='photoFillHint';hint.hidden=true;hint.textContent='点击照片填入选中的框；也可把照片拖到框上。';$('#dgrid').before(hint);const cancelHint=document.createElement('button');cancelHint.className='tool';cancelHint.textContent='取消填入';hint.append(cancelHint);cancelHint.onclick=()=>{fillTarget=null;hint.hidden=true;controls.querySelector('#cancelPhotoFill').hidden=true};
 function frame(it){return it?.type==='image'&&(it.photoSpec||it.photoPlaceholder)}
 async function fill(it,a){if(!it||it.locked)return toast('相框已锁定');fillTarget=null;hint.hidden=true;controls.querySelector('#cancelPhotoFill').hidden=true;await WB.replacePhoto(it,a.src);selId=it.id;layerPicked.clear();renderItems();toast('照片已填入，外框位置保留')}
 WB.fillPhoto=(it,a)=>fill(it,a);
 WB.fillPhotoDrop=(a,el)=>{const node=el?.closest('#items .item'),it=node&&state.items.find(i=>i.id===node.dataset.id);if(a.cat!=='photo'||!frame(it))return false;fill(it,a).catch(e=>toast(e.message));return true};
 const oldAdd=addItem;addItem=function(a,...args){const it=state.items.find(i=>i.id===fillTarget);if(fillTarget&&a.cat==='photo'&&frame(it)){fill(it,a).catch(e=>toast(e.message));return it}return oldAdd.call(this,a,...args)};
 $('#fillFromLibrary').onclick=()=>{const it=sel();if(!it||it.locked)return;if(!it.photoSpec){WB.patchImage(it,{photo:{frame:'none'}}).catch(e=>toast(e.message))}fillTarget=it.id;hint.hidden=false;controls.querySelector('#cancelPhotoFill').hidden=false;setPane('assets');setTab('photo')};
 $('#replaceFromFile').onclick=()=>WB.choosePhoto(sel());
 controls.querySelector('#cancelPhotoFill').onclick=()=>{fillTarget=null;hint.hidden=true;controls.querySelector('#cancelPhotoFill').hidden=true};
 function stop(){preview++;if(reframe){const im=$(`#items .item[data-id="${reframe.it.id}"]>img`);if(im)im.src=assets[reframe.it.asset].src}reframe=null;$('#page').classList.remove('reframing');reframeBar.hidden=true}
 $('#cancelReframe').onclick=stop;
 $('#finishReframe').onclick=async()=>{if(!reframe)return;const {it,draft}=reframe;stop();await WB.patchImage(it,{photo:draft}).catch(e=>toast(e.message))};
 $('#startReframe').onclick=()=>{const it=sel();if(!frame(it)||it.locked)return;stop();reframe={it,draft:JSON.parse(JSON.stringify(it.photoSpec)),page:curPage().id};$('#page').classList.add('reframing');reframeBar.hidden=false;toast('拖动框内照片；完成或取消构图')};
 $('#desk').addEventListener('pointerdown',e=>{if(!reframe)return;const node=e.target.closest('.item');if(node?.dataset.id!==reframe.it.id)return;e.preventDefault();e.stopImmediatePropagation();const s=reframe;s.drag={x:e.clientX,y:e.clientY,panX:s.draft.panX||0,panY:s.draft.panY||0,pointer:e.pointerId};$('#desk').setPointerCapture(e.pointerId);toCanvas(assets[s.draft.source]).then(c=>s.source=c)},true);
 $('#desk').addEventListener('pointermove',e=>{const s=reframe;if(!s?.drag||!s.source)return;const {it,drag,draft}=s,a=-it.rot*Math.PI/180,dx=(e.clientX-drag.x)/S,dy=(e.clientY-drag.y)/S,x=(dx*Math.cos(a)-dy*Math.sin(a))*(it.flip?-1:1),y=dx*Math.sin(a)+dy*Math.cos(a),scale=Math.max(it.w/s.source.width,it.h/s.source.height)*(draft.zoom||1),overX=Math.max(.1,s.source.width*scale-it.w),overY=Math.max(.1,s.source.height*scale-it.h);draft.panX=Math.max(-1,Math.min(1,drag.panX+x*2/overX));draft.panY=Math.max(-1,Math.min(1,drag.panY+y*2/overY));const r=WB.imageRecipe(it);r.photo={...draft};const token=++preview;WB.renderRecipe(r).then(c=>{if(token!==preview||reframe!==s)return;const im=$(`#items .item[data-id="${it.id}"]>img`);if(im)im.src=c.toDataURL()}).catch(e=>toast(e.message))});
 function end(e){const s=reframe;if(!s?.drag)return;const pointer=s.drag.pointer;delete s.drag;if($('#desk').hasPointerCapture(pointer))$('#desk').releasePointerCapture(pointer)}$('#desk').addEventListener('pointerup',end);$('#desk').addEventListener('pointercancel',end);
 window.addEventListener('keydown',e=>{if(e.key==='Escape')stop()},true);
 const oldPanel=renderPanel;renderPanel=function(){oldPanel.apply(this,arguments);const it=sel(),host=$('#editPhoto');if(!host)return;if(fillTarget&&it?.id!==fillTarget){fillTarget=null;hint.hidden=true;controls.querySelector('#cancelPhotoFill').hidden=true}host.prepend(controls,reframeBar);controls.hidden=!it||it.type!=='image'||it.locked;$('#startReframe').hidden=!frame(it);if(reframe&&(reframe.it!==it||reframe.page!==curPage().id))stop()};
 // 双击入口仍只有 extras 一处；普通图仅选中编辑，不弹文件选择器。
})();
