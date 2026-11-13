"""把一个本地字体文件加进手帐工作台(只放在自己电脑上,不进 GitHub 仓库)。
用法: python3 scripts/add_local_font.py 字体.ttf --name 字制区喜脉喜欢体 --tag 手写 --family "FontQu Smile" [--kind hand] [--lang zh] [--license 说明] [--source 网址]
会做: 复制到 网页源码/fonts/local/<id>.ttf, 写 <id>.json, 重新生成 网页源码/fonts/local/catalog.local.js
"""
import argparse, json, re, shutil
from hashlib import sha256
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1] / '网页源码' / 'fonts' / 'local'
ap = argparse.ArgumentParser()
ap.add_argument('ttf'); ap.add_argument('--name', required=True); ap.add_argument('--tag', default='手写')
ap.add_argument('--family', required=True); ap.add_argument('--kind', default='hand'); ap.add_argument('--lang', default='zh')
ap.add_argument('--license', default='作者声明免费商用(不可再分发)'); ap.add_argument('--source', default='')
a = ap.parse_args()
root.mkdir(parents=True, exist_ok=True)
fid = re.sub(r'[^a-z0-9]+', '', a.family.lower()) or 'localfont'
src = Path(a.ttf); ext = src.suffix.lower() if src.suffix.lower() in ('.ttf', '.otf') else '.ttf'
dst = root / f'{fid}{ext}'; shutil.copyfile(src, dst)
with TTFont(dst) as f:
    cps = sorted(f.getBestCmap())
ranges = []
for cp in cps:
    if ranges and cp == ranges[-1][1] + 1: ranges[-1][1] = cp
    else: ranges.append([cp, cp])
info = {'id': fid, 'family': a.family, 'name': a.name, 'language': a.lang, 'kind': a.kind, 'tag': a.tag,
        'file': f'local/{dst.name}', 'license': a.license, 'source': a.source, 'local': True,
        'sha256': sha256(dst.read_bytes()).hexdigest(), 'glyphs': len(cps), 'ranges': ranges}
(root / f'{fid}.json').write_text(json.dumps(info, ensure_ascii=False))
items = [json.loads(p.read_text()) for p in sorted(root.glob('*.json'))]
css = ''.join('@font-face{font-family:"%s";font-style:normal;font-weight:400;font-display:block;src:url("fonts/%s")}' % (i['family'], i['file']) for i in items)
js = ('/* 自动生成:本地字体(不进仓库)。改动请重新运行 scripts/add_local_font.py */\n'
      '(function(){const L=' + json.dumps(items, ensure_ascii=False) + ';\n'
      'for(const f of L){if(!FONT_CATALOG.some(x=>x.family===f.family))FONT_CATALOG.push(f)}\n'
      'const s=document.createElement("style");s.textContent=' + json.dumps(css, ensure_ascii=False) + ';document.head.append(s)})();\n')
(root / 'catalog.local.js').write_text(js)
print(f'OK {a.name} ({a.family}) {len(cps)} 个字符 -> {dst}')
