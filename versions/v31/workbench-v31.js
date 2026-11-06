/* v31:素材栏里新建素材套、新建标签
   - 「素材套」一行:自带的套 + 自己建的套 + 「＋ 新建」。自己建的套 = 以前的收纳夹,一个素材可以放进好几套。
   - 「标签」一行:自己建的标签 + 「＋ 新建」。点标签只看带这个标签的素材,可以和分类、素材套一起用。
   - 把素材拖到套或标签上就加进去;双击自己建的套或标签可以改名、删除。 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 const ML=window.MaterialLibrary;if(!ML?.createCollection)return;
 let activeTag='';

 /* ---------- 名字输入框(新建、改名共用) ---------- */
 function nameDialog({title,value='',placeholder='',okText='保存',onOk,onDelete}){
  $('#mbox').innerHTML=`<h3>${esc(title)}</h3><input class="txt" id="nmInput" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="16"><div class="row" style="justify-content:flex-end;gap:6px;margin-top:10px">${onDelete?'<button class="tag" id="nmDel" style="margin-right:auto">删除</button>':''}<button class="tag" id="nmNo">取消</button><button class="tag red" id="nmOk">${esc(okText)}</button></div>`;
  const input=$('#nmInput'),ok=()=>{const v=input.value.trim();if(!v)return input.focus();closeModal();onOk(v)};
  $('#nmOk').onclick=ok;$('#nmNo').onclick=closeModal;input.onkeydown=e=>{if(e.key==='Enter')ok()};
  if(onDelete)$('#nmDel').onclick=()=>{closeModal();onDelete()};openModal();setTimeout(()=>{input.focus();input.select()},30)}

 // 删除前确认(用工作台自己的弹窗,不用浏览器的 confirm)
 function confirmModal(msg,onYes){$('#mbox').innerHTML=`<h3>确定删除?</h3><p class="mini" style="line-height:1.6">${esc(msg)}</p><div class="row" style="justify-content:flex-end;gap:6px;margin-top:10px"><button class="tag" id="cfNo">取消</button><button class="tag red" id="cfYes">删除</button></div>`;
  $('#cfNo').onclick=closeModal;$('#cfYes').onclick=()=>{closeModal();onYes()};openModal()}

 /* ---------- 素材套 ---------- */
 const mine=()=>ML.collections.filter(c=>!c.kind||c.kind==='manual');
 const vis=()=>Object.values(assets).filter(a=>!a.hidden);
 function newSet(){nameDialog({title:'新建素材套',placeholder:'如:旅行贴纸、蓝色系',okText:'新建',onOk:name=>{const c=ML.createCollection(name);setTab(c.id);toast(`建好了。把素材拖到「${name}」上就能放进去`)}})}
 function editSet(c){nameDialog({title:'素材套设置',value:c.name,onOk:name=>{ML.renameCollection(c.id,name);drawerRender()},onDelete:()=>confirmModal(`删除素材套「${c.name}」?里面的素材不会被删,只是不在这套里了。`,()=>{ML.deleteCollection(c.id);setTab('all')})})}

 /* ---------- 标签 ---------- */
 const tags=()=>ML.myTags();
 function newTag(){nameDialog({title:'新建标签',placeholder:'如:旅行、蓝色、想用的',okText:'新建',onOk:name=>{ML.addMyTag(name);drawerRender();toast(`建好了。把素材拖到「${name}」上就能加上这个标签`)}})}
 function editTag(t){nameDialog({title:'标签设置',value:t,onOk:name=>{if(name===t)return;for(const a of Object.values(assets))if(a.tags?.includes(t))a.tags=[...new Set(a.tags.map(x=>x===t?name:x))];ML.removeMyTag(t);ML.addMyTag(name);if(activeTag===t)activeTag=name;save();drawerRender()},
  onDelete:()=>confirmModal(`删除标签「${t}」?素材上的这个标签也会去掉,素材本身不动。`,()=>{for(const a of Object.values(assets))if(a.tags?.includes(t))a.tags=a.tags.filter(x=>x!==t);ML.removeMyTag(t);if(activeTag===t)activeTag='';save();drawerRender()})})}
 // 点标签:只看带这个标签的素材(和分类、素材套叠加)
 const oldMatches=ML.matches;ML.matches=function(a){return oldMatches.apply(this,arguments)&&(!activeTag||a.tags?.includes(activeTag))};
 const oldSetTab=setTab;setTab=function(v){if(v==='all')activeTag='';return oldSetTab.apply(this,arguments)};

 /* ---------- 画在素材栏上 ---------- */
 const addChip=(label,onClick)=>{const b=el('button','chip chip-add','＋ '+label);b.type='button';b.onclick=onClick;return b};
 const tagRow=el('div','set-chips tag-chips');tagRow.id='tagChips';
 function paint(){const setRow=$('#setChips');if(!setRow)return;const cur=ML.filters?.collection||'';
  setRow.querySelectorAll('.mine,.chip-add').forEach(e=>e.remove());
  for(const c of mine()){const n=vis().filter(a=>a.collectionIds?.includes(c.id)).length,b=el('button','chip mine'+(cur===c.id?' on':''),`${esc(c.name)}<small>${n}</small>`);b.type='button';
   b.dataset.libraryCollection=c.id;b.title='把素材拖到这里放进这套 · 双击改名或删除';b.onclick=()=>setTab(c.id);b.ondblclick=e=>{e.preventDefault();editSet(c)};setRow.append(b)}
  setRow.append(addChip('新建',newSet));
  if(tagRow.previousElementSibling!==setRow)setRow.after(tagRow);
  tagRow.innerHTML='<span class="set-lbl">标签</span>';
  for(const t of tags()){const n=vis().filter(a=>a.tags?.includes(t)).length,b=el('button','chip'+(activeTag===t?' on':''),`${esc(t)}<small>${n}</small>`);b.type='button';b.dataset.libraryTag=t;b.title='点一下只看这个标签 · 把素材拖到这里加上标签 · 双击改名或删除';
   b.onclick=()=>{activeTag=activeTag===t?'':t;drawerRender()};b.ondblclick=e=>{e.preventDefault();editTag(t)};tagRow.append(b)}
  tagRow.append(addChip('新建',newTag))}
 const oldDR=drawerRender;drawerRender=function(){const r=oldDR.apply(this,arguments);paint();return r};
 window.materialLibraryReady?.then(()=>drawerRender());
 paint();
})();
