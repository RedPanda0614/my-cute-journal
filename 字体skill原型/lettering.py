#!/usr/bin/env python3
"""手帐字体效果 · 原型
python3 lettering.py --text "芝加哥" --style pen --out a.png
python3 lettering.py --sheet sheet.png          # 所有风格样张
字体都是 OFL / Apache,放在 fonts/。用 Chromium(playwright)渲染,透明底 PNG。
"""
import argparse, asyncio, html, os, random, pathlib
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).resolve().parent
F = HERE / 'fonts'

FONTS = {  # family -> file
 'LongCang':'LongCang-Regular.ttf','WenKai':'LXGWWenKai-Regular.ttf','MaShan':'MaShanZheng-Regular.ttf',
 'ZhiMang':'ZhiMangXing-Regular.ttf','QingKe':'ZCOOLQingKeHuangYou-Regular.ttf','KuaiLe':'ZCOOLKuaiLe-Regular.ttf',
 'GreatVibes':'GreatVibes-Regular.ttf','Pinyon':'PinyonScript-Regular.ttf','Delafield':'MrsSaintDelafield-Regular.ttf',
 'Dancing':'DancingScript.ttf','Allura':'Allura-Regular.ttf','Caveat':'Caveat.ttf','Reenie':'ReenieBeanie.ttf',
 'Elite':'SpecialElite-Regular.ttf','Courier':'CourierPrime-Regular.ttf','Shrikhand':'Shrikhand-Regular.ttf',
 'Abril':'AbrilFatface-Regular.ttf','Playfair':'PlayfairDisplay.ttf','RubikMono':'RubikMonoOne-Regular.ttf','Homemade':'HomemadeApple-Regular.ttf',
}
INK='#2b3550'; RED='#c0473a'; PAPER='#f6f1e6'

FILTERS = '''
<filter id="ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.6 1.15"/><feComposite in="SourceGraphic" operator="in"/></filter>
<filter id="wobble"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter>
<filter id="pencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.5" result="d"/><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="9"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2 1.5"/><feComposite in="d" operator="in"/></filter>
<filter id="stamp" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.08 0.6" numOctaves="3" seed="5"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3 2.1"/><feComposite in="SourceGraphic" operator="in"/></filter>
<filter id="drop"><feDropShadow dx="1.5" dy="2.5" stdDeviation="1.6" flood-color="#5a4a3a" flood-opacity=".28"/></filter>
'''

def e(s): return html.escape(s)

