#!/usr/bin/env python3
"""手帐标题字 v2:更像手画的标题设计。
python3 titles.py --sheet titles.jpg     所有样式
python3 titles.py --style bounce --text "chicago" --sub "OCT 16 · 18" --out a.png
"""
import argparse, asyncio, html, math, random, pathlib
from fontTools.ttLib import TTFont
from playwright.async_api import async_playwright
HERE=pathlib.Path(__file__).resolve().parent; F=HERE/'fonts'
FONTS={'Pacifico':'Pacifico-Regular.ttf','Sacramento':'Sacramento-Regular.ttf','Bagel':'BagelFatOne-Regular.ttf','Amatic':'AmaticSC-Bold.ttf',
 'Gaegu':'Gaegu-Bold.ttf','NanumPen':'NanumPenScript-Regular.ttf','Gochi':'GochiHand-Regular.ttf','Shadows':'ShadowsIntoLight.ttf','CaveatBrush':'CaveatBrush-Regular.ttf',
 'Shrikhand':'Shrikhand-Regular.ttf','Yozai':'Yozai-Regular.ttf','Xiaolai':'Xiaolai-Regular.ttf','KuaiLe':'ZCOOLKuaiLe-Regular.ttf','LongCang':'LongCang-Regular.ttf',
 'Elite':'SpecialElite-Regular.ttf','GreatVibes':'GreatVibes-Regular.ttf','Caveat':'Caveat.ttf','WenKai':'LXGWWenKai-Regular.ttf'}
INK='#2b3550'; TER='#c8644b'; MUS='#e0a93b'; SAGE='#8aa38b'; BLUE='#7b9cc0'; PINK='#e8a5a0'; CREAM='#f6f1e6'; BROWN='#6b4f3a'
_tt={}
def adv(fam,ch,size):
    f=_tt.get(fam)
    if f is None: f=_tt[fam]=TTFont(F/FONTS[fam],lazy=True)
    cm=f.getBestCmap(); upm=f['head'].unitsPerEm
    g=cm.get(ord(ch))
    if g is None: return size*(0.95 if ord(ch)>127 else 0.5), False
    return f['hmtx'][g][0]/upm*size, True
def has(fam,text): return all(adv(fam,c,10)[1] or c==' ' for c in text)
e=html.escape

DEFS='''<defs>
<filter id="wob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
<filter id="wob2" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="11"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter>
<filter id="wob3" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="1" seed="23"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>
<filter id="fauxcal" x="-10%" y="-10%" width="120%" height="120%"><feMorphology operator="dilate" radius="3.2 0.2"/><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" scale="0"/></filter>
<filter id="fauxcal2" x="-10%" y="-10%" width="120%" height="120%"><feMorphology operator="dilate" radius="3.2 0.3" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="6"/><feDisplacementMap in="d" scale="3"/></filter>
<filter id="inline" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="erode" radius="5" result="a"/><feMorphology in="SourceAlpha" operator="erode" radius="7" result="b"/><feComposite in="a" in2="b" operator="out" result="ring"/><feFlood flood-color="#fffaf0"/><feComposite in2="ring" operator="in" result="w"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="w"/></feMerge></filter>
<filter id="marker" x="-5%" y="-30%" width="110%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="2" seed="8" result="n"/><feColorMatrix in="n" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.5 1.6" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="t"/><feTurbulence type="fractalNoise" baseFrequency="0.03" seed="3" result="w"/><feDisplacementMap in="t" in2="w" scale="8"/></filter>
<filter id="grain" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.5 1.15"/><feComposite in="SourceGraphic" operator="in"/></filter>
</defs>'''

