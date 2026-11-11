/* v36:「生图」面板改成推荐 skill 卡片
   每张卡片:示例图 + 名字 + 一句话。点开看大图,下面是可以直接复制给自己 AI 的 prompt。
   示例图来自各 skill 仓库(都是 MIT 协议),放在 素材库/skill示例/。 */
(function(){
 const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 const SK=[
  {id:'city-sticker',name:'城市地标贴纸',does:'把城市地标画成风格统一的手绘贴纸',repo:'fishjoyness/city-sticker',ask:'城市:【填城市名,比如 芝加哥】\n地标:【可以不填,让它自己挑 6 个】\n要求:透明底 PNG,每个地标单独一张,风格统一。'},
  {id:'make-journal-material',name:'照片变复古素材',does:'从照片里提炼出一整套复古水粉剪纸风素材',repo:'emmaCCdesign/make-journal-material-skill',ask:'我会附上 1 张照片。\n要求:做成一套手帐素材,透明底 PNG,每个素材分开。'},
  {id:'watercolor-sticker-kit',name:'水彩贴纸',does:'挑出照片里的小物件,逐个画成水彩贴纸',repo:'Jin-xu13/watercolor-sticker-kit',ask:'我会附上 1 张照片。\n要求:挑出照片里 4 到 8 个小物件,每个做成透明底水彩贴纸。'},
  {id:'picture-skill',name:'钢笔淡彩插画',does:'照片变成钢笔淡彩的旅行手帐插画,边缘淡出',repo:'LiyuTian-web/picture-skill',ask:'我会附上 1 张照片。\n要求:钢笔淡彩风格,边缘自然淡出,可以加一行小字:【可以不填】。'},
  {id:'morse-illustration',name:'淡彩手帐插画',does:'日常照片变成拟物主体加淡彩背景的 3:4 插画',repo:'tiansuiwan611-stack/morse-skeuomorphic-illustration-skill',ask:'我会附上 1 张照片。\n要求:3:4 竖图,主体清楚,背景淡彩留白。'},
  {id:'monthly-zine-postcard',name:'月历明信片',does:'一张照片做成带日期的 3:4 月历 zine 明信片',repo:'shenchangyi/photo-to-monthly-zine-postcard',ask:'我会附上 1 张照片。\n月份:【比如 11 月】\n要求:3:4 竖版,低饱和,留白多一点。'},
  {id:'minimal-zine-poster',name:'极简 zine 海报',does:'大留白的安静海报,一个小图加几行字',repo:'LiamGvchi/gc-minimal-zine-poster',ask:'我会附上 1 张照片(也可以不附)。\n想表达的:【一句话,比如 秋天的第一次散步】\n要求:大留白,米白纸底,字少。'},
  {id:'scrapbook-collage',name:'照片手作拼贴',does:'1 到 8 张照片做成撕纸、胶带的手作拼贴',repo:'ShaineDemo/scrapbook-photo-collage-skill',ask:'我会附上 1 到 8 张照片。\n标题:【比如 Life, lately】\n要求:撕纸、胶带、手写感小字,多张时再出一张合集。'},
  {id:'torn-paper',name:'撕纸画',description:'',does:'照片变成层层撕纸的拼贴画',repo:'zhu135531-hue/photo-to-torn-paper',ask:'我会附上 1 张照片。\n要求:撕纸拼贴风格,纸的毛边明显。'},
  {id:'photo-echo',name:'原图加小景',does:'保留原图,再配一枚呼应它的小插画',repo:'Michaeloan/photo-echo-skill',ask:'我会附上 1 张照片。\n要求:原图不改,下面配一个和它呼应的小景插画。'},
 ];
 const img=s=>`素材库/skill示例/${s.id}.webp`,url=s=>`https://github.com/${s.repo}`;
 const prompt=s=>`请用 GitHub 上的「${s.repo.split('/')[1]}」skill 帮我做:${s.does}。\nskill 地址:${url(s)}\n\n${s.ask}\n\n做好后把图片发给我,我要放进电子手帐里。`;
 function open(s){
  $('#mbox').innerHTML=`<h3>${esc(s.name)}</h3><div class="sk-detail"><img src="${img(s)}" alt="${esc(s.name)}示例"><div class="sk-side"><p class="mini">${esc(s.does)}。示例图来自这个 skill 的仓库。</p>
   <div class="mrow"><span>skill</span><a href="${url(s)}" target="_blank" rel="noopener">${esc(s.repo)}</a></div>
   <textarea class="txt sk-prompt" id="skPrompt" spellcheck="false"></textarea>
   <p class="mini">【】里的可以改成你的,也可以删掉。</p></div></div>
   <div class="row" style="justify-content:flex-end;gap:6px;margin-top:10px"><button class="tag" id="skClose">关闭</button><button class="tag red" id="skCopy">复制 prompt</button></div>`;
  $('#skPrompt').value=prompt(s);
  $('#skClose').onclick=closeModal;
  $('#skCopy').onclick=async()=>{const v=$('#skPrompt').value;try{await navigator.clipboard.writeText(v);toast('复制好了,粘贴给你的 AI 就行')}catch(e){$('#skPrompt').select();document.execCommand('copy');toast('复制好了')}};
  openModal(true)}
 function paint(){const pane=$('.pn[data-pane="ai"]');if(!pane)return;const h=pane.querySelector('h3');if(h)h.textContent='推荐 skill';
  let intro=pane.querySelector('.sk-intro');if(!intro){intro=document.createElement('p');intro.className='mini sk-intro';h.after(intro)}
  intro.textContent='挑一个喜欢的效果,复制 prompt 给你的 AI。做好的图用下面的「导入图片」放进素材栏。';
  const box=$('#skillCards');box.className='sk-grid';box.innerHTML='';
  for(const s of SK){const b=document.createElement('button');b.type='button';b.className='sk-card';
   b.innerHTML=`<span class="sk-pic"><img src="${img(s)}" alt="" loading="lazy"></span><b>${esc(s.name)}</b><span class="mini">${esc(s.does)}</span>`;b.onclick=()=>open(s);box.append(b)}
  const h2=[...pane.querySelectorAll('h3')][1];if(h2)h2.textContent='把做好的图放回来'}
 window.workbenchReady?.then(paint);paint();
})();