def style_svg(style, text, size):
    """返回 (svg内部, 宽, 高)。宽高用估算,渲染后再裁透明边。"""
    n=max(1,len(text)); W=int(size*n*1.15+size*1.2); H=int(size*2.0); y=int(size*1.3); x=int(size*0.5)
    t=e(text)
    def T(fam, fill='none', extra='', stroke='', sw=0, filt='', dx=0, dy=0, op=1):
        st=f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" paint-order="stroke"' if stroke else ''
        fl=f' filter="url(#{filt})"' if filt else ''
        return f'<text x="{x+dx}" y="{y+dy}" font-family="{fam}" font-size="{size}" fill="{fill}"{st}{fl} opacity="{op}" {extra}>{t}</text>'
    if style=='pen':            # 钢笔字
        return T('LongCang',INK,filt='ink'),W,H
    if style=='kai':            # 楷书手写
        return T('WenKai',INK,filt='ink'),W,H
    if style=='brush':          # 毛笔
        return T('MaShan','#222',filt='ink'),W,H
    if style=='script':         # 花体英文
        return T('GreatVibes',INK),int(W*0.75),H
    if style=='signature':      # 签名花体
        return T('Delafield',INK),int(W*0.8),int(H*1.1)
    if style=='copperplate':    # 铜版花体
        return T('Pinyon','#4a3b2a'),int(W*0.8),H
    if style=='handwrite':      # 手写英文
        return T('Caveat',INK,filt='ink'),int(W*0.7),H
    if style=='outline':        # 空心字
        f='QingKe' if any(ord(c)>127 for c in text) else 'RubikMono'
        return T(f,'none',stroke=INK,sw=size*0.035),W,H
    if style=='double-outline': # 双线空心
        f='QingKe' if any(ord(c)>127 for c in text) else 'RubikMono'
        return T(f,'none',stroke=RED,sw=size*0.14)+T(f,PAPER,stroke=PAPER,sw=size*0.07)+T(f,'none',stroke=RED,sw=size*0.02),W,H
    if style=='wobbly-outline': # 手绘抖动空心
        f='KuaiLe' if any(ord(c)>127 for c in text) else 'Shrikhand'
        return T(f,'none',stroke=INK,sw=size*0.03,filt='wobble'),W,H
    if style=='sticker':        # 白边贴纸字
        f='KuaiLe' if any(ord(c)>127 for c in text) else 'Shrikhand'
        return f'<g filter="url(#drop)">'+T(f,'#e9a23b',stroke='#fff',sw=size*0.22)+'</g>',W,H
    if style=='riso':           # 错位印刷
        f='QingKe' if any(ord(c)>127 for c in text) else 'Abril'
        return (f'<g style="mix-blend-mode:multiply">'+T(f,'#e2725b',dx=size*0.05,dy=size*0.04,op=.9,filt='ink')+T(f,'#3d7bb8',op=.85,filt='ink')+'</g>'),W,H
    if style=='shadow':         # 复古投影
        f='QingKe' if any(ord(c)>127 for c in text) else 'Shrikhand'
        return T(f,INK,dx=size*0.06,dy=size*0.06)+T(f,'#f2c14e',stroke=INK,sw=size*0.025),W,H
    if style=='pencil':         # 铅笔
        f='LongCang' if any(ord(c)>127 for c in text) else 'Reenie'
        return T(f,'#555',filt='pencil'),W,H
    if style=='typewriter':     # 打字机标签
        tw=int(size*0.62*n+size*0.9)
        return (f'<rect x="{x-size*0.3}" y="{y-size*0.95}" width="{tw}" height="{size*1.3}" fill="#efe3c8" transform="rotate(-1.5 {x} {y})" filter="url(#drop)"/>'
                +f'<text x="{x}" y="{y}" font-family="Elite" font-size="{size*0.8}" fill="#2a2a2a" filter="url(#ink)" transform="rotate(-1.5 {x} {y})">{t}</text>'),int(tw+size*1.2),H
    if style=='stamp':          # 印章
        f='MaShan' if any(ord(c)>127 for c in text) else 'Elite'
        w=int(size*n*1.05+size*0.6)
        return (f'<g filter="url(#stamp)" transform="rotate(-6 {x+w/2} {y-size*0.35})"><rect x="{x-size*0.25}" y="{y-size*1.05}" width="{w}" height="{size*1.4}" rx="{size*0.18}" fill="none" stroke="{RED}" stroke-width="{size*0.08}"/>'
                +f'<text x="{x+size*0.05}" y="{y}" font-family="{f}" font-size="{size}" fill="{RED}">{t}</text></g>'),int(w+size*1.3),int(H*1.2)
    if style=='ransom':         # 剪报拼字
        rnd=random.Random(text); out=[]; cx=x
        fams=['Abril','Elite','RubikMono','Shrikhand','Playfair','Courier','QingKe','KuaiLe','MaShan']
        bgs=['#f4efe3','#1f1f1f','#e9d8a6','#d8e2dc','#f2c6c2','#ffffff','#c9d6ea']
        for ch in text:
            if ch==' ': cx+=size*0.5; continue
            cjk=ord(ch)>127; fam=rnd.choice(['QingKe','KuaiLe','MaShan','WenKai'] if cjk else fams)
            bg=rnd.choice(bgs); fg='#f4efe3' if bg=='#1f1f1f' else rnd.choice(['#1f1f1f','#1f1f1f',RED,'#2f4a7a'])
            s=size*rnd.uniform(.8,1.05); w=s*(1.05 if cjk else .78); r=rnd.uniform(-7,7); yy=y+rnd.uniform(-size*.08,size*.08)
            out.append(f'<g transform="rotate({r:.1f} {cx+w/2:.1f} {yy-s*.35:.1f})" filter="url(#drop)"><rect x="{cx-s*.08:.1f}" y="{yy-s*.92:.1f}" width="{w+s*.16:.1f}" height="{s*1.18:.1f}" fill="{bg}"/>'
                       f'<text x="{cx+w/2:.1f}" y="{yy:.1f}" text-anchor="middle" font-family="{fam}" font-size="{s:.1f}" fill="{fg}">{e(ch)}</text></g>')
            cx+=w+s*.22
        return ''.join(out),int(cx+size*.6),int(H*1.1)
    raise SystemExit('未知风格: '+style)

