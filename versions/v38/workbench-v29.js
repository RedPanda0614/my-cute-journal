/* v29:开源素材按「素材套」放,一套一个标签
   open-materials.js 只放目录和小缩略图;每套的大图在 素材库/开源/<套>/data.js,用到才载入(双击打开也能用) */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const OM=window.OPEN_MATERIALS;if(!OM?.sets?.length)return;
 const SET=Object.fromEntries(OM.sets.map(s=>[s.id,s])),CAT=id=>'set-'+id;
 window.OPEN_SET_DATA=window.OPEN_SET_DATA||{};

 /* ---------- 一套一套地载入大图 ---------- */
 const loading={};
 function ensureSet(id){if(loading[id])return loading[id];const s=SET[id];if(!s)return Promise.resolve();
  loading[id]=new Promise(res=>{if(window.OPEN_SET_DATA[id])return res();const sc=document.createElement('script');sc.src=s.file;sc.onload=()=>res();sc.onerror=()=>{toast(`「${s.name}」没载入成功,检查 素材库/开源/ 文件夹还在不在`);res()};document.head.append(sc)})
   .then(()=>{const data=window.OPEN_SET_DATA[id]||{};for(const [aid,src] of Object.entries(data)){const a=assets[aid];if(a&&!a.full){a.src=src;a.full=true}}});
  return loading[id]}
 const lazy=a=>a&&a.openSet&&!a.full;
 async function ensureAssets(ids){const sets=new Set(ids.map(i=>assets[i]).filter(lazy).map(a=>a.openSet));if(!sets.size)return false;await Promise.all([...sets].map(ensureSet));return true}
 window.WorkbenchExtras&&(window.WorkbenchExtras.ensureOpenSet=ensureSet);

 /* ---------- 登记:先用缩略图,尺寸按原图记 ---------- */
 let regDone=null;
 const register=()=>regDone||(regDone=(async()=>{for(const m of OM.items){if(assets[m.id])continue;const s=SET[m.set];
  try{const a=await addAsset(m.thumb,{id:m.id,name:m.name,source:'built-in',cat:CAT(m.set),tags:[s.name,'开源',...(m.tags||[])],style:m.style||null});a.w=m.w;a.h=m.h;a.openSet=m.set;a.full=false}catch(e){}}})());
 // 打开作品前登记,打开后把作品里用到的套载入
 if(typeof applyProject==='function'){const old=applyProject;applyProject=async function(){await register();const r=await old.apply(this,arguments);
  // 存档里记着旧分类的(v27 时放在「贴纸」「手绘」里),改回它自己的素材套
  for(const a of Object.values(assets))if(a.openSet)a.cat=CAT(a.openSet);
  // 以前版本里的简笔画素材已经去掉了:纸上用到的先拿掉,免得显示空白
  let gone=0;for(const p of state.pages){const keep=p.items.filter(i=>!(String(i.asset).startsWith('os-dd-')&&!assets[i.asset]));gone+=p.items.length-keep.length;p.items.splice(0,p.items.length,...keep)}if(gone){toast(`去掉了 ${gone} 个已下架的简笔画素材`);renderItems?.()}
  const used=state.pages.flatMap(p=>p.items.flatMap(i=>[i.asset,i.orig]));if(await ensureAssets(used))renderItems();return r}}
 window.workbenchReady?.then(()=>register().then(()=>{drawerRender();const used=state.pages.flatMap(p=>p.items.flatMap(i=>[i.asset,i.orig]));ensureAssets(used).then(ch=>ch&&renderItems())}));
 // 放到纸上:马上载入这一套的大图
 const oldAdd=addItem;addItem=function(a){const it=oldAdd.apply(this,arguments);if(lazy(a))ensureSet(a.openSet).then(()=>{renderItems();if(typeof renderPanel==='function')renderPanel()});return it};
 // 抠图、贴纸、换色这些要用原图
 const oldTC=toCanvas;toCanvas=async function(a){if(lazy(a))await ensureSet(a.openSet);return oldTC.call(this,a?.id&&assets[a.id]?assets[a.id]:a)};
 // 导出前把用到的都载入
 if(typeof renderPage==='function'){const o=renderPage;renderPage=async function(){await ensureAssets(state.pages.flatMap(p=>p.items.map(i=>i.asset)));return o.apply(this,arguments)}}

 /* ---------- 素材栏:「素材套」一行 ---------- */
 const row=el('div','set-chips');row.id='setChips';
 function paintSets(){const host=$('#catChips');if(!host)return;if(row.previousElementSibling!==host)host.after(row);
  const vis=Object.values(assets).filter(a=>!a.hidden),cur=typeof tab!=='undefined'?tab:'';
  row.innerHTML='<span class="set-lbl">素材套</span>';
  for(const s of OM.sets){const n=vis.filter(a=>a.cat===CAT(s.id)).length;if(!n)continue;const b=el('button','chip'+(cur===CAT(s.id)?' on':''),`${s.name}<small>${n}</small>`);b.type='button';b.title=`${s.credit} · ${s.license}`;
   b.dataset.tab=CAT(s.id);b.onclick=()=>{if(window.MaterialLibrary?.filters?.favorite)$('#materialFavorite')?.click();setTab(CAT(s.id));ensureSet(s.id)};row.append(b)}}
 const oldDR=drawerRender;drawerRender=function(){const r=oldDR.apply(this,arguments);paintSets();return r};
 paintSets();

 /* ---------- 详情卡:来源 ---------- */
 if(typeof showInfo==='function'){const old=showInfo;showInfo=function(a){const r=old.apply(this,arguments);const s=a?.openSet&&SET[a.openSet];const host=$('#info');
  if(s){const sel=$('#iCat');if(sel&&!sel.querySelector(`option[value="${CAT(s.id)}"]`)){const o=document.createElement('option');o.value=CAT(s.id);o.textContent='素材套 · '+s.name;sel.prepend(o)}if(sel&&a.cat===CAT(s.id))sel.value=CAT(s.id)}
  if(s&&host&&!host.querySelector('.os-credit')){const d=el('div','mini os-credit');d.textContent=`素材套「${s.name}」· ${s.credit} · ${s.license}`;host.append(d)}return r}}
})();
