import subprocess,os,json,io,base64,sys
from PIL import Image
VA='/home/claude/dl/vintageart';DS='/home/claude/dl/doodle_svg';OUT=sys.argv[1];os.makedirs(OUT,exist_ok=True)
INK=(58,46,36)
def lst(d): return sorted(os.listdir(os.path.join(VA,d)))
P={
 'flower illustrations':('sticker',['版画','植物','花'],{0:'花束圆章',3:'盆栽金合欢',5:'菊花',6:'罂粟花',7:'小野花',8:'细叶草',12:'重瓣花',17:'盆栽绿植',18:'棕榈树',19:'白花',20:'大丽花',22:'报春花',24:'秋海棠',25:'盆栽芭蕉',28:'玫瑰盆栽',29:'仙人掌',30:'芋叶',32:'马蹄莲',33:'雏菊',34:'大花瓣',36:'康乃馨',38:'鸡冠花',39:'向日葵盆栽'}),
 'fruit and veg illustrations':('sticker',['版画','果蔬'],{1:'番茄标签',2:'菜花广告',3:'两颗菜花',7:'番茄',11:'杏子',12:'小萝卜',13:'番茄广告',14:'白萝卜',15:'抱子甘蓝',16:'卷心菜广告',19:'黄瓜',20:'圆果子',23:'玉米',27:'胡萝卜广告',29:'生菜广告',30:'冬卷心菜',33:'果树',34:'芜菁',35:'辣椒',38:'胡萝卜'}),
 'frames':('decor',['版画','边框'],{0:'方边框',1:'竖边框',3:'椭圆花框',4:'珠链框',6:'细方框',7:'花纹方框',11:'横边框',13:'角花框',16:'花环圆框',17:'圆角框',19:'粗线框',20:'圆框',24:'门框',29:'圆窗框',31:'花饰横框',32:'小横框',34:'圆角竖框'}),
 'dividers':('decor',['版画','分隔线'],{0:'花叶分隔线',1:'花草分隔线',2:'城市剪影',3:'拱形花饰',4:'花饰横条',7:'叶子分隔线',10:'小船剪影',13:'细叶分隔线',14:'叶纹横条',20:'卷草横条',24:'花格横条',25:'藤蔓横条',29:'细花分隔线',32:'卷花饰',33:'心形花边',34:'细花边'}),
 'ornaments':('decor',['版画','花饰'],{0:'花环弧',2:'花叶角',3:'卷草',4:'花柱头',8:'角花',9:('圆花章','seal'),13:('圆花窗','seal'),15:('方花砖','seal'),16:('圆花砖','seal'),20:'莲花纹',21:'卷花',27:'花束饰',28:'小天使',30:'三角花饰',31:('花纹章','seal'),32:'新艺术花饰',38:'三角花纹',39:'花纹角'}),
 'words':('lettering',['版画','英文字牌'],{1:'剧院字牌',4:'花卉字牌',7:'永生花字牌',8:'冬春字牌',9:'温室字牌',13:'Quality 字牌',14:'小物字牌',15:'家居字牌',16:'杂志字牌'}),
}
DOOD={'weather':('天气',None),'emojis':('表情',None),
 'food':('食物',['Burger','Cake','Candy','Drink','Egg','IceCream','Pizza2','Popsicle','Cutlery']),
 'objects':('小物',None),'e-commerce':('购物',['Bag','Basket','Location','Shop','Tag','Box','Truck']),
 'finance':('小物',['MoneyPlant','PiggyBank','Wallet']),'arrows':('箭头',['ArrowLeft','ArrowRight','ArrowNe','ArrowSe','ArrowSw','ArrowNw'])}
