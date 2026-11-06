/* v27:字效 / 手帐标题的预览直接显示「选的字体 + 自己的字」;换字体时按当前样式预览;开源素材载入 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
 const fontLabel=f=>Object.entries(FONTS).find(([,v])=>v===f)?.[0]||f;

 /* ---------- 1. 样式预览条:预览文字 + 字体 ---------- */
 // 每个样式卡片都按「同一个字体 + 同一句话」重新画,一眼看出这个字体放进样式里是什么样
 function previewBar(bodyId,gridId,defText){
  const body=$(`[data-text-body="${bodyId}"]`),grid=$('#'+gridId);if(!body||!grid)return;
  const bar=el('div','style-preview-bar');
  bar.innerHTML=`<input class="txt" type="text" maxlength="12" placeholder="预览文字" value="${defText}"><select class="sel"><option value="">各自的默认字体</option>${Object.entries(FONTS).map(([n,f])=>`<option value="${f}">${n}</option>`).join('')}</select>`;
  body.prepend(bar);const input=bar.querySelector('input'),select=bar.querySelector('select');
  let ticket=0;
  async function paint(){const n=++ticket,text=input.value.trim()||defText,font=select.value||null;
   const cards=[...grid.querySelectorAll('.text-preview[data-style]')];
   for(const b of cards){const style=ALLSTYLES.find(s=>s.id===b.dataset.style);if(!style)continue;
    let cap=b.querySelector('.font-of');if(!cap){cap=el('span','font-of');b.append(cap)}
    const useFont=font||style.font;cap.textContent=fontLabel(useFont);
    const sample=b.querySelector('.sample');b.classList.add('repainting');
    try{if(typeof fontSupports==='function'&&!fontSupports(useFont,text)){sample.textContent='这个字体没有这些字';b.classList.remove('repainting');continue}
     const title=style.id.startsWith('t_'),t={...makeTextDraft(style.id,useFont,{text}),size:title?4:6,seed:120};
     const c=await renderText(t);if(n!==ticket)return;
     const k=Math.min(1,300/c.width,140/c.height),small=document.createElement('canvas');small.width=Math.max(1,c.width*k);small.height=Math.max(1,c.height*k);small.getContext('2d').drawImage(c,0,0,small.width,small.height);
     const im=new Image();im.alt=text;im.src=small.toDataURL();sample.replaceChildren(im)}catch(e){if(n===ticket)sample.textContent='字体不可用'}
    b.classList.remove('repainting')}}
  let t;input.oninput=()=>{clearTimeout(t);t=setTimeout(paint,350)};select.onchange=paint;
  // 点卡片:用当前预览的字体和文字打开编辑窗
  grid.addEventListener('click',e=>{const b=e.target.closest('.text-preview[data-style]');if(!b)return;e.stopImmediatePropagation();
   openTextEditor(b.dataset.style,select.value||null);const m=$('#textEditorMain');const text=input.value.trim();
   if(m&&text&&text!==defText){m.value=text;m.dispatchEvent(new Event('input',{bubbles:true}))}},true);
  // 第一次打开这个标签时补上字体名
  setTimeout(paint,1200)}
 previewBar('titles','titleStyles','星期一');
 previewBar('basic','artStyles','星期一');

 /* ---------- 2. 改字体时,按这段文字自己的样式预览 ---------- */
 if(typeof openFontPicker==='function'){const old=openFontPicker;openFontPicker=function(it){const r=old.apply(this,arguments);
  if(!it||!it.style||it.style==='plain')return r;
  const box=$('#fontPicker'),cur=$('#fontCurrentPreview');if(!box)return r;
  box.classList.add('styled');let ticket=0;
  const draw=async(font,target,size)=>{const c=await renderText({...it,font,size,boxW:it.boxW?it.boxW*size/(it.size||size):undefined,clip:null});const k=Math.min(1,320/c.width,150/c.height),s=document.createElement('canvas');s.width=Math.max(1,c.width*k);s.height=Math.max(1,c.height*k);s.getContext('2d').drawImage(c,0,0,s.width,s.height);const im=new Image();im.src=s.toDataURL();target.replaceChildren(im)};
  const showCur=async font=>{const n=++ticket;try{const tmp=el('div');await draw(font,tmp,6);if(n===ticket&&cur?.isConnected)cur.replaceChildren(...tmp.childNodes)}catch(e){}};
  // 卡片里的小样换成「这个样式 + 这个字体」,一张张慢慢画,不卡界面
  const cards=[...box.querySelectorAll('.text-preview[data-font]')];
  (async()=>{for(const card of cards){if(!card.isConnected)return;const font=card.dataset.font;
   try{await ensureFont(font,it.text+(it.sub||''));if(typeof fontSupports==='function'&&!fontSupports(font,it.text))continue;const sample=card.querySelector('.sample');await draw(font,sample,3.4)}catch(e){}}})();
  cards.forEach(card=>{card.onmouseenter=card.onfocus=()=>showCur(card.dataset.font)});showCur(it.font);
  return r}}

 /* ---------- 3. 开源素材 ---------- */
 // open-materials.js 把图片打包成 window.OPEN_MATERIALS(双击打开也能用);按「自带素材」载入,不占作品存档
 const OM=window.OPEN_MATERIALS;
 // 在打开作品之前载入(作品里可能用到这些素材);已载入的跳过
 let omDone=null;
 const loadOpen=()=>omDone||(omDone=(async()=>{if(!OM?.items?.length)return;for(const m of OM.items){if(assets[m.id])continue;try{await addAsset(m.data,{id:m.id,name:m.name,source:'built-in',cat:m.cat,tags:[...m.tags,'开源'],style:m.style||null})}catch(e){}}})());
 if(typeof applyProject==='function'){const oldA=applyProject;applyProject=async function(){await loadOpen();return oldA.apply(this,arguments)}}
 window.workbenchReady?.then(()=>loadOpen().then(()=>{if(typeof drawerRender==='function')drawerRender()}));
 // 详情卡里写上来源和许可
 if(typeof showInfo==='function'){const oldInfo=showInfo;showInfo=function(a){const r=oldInfo.apply(this,arguments);if(a&&a.id?.startsWith('os-')){const m=OM?.items.find(i=>i.id===a.id);const host=$('#info');if(host&&m){const row=el('div','mini os-credit');row.textContent=`来源:${m.credit} · ${m.license}`;host.append(row)}}return r}}
})();
