/* v43 ① 页面栏挪到最右边、竖着,和左边栏一样高;左边缘可拖动调宽度(116–260px),双击恢复
       ② 文字支持 Markdown 格式:# 标题 / - 列表 / 1. 编号 / - [ ] 待办 / > 引用 / --- 分隔线 / **粗体** / ==荧光== / ~~删除线~~ */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 /* ---------- ① 竖着的页面栏 ---------- */
 const PBW_MIN=116,PBW_MAX=260,PBW_DEF=150;let pbw=PBW_DEF;
 function setPBW(w){pbw=Math.max(PBW_MIN,Math.min(PBW_MAX,Math.round(w)));$('#app').style.setProperty('--pbw',pbw+'px');thumbH=Math.round((pbw-40)*1.45);return pbw}
 function build(){const bar=$('#pagebar');if(!bar||bar.dataset.v43)return;bar.dataset.v43=1;
  const head=document.createElement('div');head.className='pb-head';
  const t=document.createElement('b');t.textContent='页面';head.append(t,$('#pgInfo'));
  // v44:页面操作做成右边最靠边的一列方格按钮(和左边栏一样),最下面是收起
  const rail=document.createElement('nav');rail.id='prail';
  const names={add:['＋','新页'],dup:['⧉','复制'],left:['↑','上移'],right:['↓','下移'],del:['✕','删除']};
  ['add','dup','left','right','del'].forEach(k=>{const old=bar.querySelector(`[data-pg="${k}"]`);if(!old)return;const b=document.createElement('button');b.className='ri';b.dataset.pg=k;b.title=old.title||names[k][1]+(k==='del'?'本页':'');b.innerHTML=`<i>${names[k][0]}</i>${names[k][1]}`;b.onclick=()=>pageOp(k);old.remove();rail.append(b)});
  const q=$('#editBoxQuick');if(q){const b=document.createElement('button');b.className='ri';b.id='prBox';b.title='在纸上框选';b.innerHTML='<i>⬚</i>框选';b.onclick=()=>q.click();q.hidden=true;new MutationObserver(()=>b.classList.toggle('on',q.classList.contains('on'))).observe(q,{attributes:true,attributeFilter:['class']});rail.append(b)}
  const grow=document.createElement('div');grow.className='grow';
  const fold=document.createElement('button');fold.className='ri small';fold.id='pFold';fold.title='收起 / 展开页面栏';
  const setFold=on=>{$('#app').classList.toggle('pfolded',on);fold.innerHTML=on?'<i>«</i>展开':'<i>»</i>收起';try{localStorage.setItem('jw-pagebar-fold',on?1:0)}catch(_){}setTimeout(()=>{try{layout()}catch(_){}},20)};
  fold.onclick=()=>setFold(!$('#app').classList.contains('pfolded'));rail.append(grow,fold);
  bar.after(rail);let f0=false;try{f0=localStorage.getItem('jw-pagebar-fold')==='1'}catch(_){}setFold(f0);
  bar.insertBefore(head,$('#pages'));

  const g=$('#pgrip');g.title='左右拖动调宽度,双击恢复';
  g.onpointerdown=e=>{e.preventDefault();g.classList.add('on');document.body.classList.add('resizing');const x0=e.clientX,w0=pbw;
   const mv=ev=>{setPBW(w0+(x0-ev.clientX));requestAnimationFrame(()=>{try{layout()}catch(_){}})};
   const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);g.classList.remove('on');document.body.classList.remove('resizing');try{localStorage.setItem('jw-pagebar-w',pbw)}catch(_){}state.pages.forEach(p=>refreshThumb(p))};
   addEventListener('pointermove',mv);addEventListener('pointerup',up)};
  g.ondblclick=()=>{setPBW(PBW_DEF);try{localStorage.setItem('jw-pagebar-w',pbw)}catch(_){}layout();state.pages.forEach(p=>refreshThumb(p))};
  let w=PBW_DEF;try{w=+localStorage.getItem('jw-pagebar-w')||PBW_DEF}catch(_){}setPBW(w);
  // 当前页滚到看得见
  const op=pagebar;pagebar=function(){const r=op.apply(this,arguments);$('#pages .pg.on')?.scrollIntoView({block:'nearest'});return r};
  requestAnimationFrame(()=>{try{layout()}catch(_){}state.pages.forEach(p=>refreshThumb(p))})}
 build();

 /* ---------- ② Markdown 文字 ---------- */
 const MD_STYLES=['plain','label'];
 const MD_RE=/^(#{1,3} |[-*] |\d+[.、] |> |---\s*$)|\*\*.+?\*\*|==.+?==|~~.+?~~/m;
 // v45:原字/打字机条 一律走这个排版(加粗、对齐、Markdown 都在这里)
 const useMd=t=>t&&t.md!==false&&MD_STYLES.includes(t.style||'plain')&&!t.vertical&&!t.cutLetter;
 window.textUsesMarkdown=useMd;
 function parseBlocks(text){let n=0;return text.split('\n').map(raw=>{let m;
  if(/^\s*(---|\*\*\*|___)\s*$/.test(raw))return {k:'hr'};
  if(m=raw.match(/^(#{1,3})\s+(.*)$/)){n=0;return {k:'h'+m[1].length,s:m[2]}}
  if(m=raw.match(/^\s*[-*]\s+\[( |x|X)\]\s*(.*)$/))return {k:'todo',done:m[1]!==' ',s:m[2]};
  if(m=raw.match(/^\s*[-*•]\s+(.*)$/))return {k:'li',s:m[1]};
  if(m=raw.match(/^\s*(\d+)[.、]\s+(.*)$/))return {k:'ol',num:m[1],s:m[2]};
  if(m=raw.match(/^>\s?(.*)$/))return {k:'quote',s:m[1]};
  return {k:raw.trim()?'p':'blank',s:raw}})}
 function parseInline(s){const out=[];const re=/(\*\*(.+?)\*\*|==(.+?)==|~~(.+?)~~)/g;let i=0,m;
  while(m=re.exec(s)){if(m.index>i)out.push({t:s.slice(i,m.index)});out.push({t:m[2]??m[3]??m[4],b:!!m[2],hl:!!m[3],st:!!m[4]});i=re.lastIndex}
  if(i<s.length)out.push({t:s.slice(i)});return out}
 const SC={h1:1.55,h2:1.3,h3:1.12};
 async function renderMd(t){await validateTextFonts(t);
  const px=t.size*TPX,FF=`"${t.font}","LXGW WenKai Screen",serif`,LS=(+t.ls||0)*px,LH=+t.lh||1.32,AL=t.align||'left';
  const pad=px*(t.style==='label'?.5:.3),m=cv(10,10).getContext('2d');
  const fontOf=(s,b)=>`${b||t.bold?'bold ':''}${s}px ${FF}`;
  const wrapPx=t.boxW?Math.max(px*2,t.boxW*TPX-2*pad):0;
  const blocks=parseBlocks(t.text||' '),rows=[];let y=0,bw=0;
  blocks.forEach((bk,bi)=>{const s=px*(SC[bk.k]||1),head=!!SC[bk.k],ind=['li','ol','todo'].includes(bk.k)?px*1.25:bk.k==='quote'?px*.85:0;
   if(head&&bi>0)y+=px*.35;
   if(bk.k==='hr'){rows.push({hr:true,y:y+px*.55});y+=px*1.1;return}
   if(bk.k==='blank'){y+=px*LH*.7;return}
   // 排字:逐字(英文按词)放,超出宽度换行
   const units=[];for(const r of parseInline(bk.s))for(const u of (r.t.match(/[A-Za-z0-9'’\-]+|\s|./gu)||[]))units.push({u,...r,b:r.b||head});
   const max=wrapPx?wrapPx-ind:Infinity;let line=[],x=0;const lines=[];
   for(const it of units){m.font=fontOf(s,it.b);const w=m.measureText(it.u).width;
    if(x+w>max&&line.length&&!NO_START.includes(it.u[0])){lines.push({line,w:x-LS});line=[];x=0;if(/^\s$/.test(it.u))continue}
    line.push({...it,x,w});x+=w+LS}
   lines.push({line,w:Math.max(0,x-LS)});
   lines.forEach((ln,li)=>{rows.push({bk,li,s,ind,head,y,line:ln.line,w:ln.w});bw=Math.max(bw,ind+ln.w);y+=s*LH});
   if(head)y+=px*.12});
  if(wrapPx)bw=Math.max(bw,wrapPx);bw=Math.max(bw,px);
  const bh=Math.max(px,y-px*LH+px*1.32);
  const c=cv(bw+pad*2,bh+pad*2+px*.15),x=c.getContext('2d');x.textBaseline='top';x.translate(pad,pad);
  if(t.style==='label'){const R=rng(t.seed);x.save();x.fillStyle='#fbf6ea';x.shadowColor='rgba(70,45,20,.22)';x.shadowBlur=px*.12;x.shadowOffsetY=px*.04;x.translate(-pad*.7,-pad*.45);x.fill(tornPath(R,bw+pad*1.4,bh+pad*.9,0,px*.025,px*.18));x.restore()}
  const col=t.color||'#3b3226';
  for(const r of rows){
   if(r.hr){x.save();x.strokeStyle=col;x.globalAlpha=.45;x.lineWidth=Math.max(1,px*.06);x.setLineDash([px*.28,px*.2]);x.beginPath();x.moveTo(0,r.y);x.lineTo(bw,r.y);x.stroke();x.restore();continue}
   const {bk,s}=r,f=(!['li','ol','todo','quote'].includes(bk.k)&&AL!=='left')?(AL==='center'?.5:1):0,ox=r.ind+(bw-r.ind-r.w)*f;
   x.save();
   if(bk.k==='quote'){x.save();x.fillStyle=col;x.globalAlpha=.35;x.fillRect(px*.08,r.y-px*.12,Math.max(2,px*.12),s*LH);x.restore();x.globalAlpha=.78}
   if(r.li===0){x.fillStyle=col;x.font=fontOf(s);
    if(bk.k==='li'){x.beginPath();x.arc(px*.45,r.y+s*.55,px*.12,0,7);x.fill()}
    if(bk.k==='ol'){const lab=bk.num+'.';x.fillText(lab,px*1.05-x.measureText(lab).width,r.y)}
    if(bk.k==='todo'){const z=px*.72,bx=px*.12,by=r.y+s*.18;x.strokeStyle=col;x.lineWidth=Math.max(1,px*.06);x.strokeRect(bx,by,z,z);
     if(bk.done){x.lineWidth=Math.max(1.2,px*.09);x.beginPath();x.moveTo(bx+z*.18,by+z*.52);x.lineTo(bx+z*.42,by+z*.78);x.lineTo(bx+z*.86,by+z*.2);x.stroke()}}}
   const done=bk.k==='todo'&&bk.done;if(done)x.globalAlpha=.5;
   for(const g of r.line){const gx=ox+g.x;
    if(g.hl){x.save();x.globalAlpha=.55;x.fillStyle='#f0c850';x.fillRect(gx-px*.03,r.y+s*.3,g.w+LS+px*.06,s*.78);x.restore()}
    x.fillStyle=col;x.font=fontOf(s,g.b);x.fillText(g.u,gx,r.y);
    if(g.st||done){x.save();x.strokeStyle=col;x.lineWidth=Math.max(1,s*.06);x.beginPath();x.moveTo(gx,r.y+s*.58);x.lineTo(gx+g.w+LS,r.y+s*.58);x.stroke();x.restore()}}
   if(r.head&&bk.k==='h1'&&r.li===0){}
   x.restore()}
  if(t.ink){x.setTransform(1,0,0,1,0,0);inkify(x,c.width,c.height,1,t.seed)}
  return c}
 const oldRT=renderText;renderText=async function(t){if(useMd(t))return renderMd(t);return oldRT.apply(this,arguments)};

 /* 文字编辑窗口:原字 / 打字机条 加一排格式按钮 */
 const BTNS=[['h1','大标题','# '],['h2','小标题','## '],['li','• 列表','- '],['ol','1. 编号','1. '],['todo','☐ 待办','- [ ] '],['quote','❝ 引用','> '],['b','粗体','**'],['hl','荧光','=='],['st','删除线','~~'],['hr','分隔线','---']];
 const LINE_RE=/^(#{1,3} |- \[[ xX]\] |[-*•] |\d+[.、] |> )/;
 function apply(ta,k,mk){const v=ta.value,a=ta.selectionStart,b=ta.selectionEnd;
  if(['b','hl','st'].includes(k)){const sel=v.slice(a,b)||'文字',wrapped=v.slice(a-mk.length,a)===mk&&v.slice(b,b+mk.length)===mk;
   if(wrapped){ta.value=v.slice(0,a-mk.length)+v.slice(a,b)+v.slice(b+mk.length);ta.setSelectionRange(a-mk.length,b-mk.length)}
   else{ta.value=v.slice(0,a)+mk+sel+mk+v.slice(b);ta.setSelectionRange(a+mk.length,a+mk.length+sel.length)}}
  else if(k==='hr'){const ins=(a&&v[a-1]!=='\n'?'\n':'')+'---\n';ta.value=v.slice(0,a)+ins+v.slice(b);ta.setSelectionRange(a+ins.length,a+ins.length)}
  else{const s=v.lastIndexOf('\n',a-1)+1,eRaw=v.indexOf('\n',b),e=eRaw<0?v.length:eRaw,lines=v.slice(s,e).split('\n');
   const all=lines.every(l=>l.startsWith(mk)||(k==='ol'&&/^\d+[.、] /.test(l)));
   const out=lines.map((l,i)=>{const bare=l.replace(LINE_RE,'');return all?bare:(k==='ol'?`${i+1}. `:mk)+bare}).join('\n');
   ta.value=v.slice(0,s)+out+v.slice(e);ta.setSelectionRange(s,s+out.length)}
  ta.focus();ta.dispatchEvent(new Event('input'))}
 const oldOpen=openTextEditor;openTextEditor=function(style,fontOverride,item){const r=oldOpen.apply(this,arguments);
  if(String(item?.style||style).startsWith('t_'))return r;
  const ta=$('#textEditorMain');if(!ta)return r;
  const bar=document.createElement('div');bar.className='md-bar';
  bar.innerHTML=BTNS.map(([k,l])=>`<button type="button" class="cb md-${k}" data-k="${k}">${l}</button>`).join('');
  bar.querySelectorAll('button').forEach(b=>{b.onmousedown=e=>e.preventDefault();b.onclick=()=>apply(ta,b.dataset.k,BTNS.find(x=>x[0]===b.dataset.k)[2])});
  const tip=document.createElement('div');tip.className='mini md-tip';tip.textContent='也可以直接打 Markdown:# 标题、- 列表、1. 编号、- [ ] 待办、> 引用、**粗体**、==荧光==、~~删除线~~、---。⌘B 粗体,⌘U 荧光';
  ta.before(bar);ta.after(tip);ta.rows=7;if(!MD_STYLES.includes(item?.style||style)||item?.vertical)ta.closest('form')?.classList.add('no-md');
  ta.addEventListener('keydown',e=>{if(!(e.metaKey||e.ctrlKey))return;const k={b:'b',u:'hl'}[e.key.toLowerCase()];if(!k)return;e.preventDefault();apply(ta,k,BTNS.find(x=>x[0]===k)[2])});
  // 列表里回车自动续上
  ta.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.shiftKey||e.metaKey||e.ctrlKey||e.isComposing)return;const v=ta.value,a=ta.selectionStart,s=v.lastIndexOf('\n',a-1)+1,line=v.slice(s,a);
   const m=line.match(/^(- \[[ xX]\] |[-*•] |(\d+)([.、]) |> )(.*)$/);if(!m)return;e.preventDefault();
   if(!m[4].trim()){ta.value=v.slice(0,s)+v.slice(a);ta.setSelectionRange(s,s)}
   else{const next=m[2]?`${+m[2]+1}${m[3]} `:m[1].startsWith('- [')?'- [ ] ':m[1];const ins='\n'+next;ta.value=v.slice(0,a)+ins+v.slice(ta.selectionEnd);ta.setSelectionRange(a+ins.length,a+ins.length)}
   ta.dispatchEvent(new Event('input'))});
  return r};
})();
