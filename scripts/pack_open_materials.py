import json,base64,os,shutil,sys
SRC=sys.argv[1];WEB=sys.argv[2]
items=json.load(open(os.path.join(SRC,'_list.json')))
dst=os.path.join(WEB,'素材库','开源');os.makedirs(dst,exist_ok=True)
LIC={'vintageart':('WelshPixie/vintageart(19 世纪末到 20 世纪初公有领域印刷品描摹)','CC0 1.0','https://github.com/WelshPixie/vintageart'),
     'doodle':('Doodle Icons · Khushmeen Sidhu','CC0 1.0','https://khushmeen.com/icons.html')}
out=[]
for it in items:
  shutil.copy(os.path.join(SRC,it['file']),os.path.join(dst,it['file']))
  b=base64.b64encode(open(os.path.join(SRC,it['file']),'rb').read()).decode()
  c,l,u=LIC[it['src']]
  out.append(dict(id=it['id'],name=it['name'],cat=it['cat'],tags=it['tags'],style=it['style'],credit=c,license=l,data='data:image/webp;base64,'+b))
js='/* 开源素材包:由 scripts/pack_open_materials 生成。图片原件在 素材库/开源/,来源和许可见 素材库/开源/来源和许可.md */\nwindow.OPEN_MATERIALS='+json.dumps({'items':out},ensure_ascii=False,separators=(',',':'))+';\n'
open(os.path.join(WEB,'open-materials.js'),'w').write(js)
by={}
for it in items: by.setdefault(it['src'],[]).append(it)
md=['# 开源素材 · 来源和许可','','这些素材都可以免费用,包括商用,不用署名。工作台里在素材栏能找到,标签「开源」。','']
for k,v in by.items():
  c,l,u=LIC[k];md+= [f'## {c}','',f'- 许可:{l}(公有领域贡献,可以随便用、改、商用)',f'- 来源:{u}',f'- 数量:{len(v)} 个','','| 文件 | 名字 | 原文件 |','|---|---|---|']+[f"| {i['file']} | {i['name']} | {i['orig']} |" for i in v]+['']
md+=['## 处理方式','','- 原图是黑白线稿(SVG),这里转成 WebP,颜色换成深棕墨色,背景透明。','']
open(os.path.join(dst,'来源和许可.md'),'w').write('\n'.join(md))
print(len(out),os.path.getsize(os.path.join(WEB,'open-materials.js'))//1024,'KB')