def run(text,fam,size,x,y,*,seed=1,bounce=0,rot=0,sj=0,track=0,colors=None,attrs='',per=None,anchor_center=False):
    """逐字排版:弹跳、旋转、大小随机。返回 (svg, 宽度, 各字位置)。"""
    r=random.Random(seed); out=[]; cx=x; pos=[]
    for i,ch in enumerate(text):
        a,_=adv(fam,ch,size)
        if ch==' ': cx+=a+track; continue
        s=size*(1+r.uniform(-sj,sj)); dy=(r.uniform(-1,1)*bounce) if bounce else 0
        if bounce and i%2==1: dy=abs(dy)*0.8
        ang=r.uniform(-rot,rot)
        col=colors[i%len(colors)] if colors else None
        extra=per(i,ch,cx,y+dy,s) if per else ''
        fill=f' fill="{col}"' if col else ''
        out.append(f'{extra}<text x="{cx:.1f}" y="{y+dy:.1f}" font-family="{fam}" font-size="{s:.1f}"{fill} transform="rotate({ang:.1f} {cx+a/2:.1f} {y+dy-s*0.3:.1f})" {attrs}>{e(ch)}</text>')
        pos.append((cx,y+dy,a*s/size,s)); cx+=a*s/size+track
    return ''.join(out), cx-x, pos

# ---------- 手绘小装饰 ----------
def jit(r,v,a): return v+r.uniform(-a,a)
def sparkle(x,y,s,col=MUS,seed=0):
    r=random.Random(seed); p=[]
    for k in range(4):
        ang=k*math.pi/2+r.uniform(-.15,.15); L=s*(1 if k%2==0 else .75)
        p.append((x+math.cos(ang)*L,y+math.sin(ang)*L))
    d=f'M{p[0][0]:.1f},{p[0][1]:.1f} Q{x:.1f},{y:.1f} {p[1][0]:.1f},{p[1][1]:.1f} Q{x:.1f},{y:.1f} {p[2][0]:.1f},{p[2][1]:.1f} Q{x:.1f},{y:.1f} {p[3][0]:.1f},{p[3][1]:.1f} Q{x:.1f},{y:.1f} {p[0][0]:.1f},{p[0][1]:.1f}Z'
    return f'<path d="{d}" fill="{col}" stroke="{col}" stroke-width="1.2" stroke-linejoin="round"/>'
def star(x,y,s,col=MUS,seed=0,fill=True):
    r=random.Random(seed); pts=[]
    for k in range(10):
        ang=-math.pi/2+k*math.pi/5+r.uniform(-.08,.08); L=s*(1 if k%2==0 else .45)*r.uniform(.9,1.1)
        pts.append(f'{x+math.cos(ang)*L:.1f},{y+math.sin(ang)*L:.1f}')
    return f'<polygon points="{" ".join(pts)}" fill="{col if fill else "none"}" stroke="{col}" stroke-width="2" stroke-linejoin="round"/>'
def dot(x,y,s,col): return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{s:.1f}" fill="{col}"/>'
def heart(x,y,s,col=TER):
    return f'<path d="M{x},{y+s*.35} C{x-s*1.1},{y-s*.4} {x-s*.4},{y-s*1.1} {x},{y-s*.45} C{x+s*.4},{y-s*1.1} {x+s*1.1},{y-s*.4} {x},{y+s*.35}Z" fill="{col}" transform="rotate(-8 {x} {y})"/>'
