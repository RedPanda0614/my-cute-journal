/* v42:新素材的默认属性 + 上传窗口
   - 粘贴:默认标签「未分类」,默认素材套「无」
   - 上传整张图:先选「保持一张图 / 分开」,再选标签和素材套(可不选,默认同上),属性区和详情小窗口一模一样 */
(function(){
 const $=s=>document.querySelector(s),ML=window.MaterialLibrary;
 // 旧数据:以前粘贴的带「粘贴」标签、分类是 upload,改成默认值
 function migrate(){let n=0;for(const a of Object.values(assets)){if(a.tags?.includes('粘贴')){a.tags=a.tags.filter(t=>t!=='粘贴');n++}if(a.cat==='upload'){a.cat='uncategorized';n++}}return n}
 if(migrate())save();
 const oldApply=applyProject;applyProject=async function(){const r=await oldApply.apply(this,arguments);if(migrate())save();return r};

 // 上传:每个文件都不自动建「素材纸」素材套;标签/素材套用窗口里选的
 const blank=()=>({cat:'uncategorized',tags:[],collectionIds:[]});
 const oldOpt=ML.uploadAssetOptions;
 ML.uploadAssetOptions=function(it,U){it.importState??={id:'import-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind:'file',category:'uncategorized',folderName:'',folderEdited:true,collectionId:null};
  const o=oldOpt.call(this,it,U),d=U?.draft||blank();
  return {...o,cat:d.cat||'uncategorized',tags:[...d.tags],collectionIds:[...new Set([...(o.collectionIds||[]),...d.collectionIds])]}};
 const MODES={whole:['保持一张图','整张图存成一个素材'],split:['分开','一张图上有好几个东西,分别存成小素材']};
 const oldShow=showUpload;showUpload=function(){const U=UQ;if(!U)return oldShow.apply(this,arguments);
  if(!MODES[U.mode])U.mode='whole';U.draft??=blank();
  const it=U.list[U.i];it.importState??={id:'import-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind:'file',category:'uncategorized',folderName:'',folderEdited:true,collectionId:null};
  const r=oldShow.apply(this,arguments);
  $('#mbox .upload-origin')?.remove();
  $$('#mbox .seg button').forEach(b=>{const m=MODES[b.dataset.m];if(!m)b.remove();else b.textContent=m[0]});
  const hint=$('#upHint');if(hint)hint.textContent=MODES[U.mode][1]+(U.mode==='split'?'。点框可以取消或选回,在空白处拖一下能自己补一个框':'');
  // 名字一行,下面是 标签 / 素材套
  const name=$('#shName'),row=name?.closest('.row');
  if(row){const tg=$('#shTags'),ct=$('#shCat');tg.value='';ct.value='uncategorized';
   row.textContent='';row.classList.add('up-name');const l=document.createElement('span');l.className='iattr-h';l.textContent='名字';
   row.append(l,name,tg,ct);tg.hidden=ct.hidden=true;name.style.width='';
   const box=document.createElement('div');box.className='iattr up-attr';row.after(box);
   window.AttrEditor(box,U.draft,()=>{})}
  return r};
 // 默认这次上传完跳到新素材所在的地方
 const oldFinish=ML.finishUpload;ML.finishUpload=function(U){const d=U?.draft;const r=oldFinish.apply(this,arguments);
  if(d&&d.collectionIds.length===1){try{setTab(d.collectionIds[0])}catch(e){}}return r};
})();
/* 搜索区:搜索 · 多选 · 上传 顺序 */
(function(){const r=document.querySelector('#dfind .row'),b=document.getElementById('bBatch'),u=document.getElementById('materialUpload');if(r&&b&&u){r.append(b,u)}})();