STYLES = [('pen','钢笔字'),('kai','楷书手写'),('brush','毛笔'),('pencil','铅笔'),('script','花体英文'),('signature','签名花体'),('copperplate','铜版花体'),('handwrite','手写英文'),
          ('outline','空心字'),('double-outline','双线空心'),('wobbly-outline','手绘抖动空心'),('sticker','白边贴纸字'),('riso','错位印刷'),('shadow','复古投影'),
          ('typewriter','打字机标签'),('stamp','印章'),('ransom','剪报拼字')]

def page(svgs, bg='transparent'):
    ff=''.join(f'@font-face{{font-family:"{k}";src:url("fonts/{v}")}}' for k,v in FONTS.items())
    return f'<!doctype html><meta charset=utf-8><style>{ff}html,body{{margin:0;background:{bg}}}svg{{display:block}}</style><body>{svgs}</body>'

async def render(items, bg='transparent', sheet=False):
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(device_scale_factor=2)
        out=[]
        for (text,style,size,path) in items:
            inner,W,H=style_svg(style,text,size)
            svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><defs>{FILTERS}</defs>{inner}</svg>'
            hp=HERE/'_render.html'; hp.write_text(page(svg,bg),encoding='utf8')
            await pg.goto(hp.as_uri()); await pg.evaluate('document.fonts.ready')
            await pg.wait_for_timeout(150)
            await pg.locator('svg').screenshot(path=path, omit_background=(bg=='transparent'))
            out.append(path)
        await b.close(); return out

def trim(path, pad=12):
    from PIL import Image
    im=Image.open(path).convert('RGBA'); bb=im.getchannel('A').getbbox()
    if bb: im=im.crop((max(0,bb[0]-pad),max(0,bb[1]-pad),min(im.width,bb[2]+pad),min(im.height,bb[3]+pad)))
    im.save(path)

def make_sheet(path):
    from PIL import Image, ImageDraw, ImageFont
    tmp=HERE/'_tmp'; tmp.mkdir(exist_ok=True)
    samples={'pen':'今天去了湖边','kai':'慢慢走 慢慢看','brush':'芝加哥','pencil':'记得带外套','script':'Chicago Days','signature':'Sijie','copperplate':'Lovely Afternoon',
             'handwrite':'coffee & river walk','outline':'旅行手帐','double-outline':'DAY 01','wobbly-outline':'今日份快乐','sticker':'Yummy!','riso':'城市漫步',
             'shadow':'HELLO','typewriter':'Oct 16 · Riverwalk','stamp':'已打卡','ransom':'TRIP 旅行'}
    items=[(samples[s],s,72,str(tmp/f'{s}.png')) for s,_ in STYLES]
    asyncio.run(render(items))
    for it in items: trim(it[3])
    ims=[Image.open(it[3]) for it in items]
    cols=2; cw=900; pad=40
    rows=[ims[i:i+cols] for i in range(0,len(ims),cols)]
    labf=ImageFont.truetype(str(F/'LXGWWenKai-Regular.ttf'),26)
    hs=[max(min(im.height, 260)/2*1 for im in r)+80 for r in rows]
    Ht=int(sum(max(min(im.height//2,200) for im in r)+90 for r in rows)+pad*2+70)
    sh=Image.new('RGBA',(cols*cw+pad*2,Ht),PAPER); d=ImageDraw.Draw(sh)
    d.text((pad,pad-10),'手帐字体效果 · 原型样张',font=ImageFont.truetype(str(F/'LXGWWenKai-Regular.ttf'),36),fill=INK)
    yy=pad+70; k=0
    for r in rows:
        rh=max(min(im.height//2,200) for im in r)
        for j,im in enumerate(r):
            s,label=STYLES[k]; k+=1
            sc=min(1, (cw-60)/(im.width/2), 200/(im.height/2))*0.5
            im2=im.resize((int(im.width*sc),int(im.height*sc)),Image.LANCZOS)
            xx=pad+j*cw; sh.alpha_composite(im2,(xx,yy+28))
            d.text((xx,yy-4),f'{label} · {s}',font=labf,fill='#8a7a66')
        yy+=rh+90
    sh.convert('RGB').save(path,quality=92)

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--text'); ap.add_argument('--style',default='pen'); ap.add_argument('--size',type=int,default=96)
    ap.add_argument('--out',default='out.png'); ap.add_argument('--bg',default='transparent'); ap.add_argument('--sheet')
    a=ap.parse_args()
    if a.sheet: make_sheet(a.sheet)
    else: asyncio.run(render([(a.text,a.style,a.size,a.out)],a.bg)); trim(a.out)