def swash(x1,x2,y,col=INK,w=3,seed=0,loop=True):
    r=random.Random(seed); L=x2-x1
    if loop:
        d=(f'M{x1:.1f},{y:.1f} C{x1+L*.25:.1f},{y+12:.1f} {x1+L*.55:.1f},{y+10:.1f} {x1+L*.7:.1f},{y+2:.1f} '
           f'C{x1+L*.78:.1f},{y-6:.1f} {x1+L*.7:.1f},{y-16:.1f} {x1+L*.64:.1f},{y-6:.1f} C{x1+L*.6:.1f},{y+6:.1f} {x1+L*.85:.1f},{y+12:.1f} {x2:.1f},{y-4:.1f}')
    else:
        d=f'M{x1:.1f},{y:.1f} Q{(x1+x2)/2:.1f},{y+r.uniform(8,14):.1f} {x2:.1f},{y-r.uniform(2,6):.1f}'
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" filter="url(#wob)"/>'
def hilite(x,y,w,h,col=MUS,op=.55,rot=-1.5):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{h*.3:.1f}" fill="{col}" opacity="{op}" filter="url(#marker)" transform="rotate({rot} {x+w/2:.1f} {y+h/2:.1f})" style="mix-blend-mode:multiply"/>'
def sprig(x,y,s,col=SAGE,seed=0,flip=False):
    r=random.Random(seed); m=-1 if flip else 1
    out=[f'<path d="M{x},{y} q{m*s*.6},{-s*.2} {m*s*1.4},{-s*.9}" fill="none" stroke="{col}" stroke-width="2.2" stroke-linecap="round"/>']
    for k in range(4):
        t=.2+k*.22; px=x+m*s*1.4*t; py=y-s*.9*t*t*1.1
        for sgn in (-1,1):
            ang=(-60 if sgn<0 else 20)*m+r.uniform(-10,10)
            out.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{s*.2:.1f}" ry="{s*.08:.1f}" fill="{col}" transform="rotate({ang:.0f} {px:.1f} {py:.1f}) translate({s*.17*sgn*m:.1f},0)"/>')
    return ''.join(out)
def cloud(x,y,s,col=BLUE):
    return f'<path d="M{x},{y} q{-s*.5},0 {-s*.45},{-s*.4} q0,{-s*.45} {s*.45},{-s*.4} q{s*.15},{-s*.45} {s*.6},{-s*.3} q{s*.45},{-s*.05} {s*.45},{s*.35} q{s*.4},{s*.05} {s*.3},{s*.4} q{-s*.1},{s*.35} {-s*.45},{s*.35}Z" fill="none" stroke="{col}" stroke-width="2.4" stroke-linejoin="round" filter="url(#wob)"/>'

# ---------- 样式 ----------
def S_bounce(t='chicago',sub='OCT 16 · 18'):
    body,w,_=run(t,'Sacramento',150,30,150,seed=3,bounce=14,rot=6,sj=.1,attrs=f'fill="{INK}" filter="url(#fauxcal2)"')
    s2,w2,_=run(sub,'Elite',26,30+w*.42,262,track=6,attrs=f'fill="{TER}"')
    deco=swash(40,30+w*.9,222,TER,3,1)+sparkle(30+w+10,70,18,MUS,1)+sparkle(30+w-30,40,10,MUS,2)+dot(30+w+30,100,4,PINK)
    return body+deco+s2, w+90, 290
def S_bubble(t='TRIP'):
    cols=[TER,MUS,SAGE,BLUE,PINK]
    def per(i,ch,x,y,s): return ''
    sh,w,pos=run(t,'Bagel',150,40,170,seed=5,bounce=10,rot=8,sj=.06,track=4,attrs=f'fill="none" stroke="{INK}" stroke-width="3" transform-origin="0 0" filter="url(#wob)"')
    sh=sh.replace('<text x="','<text dx="9" dy="9" x="')   # 线条阴影
    body,_,_=run(t,'Bagel',150,40,170,seed=5,bounce=10,rot=8,sj=.06,track=4,colors=cols,attrs=f'stroke="{INK}" stroke-width="3.5" paint-order="stroke" filter="url(#wob)"')
    hl=''.join(f'<path d="M{x+a*.2:.1f},{y-s*.55:.1f} q{a*.06:.1f},{-s*.1:.1f} {a*.18:.1f},{-s*.13:.1f}" stroke="#fffaf0" stroke-width="6" stroke-linecap="round" fill="none"/>' for (x,y,a,s) in pos)
    deco=''.join(dot(40+random.Random(k).uniform(0,w),random.Random(k+9).choice([30,195]),random.Random(k).uniform(3,6),cols[k%5]) for k in range(9))
    return sh+body+hl+deco, w+90, 230
def S_combo(a='the',b='WEEKEND',c='in chicago'):
    t1,w1,_=run(a,'GreatVibes',70,40,75,seed=2,attrs=f'fill="{TER}"')
    t2,w2,_=run(b,'Amatic',140,30,190,track=6,seed=3,rot=1.5,attrs=f'fill="{INK}" filter="url(#wob)"')
    t3,w3,_=run(c,'Pacifico',64,30+w2*.38,250,seed=4,rot=3,attrs=f'fill="{SAGE}" stroke="{CREAM}" stroke-width="10" paint-order="stroke"')
    deco=star(30+w2+20,85,16,MUS,1)+star(30+w2-5,125,8,MUS,3,False)+hilite(25,150,w2+10,40,PINK,.45)
    return deco+t1+t2+t3, max(w2,w3+w2*.38)+90, 290
def S_sketch(t='芝加哥'):
    fam='KuaiLe'
    lay=''.join(run(t,fam,140,40,165,seed=2,rot=3,track=8,attrs=f'fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" filter="url(#{f})" opacity="{op}"')[0]
                for f,sw,op in (('wob',3,1),('wob2',2,.8),('wob3',1.5,.6)))
    _,w,_=run(t,fam,140,40,165,track=8)
    return hilite(30,110,w+20,58,MUS,.5)+lay+sparkle(40+w+15,55,16,TER,4), w+90, 210
def S_fauxcal(t='hello october'):
    body,w,_=run(t,'Sacramento',110,90,140,seed=7,bounce=6,rot=3,attrs=f'fill="{BROWN}" filter="url(#fauxcal2)"')
    return sprig(90+w+5,150,60,SAGE,1)+sprig(80,150,50,SAGE,2,True)+body+dot(90+w*.55,40,4,TER)+dot(90+w*.6,28,2.5,MUS), w+190, 200
def S_cn_cute(t='今日份快乐'):
    fam='Yozai' if has('Yozai',t) else 'Xiaolai'
    def per(i,ch,x,y,s):
        return f'<circle cx="{x+s*.48:.1f}" cy="{y-s*.33:.1f}" r="{s*.42:.1f}" fill="{[PINK,MUS,SAGE,BLUE,PINK][i%5]}" opacity=".55" transform="translate({s*.07:.1f},{s*.06:.1f})"/>'
    body,w,pos=run(t,fam,96,40,140,seed=9,bounce=10,rot=6,sj=.12,per=per,attrs=f'fill="{INK}" filter="url(#grain)"')
    deco=heart(40+w+18,70,16,TER)+f'<path d="M45,175 H{40+w}" stroke="{INK}" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>'
    return body+deco, w+80, 200
def S_kdaku(t="today's record",sub='2026. 10. 16'):
    body,w,pos=run(t,'NanumPen',80,40,110,seed=4,track=9,rot=3,attrs=f'fill="{INK}"')
    blobs=''.join(f'<circle cx="{x+a*.55:.1f}" cy="{y-s*.28:.1f}" r="{s*.24:.1f}" fill="{[PINK,MUS,BLUE][i%3]}" opacity=".45"/>' for i,(x,y,a,s) in enumerate(pos) if i in (0,5,9))
    s2,_,_=run(sub,'Gaegu',30,44,155,track=3,attrs=f'fill="{TER}"')
    deco=cloud(40+w+50,80,46,BLUE)+star(40+w+5,40,9,MUS,6)+dot(40+w+20,120,3,PINK)
    return blobs+body+s2+deco, w+180, 180
def S_flags(t='DAY 01'):
    letters=[c for c in t if c!=' ']; n=len(letters); W=n*72+80; out=[]
    d=f'M30,40 Q{W/2:.0f},90 {W-30},40'
    out.append(f'<path d="{d}" fill="none" stroke="{BROWN}" stroke-width="2.2" filter="url(#wob)"/>')
    cols=[TER,MUS,SAGE,BLUE,PINK]
    for i,ch in enumerate(letters):
        t_=(i+.5)/n; x=30+(W-60)*t_; y=40+50*4*t_*(1-t_)*1.0*0.5*2
        if ch==' ': continue
        ang=(t_-.5)*14
        out.append(f'<g transform="rotate({ang:.1f} {x:.1f} {y:.1f})"><path d="M{x-28:.1f},{y:.1f} L{x+28:.1f},{y:.1f} L{x:.1f},{y+80:.1f}Z" fill="{cols[i%5]}" filter="url(#wob)"/>'
                   f'<text x="{x:.1f}" y="{y+40:.1f}" text-anchor="middle" font-family="Bagel" font-size="34" fill="#fffaf0">{e(ch)}</text></g>')
    return ''.join(out), W, 150
def S_ribbon(t='Riverwalk'):
    _,w,_=run(t,'Pacifico',60,0,0); L=w+70; x0=60; y0=60; h=70
    rib=(f'<path d="M{x0-40},{y0+18} l30,0 l0,{h} l-30,0 l14,{-h/2}Z" fill="#b5503b"/>'
         f'<path d="M{x0+L+40},{y0+18} l-30,0 l0,{h} l30,0 l-14,{-h/2}Z" fill="#b5503b"/>'
         f'<path d="M{x0},{y0} Q{x0+L/2},{y0-14} {x0+L},{y0} L{x0+L},{y0+h} Q{x0+L/2},{y0+h-14} {x0},{y0+h}Z" fill="{TER}" filter="url(#wob)"/>')
    body,_,_=run(t,'Pacifico',60,x0+35,y0+50,seed=2,rot=2,attrs='fill="#fffaf0"')
    return rib+body+sparkle(x0+L+50,30,12,MUS,3), L+150, 170
def S_inline(t='MEMO'):
    sh,w,_=run(t,'Shrikhand',150,40,170,seed=1,rot=4,track=4,attrs=f'fill="none" stroke="{INK}" stroke-width="2.5" filter="url(#wob)"')
    sh=sh.replace('<text x="','<text dx="10" dy="10" x="')
    body,_,_=run(t,'Shrikhand',150,40,170,seed=1,rot=4,track=4,attrs=f'fill="{TER}" filter="url(#inline)"')
    return sh+body+star(40+w+25,60,14,MUS,2), w+90, 220
def S_pop(t='出发啦'):
    fam='KuaiLe'
    outer,w,_=run(t,fam,130,40,160,seed=3,bounce=8,rot=7,track=10,attrs=f'fill="{INK}" stroke="{INK}" stroke-width="26" stroke-linejoin="round" transform-origin="0 0"')
    outer=outer.replace('<text x="','<text dx="6" dy="8" x="')
    white,_,_=run(t,fam,130,40,160,seed=3,bounce=8,rot=7,track=10,attrs='fill="#fffaf0" stroke="#fffaf0" stroke-width="22" stroke-linejoin="round"')
    body,_,_=run(t,fam,130,40,160,seed=3,bounce=8,rot=7,track=10,colors=[MUS,TER,SAGE],attrs=f'stroke="{INK}" stroke-width="3" paint-order="stroke" filter="url(#wob)"')
    return outer+white+body+sparkle(40+w+15,45,15,TER,5)+sparkle(25,40,9,MUS,6), w+90, 210
def S_arc(t='SLOW TRAVEL',sub='· a weekend in the windy city ·'):
    W=560
    return (f'<path id="arc" d="M60,190 Q{W/2},40 {W-60},190" fill="none"/><path id="arc2" d="M110,225 Q{W/2},120 {W-110},225" fill="none"/>'
            f'<text font-family="Amatic" font-size="72" fill="{INK}" letter-spacing="8" filter="url(#wob)"><textPath href="#arc" startOffset="50%" text-anchor="middle">{e(t)}</textPath></text>'
            f'<text font-family="Caveat" font-size="28" fill="{TER}"><textPath href="#arc2" startOffset="50%" text-anchor="middle">{e(sub)}</textPath></text>'
            +star(W/2,200,18,MUS,1)+sparkle(70,90,10,MUS,2)+sparkle(W-70,90,12,MUS,3)), W, 250
def S_cn_title(t='芝加哥慢游',sub='Day 1 · 河边散步'):
    fam='Xiaolai'
    big,w,pos=run(t[:3],fam,120,40,150,seed=6,rot=5,sj=.08,track=4,attrs=f'fill="{INK}" filter="url(#fauxcal2)"')
    small,w2,_=run(t[3:],fam,64,40+w+6,150,seed=7,rot=6,attrs=f'fill="{TER}"')
    s3,_,_=run(sub,'Xiaolai',30,50,205,seed=8,attrs=f'fill="{BROWN}"')
    deco=hilite(36,165,w*.8,22,PINK,.5)+f'<circle cx="{40+w+w2*.5:.1f}" cy="{110:.1f}" r="{w2*.7:.1f}" fill="none" stroke="{TER}" stroke-width="2.2" filter="url(#wob)"/>'+sparkle(40+w+w2+30,60,12,MUS,9)
    return deco+big+small+s3, w+w2+110, 230

STYLES=[('bounce','弹跳花体','S_bounce'),('fauxcal','仿书法','S_fauxcal'),('combo','混排标题','S_combo'),('bubble','泡泡字','S_bubble'),
        ('inline','镂空线加线影','S_inline'),('pop','中文 POP 胖字','S_pop'),('sketch','草稿线空心','S_sketch'),('cn_title','中文大小字','S_cn_title'),
        ('cn_cute','可爱色块字','S_cn_cute'),('kdaku','韩系小手写','S_kdaku'),('flags','三角旗','S_flags'),('ribbon','丝带横幅','S_ribbon'),('arc','弧形排字','S_arc')]

def html_page(svg,bg):
    ff=''.join(f'@font-face{{font-family:"{k}";src:url("fonts/{v}")}}' for k,v in FONTS.items())
    return f'<!doctype html><meta charset=utf-8><style>{ff}html,body{{margin:0;background:{bg}}}svg{{display:block;overflow:visible}}</style><body>{svg}</body>'
async def render(jobs,bg='transparent'):
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(device_scale_factor=2)
        for fn,args,path in jobs:
            inner,W,H=globals()[fn](*args)
            svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{int(W)}" height="{int(H)}">{DEFS}{inner}</svg>'
            hp=HERE/'_render.html'; hp.write_text(html_page(svg,bg),encoding='utf8')
            await pg.goto(hp.as_uri()); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(200)
            await pg.locator('svg').screenshot(path=path,omit_background=(bg=='transparent'))
        await b.close()
def trim(p,pad=14):
    from PIL import Image
    im=Image.open(p).convert('RGBA'); bb=im.getchannel('A').getbbox()
    if bb: im=im.crop((max(0,bb[0]-pad),max(0,bb[1]-pad),min(im.width,bb[2]+pad),min(im.height,bb[3]+pad)))
    im.save(p)
def sheet(out):
    from PIL import Image,ImageDraw,ImageFont
    tmp=HERE/'_t2'; tmp.mkdir(exist_ok=True)
    jobs=[(fn,(),str(tmp/f'{k}.png')) for k,_,fn in STYLES]; asyncio.run(render(jobs))
    for j in jobs: trim(j[2])
    ims=[Image.open(j[2]) for j in jobs]
    cw=900; pad=50; cols=2; lab=ImageFont.truetype(str(F/'LXGWWenKai-Regular.ttf'),26)
    cells=[]
    for im in ims:
        sc=min(1,(cw-80)/im.width,420/im.height); cells.append(im.resize((int(im.width*sc),int(im.height*sc)),Image.LANCZOS))
    rows=[cells[i:i+cols] for i in range(0,len(cells),cols)]
    H=pad*2+70+sum(max(c.height for c in r)+70 for r in rows)
    sh=Image.new('RGBA',(cw*cols+pad*2,H),CREAM); d=ImageDraw.Draw(sh)
    d.text((pad,pad-10),'手帐标题字 v2 · 手画感',font=ImageFont.truetype(str(F/'LXGWWenKai-Regular.ttf'),38),fill=INK)
    y=pad+70; k=0
    for r in rows:
        for j,c in enumerate(r):
            d.text((pad+j*cw,y),f'{STYLES[k][1]} · {STYLES[k][0]}',font=lab,fill='#8a7a66'); sh.alpha_composite(c,(pad+j*cw,y+36)); k+=1
        y+=max(c.height for c in r)+70
    sh.convert('RGB').save(out,quality=90)
if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('--sheet'); ap.add_argument('--style'); ap.add_argument('--text'); ap.add_argument('--sub'); ap.add_argument('--out',default='title.png')
    a=ap.parse_args()
    if a.sheet: sheet(a.sheet)
    else:
        fn=dict((k,f) for k,_,f in STYLES)[a.style]; args=[x for x in (a.text,a.sub) if x]
        asyncio.run(render([(fn,tuple(args),a.out)])); trim(a.out)
