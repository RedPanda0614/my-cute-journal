async(page)=>{
 const p=page.context().browser().contexts().find(c=>c!==page.context()).pages()[0];
 const result=await p.evaluate(async()=>{
  const WB=WorkbenchExtras,results=[],assert=(v,n)=>{if(!v)throw Error(n);results.push(n)};
  await applyProject({paper:{size:'A5',cw:148,ch:210,landscape:false,spread:false},pages:[{id:'verify-page',kind:'cream',items:[]}],cur:0,assets:[],workInfo:{id:'verify-main',name:'验收作品'}});
  const c=cv(240,180),x=c.getContext('2d');x.fillStyle='#679bc3';x.fillRect(0,0,240,180);x.fillStyle='#e5a951';x.fillRect(40,30,80,110);
  const a=await addAsset(c.toDataURL(),{name:'蓝黄测试照片',source:'upload',cat:'photo'}),it=addItem(a,60,80,{w:60,h:45});setPane('tidy');
  await WB.patchImage(it,{edges:{sticker:'mid'}});await WB.patchImage(it,{photo:{frame:'film'}});await setFxW('sticker','');assert(it.photoSpec.frame==='film'&&!it.fxs.sticker,'A01 白边归零保留相框');
  const frame=$('#photoInline [data-k=frame]'),effect=$('#photoInline [data-k=effect]');frame.value='stamp';frame.dispatchEvent(new Event('change'));effect.value='mono';effect.dispatchEvent(new Event('change'));await WB.whenEditsSettled();assert(it.photoSpec.frame==='stamp'&&it.photoSpec.effect==='mono','A01 快速连续设置不丢参数');
  $('#editTone-exposure').value='.6';$('#editTone-exposure').dispatchEvent(new Event('change'));await WB.whenEditsSettled();await setFxW('torn','thin');await setFxW('torn','');assert(it.photoSpec.frame==='stamp'&&it.editRecipe.tone.exposure===.6&&!it.fxs.torn,'A01 相框调色撕边可组合归零');
  undo();await new Promise(r=>setTimeout(r,150));assert(state.items[0].fxs.torn==='thin','A01 撤销恢复配方');redo();await new Promise(r=>setTimeout(r,150));assert(!state.items[0].fxs.torn,'A01 重做恢复配方');
  const first=state.items[0],b=addItem(a,90,100,{w:20,h:15}),d=addItem(a,110,120,{w:20,h:15});layerPicked.clear();layerPicked.add(first.id);layerPicked.add(b.id);selId=d.id;renderItems();assert(selId===null&&$('#editTransformSection').hidden,'A03 多选清除外部焦点并隐藏单体属性');
  WB.transformSelection({dx:5,dy:7,angle:90,opacity:.6});assert(d.opacity===1&&d.x===110&&d.y===120,'A03 集合外图层未改变');assert(first.opacity===.6&&b.opacity===.6&&first.rot===90&&b.rot===90,'B06 共同透明度整体旋转');assert(Math.abs(Math.hypot(first.x-b.x,first.y-b.y)-Math.hypot(30,20))<.001,'B06 整体变换保持相对距离');
  b.locked=true;WB.transformSelection({dx:3});assert(b.x===70&&first.x===93,'B06 锁定图层被跳过');b.locked=false;
  const element=await WB.personalElements.snapshot('测试日期照片组合');assert(element.items.length===2&&element.assets.length>1,'B04 保存可编辑组合及源图');const originalX=first.x;const inserted=await WB.personalElements.insert(element);assert(inserted.length===2&&inserted[0].id!==first.id&&inserted[0].asset!==first.asset,'B04 插入生成独立对象及资产');inserted[0].x+=10;assert(first.x===originalX&&WB.personalElements.all()[0].items[0].x===element.items[0].x,'B04 修改副本不改变原组合');
  const frozen=JSON.stringify({x:first.x,y:first.y,w:first.w,h:first.h,rot:first.rot});await WB.fillPhoto(first,a);assert(frozen===JSON.stringify({x:first.x,y:first.y,w:first.w,h:first.h,rot:first.rot}),'B05 替换照片固定外框几何');
  const tapeResults=[];for(const widthMM of [5,15,25]){const tape=WB.makeTape(c,{x:0,y:0,w:240,h:80},{len:80,widthMM,mode:'repeat',alpha:.7,edge:'zig',base:'#fffaf0'});tapeResults.push([tape.width,tape.height]);assert(Math.abs(tape.width/tape.height-80/widthMM)<.01,'B07 '+widthMM+'mm 胶带长宽比');}
  setPane('assets');setTab('all');dq='蓝色蝴蝶';$('#dq').value=dq;drawerRender();assert([...$('#dgrid').querySelectorAll('.thumb')].some(e=>e.dataset.id==='os-butterfly-25'),'B03 蓝色蝴蝶可搜索');dq='圆形花框';$('#dq').value=dq;drawerRender();assert([...$('#dgrid').querySelectorAll('.thumb')].some(e=>e.dataset.id==='os-va-frames-16'),'B03 圆形花框可搜索');
  const custom=assets['os-butterfly-25'];custom.name='用户改过的蓝蝶';await applyProject(projectData());assert(assets[custom.id].name==='用户改过的蓝蝶','B03 保留用户自定义名称');
  setPane('assets');setTab('all');dq='';$('#dq').value='';drawerRender();const recentChip=$('#catChips [data-tab=__recent]');recentChip.onclick();dq='绝对不存在xyz';$('#dq').value=dq;drawerRender();assert(!$('#dgrid .thumb'),'B02 最近模式遵守搜索');dq='';$('#dq').value='';drawerRender();assert(!!$('#dgrid .thumb'),'B02 清空搜索恢复最近');
  for(let i=0;i<30;i++){MaterialLibrary.addMyTag('测试标签'+i);MaterialLibrary.createCollection('测试素材套'+i)}drawerRender();assert($('#dtabs').offsetHeight<=180&&$('#dgrid').clientHeight>=400,'B01 新增 30 组后素材空间有界');
  const out=await WB.renderExport('xhs',curPage(),'contain');assert(out.width===1080&&out.height===1440,'B08 成品 PNG 精确像素');const print=await WB.renderExport('print',curPage());assert(Math.abs(print.width-148*300/25.4)<2,'B08 打印 PNG 尺寸');
  save();await new Promise(r=>setTimeout(r,1000));await WB.flushDisk();assert($('#saveStatus').textContent.includes('已存磁盘'),'A04 浏览器和磁盘保存状态');
  return {passed:results,errors:auditErrors,ids:{photo:state.items[0].id,asset:a.id},tapeResults,header:$('#dtabs').offsetHeight,grid:$('#dgrid').clientHeight,elements:WB.personalElements.all().length};
 });
 return result;
}
