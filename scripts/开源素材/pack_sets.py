"""把处理好的素材打包成「素材套」:
网页源码/open-materials.js            目录 + 小缩略图
网页源码/素材库/开源/<套>/*.webp       原图
网页源码/素材库/开源/<套>/data.js      这一套的大图(工作台用到时才载入)
网页源码/素材库/开源/来源和许可.md
"""
import json, os, io, base64, shutil, glob
from PIL import Image
WEB = '/home/claude/my-cute-journal/网页源码'
OUT = os.path.join(WEB, '素材库', '开源')
SETS = [
    ('vintage', '复古版画', 'WelshPixie/vintageart:19 世纪末到 20 世纪初公有领域印刷品的描摹', 'CC0 1.0', 'https://github.com/WelshPixie/vintageart'),
    ('moths', '蛾蝶花草', 'Benjamin Wilkes《The English Moths and Butterflies》(18 世纪手绘图谱)', '公有领域', 'https://www.gutenberg.org/ebooks/73622'),
    ('wildflower', '英国野花', 'Edward Step《Wayside and Woodland Blossoms》(1895)', '公有领域', 'https://www.gutenberg.org/ebooks/59035'),
    ('greenaway', '格林纳威花语', 'Kate Greenaway《Language of Flowers》(1884)', '公有领域', 'https://www.gutenberg.org/ebooks/31591'),
    ('birds', '牙买加鸟类', 'P. H. Gosse《Illustrations of the Birds of Jamaica》(1849)', '公有领域', 'https://www.gutenberg.org/ebooks/73392'),
    ('butterfly', '蝴蝶图鉴', 'W. J. Holland《The Butterfly Guide》(1915)', '公有领域', 'https://www.gutenberg.org/ebooks/73524'),
    ('trees', '熟悉的树', 'G. S. Boulger《Familiar Trees》(20 世纪初),扫描来自 GitHub boxbot6', '公有领域', 'https://github.com/boxbot6/illustrations-from-familiar-trees-by-g-s-boulger'),
    ('initials', '木刻首字母', 'Oscar Jennings《Early Woodcut Initials》(1908)', '公有领域', 'https://www.gutenberg.org/ebooks/65847'),
    ('printers', '印刷花饰', 'H. R. Plomer《English Printers\' Ornaments》(1924)', '公有领域', 'https://www.gutenberg.org/ebooks/70528'),
    ('wallpaper', '复古墙纸', 'rec0de/papertiles:Historic New England 与 Smithsonian 藏的老墙纸,做成可平铺', '公有领域', 'https://github.com/rec0de/papertiles'),
]
jobs = json.load(open('/home/claude/dl/jobs.json'))
old = [i for i in json.load(open('/home/claude/dl/open_out/_list.json')) if i['src'] == 'vintageart']
items_by = {s[0]: [] for s in SETS}
for i in old:
    items_by['vintage'].append(dict(id=i['id'], name=i['name'], src_file=os.path.join('/home/claude/dl/set_out2/vintage', i['file']), orig=i['orig'], tags=[t for t in i['tags'] if t != '版画'], style='retro'))
for j in jobs:
    f = f"/home/claude/dl/set_out2/{j['set']}/{j['id']}.webp"
    if os.path.exists(f):
        items_by[j['set']].append(dict(id=j['id'], name=j['name'], src_file=f, orig=os.path.relpath(j['src'], '/home/claude/dl/sets'), tags=[], style='retro'))
# 旧的平铺文件清掉
for f in glob.glob(os.path.join(OUT, '*.webp')):
    os.remove(f)
manifest = {'sets': [], 'items': []}
md = ['# 开源素材 · 来源和许可', '', '一共 10 套,都可以免费用,包括商用。工作台素材栏「素材套」那一行,一套一个标签。', '',
      '- 「公有领域」:原书出版很早,版权已经过期。图片来自古登堡计划(Project Gutenberg)在 GitHub 上的镜像 GITenberg 等。',
      '- 「CC0 1.0」:作者放弃了全部权利。', '- 处理:像用剪刀剪下来的贴纸——外轮廓里面不透明,保留原书纸色(木刻和版画是米白纸 + 深棕墨),边上留一圈细纸边;墙纸保持原样。', '']
for sid, name, credit, lic, url in SETS:
    lst = items_by[sid]
    if not lst:
        continue
    d = os.path.join(OUT, sid)
    os.makedirs(d, exist_ok=True)
    data = {}
    for it in lst:
        dst = os.path.join(d, it['id'] + '.webp')
        shutil.copy(it['src_file'], dst)
        raw = open(dst, 'rb').read()
        data[it['id']] = 'data:image/webp;base64,' + base64.b64encode(raw).decode()
        im = Image.open(io.BytesIO(raw))
        w, h = im.size
        th = im.copy()
        th.thumbnail((140, 140), Image.LANCZOS)
        b = io.BytesIO()
        th.save(b, 'WEBP', quality=72, alpha_quality=70, method=4)
        manifest['items'].append(dict(id=it['id'], set=sid, name=it['name'], w=w, h=h, tags=it['tags'], style=it['style'], thumb='data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()))
    with open(os.path.join(d, 'data.js'), 'w') as f:
        f.write(f"/* 素材套「{name}」的大图 */\n(window.OPEN_SET_DATA=window.OPEN_SET_DATA||{{}})[{json.dumps(sid)}]=" + json.dumps(data, separators=(',', ':')) + ';\n')
    manifest['sets'].append(dict(id=sid, name=name, credit=credit, license=lic, url=url, file=f'素材库/开源/{sid}/data.js', count=len(lst)))
    md += [f'## {name}({len(lst)} 个)', '', f'- 出处:{credit}', f'- 许可:{lic}', f'- 链接:{url}', f'- 文件夹:`{sid}/`', '']
with open(os.path.join(WEB, 'open-materials.js'), 'w') as f:
    f.write('/* 开源素材目录 + 缩略图(scripts/pack_open_sets.py 生成)。大图按套放在 素材库/开源/<套>/data.js */\nwindow.OPEN_MATERIALS=' + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(os.path.join(OUT, '来源和许可.md'), 'w').write('\n'.join(md))
for old_md in ['_list.json']:
    p = os.path.join(OUT, old_md)
    if os.path.exists(p):
        os.remove(p)
print(len(manifest['items']), {s['id']: s['count'] for s in manifest['sets']}, os.path.getsize(os.path.join(WEB, 'open-materials.js')) // 1024, 'KB')
