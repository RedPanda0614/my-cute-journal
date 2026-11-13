/* v45 文字 = 一张「文字贴纸」:所有格式都在输入窗口里调好,预览什么样放到纸上就什么样。
   放上纸后,点「编辑文字」或双击文字,弹出同一个窗口继续改。编辑栏里不再放字体/颜色/对齐/字号这些。 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 const MD=['plain','label'],natK=it=>{const a=assets[it.asset];return a?it.w/(a.w/TPX):1};
 openTextEditor=function(style,fontOverride=null,item=null){
  if(item?.locked)return toast('请先解锁文字');
  const title=String(style).startsWith('t_');
  const draft=item?{...item}:makeTextDraft(style,fontOverride);
  if(item){const k=natK(item);if(Math.abs(k-1)>.005)draft.size=+(item.size*k).toFixed(2)}// 纸上缩放过,按实际看到的大小来
  if(title)draft.subFont=subtitleFont(draft);
  const group=title?TITLES:ART;
  $('#mbox').innerHTML=`<form id="textEditorForm" class="tx-form"><h3>${item?'编辑文字':'添加文字'}</h3>
   <div class="tx-row"><label>样式</label><select class="sel" id="txStyle">${group.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><label>字体</label><select class="sel" id="textEditorFont"></select></div>
   ${title?'':`<div class="tx-fmt">
    <div class="tx-f"><span>对齐</span><div class="seg" id="txAlign">${[['left','左'],['center','居中'],['right','右']].map(([k,l])=>`<button type="button" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div class="tx-f" id="txBoldRow"><span>字重</span><div class="seg" id="txBold"><button type="button" data-v="0">常规</button><button type="button" data-v="1">加粗</button></div></div>
    <div class="tx-f tx-wide"><span>颜色</span><div class="tx-sw">${INKS.map(c=>`<span class="swatch" data-c="${c}" style="background:${c}" title="${c}"></span>`).join('')}<input type="color" id="txColor" title="自己选颜色"></div></div>
    <label class="tx-f"><span>字号</span><input type="range" id="txSize" min="2" max="40" step=".5"><b></b></label>
    <label class="tx-f"><span>字间距</span><input type="range" id="txLs" min="-0.1" max="0.8" step="0.01"><b></b></label>
    <label class="tx-f"><span>行间距</span><input type="range" id="txLh" min="0.9" max="2.6" step="0.02"><b></b></label>
    <div class="tx-f"><span>宽度</span><div class="seg" id="txBox"><button type="button" data-v="auto">按内容</button><button type="button" data-v="fixed">固定</button></div><input type="number" class="txt" id="txBoxW" min="8" max="${Math.round(dims().W*1.5)}" step="1"><b>mm</b></div>
    <label class="tx-f"><span>竖排</span><input type="checkbox" id="txVert"></label>
   </div>`}
   <textarea class="txt" id="textEditorMain" required rows="5"></textarea>
   ${title?'<div class="tx-row"><label>小标题</label><input class="txt" id="textEditorSub"><label>字体</label><select class="sel" id="textEditorSubFont"></select></div>':''}
   <div id="textEditorPreview" aria-label="文字预览"></div><div class="mini tx-size" id="txDim"></div>
   <div class="text-editor-actions"><button class="tag" id="textEditorCancel" type="button">取消</button><button class="tag red" id="textEditorApply" type="submit">${item?'保存':'添加到纸上'}</button></div></form>`;
  const form=$('#textEditorForm'),main=$('#textEditorMain'),sub=$('#textEditorSub'),mainFont=$('#textEditorFont'),subFont=$('#textEditorSubFont'),preview=$('#textEditorPreview'),apply=$('#textEditorApply');
  main.value=draft.text;if(sub)sub.value=draft.sub||'';$('#txStyle').value=draft.style;
  populateFontOptions(mainFont,main.value,draft.font);if(subFont)populateFontOptions(subFont,sub.value,draft.subFont);
  let timer,ticket=0;
  const read=()=>{draft.text=main.value;draft.sub=sub?sub.value:'';draft.font=mainFont.value;if(subFont)draft.subFont=subFont.value;return fontError(draft.font,draft.text)||(title&&draft.sub?fontError(draft.subFont,draft.sub):'')};
  const invalid=issue=>{preview.classList.add('font-error');preview.textContent=issue;apply.disabled=true};
  // 格式控件 <-> draft
  function sync(){if(title)return;const md=MD.includes(draft.style);
   $$('#txAlign button').forEach(b=>{b.classList.toggle('on',(draft.align||'left')===b.dataset.v);b.disabled=!!draft.vertical});
   $('#txBoldRow').hidden=!md;$$('#txBold button').forEach(b=>b.classList.toggle('on',(draft.bold?'1':'0')===b.dataset.v));
   $$('.tx-sw .swatch').forEach(s=>s.classList.toggle('on',s.dataset.c===draft.color));if(/^#[0-9a-f]{6}$/i.test(draft.color))$('#txColor').value=draft.color;
   const sz=$('#txSize');sz.value=draft.size;sz.nextElementSibling.textContent=(+draft.size).toFixed(1);
   const ls=$('#txLs');ls.value=+draft.ls||0;ls.nextElementSibling.textContent=Math.round((+draft.ls||0)*100)+'%';
   const lh=$('#txLh');lh.value=+draft.lh||1.32;lh.nextElementSibling.textContent=(+draft.lh||1.32).toFixed(2);
   $$('#txBox button').forEach(b=>{b.classList.toggle('on',(draft.boxW?'fixed':'auto')===b.dataset.v);b.disabled=b.dataset.v==='fixed'&&!!draft.vertical});
   const bw=$('#txBoxW');bw.hidden=bw.nextElementSibling.hidden=!draft.boxW;if(draft.boxW)bw.value=Math.round(draft.boxW);
   $('#txVert').checked=!!draft.vertical;
   form.classList.toggle('no-md',!md||!!draft.vertical)}
  const update=async()=>{const n=++ticket,issue=read();sync();if(!draft.text.trim()){preview.replaceChildren();$('#txDim').textContent='';apply.disabled=true;return}if(issue)return invalid(issue);preview.classList.remove('font-error');apply.disabled=true;
   try{const c=clipC(await renderText(draft),item?.clip);if(n!==ticket||!preview.isConnected)return;const im=new Image();im.alt='文字预览';im.src=c.toDataURL();
    const {W}=dims(),w=c.width/TPX,h=c.height/TPX;im.style.width=Math.min(100,w/W*100)+'%';preview.replaceChildren(im);$('#txDim').textContent=`放到纸上约 ${Math.round(w)}×${Math.round(h)} mm`+(w>W?`(比纸宽,建议用「固定」宽度)`:'');apply.disabled=false}catch(err){if(n===ticket&&preview.isConnected)invalid(err.message)}};
  const later=()=>{ticket++;clearTimeout(timer);sync();timer=setTimeout(update,140)};
  const changed=()=>{ticket++;clearTimeout(timer);const issue=read();populateFontOptions(mainFont,main.value,draft.font);if(subFont)populateFontOptions(subFont,sub.value,draft.subFont);if(issue)return invalid(issue);apply.disabled=true;timer=setTimeout(update,160)};
  main.addEventListener('input',changed);if(sub)sub.oninput=changed;mainFont.onchange=update;if(subFont)subFont.onchange=update;
  $('#txStyle').onchange=e=>{const d=ALLSTYLES.find(a=>a.id===e.target.value);draft.style=d.id;draft.font=d.font;draft.color=d.id.startsWith('t_')?PAL[d.key]:d.color;draft.ink=d.id==='bounce';populateFontOptions(mainFont,main.value,draft.font);update()};
  if(!title){
   $$('#txAlign button').forEach(b=>b.onclick=()=>{draft.align=b.dataset.v;later()});
   $$('#txBold button').forEach(b=>b.onclick=()=>{draft.bold=b.dataset.v==='1';later()});
   $$('.tx-sw .swatch').forEach(s=>s.onclick=()=>{draft.color=s.dataset.c;later()});$('#txColor').oninput=e=>{draft.color=e.target.value;later()};
   const num=(id,key)=>$('#'+id).oninput=e=>{draft[key]=+e.target.value;later()};num('txSize','size');num('txLs','ls');num('txLh','lh');
   $$('#txBox button').forEach(b=>b.onclick=()=>{if(b.dataset.v==='auto')delete draft.boxW;else draft.boxW=draft.boxW||Math.round(dims().W*.72);later()});
   $('#txBoxW').oninput=e=>{draft.boxW=Math.max(8,+e.target.value||8);later()};
   $('#txVert').onchange=e=>{draft.vertical=e.target.checked;if(draft.vertical)delete draft.boxW;later()}}
  $('#textEditorCancel').onclick=()=>{clearTimeout(timer);ticket++;closeModal()};
  main.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();form.requestSubmit()}});
  form.onsubmit=async e=>{e.preventDefault();if(apply.disabled||!main.value.trim())return;clearTimeout(timer);ticket++;const issue=read();if(issue)return invalid(issue);apply.disabled=true;
   try{await validateTextFonts(draft);
    if(item){if(!state.items.includes(item))return closeModal();commit();
     const cx=item.x,cy=item.y;Object.assign(item,{text:draft.text,sub:draft.sub,font:draft.font,subFont:draft.subFont,style:draft.style,color:draft.color,size:draft.size,align:draft.align,bold:!!draft.bold,ls:draft.ls,lh:draft.lh,vertical:!!draft.vertical,ink:draft.ink});
     if(draft.boxW)item.boxW=draft.boxW;else delete item.boxW;
     const c=clipC(await renderText(item),item.clip),a=await addAsset(c.toDataURL('image/png'),{name:item.name,source:'text',hidden:true});
     item.asset=a.id;item.orig=a.id;item.w=a.w/TPX;item.h=a.h/TPX;item.x=cx;item.y=cy;item.name='字:'+item.text.slice(0,8);renderItems();renderPanel()}
    else{const c=await renderText(draft),a=await addAsset(c.toDataURL('image/png'),{name:'字:'+draft.text.slice(0,8),source:'text',hidden:true});
     addItem(a,null,null,{...draft,w:a.w/TPX,h:a.h/TPX,name:'字:'+draft.text.slice(0,8),rot:draft.style==='stamp'?-4:0})}
    closeModal();save()}catch(err){invalid(err.message)}};
  openModal(true);update();requestAnimationFrame(()=>{main.focus();main.select()})};

 // 编辑栏:文字只留「编辑文字」,格式都去窗口里改
 const oldPanel=renderPanel;renderPanel=function(){const r=oldPanel.apply(this,arguments);const it=sel();
  // v46:文字部分就是一个「编辑文字」按钮,放在最上面(和「存为我的元素」同样式),不要折叠区
  const sec=$('#editTextSection');let btn=$('#v46EditText');
  if(it?.type==='text'&&!it.cutLetter){if(sec)sec.hidden=true;
   if(!btn){btn=document.createElement('button');btn.id='v46EditText';btn.className='tool';btn.textContent='编辑文字';btn.onclick=()=>{const t=sel();if(t?.type==='text')openTextEditor(t.style,t.font,t)}}
   const anchor=$('#editTransformSection');if(anchor&&anchor.nextElementSibling!==btn)anchor.after(btn);btn.hidden=false}// v49:和普通素材一样,变换与图层在最上面
  else if(btn)btn.hidden=true;
  const nm=$('#editName');if(nm)nm.hidden=it?.type==='text'
  return r};
})();
