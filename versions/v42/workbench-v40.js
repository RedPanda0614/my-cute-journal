/* v40/v42:素材属性只有两项 —— 标签、素材套,和素材栏一一对应
   标签 = 分类(一个,默认「未分类」)+ 标签栏里的标签(多个);素材套 = 自带那一套 + 自建的套(默认「无」)
   AttrEditor 同时给 详情小窗口 和 上传窗口 用,长得一样 */
(function(){
 const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 const ML=window.MaterialLibrary,OM=window.OPEN_MATERIALS;
 const catLabel=id=>ML?.labels?.()?.[id]||catName(id);
 const setName=id=>ML?.labels?.()?.['set-'+id]||OM?.sets?.find(s=>s.id===id)?.name||id;
 const isCatName=v=>BASECATS.find(([id])=>catLabel(id)===v||catName(id)===v)?.[0];
 const barTags=()=>ML.myTags();
 // 素材上只显示标签栏里有的标签(自带素材的搜索关键词不显示,但还能搜到)
 const shownTags=t=>(t.tags||[]).filter(x=>barTags().includes(x));
 function AttrEditor(box,t,onChange){
  t.tags=t.tags||[];t.collectionIds=t.collectionIds||[];if(!t.cat)t.cat='uncategorized';
  const changed=()=>{onChange?.();paint()};
  function paint(){
   const mine=ML.collections.filter(c=>!String(c.id).startsWith('set-'));
   const inSets=t.collectionIds.map(id=>ML.collections.find(c=>c.id===id)).filter(Boolean);
   const tags=shownTags(t),uncat=!t.cat||t.cat==='uncategorized';
   const tagOpts=[...new Set([...BASECATS.map(([id])=>catLabel(id)),...barTags()])].filter(x=>x&&x!==catLabel(t.cat)&&!t.tags.includes(x));
   const noSet=!t.openSet&&!inSets.length,setOpts=mine.filter(c=>!t.collectionIds.includes(c.id));
   box.innerHTML=`<div class="iattr-h">标签</div><div class="ichips">${uncat?`<span class="ichip none">${esc(catLabel('uncategorized'))}</span>`:`<span class="ichip cat" title="分类">${esc(catLabel(t.cat))}<b data-cat>×</b></span>`}${tags.map(x=>`<span class="ichip">${esc(x)}<b data-t="${esc(x)}">×</b></span>`).join('')}<input class="txt ichip-add" data-tagadd list="iTagList" placeholder="+ 加标签"><datalist id="iTagList">${tagOpts.map(x=>`<option value="${esc(x)}">`).join('')}</datalist></div>
<div class="iattr-h">素材套</div><div class="ichips">${t.openSet?`<span class="ichip set" title="自带素材套">${esc(setName(t.openSet))}</span>`:''}${inSets.map(c=>`<span class="ichip">${esc(c.name)}<b data-c="${esc(c.id)}">×</b></span>`).join('')}<select class="sel ichip-add${noSet?'':' more'}" data-setadd>${noSet?'<option value="">无</option>':'<option value="">+ 再加一个</option>'}${setOpts.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}<option value="__new">新建素材套…</option></select></div>`;
   box.querySelector('[data-cat]')?.addEventListener('click',()=>{t.cat='uncategorized';changed()});
   box.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{t.tags=t.tags.filter(x=>x!==b.dataset.t);changed()});
   box.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{t.collectionIds=t.collectionIds.filter(x=>x!==b.dataset.c);changed()});
   const add=box.querySelector('[data-tagadd]');
   const commitTag=()=>{const vs=add.value.split(/[,，]+/).map(v=>v.trim()).filter(Boolean);if(!vs.length)return;
    for(const v of vs){const cid=isCatName(v);if(cid)t.cat=cid;else{t.tags=[...new Set([...t.tags,v])];if(!barTags().includes(v))ML.addMyTag(v)}}
    changed();setTimeout(()=>box.querySelector('[data-tagadd]')?.focus(),0)};
   add.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();commitTag()}};
   add.onchange=()=>{if(tagOpts.includes(add.value.trim()))commitTag()};
   const sel=box.querySelector('[data-setadd]');sel.onchange=()=>{const v=sel.value;if(!v)return;
    if(v!=='__new'){t.collectionIds=[...new Set([...t.collectionIds,v])];changed();return}
    const inp=document.createElement('input');inp.className='txt ichip-add';inp.placeholder='新素材套名字,回车';sel.replaceWith(inp);inp.focus();
    inp.onblur=()=>{if(!inp.value.trim())paint()};
    inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape')return paint();if(e.key!=='Enter')return;const n=inp.value.trim();if(!n)return;
     const c=ML.createCollection(n);t.collectionIds=[...new Set([...t.collectionIds,c.id])];changed()}}}
  paint();return {paint}}
 window.AttrEditor=AttrEditor;

 // 详情小窗口
 function build(a){const host=$('#info');if(!host||!ML)return;
  [$('#iCat')?.closest('.irow'),$('#materialAssetStyle')?.closest('.irow'),$('#iTags'),$('#materialAssetFolders')].forEach(e=>e?.remove());
  [...host.querySelectorAll('.mini')].filter(e=>e.textContent.trim()==='标签').forEach(e=>e.remove());
  host.querySelector('.iattr')?.remove();
  const box=document.createElement('div');box.className='iattr';
  const anchor=$('#iName')?.closest('.irow');anchor?anchor.after(box):host.append(box);
  AttrEditor(box,a,()=>{hov.dirty=true;save()})}// 小窗口关掉时素材栏自己刷新(计数、筛选)
 const old=showInfo;showInfo=function(a){const r=old.apply(this,arguments);if(a)try{build(typeof a==='string'?assets[a]:a)}catch(e){console.error(e)}return r};
})();