CN={'CloudyDay':'多云','CloudyNight':'夜里多云','Night':'月亮','RainHeavy':'大雨','RainLight':'小雨','Snow':'下雪','Snowflake':'雪花','Snowman':'雪人','Sunny':'太阳','Thunderstorm':'雷雨','Tornado':'龙卷风','Vector':'云','Wind':'风',
 'ConfusedEmoji':'疑惑脸','CoolEmoji':'墨镜脸','CryingEmoji':'大哭脸','GrinningSquintingEmoji':'眯眼笑','HappyEmoji':'开心脸','HeartEyesEmoji':'爱心眼','LaughEmoji':'笑出泪','SadEmoji':'难过脸','ShockedEmoji':'惊讶脸','SmilingEmoji':'微笑脸','SmilingWithEyesEmoji':'眯眼微笑','SurprisedEmoji':'哇脸','WinkEmoji':'眨眼脸','WorriedEmoji':'担心脸',
 'Burger':'汉堡','Cake':'蛋糕','Candy':'拐杖糖','Drink':'鸡尾酒','Egg':'煎蛋','IceCream':'冰淇淋','Pizza2':'披萨','Popsicle':'冰棍','Cutlery':'刀叉',
 'Automation':'机械臂','Bot':'小机器人','Bug':'小虫','Bus':'巴士','Car':'小汽车','Chip':'芯片','CoffeeCup1':'咖啡杯','CoffeeCup2':'马克杯','Fire':'火苗','HotAirBalloon':'热气球','Plane':'飞机','Producthunt':None,'Rocket':'火箭','Satellite':'卫星','Server':None,'Ship':'小船','Tiktok':None,'Trophy':'奖杯','Anchor':'船锚','Balloon':'气球','Balloon2':'一串气球','Camera':'摄像机','Crown':'皇冠','Flashlight':'手电筒','Frame':'画框','Guitar':'吉他','MovieClapper':'场记板','PaintBrush':'刷子','PaintBrush2':'画笔','PaintBucket':'油漆桶','PaintRoller':'滚刷','Sofa':'沙发','Tv':'电视',
 'Bag':'购物袋','Basket':'菜篮','Location':'定位','Shop':'小店','Tag':'价签','Box':'纸箱','Truck':'小货车','MoneyPlant':'金钱树','PiggyBank':'存钱罐','Wallet':'钱包',
 'ArrowLeft':'左箭头','ArrowRight':'右箭头','ArrowNe':'右上箭头','ArrowSe':'右下箭头','ArrowSw':'左下箭头','ArrowNw':'左上箭头'}
def render(svg,h):
  png=subprocess.run(['rsvg-convert','-h',str(h),svg],capture_output=True).stdout
  im=Image.open(io.BytesIO(png)).convert('RGBA')
  m=max(im.size)
  if m>720: im=im.resize((round(im.width*720/m),round(im.height*720/m)),Image.LANCZOS)
  px=im.load();W,H=im.size
  # alpha = coverage * darkness; ink color
  r,g,b,a=im.split()
  from PIL import ImageChops
  lum=Image.merge('RGB',(r,g,b)).convert('L')
  dark=lum.point(lambda v:255-v)
  alpha=ImageChops.multiply(a,dark)
  ink=Image.new('RGBA',im.size,INK+(0,));ink.putalpha(alpha)
  bb=ink.getbbox();return ink.crop(bb) if bb else ink
items=[]
for d,(cat,tags,picks) in P.items():
  fs=lst(d)
  for i,v in picks.items():
    name,c=(v if isinstance(v,tuple) else (v,cat))
    im=render(os.path.join(VA,d,fs[i]),1400)
    fid=f"os-va-{d.split()[0]}-{i:02d}";fn=f"{fid}.webp"
    im.save(os.path.join(OUT,fn),'WEBP',quality=82,method=6)
    items.append(dict(id=fid,file=fn,name=name,cat=c,tags=tags,style='retro',src='vintageart',orig=f"{d}/{fs[i]}"))
for g,(tag,only) in DOOD.items():
  for f in sorted(os.listdir(DS)):
    if not f.startswith(g+'__'):continue
    k=f.split('__')[1][:-4]
    if only and k not in only:continue
    nm=CN.get(k)
    if not nm:continue
    im=render(os.path.join(DS,f),900)
    m=max(im.size)
    if m>360: im=im.resize((round(im.width*360/m),round(im.height*360/m)),Image.LANCZOS)
    fid=f"os-dd-{k.lower()}";fn=fid+'.webp'
    im.save(os.path.join(OUT,fn),'WEBP',quality=88,method=6)
    items.append(dict(id=fid,file=fn,name=nm,cat='decor',tags=['手绘',tag],style=None,src='doodle',orig=f"{g}/{k}"))
json.dump(items,open(os.path.join(OUT,'_list.json'),'w'),ensure_ascii=False,indent=0)
print(len(items),sum(os.path.getsize(os.path.join(OUT,i['file'])) for i in items)//1024,'KB')
