/* v54 左边栏减负
   ① 入口 7→4:素材 / 文字 / 涂鸦 / 编辑。作品走顶栏「作品 ▾」;生图挪进素材的「添加 ▾」;图层并进编辑最下面
   ② 编辑:层级/锁定/隐藏变一排小图标,移页进「⋯」;裁切、抠图各一个下拉;没选中时不显示对齐;折叠区一次只开一个
   ③ 文字:三个页签 字体 / 标题 / 卡片;字体筛选收成两个下拉;字体卡片三列 */
(function(){
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const tidy=$('.pn[data-pane="tidy"]');
 /* ---------- ① 入口 ---------- */
 ['works','ai','styles'].forEach(p=>$(`#rail .ri[data-pane="${p}"]`)?.classList.add('v54-gone'));
 // v55:图层还是单独一个入口(用户觉得并进编辑不方便)
 const layersBox=null;
 const oldSet=setPane;setPane=function(p){const r=oldSet.apply(this,arguments);if(p==='works'||p==='ai')$$('#rail .ri').forEach(b=>b.classList.remove('on'));return r};
 // 素材面板:「上传」换成「添加 ▾」= 上传图片 / AI 生成素材
 const up=$('#materialUpload');
 if(up){const wrap=document.createElement('span');wrap.className='v54-add';up.replaceWith(wrap);up.textContent='添加 ▾';up.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden};wrap.append(up);
  const menu=document.createElement('div');menu.className='v54-menu';menu.hidden=true;
  menu.innerHTML='<button type="button" data-k="up">上传图片</button><button type="button" data-k="ai">AI 生成素材</button><div class="mini">别处复制的图片,在纸上 ⌘V 直接粘贴</div>';
  menu.querySelector('[data-k=up]').onclick=()=>{menu.hidden=true;$('#fUp').click()};
  menu.querySelector('[data-k=ai]').onclick=()=>{menu.hidden=true;setPane('ai')};
  wrap.append(menu);document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))menu.hidden=true})}
 // 生图、作品页顶上加「← 返回」
 for(const [p,to,label] of [['ai','assets','← 回到素材'],['works','assets','← 回到素材']]){const pn=$(`.pn[data-pane="${p}"]`);if(!pn||pn.querySelector('.v54-back'))continue;
  const b=document.createElement('button');b.type='button';b.className='v54-back';b.textContent=label;b.onclick=()=>setPane(to);pn.prepend(b)}

 /* ---------- ② 编辑面板 ---------- */
 const SVG={
  up:'<svg viewBox="0 0 16 16"><path d="M8 3v10M4 7l4-4 4 4"/></svg>',
  down:'<svg viewBox="0 0 16 16"><path d="M8 13V3M4 9l4 4 4-4"/></svg>',
  top:'<svg viewBox="0 0 16 16"><path d="M3 2.5h10M8 5v9M4.5 8.5 8 5l3.5 3.5"/></svg>',
  bottom:'<svg viewBox="0 0 16 16"><path d="M3 13.5h10M8 11V2M4.5 7.5 8 11l3.5-3.5"/></svg>',
  lock:'<svg viewBox="0 0 16 16"><rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>',
  hide:'<svg viewBox="0 0 16 16"><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>',
  more:'<svg viewBox="0 0 16 16"><circle cx="3.5" cy="8" r="1.1"/><circle cx="8" cy="8" r="1.1"/><circle cx="12.5" cy="8" r="1.1"/></svg>'};
 const TIPS={up:'上移一层',down:'下移一层',top:'置顶',bottom:'置底',lock:'锁定',hide:'隐藏'};
 function slimTransform(){const menu=$('#editTransform .more .menu');if(!menu||menu.querySelector('.v54-icons'))return;
  const btn=a=>menu.querySelector(`[data-a="${a}"]`);
  const row=document.createElement('div');row.className='v54-icons';
  for(const a of ['up','down','top','bottom','lock','hide']){const o=btn(a);if(!o)continue;o.classList.add('v54-gone');const b=document.createElement('button');b.type='button';b.className='v54-ic';b.title=o.textContent.trim()||TIPS[a];b.innerHTML=SVG[a];if(o.classList.contains('on'))b.classList.add('on');b.onclick=()=>o.click();row.append(b)}
  const pages=['prevpg','nextpg'].map(btn).filter(Boolean);
  if(pages.length){pages.forEach(o=>o.classList.add('v54-gone'));const m=document.createElement('span');m.className='v54-more';const b=document.createElement('button');b.type='button';b.className='v54-ic';b.title='更多';b.innerHTML=SVG.more;
   const pop=document.createElement('div');pop.className='v54-menu';pop.hidden=true;pages.forEach(o=>{const x=document.createElement('button');x.type='button';x.textContent=o.textContent;x.onclick=()=>{pop.hidden=true;o.click()};pop.append(x)});
   b.onclick=e=>{e.stopPropagation();pop.hidden=!pop.hidden};m.append(b,pop);row.append(m)}
  menu.prepend(row);
  // 裁切:一个下拉
  const crops=[...menu.querySelectorAll('button.v47')];menu.querySelector('.v47-h')?.classList.add('v54-gone');
  if(crops.length){crops.forEach(o=>o.classList.add('v54-gone'));const r=document.createElement('label');r.className='v54-row';r.innerHTML='<span>裁切</span>';
   const s=document.createElement('select');s.className='sel';s.innerHTML='<option value="">选一种形状…</option>'+crops.map((o,i)=>`<option value="${i}">${o.textContent.trim()}</option>`).join('');
   s.onchange=()=>{const o=crops[+s.value];s.value='';o?.click()};r.append(s);menu.append(r)}}
 function slimMatte(){const body=$('#editMatteBody');if(!body||body.querySelector('.v54-row'))return;
  const opts=[['wbPerson','提取主体'],['key','自动去背景'],['bWand','点选去色']].map(([id,l])=>[id==='key'?body.querySelector('[data-op="key"]'):$('#'+id),l]).filter(x=>x[0]);
  if(!opts.length)return;opts.forEach(([o])=>o.classList.add('v54-gone'));
  const r=document.createElement('label');r.className='v54-row';r.innerHTML='<span>方式</span>';const s=document.createElement('select');s.className='sel';
  s.innerHTML='<option value="">选一种抠图方式…</option>'+opts.map(([,l],i)=>`<option value="${i}">${l}</option>`).join('');
  s.onchange=()=>{const i=+s.value;s.value='';if(Number.isNaN(i))return;body.dataset.v54Tol=opts[i][1]==='提取主体'?'':'1';opts[i][0].click();syncTol()};r.append(s);body.prepend(r);syncTol()}
 function syncTol(){const body=$('#editMatteBody');if(!body)return;const tol=$('#tol')?.closest('.edit-slider');if(!tol)return;
  const on=body.dataset.v54Tol==='1'||$('#bWand')?.classList.contains('on');if(on)tol.style.removeProperty('display');else tol.style.setProperty('display','none','important')}
 function alignVis(){const bar=$('#alignBar');if(!bar)return;const any=!!selId||!!$('#layers .layer.picked');bar.classList.toggle('v54-gone',!any)}
 // 折叠区一次只开一个(图层不算)
 tidy?.addEventListener('toggle',e=>{const d=e.target;if(!(d instanceof HTMLDetailsElement)||!d.open||d.classList.contains('v54-layers')||!d.classList.contains('edit-section'))return;
  tidy.querySelectorAll(':scope>details.edit-section[open]').forEach(x=>{if(x!==d&&!x.classList.contains('v54-layers'))x.open=false})},true);
 $('.edit-selection')?.classList.add('v54-gone');
 let lastSel=null;const oldPanel=renderPanel;renderPanel=function(){const r=oldPanel.apply(this,arguments);try{slimTransform();slimMatte();alignVis();$('.edit-selection')?.classList.add('v54-gone');
  if(layersBox&&tidy.lastElementChild!==layersBox)tidy.append(layersBox);
  // 没有展开的就默认打开「变换与图层」
  // 文字默认打开「文字」区,其他默认打开「变换与图层」;换选中的东西时重新按这个来
  const it=sel(),want=it?.type==='text'?$('#editTextSection'):$('#editTransformSection');
  if(it&&it.id!==lastSel){lastSel=it.id;if(want&&!want.hidden){want.open=true;tidy.querySelectorAll(':scope>details.edit-section[open]').forEach(x=>{if(x!==want&&!x.classList.contains('v54-layers'))x.open=false})}}
  }catch(e){console.error(e)}return r};
 $('#bWand')&&new MutationObserver(syncTol).observe($('#bWand'),{attributes:true,attributeFilter:['class']});

 /* ---------- ③ 文字面板 ---------- */
 const tp=$('.pn[data-pane="text"]'),tabs=$('.text-library-tabs');
 if(tp&&tabs){const card=tp.querySelector('.card-pane'),body=k=>tp.querySelector(`[data-text-body="${k}"]`);
  const heads={};const head=(k,t)=>{const h=document.createElement('div');h.className='v54-h';h.textContent=t;body(k)?.before(h);heads[k]=h};
  head('titles','手帐标题');head('basic','字效');head('cutout','剪报字');
  // 顺序:手帐标题(带示例文字条)→ 字效 → 剪报字
  if(body('titles')&&body('basic')){body('titles').after(heads.basic,body('basic'))}
  // 「字效」用标题区上面那一条示例文字,不再各放一条
  body('basic')?.querySelector('.style-preview-bar')?.classList.add('v54-gone');$('#basicFilters')?.classList.add('v54-gone');
  [...tabs.children].forEach(b=>b.classList.add('v54-gone'));
  if(card)tabs.after(card);// 卡片放在页签下面
  const T=[['fonts','字体'],['titles','标题'],['cards','卡片']];
  function show(k){T.forEach(([x])=>tabs.querySelector(`[data-v54="${x}"]`)?.classList.toggle('on',x===k));
   const vis={fonts:['fonts'],titles:['titles','basic','cutout'],cards:[]}[k];
   for(const b of tp.querySelectorAll('[data-text-body]'))b.hidden=!vis.includes(b.dataset.textBody);
   for(const [x,h] of Object.entries(heads))h.hidden=!vis.includes(x);if(card)card.hidden=k!=='cards';try{localStorage.setItem('jw-text-tab',k)}catch(e){}}
  T.forEach(([k,l])=>{const b=document.createElement('button');b.type='button';b.className='cb';b.dataset.v54=k;b.textContent=l;b.onclick=()=>show(k);tabs.append(b)});
  let k0='fonts';try{k0=localStorage.getItem('jw-text-tab')||'fonts'}catch(e){}show(T.some(t=>t[0]===k0)?k0:'fonts');
  // 字体筛选:两排按钮 → 搜索框后面两个下拉
  const ff=$('#fontFilters');if(ff){const rows=[...ff.querySelectorAll('.text-filter-row')];const line=document.createElement('div');line.className='v54-filter';
   const search=ff.querySelector('.font-search');if(search)line.append(search);
   rows.forEach(row=>{const bs=[...row.querySelectorAll('button')];if(!bs.length)return;row.classList.add('v54-gone');const s=document.createElement('select');s.className='sel';
    const lab={language:{all:'中英文'},kind:{all:'所有风格'}}[bs[0].dataset.filter]||{};
    s.innerHTML=bs.map((b,i)=>`<option value="${i}">${b.dataset.value==='all'?(lab.all||'全部'):b.textContent}</option>`).join('');s.value=String(Math.max(0,bs.findIndex(b=>b.classList.contains('on'))));
    s.onchange=()=>bs[+s.value]?.click();line.append(s)});ff.prepend(line)}}
})();
