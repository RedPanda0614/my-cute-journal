/* v40:素材详情卡只剩「标签」「素材套」两项,和素材栏一致(去掉 分类、风格)
   标签 = 这个素材属于的分类(一个)+ 加的标签(多个);素材套 = 自带的那一套 + 自己放进去的套(多个) */
(function(){
 const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 const ML=window.MaterialLibrary,OM=window.OPEN_MATERIALS;
 const catLabel=id=>ML?.labels?.()?.[id]||catName(id);
 const setName=id=>ML?.labels?.()?.['set-'+id]||OM?.sets?.find(s=>s.id===id)?.name||id;
 const isCatName=v=>BASECATS.find(([id])=>catLabel(id)===v||catName(id)===v)?.[0];
 function build(a){const host=$('#info');if(!host||!ML)return;
  a.tags=a.tags||[];a.collectionIds=a.collectionIds||[];
  [$('#iCat')?.closest('.irow'),$('#materialAssetStyle')?.closest('.irow'),$('#iTags'),$('#materialAssetFolders')].forEach(e=>e?.remove());
  [...host.querySelectorAll('.mini')].filter(e=>e.textContent.trim()==='标签').forEach(e=>e.remove());
  host.querySelector('.iattr')?.remove();
  const box=document.createElement('div');box.className='iattr';
  const anchor=$('#iName')?.closest('.irow');anchor?anchor.after(box):host.append(box);
  const changed=()=>{hov.dirty=true;save();paint()};// 卡片关掉时素材栏自己刷新(计数、筛选)
  function paint(){
   const mine=ML.collections.filter(c=>!String(c.id).startsWith('set-'));
   const inSets=a.collectionIds.map(id=>ML.collections.find(c=>c.id===id)).filter(Boolean);
   const cl=a.cat&&a.cat!=='uncategorized'?catLabel(a.cat):'';
   const tagOpts=[...new Set([...BASECATS.map(([id])=>catLabel(id)),...ML.myTags()])].filter(t=>t&&t!==cl&&!a.tags.includes(t));
   box.innerHTML=`<div class="iattr-h">标签</div><div class="ichips">${cl?`<span class="ichip cat" title="分类">${esc(cl)}<b data-cat>×</b></span>`:''}${a.tags.map(t=>`<span class="ichip">${esc(t)}<b data-t="${esc(t)}">×</b></span>`).join('')}<input class="txt ichip-add" id="iTagAdd" list="iTagList" placeholder="+ 加标签"><datalist id="iTagList">${tagOpts.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></div>
<div class="iattr-h">素材套</div><div class="ichips">${a.openSet?`<span class="ichip set" title="自带素材套">${esc(setName(a.openSet))}</span>`:''}${inSets.map(c=>`<span class="ichip">${esc(c.name)}<b data-c="${esc(c.id)}">×</b></span>`).join('')}<select class="sel ichip-add" id="iSetAdd"><option value="">+ 加入素材套</option>${mine.filter(c=>!a.collectionIds.includes(c.id)).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}<option value="__new">新建素材套…</option></select></div>`;
   box.querySelector('[data-cat]')?.addEventListener('click',()=>{a.cat='uncategorized';changed()});
   box.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{a.tags=a.tags.filter(t=>t!==b.dataset.t);changed()});
   box.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{a.collectionIds=a.collectionIds.filter(x=>x!==b.dataset.c);changed()});
   const add=$('#iTagAdd');
   const commitTag=()=>{const vs=add.value.split(/[,，]+/).map(v=>v.trim()).filter(Boolean);if(!vs.length)return;
    for(const v of vs){const cid=isCatName(v);if(cid)a.cat=cid;else{a.tags=[...new Set([...a.tags,v])];if(!ML.myTags().includes(v))ML.addMyTag(v)}}
    changed();setTimeout(()=>$('#iTagAdd')?.focus(),0)};
   add.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();commitTag()}};
   add.onchange=()=>{if(tagOpts.includes(add.value.trim()))commitTag()};
   const sel=$('#iSetAdd');sel.onchange=()=>{const v=sel.value;if(!v)return;
    if(v!=='__new'){a.collectionIds=[...new Set([...a.collectionIds,v])];changed();return}
    const inp=document.createElement('input');inp.className='txt ichip-add';inp.placeholder='新素材套名字,回车';sel.replaceWith(inp);inp.focus();
    inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape')return paint();if(e.key!=='Enter')return;const n=inp.value.trim();if(!n)return;
     const c=ML.createCollection(n);a.collectionIds=[...new Set([...a.collectionIds,c.id])];changed()}}}
  paint()}
 const old=showInfo;showInfo=function(a){const r=old.apply(this,arguments);if(a)try{build(typeof a==='string'?assets[a]:a)}catch(e){console.error(e)}return r};
})();
