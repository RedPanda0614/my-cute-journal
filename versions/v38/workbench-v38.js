/* v38:
   1. 除了「全部」,所有标签和素材套都能改名、删除(自带的也可以;删除 = 从栏里拿掉,素材还在「全部」里,可以在「管理」里恢复)
   2. 纸张「自定义照片…」:上传一张照片当背景,纸张尺寸自动变成「自定义」,比例跟照片一样
   3. 去掉「风格」模块 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 const ML=window.MaterialLibrary;

 /* ---------- 1. 自带标签、素材套:改名 / 删除 / 恢复 ---------- */
 const builtinChips=()=>$$('#catChips .chip[data-tab],#setChips .chip[data-tab]').filter(c=>c.dataset.tab!=='all'&&!c.matches('.my-tag,.mine,.chip-more'));
 function applyLabels(){if(!ML?.labels)return;const L=ML.labels(),H=new Set(ML.hiddenTabs()),managing=$('#dtabs')?.classList.contains('managing');
  for(const c of builtinChips()){const id=c.dataset.tab;if(!c.dataset.orig){const t=[...c.childNodes].find(n=>n.nodeType===3);c.dataset.orig=t?t.textContent:c.textContent}
   const t=[...c.childNodes].find(n=>n.nodeType===3);if(t)t.textContent=L[id]||c.dataset.orig;
   if(!c.querySelector('.ed'))c.insertAdjacentHTML('beforeend','<i class="ed">✎</i>');
   const gone=H.has(id);c.classList.toggle('gone',gone);if(gone)c.hidden=!managing}}
 function editBuiltin(c){const id=c.dataset.tab,orig=c.dataset.orig||'',L=ML.labels(),gone=ML.hiddenTabs().includes(id),now=L[id]||orig;
  $('#mbox').innerHTML=`<h3>${gone?'恢复':'改名或删除'}「${esc(now)}」</h3>${gone?`<p class="mini">这个已经从栏里拿掉了,素材还在「全部」里。</p>`:`<input class="txt" id="biName" value="${esc(now)}" maxlength="16"><p class="mini">原名「${esc(orig)}」。删除只是从栏里拿掉,里面的素材还在「全部」里,以后可以在「管理」里恢复。</p>`}
   <div class="row" style="justify-content:flex-end;gap:6px;margin-top:10px">${gone?'<button class="tag" id="biNo">取消</button><button class="tag red" id="biBack">恢复显示</button>':`${L[id]?'<button class="tag" id="biReset" style="margin-right:auto">恢复原名</button>':''}<button class="tag" id="biDel">删除</button><button class="tag" id="biNo">取消</button><button class="tag red" id="biOk">保存</button>`}</div>`;
  $('#biNo').onclick=closeModal;
  if(gone){$('#biBack').onclick=()=>{ML.setHidden(id,false);closeModal();drawerRender()}}
  else{const ok=()=>{const v=$('#biName').value.trim();ML.setLabel(id,v&&v!==orig?v:'');closeModal();drawerRender()};$('#biOk').onclick=ok;$('#biName').onkeydown=e=>{if(e.key==='Enter')ok()};
   if($('#biReset'))$('#biReset').onclick=()=>{ML.setLabel(id,'');closeModal();drawerRender()};
   $('#biDel').onclick=()=>{ML.setHidden(id,true);if(typeof tab!=='undefined'&&tab===id)setTab('all');closeModal();drawerRender();toast('拿掉了。点「管理」可以恢复')}}
  openModal();setTimeout(()=>$('#biName')?.select(),30)}
 // 管理模式下点自带的胶囊:改名 / 删除 / 恢复(自建的仍由 v37 处理;「全部」不能改)
 document.addEventListener('click',e=>{if(!$('#dtabs')?.classList.contains('managing'))return;const c=e.target.closest('#catChips .chip[data-tab],#setChips .chip[data-tab]');
  if(!c||c.matches('.my-tag,.mine,.chip-more'))return;e.preventDefault();e.stopImmediatePropagation();if(c.dataset.tab==='all')return toast('「全部」不能改');editBuiltin(c)},true);
 const oldDR=drawerRender;drawerRender=function(){const r=oldDR.apply(this,arguments);applyLabels();return r};

 /* ---------- 2. 自定义照片背景 ---------- */
 const bgCache={};
 window.bgImage=page=>{const id=page?.bgAsset,a=id&&assets[id];if(!a)return null;let im=bgCache[id];
  if(!im||im.dataset.src!==a.src){im=new Image();im.dataset.src=a.src;im.onload=()=>{if(typeof layout==='function')layout()};im.src=a.src;bgCache[id]=im}return im};
 const pick=document.createElement('input');pick.type='file';pick.accept='image/*';pick.hidden=true;document.body.append(pick);
 let prevKind='cream';
 function readFile(f){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)})}
 pick.onchange=async()=>{const f=pick.files[0];pick.value='';if(!f){$('#pKind').value=curPage().bgAsset?'photo':prevKind;return}
  try{const src=await readFile(f),a=await addAsset(src,{name:'背景 · '+f.name.replace(/\.[^.]+$/,''),source:'upload',cat:'background'});
   const im=await loadImg(a.src),ratio=im.naturalHeight/im.naturalWidth;commit();const P=state.paper,page=curPage();
   page.kind='photo';page.bgAsset=a.id;P.kind='photo';
   // 尺寸改成「自定义」,比例跟照片一样(保留现在的宽)
   P.size='自定义';if(P.landscape)P.cw=Math.round(P.ch*ratio);else P.ch=Math.round(P.cw*ratio);
   syncTop();layout();save();drawerRender();toast('背景换好了,纸张改成和照片一样的比例')}catch(e){toast('这张图没能打开');$('#pKind').value=prevKind}};
 const kindSel=$('#pKind');
 if(kindSel){kindSel.addEventListener('focus',()=>{prevKind=curPage().kind||'cream'});kindSel.addEventListener('mousedown',()=>{prevKind=curPage().kind||'cream'});
  const oldChange=kindSel.onchange;kindSel.onchange=e=>{if(e.target.value==='photo'){pick.click();return}const page=curPage();if(page.bgAsset&&e.target.value!=='photo'){/* 换回普通纸:背景照片留着素材,页面不再用 */}oldChange.call(kindSel,e)}}
 // 打开作品时把背景照片先载入
 if(typeof applyProject==='function'){const old=applyProject;applyProject=async function(){const r=await old.apply(this,arguments);for(const p of state.pages)if(p.bgAsset)window.bgImage(p);return r}}

 // 有照片背景时不显示「从这里开始」,免得挡住照片
 const hint=()=>{const h=$('.empty-hint');if(h&&curPage()?.bgAsset&&curPage().kind==='photo')h.hidden=true};
 for(const f of ['renderItems','goPage','layout']){const o=window[f];if(typeof o==='function')window[f]=function(){const r=o.apply(this,arguments);hint();return r}}

 /* ---------- 3. 去掉「风格」模块 ---------- */
 const hideStyles=()=>{const b=$('.ri[data-pane="styles"]'),p=$('.pn[data-pane="styles"]');if(b)b.hidden=true;if(p)p.hidden=true;if($('.ri.on')?.dataset.pane==='styles')setPane('assets')};
 hideStyles();window.workbenchReady?.then(()=>{hideStyles();drawerRender()});
})();
