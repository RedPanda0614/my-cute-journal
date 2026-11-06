'use strict';
/* v26:改进计划 P0 + P1
   P0 作品自动存到文件夹 / 备份提醒 / 存储快满提醒;项目和作品库合成「作品」;侧栏点了只打开。
   P1 页面模板、手帐卡片、素材栏简化、缩略图、最近用过、常用字体、一键整理名字、对齐工具、智能参考线。
   这个文件最后加载,只通过包一层旧函数来加功能,不改旧文件的逻辑。 */
(()=>{
 const WB=window.WorkbenchExtras||{};
 const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
 const pad2=n=>String(n).padStart(2,'0'),esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
 const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
 const hasContent=()=>state.pages.some(p=>p.items.length);
 const fontReady=async(f,t)=>{try{await ensureFont(f,t)}catch(e){}};

 /* ================= 旧数据迁移 ================= */
 const migratePaper=()=>{if(state.paper.size==='小红书竖图')state.paper.size='108×144'};
 const oldApply=applyProject;applyProject=async function(p){await oldApply(p);migratePaper()};
 migratePaper();

 /* ================= P0-1 自动保存到「作品」文件夹 + 备份提醒 ================= */
 const SERVER=/^https?:$/.test(location.protocol)&&/^(127\.0\.0\.1|localhost)$/.test(location.hostname);
 let serverOk=false,dirty=false,lastServerSave=null,saving=false,saveTimer=null,lastBytes=0;
 const status=el('button','tag save-status');status.id='saveStatus';status.type='button';
 $('#projectMenu')?.before(status);
 function paintStatus(){
  if(serverOk){status.textContent=saving?'正在存到作品文件夹…':lastServerSave?`已存到作品文件夹 ${lastServerSave}`:'作品会自动存到文件夹';status.classList.toggle('warn',false);status.title='作品自动存在「03 手帐工作台/作品/自动保存.json」,每天另留一份备份';return}
  const last=ls.get('jw-last-backup',0),days=last?Math.floor((Date.now()-last)/864e5):null;
  status.textContent=last?(days<1?'今天已备份':`${days} 天没备份`):'只存在浏览器里';status.classList.toggle('warn',!last||days>=1);
  status.title='双击打开时作品只存在这个浏览器里。点这里下载一份备份文件。用「启动工作台.command」打开,会自动存进文件夹。'}
 status.onclick=()=>{if(serverOk)return toast('作品在「03 手帐工作台/作品/」里,每天有一份备份');downloadBackup()};
 function downloadBackup(){saveProject();ls.set('jw-last-backup',Date.now());hideBanner();paintStatus()}
 const oldSaveProject=saveProject;saveProject=function(){const r=oldSaveProject.apply(this,arguments);ls.set('jw-last-backup',Date.now());paintStatus();return r};
 async function pushToServer(force){if(!serverOk||saving||!dirty&&!force)return;saving=true;dirty=false;paintStatus();
  try{const body=JSON.stringify(projectData());lastBytes=body.length;const r=await fetch('/api/autosave',{method:'POST',headers:{'Content-Type':'application/json'},body});const j=await r.json();if(!j.ok)throw new Error(j.error||'保存失败');lastServerSave=j.time}
  catch(e){dirty=true;toast('存到作品文件夹失败:'+e.message+'。作品还在浏览器里。')}
  saving=false;paintStatus()}
 const oldSave=save;save=function(){const r=oldSave.apply(this,arguments);dirty=true;if(serverOk){clearTimeout(saveTimer);saveTimer=setTimeout(()=>pushToServer(),4000)}else checkReminder();return r};
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')pushToServer()});
 // 双击打开时:一天提醒一次下载备份
 const banner=el('div','backup-banner');banner.hidden=true;document.body.append(banner);
 function hideBanner(){banner.hidden=true}
 function showBanner(msg){banner.innerHTML=`<span>${msg}</span><button class="cb" id="bnBackup">下载备份</button><button class="cb" id="bnLater">明天再说</button>`;banner.hidden=false;
  $('#bnBackup').onclick=downloadBackup;$('#bnLater').onclick=()=>{ls.set('jw-backup-snooze',Date.now());hideBanner()}}
 let reminded=false;
 function checkReminder(){if(serverOk||reminded||!hasContent())return;const last=ls.get('jw-last-backup',0),snooze=ls.get('jw-backup-snooze',0);
  if(Date.now()-Math.max(last,snooze)<864e5)return;reminded=true;setTimeout(()=>{if(!serverOk)showBanner('作品现在只存在这个浏览器里。换浏览器、清缓存,作品就没了。下载一份备份放在文件夹里更保险。')},90000)}
 async function checkStorage(){try{const e=await navigator.storage?.estimate?.();if(!e||!e.quota)return;const r=e.usage/e.quota;if(r>.8)showBanner(`浏览器存储已经用了 ${Math.round(r*100)}%,快满了。先下载一份备份,再删掉不用的上传素材。`)}catch(e){}}
 (async()=>{
  if(SERVER){try{const r=await fetch('/api/ping',{cache:'no-store'});serverOk=(await r.json()).ok}catch(e){serverOk=false}}
  paintStatus();
  if(serverOk){
   // 浏览器里是空的,但文件夹里有自动保存 → 问要不要恢复
   if(!hasContent()){try{const r=await fetch('/api/autosave',{cache:'no-store'});if(r.ok){const p=await r.json();if(p.pages?.some(pg=>pg.items?.length))askRestore(p)}}catch(e){}}
   else pushToServer(true);
  }else{checkReminder();checkStorage()}
 })();
 function askRestore(p){$('#mbox').innerHTML=`<h3>找到文件夹里的作品</h3><p class="mini">浏览器里是空的,但「作品/自动保存.json」里有 ${p.pages.length} 页。要恢复吗?</p><div class="row" style="justify-content:flex-end"><button class="tag" id="rsNo">不用</button><button class="tag red" id="rsYes">恢复</button></div>`;
  $('#rsNo').onclick=closeModal;$('#rsYes').onclick=async()=>{closeModal();commit();await applyProject(p);selId=null;syncTop();layout();drawerRender();pagebar();save();toast('已从作品文件夹恢复')};openModal()}

 /* ================= P0-2 项目和作品库合成「作品」 ================= */
 (function mergeMenus(){const m=$('#projectMenu');if(!m)return;m.querySelector('summary').textContent='作品 ▾';
  const d=m.querySelector('.top-dropdown');d.innerHTML='';
  const item=(label,hint,fn)=>{const b=el('button','tag');b.innerHTML=`${label}<small>${hint}</small>`;b.onclick=()=>{m.open=false;fn()};d.append(b)};
  item('保存到我的作品','存一份带封面的作品,随时打开',()=>$('#wbSaveWork')?.click());
  item('打开我的作品','看全部作品',()=>setPane('works'));
  item('下载备份文件','存成文件,换电脑也能打开',()=>downloadBackup());
  item('从备份文件打开','打开之前下载的 .json',()=>$('#fProj').click());
  // 作品面板顶上也放备份按钮,说清楚两种保存的区别
  const pane=$('.pn[data-pane="works"]');if(pane){const box=el('div','works-help','<p class="mini">「保存当前作品」存在这个浏览器里,带封面,方便挑着打开。<br>「下载备份」存成文件,换浏览器、换电脑也能打开。</p><div class="row"><button class="cb" id="wkBackup">下载备份</button><button class="cb" id="wkOpen">从备份文件打开</button></div>');pane.querySelector('.row')?.after(box);
   $('#wkBackup').onclick=downloadBackup;$('#wkOpen').onclick=()=>$('#fProj').click()}
  const h=pane?.querySelector('h3');if(h)h.textContent='我的作品';
 })();

 /* ================= P0-3 侧栏图标说明 ================= */
 const railHints={assets:'胶带、贴纸、照片等素材',text:'加文字、标题和手帐卡片',tidy:'编辑选中的东西',layers:'调整上下顺序、分组',ai:'生成任务单,导入生成好的图',styles:'整套风格样页',works:'保存和打开作品'};
 $$('.ri[data-pane]').forEach(b=>{if(railHints[b.dataset.pane])b.title=railHints[b.dataset.pane]});

 /* ================= P1 最近用过 + 常用字体 ================= */
 const RECENT='jw-recent-assets',FONTS_USED='jw-fonts-used';
 const recent=()=>ls.get(RECENT,[]);
 function noteRecent(a){if(!a||a.hidden||a.source==='text'||a.source==='edit')return;const r=recent().filter(id=>id!==a.id);r.unshift(a.id);ls.set(RECENT,r.slice(0,30));renderChips()}
 function noteFont(f){if(!f)return;const m=ls.get(FONTS_USED,{});m[f]={n:(m[f]?.n||0)+1,t:Date.now()};ls.set(FONTS_USED,m)}
 const topFonts=(n=6)=>Object.entries(ls.get(FONTS_USED,{})).sort((a,b)=>b[1].n-a[1].n||b[1].t-a[1].t).slice(0,n).map(e=>e[0]);
 const oldAddItem=addItem;addItem=function(a){const it=oldAddItem.apply(this,arguments);noteRecent(a);return it};
 const oldAddText=addText;addText=async function(style,font,values){const it=await oldAddText.apply(this,arguments);noteFont(it?.font);return it};
 if(typeof applyFont==='function'){const oldApplyFont=applyFont;applyFont=async function(it,font){const r=await oldApplyFont.apply(this,arguments);if(r)noteFont(font);return r}}
 // 字体卡片:常用的排前面并加「常用」角标
 function markFonts(host){if(!host)return;const top=topFonts();if(!top.length)return;const cards=[...host.children].filter(c=>c.dataset?.font||c.getAttribute?.('data-font')||c.title);
  const fam=c=>c.dataset.font||c.dataset.family||Object.entries(FONTS).find(([n])=>c.title===n||c.textContent.includes(n))?.[1];
  top.slice().reverse().forEach(f=>{const c=cards.find(x=>fam(x)===f);if(c){host.prepend(c);c.classList.add('used-font')}})}
 if(typeof openFontPicker==='function'){const oldPicker=openFontPicker;openFontPicker=function(){const r=oldPicker.apply(this,arguments);markFonts($('#fontPicker'));return r}}
 setTimeout(()=>markFonts($('#fontStyles')),1500);

 /* ================= P1 素材栏简化 ================= */
 let recentMode=false;
 const ML=window.MaterialLibrary;
 if(ML){const oldMatch=ML.matches;ML.matches=function(a){if(recentMode)return !a.hidden&&recent().includes(a.id);return oldMatch.apply(this,arguments)}}
 window.sortAssetList=list=>{if(recentMode){const r=recent();list.sort((a,b)=>r.indexOf(a.id)-r.indexOf(b.id))}};
 const chips=el('div','cat-chips');chips.id='catChips';
 const filterBtn=el('button','cb filter-toggle','筛选');filterBtn.id='bFilters';filterBtn.type='button';filterBtn.title='按风格、来源、标签、收纳夹、颜色筛选';
 (function placeBar(){const head=$('#tabList');head?.after(chips);$('#dq')?.after(filterBtn);$('#pane').classList.add('lib-simple')})();
 filterBtn.onclick=()=>{const on=$('#pane').classList.toggle('filters-open');filterBtn.classList.toggle('on',on)};
 const tidyBtn=el('button','cb','整理名字');tidyBtn.id='bTidyNames';tidyBtn.type='button';tidyBtn.title='把 IMG_1234 这类名字改成好认的名字';tidyBtn.onclick=()=>tidyNames();
 $('#dfind .material-result')?.append(tidyBtn);
 function renderChips(){const cats=(ML?.categories||[]).map(([id,name])=>({id,name}));const vis=Object.values(assets).filter(a=>!a.hidden);
  const list=[{id:'all',name:'全部'},...(recent().some(id=>assets[id]&&!assets[id].hidden)?[{id:'__recent',name:'最近'}]:[]),{id:'__fav',name:'★ 收藏'},...cats.filter(c=>vis.some(a=>a.cat===c.id)||c.id==='upload')];
  const favOn=!!ML?.filters?.favorite;chips.innerHTML='';
  for(const c of list){const n=c.id==='all'||c.id==='__recent'||c.id==='__fav'?'':vis.filter(a=>a.cat===c.id).length;
   const on=c.id==='__recent'?recentMode:c.id==='__fav'?favOn&&!recentMode:!recentMode&&!favOn&&tab===c.id;
   const b=el('button','chip'+(on?' on':''),esc(c.name)+(n!==''?`<small>${n}</small>`:''));b.type='button';b.dataset.tab=c.id;b.dataset.libraryCategory=c.id;
   b.onclick=()=>{if(c.id==='__recent'){recentMode=!recentMode;drawerRender();return}recentMode=false;
    if(c.id==='__fav'){if(tab!=='all')setTab('all');if(!ML?.filters?.favorite)$('#materialFavorite')?.click();else drawerRender();return}
    if(ML?.filters?.favorite)$('#materialFavorite')?.click();setTab(c.id)};chips.append(b)}}
 const oldDrawer=drawerRender;drawerRender=function(){oldDrawer.apply(this,arguments);renderChips();
  $$('#dgrid .thumb').forEach(t=>{const a=assets[t.dataset.id];if(a)t.classList.add('cat-'+a.cat)})};
 const oldSetTab=setTab;setTab=function(t){recentMode=false;return oldSetTab.apply(this,arguments)};

 /* ================= P1 一键整理名字 ================= */
 const MESSY=/^(img|dsc|dscf|dcim|pxl|mvimg|photo|image|screenshot|screen shot|wechat|mmexport|微信图片|截屏|屏幕截图|截图|未命名|untitled|download|下载)[\s_\-]*[\d_\-\s.()（）]*$|^[\d_\-\s.()]+$|^[0-9a-f]{8,}(-[0-9a-f]{4,})*$|^img_\d+.*$/i;
 function cleanName(n){return String(n||'').replace(/\.(jpe?g|png|webp|heic|gif)$/i,'').replace(/[_]+/g,' ').replace(/\s*\(\d+\)$/,'').replace(/\s+/g,' ').trim()}
 function tidyPlan(){const mine=Object.values(assets).filter(a=>!a.hidden&&a.source!=='built-in'&&!a.id.startsWith('kit-'));const used={},plan=[];
  for(const a of mine){const base=cleanName(a.name);if(base&&!MESSY.test(base)&&base===a.name)continue;
   let nw;if(base&&!MESSY.test(base))nw=base;else{const label=a.cat==='photo'?'照片':(catName(a.cat)&&catName(a.cat)!=='未分类'?catName(a.cat):'素材');used[label]=(used[label]||0)+1;nw=`${label} ${pad2(used[label])}`}
   if(nw!==a.name)plan.push({a,old:a.name,nw})}
  // 序号避开已有名字
  const taken=new Set(Object.values(assets).map(a=>a.name));for(const p of plan){let k=1,n=p.nw;while(taken.has(n)&&n!==p.old){const m=n.match(/^(.*) (\d+)$/);n=m?`${m[1]} ${pad2(+m[2]+k)}`:`${p.nw} ${pad2(++k)}`}p.nw=n;taken.add(n)}
  return plan}
 function tidyNames(){const plan=tidyPlan();if(!plan.length)return toast('你上传的素材名字都挺清楚的,不用整理');
  $('#mbox').innerHTML=`<h3>整理名字</h3><p class="mini">把相机文件名、截图名、乱码改成「分类 + 序号」。去掉勾选的不改。</p><div class="tidy-list">${plan.map((p,i)=>`<label class="tidy-row"><input type="checkbox" data-i="${i}" checked><img src="${p.a.src}"><span class="old">${esc(p.old)}</span><span>→</span><input class="txt" data-n="${i}" value="${esc(p.nw)}"></label>`).join('')}</div><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="tag" id="tdNo">取消</button><button class="tag red" id="tdOk">改名</button></div>`;
  $('#tdNo').onclick=closeModal;$('#tdOk').onclick=()=>{let n=0;plan.forEach((p,i)=>{if(!$(`[data-i="${i}"]`).checked)return;const v=$(`[data-n="${i}"]`).value.trim();if(!v)return;
   for(const pg of state.pages)for(const it of pg.items)if((it.asset===p.a.id||it.orig===p.a.id)&&it.name===p.a.name)it.name=v;p.a.name=v;n++});closeModal();save();drawerRender();renderLayers?.();toast(`改好了 ${n} 个名字`)};openModal(true)}
 WB.tidyNames=tidyNames;

 /* ================= P1 手帐卡片 ================= */
 const WEEK_CN=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'],WEEK_EN=['SUN','MON','TUE','WED','THU','FRI','SAT'],MON_EN=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
 const WEATHER={sunny:'晴',cloudy:'多云',overcast:'阴',rain:'雨',snow:'雪',wind:'有风'},MOOD={happy:'开心',calm:'平静',excited:'超棒',tired:'有点累',sad:'不开心'};
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`};
 const parseDay=s=>{const [y,m,d]=(s||today()).split('-').map(Number);return new Date(y,m-1,d)};
 const CARD_SIZE={date:[34,42],week:[42,13],weather:[30,32],mood:[30,32],strip:[78,11]};
 const PALETTE=['#c8644b','#6f8fb5','#7f9c80','#d39a2e','#d98e8a','#3b3226'];
 function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
 /* ---- 卡片做成实物纸片:有厚度、两层阴影、纸纤维、印刷墨色 (v27) ---- */
 function mix(hex,t){const n=parseInt(hex.slice(1),16),c=[n>>16,n>>8&255,n&255].map(v=>Math.round(t<0?v*(1+t):v+(255-v)*t));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('')}
 function rectPath(X,Y,w,h,r=.5){const p=new Path2D();p.moveTo(X+r,Y);p.arcTo(X+w,Y,X+w,Y+h,r);p.arcTo(X+w,Y+h,X,Y+h,r);p.arcTo(X,Y+h,X,Y,r);p.arcTo(X,Y,X+w,Y,r);p.closePath();return p}
 // 一张纸:底下一层暗边当厚度,再盖面纸;面纸上加光照渐变、纤维、边缘高光
 function paper(x,path,box,o={}){const fill=o.fill||'#fbf7ee',edge=o.edge||mix(fill,-.2),lift=o.lift??.45,R=rng(o.seed||7);
  x.save();x.shadowColor='rgba(60,40,20,.18)';x.shadowBlur=o.blur??2.8;x.shadowOffsetX=.3;x.shadowOffsetY=o.drop??1.4;x.fillStyle=edge;x.fill(path);x.restore();
  x.save();x.shadowColor='rgba(55,35,18,.36)';x.shadowBlur=.45;x.shadowOffsetY=.25;x.translate(.1,lift);x.fillStyle=edge;x.fill(path);x.restore();
  x.fillStyle=fill;x.fill(path);
  x.save();x.clip(path);const [X,Y,w,h]=box;
  const g=x.createLinearGradient(X,Y,X+w*.7,Y+h);g.addColorStop(0,'rgba(255,255,255,.28)');g.addColorStop(.55,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(90,60,30,.07)');x.fillStyle=g;x.fillRect(X,Y,w,h);
  if(o.fibers!==false){x.lineCap='round';for(let i=0;i<w*h*.05;i++){const fx=X+R()*w,fy=Y+R()*h,a=R()*Math.PI,l=.5+R()*1.6;x.strokeStyle=R()<.6?`rgba(110,80,45,${.05+R()*.06})`:'rgba(255,255,255,.35)';x.lineWidth=.08+R()*.08;x.beginPath();x.moveTo(fx,fy);x.quadraticCurveTo(fx+Math.cos(a)*l*.5+R()*.3,fy+Math.sin(a)*l*.5,fx+Math.cos(a)*l,fy+Math.sin(a)*l);x.stroke()}
   for(let i=0;i<w*h*.25;i++){x.fillStyle=R()<.5?'rgba(110,80,45,.06)':'rgba(255,255,255,.3)';x.fillRect(X+R()*w,Y+R()*h,.25,.25)}}
  x.restore();
  x.save();x.clip(path);x.strokeStyle='rgba(255,255,255,.6)';x.lineWidth=.45;x.translate(.12,.12);x.stroke(path);x.restore()}
 // 印刷/盖章的墨:先画在单独一层,再随机抠掉小点,像油墨没完全吃进纸里
 function ink(x,w,h,k,draw,seed=3,amt=.5){const L=cv(Math.ceil(w*k),Math.ceil(h*k)),lx=L.getContext('2d');lx.scale(k,k);draw(lx);
  lx.globalCompositeOperation='destination-out';const R=rng(seed);for(let i=0;i<w*h*amt*.6;i++){lx.globalAlpha=.12+R()*.3;lx.beginPath();lx.arc(R()*w,R()*h,.05+R()*.12,0,7);lx.fill()}
  x.save();x.setTransform(1,0,0,1,0,0);x.globalAlpha=.94;x.drawImage(L,0,0);x.restore()}
 function hole(x,cx,cy,r){x.save();x.globalCompositeOperation='destination-out';x.beginPath();x.arc(cx,cy,r,0,7);x.fill();x.restore();
  x.save();x.beginPath();x.arc(cx,cy,r,0,7);x.strokeStyle='rgba(60,40,20,.35)';x.lineWidth=.25;x.stroke();x.restore()}
 function icon(x,kind,cx,cy,s,col){x.save();x.lineCap='round';x.lineJoin='round';x.lineWidth=s*.09;x.strokeStyle=col;x.fillStyle=col;
  const cloud=(dx,dy,k,fill)=>{x.beginPath();x.arc(cx+dx-s*.22*k,cy+dy+s*.05*k,s*.2*k,Math.PI*.5,Math.PI*1.5);x.arc(cx+dx,cy+dy-s*.12*k,s*.27*k,Math.PI,Math.PI*2);x.arc(cx+dx+s*.24*k,cy+dy+s*.05*k,s*.2*k,Math.PI*1.5,Math.PI*.5);x.closePath();if(fill){x.fillStyle=fill;x.fill()}x.stroke()};
  if(kind==='sunny'){x.beginPath();x.arc(cx,cy,s*.22,0,7);x.fillStyle='#e8b64a';x.fill();x.strokeStyle='#e8a43a';for(let i=0;i<8;i++){const a=i*Math.PI/4;x.beginPath();x.moveTo(cx+Math.cos(a)*s*.32,cy+Math.sin(a)*s*.32);x.lineTo(cx+Math.cos(a)*s*.44,cy+Math.sin(a)*s*.44);x.stroke()}}
  if(kind==='cloudy'){x.beginPath();x.arc(cx+s*.16,cy-s*.12,s*.17,0,7);x.fillStyle='#e8b64a';x.fill();cloud(-s*.04,s*.08,.85,'#fbf7ee')}
  if(kind==='overcast'){cloud(s*.1,-s*.08,.7,'#e4ddd0');cloud(-s*.06,s*.1,.85,'#fbf7ee')}
  if(kind==='rain'){cloud(0,-s*.06,.85,'#fbf7ee');x.strokeStyle='#6f8fb5';for(let i=-1;i<=1;i++){x.beginPath();x.moveTo(cx+i*s*.18,cy+s*.22);x.lineTo(cx+i*s*.18-s*.05,cy+s*.36);x.stroke()}}
  if(kind==='snow'){cloud(0,-s*.06,.85,'#fbf7ee');x.fillStyle='#8fb0cf';for(let i=-1;i<=1;i++){x.beginPath();x.arc(cx+i*s*.18,cy+s*.3+(i%2?0:s*.04),s*.045,0,7);x.fill()}}
  if(kind==='wind'){x.strokeStyle='#7f9c80';for(let i=0;i<3;i++){const y=cy-s*.18+i*s*.18,L=s*(.6-i*.1);x.beginPath();x.moveTo(cx-s*.35,y);x.lineTo(cx-s*.35+L,y);x.arc(cx-s*.35+L,y-s*.07,s*.07,Math.PI*.5,-Math.PI*.6,true);x.stroke()}}
  if(MOOD[kind]){x.beginPath();x.arc(cx,cy,s*.36,0,7);x.fillStyle={happy:'#f2c66a',calm:'#bcd3b9',excited:'#f0a48f',tired:'#d8cfe6',sad:'#b9cbe0'}[kind];x.fill();x.strokeStyle='#3b3226';x.lineWidth=s*.06;
   const ey=cy-s*.07,ex=s*.13;if(kind==='tired'){x.beginPath();x.moveTo(cx-ex-s*.06,ey);x.lineTo(cx-ex+s*.06,ey);x.moveTo(cx+ex-s*.06,ey);x.lineTo(cx+ex+s*.06,ey);x.stroke()}else if(kind==='excited'){for(const sx of [-1,1]){x.beginPath();x.arc(cx+sx*ex,ey+s*.02,s*.06,Math.PI,0);x.stroke()}}else{x.fillStyle='#3b3226';for(const sx of [-1,1]){x.beginPath();x.arc(cx+sx*ex,ey,s*.035,0,7);x.fill()}}
   x.beginPath();if(kind==='happy'||kind==='excited')x.arc(cx,cy+s*.04,s*.15,.15*Math.PI,.85*Math.PI);else if(kind==='sad')x.arc(cx,cy+s*.2,s*.12,1.2*Math.PI,1.8*Math.PI);else{x.moveTo(cx-s*.1,cy+s*.13);x.lineTo(cx+s*.1,cy+s*.13)}x.stroke();
   if(kind==='happy'||kind==='excited'){x.fillStyle='rgba(232,140,120,.45)';for(const sx of [-1,1]){x.beginPath();x.arc(cx+sx*s*.22,cy+s*.06,s*.05,0,7);x.fill()}}}
  x.restore()}
 async function cardCanvas(spec){const [w,h]=CARD_SIZE[spec.type],k=TPX*2,c=cv(w*k,h*k),x=c.getContext('2d');x.scale(k,k);const d=parseDay(spec.date),col=spec.color||PALETTE[0];
  const CN='"LXGW WenKai Screen",serif',EN='"Special Elite","LXGW WenKai Screen",serif',NUM='"Bebas Neue","Special Elite",serif';
  await Promise.all([fontReady('LXGW WenKai Screen',WEEK_CN.join('')+Object.values(WEATHER).join('')+Object.values(MOOD).join('')+'年月日°'),fontReady('Special Elite','0123456789'+MON_EN.join('')+WEEK_EN.join('')),fontReady('Bebas Neue','0123456789')]);
  x.textAlign='center';x.textBaseline='middle';const INK='#2f2720',sd=(spec.date||'').replace(/\D/g,'')%997+1;
  if(spec.type==='date'){// 撕页台历:底下垫两张,上面是今天这页,顶上是装订的硬纸条和两个金属环
   for(const [dy,f] of [[2.2,'#ece3d0'],[1.1,'#f3ecdc']])paper(x,rectPath(2.4,3+dy,29.2,34.2,.4),[2.4,3+dy,29.2,34.2],{fill:f,fibers:false,drop:.6,blur:1.4,lift:.3});
   paper(x,rectPath(2,3,30,34.4,.4),[2,3,30,34.4],{fill:'#fcf8ef',seed:sd});
   x.save();x.strokeStyle='rgba(120,95,60,.35)';x.lineWidth=.22;x.setLineDash([.5,.55]);x.beginPath();x.moveTo(2.6,11.9);x.lineTo(31.4,11.9);x.stroke();x.restore();
   paper(x,rectPath(1.2,1,31.6,10,.7),[1.2,1,31.6,10],{fill:col,edge:mix(col,-.35),lift:.6,drop:.8,blur:1.4,seed:sd+1});
   for(const hx of [9,25]){x.save();x.beginPath();x.arc(hx,3.4,1.15,0,7);x.fillStyle='rgba(30,20,10,.55)';x.fill();const g=x.createLinearGradient(hx-1.4,1,hx+1.4,4);g.addColorStop(0,'#f2efe8');g.addColorStop(.5,'#a9a49a');g.addColorStop(1,'#e2ded5');x.strokeStyle=g;x.lineWidth=.55;x.beginPath();x.arc(hx,2.5,1.3,Math.PI*.95,Math.PI*2.05);x.stroke();x.restore()}
   x.fillStyle='rgba(255,250,240,.95)';x.font=`3.9px ${EN}`;x.fillText(`${MON_EN[d.getMonth()]}  ${d.getFullYear()}`,17,7.6);
   ink(x,w,h,k,lx=>{lx.textAlign='center';lx.textBaseline='middle';lx.fillStyle=INK;lx.font=`18px ${NUM}`;lx.fillText(String(d.getDate()),17,23.4);lx.font=`4.4px ${CN}`;lx.fillStyle=col;lx.fillText(WEEK_CN[d.getDay()],17,33.6)},sd,.45)}
  if(spec.type==='week'){// 布纹标签:一圈缝线,左边一颗小圆贴
   const P=rectPath(1.5,1.4,39,8.6,1);paper(x,P,[1.5,1.4,39,8.6],{fill:'#fbf5e7',seed:sd,drop:1,blur:2});
   x.save();x.strokeStyle=mix(col,.15);x.lineWidth=.3;x.setLineDash([.9,.7]);x.stroke(rectPath(2.7,2.6,36.6,6.2,.6));x.restore();
   paper(x,(()=>{const p=new Path2D();p.arc(7,5.7,2.2,0,7);return p})(),[4.8,3.5,4.4,4.4],{fill:col,edge:mix(col,-.3),lift:.25,drop:.5,blur:.9,fibers:false});
   ink(x,w,h,k,lx=>{lx.textBaseline='middle';lx.textAlign='left';lx.fillStyle=INK;lx.font=`5px ${CN}`;lx.fillText(WEEK_CN[d.getDay()],11.4,5.9);lx.textAlign='right';lx.font=`3.6px ${EN}`;lx.fillStyle=col;lx.fillText(WEEK_EN[d.getDay()],37.6,6)},sd,.35)}
  if(spec.type==='weather'){// 牛皮纸吊牌:上面两个角剪掉,中间一个加固圈和穿孔
   const P=new Path2D();P.moveTo(2,7);P.lineTo(6.5,2.2);P.lineTo(23.5,2.2);P.lineTo(28,7);P.lineTo(28,29.4);P.lineTo(2,29.4);P.closePath();
   paper(x,P,[2,2.2,26,27.2],{fill:'#d9bd93',edge:'#b39469',seed:sd});
   const ringP=new Path2D();ringP.arc(15,6.4,2.3,0,7);paper(x,ringP,[12.7,4.1,4.6,4.6],{fill:'#f1e6d1',edge:'#cdbb9c',lift:.2,drop:.3,blur:.6,fibers:false});
   ink(x,w,h,k,lx=>{icon(lx,spec.weather||'sunny',15,16.3,14,col);lx.textAlign='center';lx.textBaseline='middle';lx.fillStyle='#3a2c1e';lx.font=`4.4px ${CN}`;lx.fillText(WEATHER[spec.weather||'sunny']+(spec.temp?`  ${spec.temp}°`:''),15,25.6)},sd,.5);
   hole(x,15,6.4,1)}
  if(spec.type==='mood'){// 两层花边圆纸:底下一层彩纸,上面一层米白
   const sc=(cx,cy,r,n)=>{const p=new Path2D();for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2,am=(a0+a1)/2,bx=cx+Math.cos(am)*r,by=cy+Math.sin(am)*r;if(!i)p.moveTo(cx+Math.cos(a0)*r*.95,cy+Math.sin(a0)*r*.95);p.arc(bx,by,r*Math.sin(Math.PI/n)*1.05,am-Math.PI/2-.35,am+Math.PI/2+.35)}p.closePath();return p};
   paper(x,sc(15,15.2,13,18),[2,2.2,26,26],{fill:mix(col,.45),edge:mix(col,-.15),seed:sd});
   const top=new Path2D();top.arc(14.8,14.9,10.6,0,7);paper(x,top,[4.2,4.3,21.2,21.2],{fill:'#fcf8ef',lift:.35,drop:.7,blur:1.2,seed:sd+2});
   ink(x,w,h,k,lx=>{icon(lx,spec.mood||'happy',14.8,12.6,13,col);lx.textAlign='center';lx.textBaseline='middle';lx.fillStyle=INK;lx.font=`3.9px ${CN}`;lx.fillText(MOOD[spec.mood||'happy'],14.8,20.7)},sd,.4)}
  if(spec.type==='strip'){// 两头撕开的纸条,撕口露出白色纸芯
   const R=rng(sd),edgeL=[],edgeR=[];for(let i=0;i<=10;i++){edgeL.push([1.6+R()*1.4,1.4+i*7.6/10]);edgeR.push([76.2-R()*1.4,1.4+i*7.6/10])}
   const mk=g=>{const p=new Path2D();p.moveTo(edgeL[0][0]-g,1.4-g*.3);for(const [a,b] of edgeR.slice().reverse().reverse())p.lineTo(a+g,b);for(const [a,b] of edgeL.slice().reverse())p.lineTo(a-g,b);p.closePath();return p};
   paper(x,mk(.35),[1,1,76,8.6],{fill:'#fffaf0',edge:'#d9ccb2',fibers:false,drop:1,blur:1.8});
   x.fillStyle='#efe2c8';x.fill(mk(-.25));x.save();x.clip(mk(-.25));const R2=rng(sd+3);for(let i=0;i<260;i++){x.fillStyle=R2()<.5?'rgba(110,80,45,.07)':'rgba(255,255,255,.3)';x.fillRect(1+R2()*76,1+R2()*9,.25,.25)}x.restore();
   ink(x,w,h,k,lx=>{lx.textBaseline='middle';lx.textAlign='left';lx.fillStyle=INK;lx.font=`4.3px ${EN}`;lx.fillText(`${d.getFullYear()}.${pad2(d.getMonth()+1)}.${pad2(d.getDate())}`,6,5.5);lx.font=`4.4px ${CN}`;lx.fillText(WEEK_CN[d.getDay()],33,5.4);lx.fillStyle=col;lx.fillText(WEATHER[spec.weather||'sunny']+(spec.temp?` ${spec.temp}°`:''),53,5.4)},sd,.35)}
  return c}
 async function cardAsset(spec){const c=await cardCanvas(spec);return addAsset(c.toDataURL('image/png'),{name:cardName(spec),source:'tool',hidden:true})}
 const cardName=s=>({date:'日期卡',week:'星期卡',weather:'天气卡',mood:'心情卡',strip:'日期条'})[s.type];
 async function addCard(type,at={}){const spec={type,date:today(),weather:'sunny',mood:'happy',temp:'',color:PALETTE[0],...at.spec};const a=await cardAsset(spec),[w,h]=CARD_SIZE[type];
  const it=oldAddItem(a,at.x??null,at.y??null,{w:at.w||w,h:(at.w||w)*h/w,name:cardName(spec),card:spec,rot:at.rot??(state.paper.tilt?+(Math.random()*6-3).toFixed(1):0)});if(!at.silent)WB.editNewItem?.(it);return it}
 async function rebuildCard(it){const a=await cardAsset(it.card),k=it.w/(assets[it.asset]?.w||a.w);commit();it.asset=a.id;it.orig=a.id;it.w=a.w*k;it.h=a.h*k;it.name=cardName(it.card);renderItems();save()}
 WB.addCard=addCard;WB.cardCanvas=cardCanvas;
 // 文字面板:加一组「手帐卡片」
 (function cardPanel(){const pane=$('.pn[data-pane="text"]');if(!pane)return;const box=el('div','card-pane');
  box.innerHTML='<h3>手帐卡片 <small>自动填今天</small></h3><div class="card-grid"></div>';const grid=box.querySelector('.card-grid');
  for(const t of ['date','week','weather','mood','strip']){const b=el('button','card-btn');b.type='button';b.innerHTML=`<span class="cp"></span><b>${cardName({type:t})}</b>`;b.onclick=()=>addCard(t);grid.append(b);
   cardCanvas({type:t,date:today(),weather:'sunny',mood:'happy',color:PALETTE[0]}).then(c=>{const im=new Image();im.src=c.toDataURL();b.querySelector('.cp').append(im)})}
  pane.querySelector('h3')?.after(box)})();
 // 编辑面板:卡片设置
 const cardSec=el('div','edit-section card-edit');cardSec.id='editCardSection';cardSec.hidden=true;
 (function(){const t=$('#editTransformSection');if(t)t.after(cardSec)})();
 function renderCardEditor(it){if(!it?.card){cardSec.hidden=true;return}cardSec.hidden=false;const s=it.card;
  const opts=(o,v)=>Object.entries(o).map(([k,n])=>`<option value="${k}" ${k===v?'selected':''}>${n}</option>`).join('');
  cardSec.innerHTML=`<div class="edit-head"><b>${cardName(s)}</b></div><div class="edit-body card-body">
   <label class="tl-row"><span>日期</span><input type="date" id="cdDate" value="${s.date}"><button class="cb" id="cdToday" type="button">今天</button></label>
   ${s.type==='weather'||s.type==='strip'?`<label class="tl-row"><span>天气</span><select class="sel" id="cdWeather">${opts(WEATHER,s.weather)}</select><span></span></label><label class="tl-row"><span>温度</span><input type="number" id="cdTemp" value="${esc(s.temp)}" placeholder="不填"><b>°</b></label>`:''}
   ${s.type==='mood'?`<label class="tl-row"><span>心情</span><select class="sel" id="cdMood">${opts(MOOD,s.mood)}</select><span></span></label>`:''}
   <div class="tl-row"><span>颜色</span><div class="tc-pre">${PALETTE.map(c=>`<span class="swatch ${c===s.color?'on':''}" data-cc="${c}" style="background:${c}"></span>`).join('')}<input type="color" id="cdColor" value="${s.color}"></div></div></div>`;
  const upd=patch=>{Object.assign(it.card,patch);rebuildCard(it)};
  $('#cdDate').onchange=e=>upd({date:e.target.value||today()});$('#cdToday').onclick=()=>upd({date:today()});
  $('#cdWeather')&&($('#cdWeather').onchange=e=>upd({weather:e.target.value}));$('#cdTemp')&&($('#cdTemp').onchange=e=>upd({temp:e.target.value}));$('#cdMood')&&($('#cdMood').onchange=e=>upd({mood:e.target.value}));
  cardSec.querySelectorAll('[data-cc]').forEach(sw=>sw.onclick=()=>upd({color:sw.dataset.cc}));$('#cdColor').onchange=e=>upd({color:e.target.value})}

 /* ================= P1 页面模板 ================= */
 async function frameAsset(label='放照片'){const k=TPX*2,w=60,h=70,c=cv(w*k,h*k),x=c.getContext('2d');x.scale(k,k);
  x.save();x.shadowColor='rgba(70,45,20,.25)';x.shadowBlur=2.4;x.shadowOffsetY=.8;x.fillStyle='#fffdf8';x.fillRect(1.5,1.5,w-3,h-3);x.restore();
  x.fillStyle='#e9e2d4';x.fillRect(5,5,w-10,w-10);x.strokeStyle='#bfb29b';x.lineWidth=.5;x.setLineDash([1.6,1.2]);x.strokeRect(5,5,w-10,w-10);x.setLineDash([]);
  x.strokeStyle='#a99a82';x.lineWidth=.9;x.lineJoin='round';const cx=w/2,cy=(w)/2;x.beginPath();x.rect(cx-8,cy-5,16,11);x.moveTo(cx-3,cy-5);x.lineTo(cx-2,cy-7.5);x.lineTo(cx+2,cy-7.5);x.lineTo(cx+3,cy-5);x.stroke();x.beginPath();x.arc(cx,cy+.5,3.2,0,7);x.stroke();
  await fontReady('LXGW WenKai Screen',label+'双击换照片');x.fillStyle='#8a7a66';x.textAlign='center';x.font='3.8px "LXGW WenKai Screen",serif';x.fillText(label,cx,cy+12);x.font='3px "LXGW WenKai Screen",serif';x.fillText('双击换照片',cx,h-6.5);
  return addAsset(c.toDataURL('image/png'),{name:'照片框',source:'tool',hidden:true})}
 async function calendarAsset(year,month,col='#c8644b'){const k=TPX*2,w=118,h=96,c=cv(w*k,h*k),x=c.getContext('2d');x.scale(k,k);
  await Promise.all([fontReady('LXGW WenKai Screen','一二三四五六日月'),fontReady('Special Elite','0123456789SMTWF')]);
  const first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate(),cw=w/7,top=10,rows=Math.ceil((first+days)/7),ch=(h-top)/Math.max(5,rows);
  x.textAlign='center';x.textBaseline='middle';x.font='4.2px "LXGW WenKai Screen",serif';['日','一','二','三','四','五','六'].forEach((d,i)=>{x.fillStyle=i===0||i===6?col:'#7a6a55';x.fillText(d,cw*i+cw/2,4.5)});
  x.strokeStyle='rgba(122,106,85,.35)';x.lineWidth=.3;for(let r=0;r<=Math.max(5,rows);r++){x.beginPath();x.moveTo(0,top+r*ch);x.lineTo(w,top+r*ch);x.stroke()}
  x.font='3.8px "Special Elite",serif';x.textAlign='left';x.textBaseline='top';const t=new Date();
  for(let d=1;d<=days;d++){const i=first+d-1,cx=(i%7)*cw,cy=top+Math.floor(i/7)*ch;const isToday=t.getFullYear()===year&&t.getMonth()===month&&t.getDate()===d;
   if(isToday){x.fillStyle=col;x.globalAlpha=.18;x.fillRect(cx+.4,cy+.4,cw-.8,ch-.8);x.globalAlpha=1}x.fillStyle=i%7===0||i%7===6?col:'#3b3226';x.fillText(String(d),cx+1.6,cy+1.4)}
  return addAsset(c.toDataURL('image/png'),{name:`${month+1} 月月历`,source:'tool',hidden:true})}
 const tapeIds=['b-tape-0','b-tape-1','b-tape-2','b-tape-3','b-tape-4','b-tape-5'];
 const TEMPLATES=[
  {id:'blank',name:'空白',hint:'一张白纸',kind:null},
  {id:'diary',name:'日记',hint:'日期卡、天气、一张照片、一段话',kind:'lined'},
  {id:'travel',name:'旅行',hint:'两张照片、票根、地点和日期',kind:'cream'},
  {id:'month',name:'月历',hint:'这个月的日历和备注',kind:'grid'},
  {id:'photos',name:'照片拼贴',hint:'四张照片错落摆放',kind:'kraft'},
 ];
 async function buildTemplate(id){const {W,H}=dims(),u=Math.min(W,H)/148,items=[];const P=(fx,fy)=>[W*fx,H*fy];
  const put=(a,fx,fy,w,extra={})=>{const it={id:uid(),type:'image',asset:a.id,orig:a.id,name:a.name,x:W*fx,y:H*fy,w:w*u,h:w*u*a.h/a.w,rot:0,flip:false,opacity:1,locked:false,hidden:false,...extra};items.push(it);return it};
  const frame=async(fx,fy,w,rot,label)=>{const a=await frameAsset(label);return put(a,fx,fy,w,{rot,photoPlaceholder:true,name:label||'照片框'})};
  const tape=(fx,fy,w,rot,i=0)=>{const a=assets[tapeIds[i%tapeIds.length]];if(a)put(a,fx,fy,w,{rot})};
  const text=async(t,fx,fy,o={})=>{const draft={...makeTextDraft('plain',o.font||null,{text:t}),...o.props};if(o.boxW)draft.boxW=o.boxW*u;if(o.size)draft.size=o.size*u;if(o.color)draft.color=o.color;if(o.align)draft.align=o.align;
   let c;try{c=await renderText(draft)}catch(e){draft.font='LXGW WenKai Screen';c=await renderText(draft)}const a=await addAsset(c.toDataURL('image/png'),{name:'字:'+t.slice(0,8),source:'text',hidden:true});const it={...draft,id:uid(),asset:a.id,orig:a.id,name:'字:'+t.slice(0,8),x:W*fx,y:H*fy,w:a.w/TPX,h:a.h/TPX,rot:o.rot||0,flip:false,opacity:1,locked:false,hidden:false};items.push(it);return it};
  const card=async(type,fx,fy,w,rot,spec={})=>{const s={type,date:today(),weather:'sunny',mood:'happy',temp:'',color:PALETTE[0],...spec},a=await cardAsset(s);return put(a,fx,fy,w,{rot,card:s,name:cardName(s)})};
  const d=new Date();
  if(id==='diary'){await card('date',.2,.14,30,-3);await card('weather',.5,.12,22,2);await card('mood',.72,.13,22,-2);
   await frame(.66,.42,58,4,'今天的照片');tape(.66,.27,30,-8,0);
   await text('今天',.22,.33,{size:10,font:'Long Cang'});
   await text('今天发生了什么?\n写一点点就好。',.32,.66,{boxW:92,size:6.2,props:{lh:1.9}});
   const st=assets['b-doodle-star'];if(st)put(st,.86,.82,12,{rot:8})}
  if(id==='travel'){await text('旅行日记',.3,.09,{size:11,font:'Long Cang'});await card('strip',.62,.17,64,-2);
   await frame(.32,.36,56,-5,'风景');tape(.24,.21,26,-14,3);await frame(.7,.55,52,6,'我们');tape(.78,.4,24,12,1);
   const tk=assets['b-scrap-ticket'];if(tk)put(tk,.3,.72,52,{rot:-4});const tg=assets['b-scrap-tag'];if(tg)put(tg,.86,.82,18,{rot:10});
   await text('去了哪里、吃了什么、\n最想记住的一件事。',.62,.85,{boxW:70,size:5.4,props:{lh:1.8}})}
  if(id==='month'){await text(`${d.getMonth()+1} 月`,.2,.08,{size:14,font:'Long Cang'});await text(MON_EN[d.getMonth()]+' '+d.getFullYear(),.5,.1,{size:5,font:'Special Elite',color:'#7a6a55'});
   const cal=await calendarAsset(d.getFullYear(),d.getMonth());put(cal,.5,.42,124);tape(.5,.17,34,-3,1);
   await text('这个月想做的事:\n·\n·\n·',.3,.82,{boxW:70,size:5.6,props:{lh:1.7}});const n=assets['b-scrap-memo'];if(n)put(n,.78,.83,36,{rot:5})}
  if(id==='photos'){await frame(.3,.26,56,-6,'照片 1');await frame(.72,.3,52,5,'照片 2');await frame(.32,.66,52,4,'照片 3');await frame(.72,.7,56,-4,'照片 4');
   tape(.3,.12,26,-10,0);tape(.74,.15,24,8,2);tape(.24,.53,22,-6,4);tape(.8,.56,24,12,5);await card('strip',.5,.93,62,-1)}
  return items}
 async function applyTemplate(id,where){const t=TEMPLATES.find(x=>x.id===id);toast('正在铺模板…');const items=await buildTemplate(id);commit();
  if(where==='new'){state.pages.splice(state.cur+1,0,newPage(t.kind||curPage().kind));goPage(state.cur+1)}else if(t.kind){curPage().kind=state.paper.kind=t.kind;syncTop()}
  state.items.push(...items);selId=null;layout();renderItems();save();toast(id==='blank'?'新的一页':'模板铺好了。双击照片框换照片,双击文字改字')}
 WB.applyTemplate=applyTemplate;
 function templateChooser(where){$('#mbox').innerHTML=`<h3>${where==='new'?'新的一页':'用模板'}</h3><div class="tpl-grid">${TEMPLATES.map(t=>`<button class="tpl" data-t="${t.id}" type="button"><span class="tpl-pic tpl-${t.id}"></span><b>${t.name}</b><small>${t.hint}</small></button>`).join('')}</div><div class="row" style="justify-content:flex-end"><button class="tag" id="tplNo">取消</button></div>`;
  $$('.tpl').forEach(b=>b.onclick=()=>{closeModal();if(where!=='new'&&b.dataset.t==='blank')return;applyTemplate(b.dataset.t,where)});$('#tplNo').onclick=closeModal;openModal(true)}
 // 「新页」先选模板
 const oldPageOp=pageOp;pageOp=function(op){if(op==='add')return templateChooser('new');return oldPageOp.apply(this,arguments)};
 $$('[data-pg="add"]').forEach(b=>b.onclick=()=>pageOp('add'));
 // 空白页时在纸上提示「从模板开始」
 const emptyHint=el('div','empty-hint','<b>从这里开始</b><span>选一个模板,或者直接从左边拖素材上来</span><div class="row"></div>');$('#desk').append(emptyHint);
 TEMPLATES.filter(t=>t.id!=='blank').forEach(t=>{const b=el('button','cb',t.name);b.type='button';b.onclick=()=>applyTemplate(t.id,'here');emptyHint.querySelector('.row').append(b)});
 function paintEmpty(){emptyHint.hidden=state.items.length>0}
 // 双击照片框 = 换照片
 $('#items').addEventListener('dblclick',e=>{const row=e.target.closest('.item');const it=row&&state.items.find(i=>i.id===row.dataset.id);if(it?.photoPlaceholder||it?.photoSpec){setTimeout(()=>$('#wbPhotoReplace')?.click(),30)}if(it?.card){setPane('tidy')}});

 /* ================= P1 对齐工具 ================= */
 function bbox(it){const r=it.rot*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r)),w=it.w*c+it.h*s,h=it.w*s+it.h*c;return{l:it.x-w/2,r:it.x+w/2,t:it.y-h/2,b:it.y+h/2,cx:it.x,cy:it.y,w,h}}
 const targets=()=>{const ids=layerPicked.size?[...layerPicked]:selId?[selId]:[];return state.items.filter(i=>ids.includes(i.id)&&!i.locked&&!i.hidden)};
 function align(kind){const L=targets();if(!L.length)return toast('先选中要对齐的东西');const {W,H}=dims();let box;
  if(L.length===1)box={l:0,r:W,t:0,b:H,cx:W/2,cy:H/2};else{const bs=L.map(bbox);box={l:Math.min(...bs.map(b=>b.l)),r:Math.max(...bs.map(b=>b.r)),t:Math.min(...bs.map(b=>b.t)),b:Math.max(...bs.map(b=>b.b))};box.cx=(box.l+box.r)/2;box.cy=(box.t+box.b)/2}
  commit();
  if(kind==='hdist'||kind==='vdist'){if(L.length<3){undoStack.pop();return toast('等间距要选 3 个以上')}const h=kind==='hdist',s=L.map(i=>({i,b:bbox(i)})).sort((a,b)=>h?a.b.l-b.b.l:a.b.t-b.b.t),total=s.reduce((n,x)=>n+(h?x.b.w:x.b.h),0),span=h?box.r-box.l:box.b-box.t,gap=(span-total)/(s.length-1);let pos=h?box.l:box.t;
   for(const x of s){const size=h?x.b.w:x.b.h;if(h)x.i.x=pos+size/2;else x.i.y=pos+size/2;pos+=size+gap}}
  else for(const it of L){const b=bbox(it);if(kind==='left')it.x+=box.l-b.l;if(kind==='hcenter')it.x+=box.cx-b.cx;if(kind==='right')it.x+=box.r-b.r;if(kind==='top')it.y+=box.t-b.t;if(kind==='vcenter')it.y+=box.cy-b.cy;if(kind==='bottom')it.y+=box.b-b.b}
  renderItems();save()}
 WB.align=align;
 const alignBar=el('div','align-bar');alignBar.id='alignBar';
 const ALIGN=[['left','左对齐','<path d="M3 2v16M6 5h10M6 10h7M6 15h11"/>'],['hcenter','水平居中','<path d="M10 2v16M4 5h12M6 10h8M3 15h14"/>'],['right','右对齐','<path d="M17 2v16M4 5h10M7 10h7M3 15h11"/>'],
  ['top','顶对齐','<path d="M2 3h16M5 6v10M10 6v7M15 6v11"/>'],['vcenter','垂直居中','<path d="M2 10h16M5 4v12M10 6v8M15 3v14"/>'],['bottom','底对齐','<path d="M2 17h16M5 4v10M10 7v7M15 3v11"/>'],
  ['hdist','横向等距','<path d="M2 3v14M18 3v14M7 6v8M13 6v8"/>'],['vdist','纵向等距','<path d="M3 2h14M3 18h14M6 7h8M6 13h8"/>']];
 alignBar.innerHTML='<span class="ab-lbl">对齐</span>'+ALIGN.map(([k,t,p])=>`<button type="button" class="ab" data-al="${k}" title="${t}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${p}</svg></button>`).join('');
 alignBar.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>align(b.dataset.al));
 function placeAlign(){const L=targets(),row=$('#editBoxSelect')?.parentElement;if(!row)return;alignBar.hidden=!L.length;
  alignBar.querySelector('.ab-lbl').textContent=L.length>1?`对齐 ${L.length} 个`:'对齐页面';alignBar.querySelectorAll('[data-al$=dist]').forEach(b=>b.disabled=L.length<3);
  if(alignBar.previousElementSibling!==row)row.after(alignBar)}

 /* ================= P1 智能参考线 ================= */
 const guideLayer=el('div','smart-guides');$('#page').append(guideLayer);
 let snapOn=false;
 function guidesFor(it){const {W,H}=dims(),xs=[[0,'p'],[W/2,'p'],[W]],ys=[[0],[H/2],[H]];
  for(const o of state.items){if(o===it||o.hidden)continue;const b=bbox(o);xs.push([b.l],[b.cx],[b.r]);ys.push([b.t],[b.cy],[b.b])}return{xs:xs.map(v=>v[0]),ys:ys.map(v=>v[0])}}
 window.addEventListener('pointermove',e=>{if(!drag||drag.mode!=='move'||!drag.moved||e.shiftKey){if(snapOn&&!drag){guideLayer.innerHTML='';snapOn=false}return}
  const it=drag.it,b=bbox(it),g=guidesFor(it),th=6/S;let dx=null,dy=null,gx=null,gy=null;
  for(const [v,src] of [[b.l,'l'],[b.cx,'c'],[b.r,'r']])for(const x of g.xs){const d=x-v;if(Math.abs(d)<th&&(dx==null||Math.abs(d)<Math.abs(dx))){dx=d;gx=x}}
  for(const [v] of [[b.t],[b.cy],[b.b]])for(const y of g.ys){const d=y-v;if(Math.abs(d)<th&&(dy==null||Math.abs(d)<Math.abs(dy))){dy=d;gy=y}}
  if(dx!=null)it.x+=dx;if(dy!=null)it.y+=dy;if(dx!=null||dy!=null)quickPlace(it);
  guideLayer.innerHTML=(gx!=null?`<i class="gv" style="left:${gx*S}px"></i>`:'')+(gy!=null?`<i class="gh" style="top:${gy*S}px"></i>`:'');snapOn=true});
 window.addEventListener('pointerup',()=>{guideLayer.innerHTML='';snapOn=false});

 /* ================= 面板挂钩 ================= */
 const oldPanel=renderPanel;renderPanel=function(){$$('.v26-cardhid').forEach(e=>{e.hidden=false;e.classList.remove('v26-cardhid')});oldPanel.apply(this,arguments);const it=sel();
  renderCardEditor(it);if(it?.card)['#editPhotoSection','#editCropSection','#editColorSection','[data-edit-image]'].forEach(q=>$$(q).forEach(e=>{if(!e.hidden){e.hidden=true;e.classList.add('v26-cardhid')}}));placeAlign();paintEmpty()};
 const oldRender=renderItems;renderItems=function(){oldRender.apply(this,arguments);paintEmpty()};
 const oldGo=goPage;goPage=function(){const r=oldGo.apply(this,arguments);paintEmpty();return r};
 paintEmpty();drawerRender();
})();
