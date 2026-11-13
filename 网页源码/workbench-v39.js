/* v39:粘贴图片
   在别的地方复制图片 → 回到工作台(可以先点一下纸上想放的位置)→ ⌘V / Ctrl+V。
   图片存成「我的上传」里的素材,放到纸上;左边跳到素材栏「全部」,滚到这张新素材并闪一下。 */
(function(){
 const $=s=>document.querySelector(s);
 // 记住最近一次点在纸上的位置(mm),粘贴就放在那里;没点过就放在页面中间
 let lastAt=null;
 document.addEventListener('pointerdown',e=>{const page=$('#page');if(!page||!page.contains(e.target)){if(!e.target.closest?.('#desk'))return;lastAt=null;return}
  const r=page.getBoundingClientRect();lastAt={x:(e.clientX-r.left)/S,y:(e.clientY-r.top)/S,t:Date.now()}},true);
 const typing=()=>{const a=document.activeElement;return a&&(a.matches('input,textarea,select,[contenteditable],[contenteditable] *'))};
 const pad=n=>String(n).padStart(2,'0');
 function shrink(src){return new Promise((ok,no)=>{const im=new Image();im.onload=()=>{const k=Math.min(1,2400/Math.max(im.naturalWidth,im.naturalHeight));if(k===1&&src.startsWith('data:'))return ok(src);
  const c=cv(Math.round(im.naturalWidth*k),Math.round(im.naturalHeight*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/png'))};im.onerror=no;im.src=src})}
 const readFile=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)});
 // 在素材栏里找到这张素材:切到「我的上传」,滚过去,闪一下
 function reveal(id){setPane('assets');setTab('all');requestAnimationFrame(()=>{const t=document.querySelector(`#dgrid .thumb[data-id="${id}"]`);if(!t)return;t.scrollIntoView({block:'center',behavior:'smooth'});t.classList.remove('just-added');void t.offsetWidth;t.classList.add('just-added');setTimeout(()=>t.classList.remove('just-added'),2400)})}
 async function pasteImages(files){const {W,H}=dims();let n=0,last=null;
  for(const f of files){try{const src=await shrink(await readFile(f)),d=new Date(),name=`粘贴 ${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`+(files.length>1?` (${n+1})`:'');
   const a=await addAsset(src,{name,source:'upload',cat:'uncategorized',tags:[]});
   const at=lastAt&&Date.now()-lastAt.t<10*60*1000?lastAt:{x:W/2,y:H/2},w=Math.min(W*.5,60);
   addItem(a,Math.min(W,Math.max(0,at.x+n*6)),Math.min(H,Math.max(0,at.y+n*6)),{w});last=a;n++}catch(e){console.warn(e)}}
  if(!last)return toast('没读到图片');drawerRender();reveal(last.id);toast(n>1?`粘贴了 ${n} 张图,也存进了「我的上传」`:'粘贴好了,也存进了「我的上传」')}
 document.addEventListener('paste',e=>{if(typing()||$('#modal')?.classList.contains('show'))return;
  const files=[...(e.clipboardData?.items||[])].filter(i=>i.kind==='file'&&i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);
  if(!files.length)return;e.preventDefault();pasteImages(files)});
 window.WorkbenchExtras&&(window.WorkbenchExtras.pasteImages=pasteImages);
})();
