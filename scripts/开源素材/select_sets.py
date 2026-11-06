import os,glob,json,re
R='/home/claude/dl/sets'
def even(lst,n):
  lst=sorted(lst)
  if len(lst)<=n: return lst
  return [lst[round(i*(len(lst)-1)/(n-1))] for i in range(n)]
TREE={'wayfaring-tree':'绵毛荚蒾','plum':'李树','maple':'枫树','horse-chestnut':'七叶树','cluster-pine':'海岸松','cherry':'樱桃树','linden':'椴树','cornel-or-dogwood':'山茱萸','stone-pine':'石松','holly':'冬青','apple':'苹果树','hazel':'榛树','wych-elm':'榆树','spruce':'云杉','acacia':'刺槐','silver-birch':'白桦','pollard-white-willow':'白柳','hawthorn':'山楂','walnut':'核桃树','white-beam':'白面子树','wellingtonia':'巨杉','sycamore':'梧桐槭','mulberry':'桑树','strawberry-tree':'草莓树','guelder-rose':'欧洲荚蒾','yew':'紫杉','beech':'山毛榉','pear':'梨树','oak':'橡树','alder-buckthorn':'欧鼠李','common-laurel':'月桂','lombardy-poplar':'钻天杨','alder':'桤木','box':'黄杨','weeping-willow':'垂柳','hornbeam':'鹅耳枥','scots-fir':'欧洲赤松','ash':'白蜡树','elm':'榆树','poplar':'杨树','larch':'落叶松','cedar':'雪松','chestnut':'栗树','lime':'椴树','rowan':'花楸','elder':'接骨木','juniper':'刺柏','privet':'女贞','laburnum':'金链花','fir':'冷杉','pine':'松树','willow':'柳树','aspen':'山杨','birch':'桦树','buckthorn':'鼠李','spindle':'卫矛','sloe':'黑刺李','blackthorn':'黑刺李','service':'花楸','whitebeam':'白面子树','cherry-laurel':'桂樱','plane':'悬铃木','tulip-tree':'鹅掌楸','robinia':'刺槐','barberry':'小檗','ivy':'常春藤','gean':'欧洲甜樱桃','crab':'山楂苹果','medlar':'欧楂','quince':'榅桲','fig':'无花果','sweet-chestnut':'欧洲栗','evergreen-oak':'冬青栎','turkey-oak':'土耳其栎','cork':'栓皮栎','monkey-puzzle':'智利南洋杉','deodar':'喜马拉雅雪松','cypress':'柏树','arbor-vitae':'侧柏','silver-fir':'银冷杉','douglas':'花旗松','tamarisk':'柽柳','sea-buckthorn':'沙棘','dogwood':'山茱萸','wild-service':'野花楸','mountain-ash':'花楸','field-maple':'田野槭','norway-maple':'挪威槭','black-poplar':'黑杨','white-poplar':'银白杨','grey-poplar':'灰杨','osier':'蒲柳','crack-willow':'爆竹柳','goat-willow':'黄花柳','hornbeam':'鹅耳枥','walnut':'核桃树'}
def tree_name(f):
  m=re.match(r'\d+-\d+[ab]-(.+)-familiar',os.path.basename(f))
  k=m.group(1) if m else ''
  return TREE.get(k) or next((v for kk,v in sorted(TREE.items(),key=lambda x:-len(x[0])) if kk in k),'树')
jobs=[]
def add(set_id,mode,files,short,namefn=None):
  for i,f in enumerate(files,1):
    jobs.append(dict(set=set_id,mode=mode,src=f,id=f'os-{set_id}-{i:02d}',name=namefn(f,i) if namefn else f'{short} {i:02d}'))
mo=[f for f in glob.glob(R+'/The-english-moths*/*/images/i*_lrg.jpg') if int(re.search(r'i(\d+)',f).group(1))>=97]
add('moths','color',even(mo,40),'蛾蝶花草')
wf=[f for f in glob.glob(R+'/Wayside*/*/images/i_*.jpg') if not f.endswith('i_001.jpg')]
add('wildflower','color',even(wf,45),'英国野花')
gr=glob.glob(R+'/Language-of*/*/images/ill_*.jpg')
add('greenaway','color',even(gr,50),'花语')
bd=glob.glob(R+'/Illustrations-of-the-birds*/*/images/plate*.jpg')
add('birds','color',even(bd,48),'鸟')
bf=[f for f in glob.glob(R+'/The-butterfly*/*/images/i*.jpg') if 'small' not in f]
add('butterfly','color',even(bf,45),'蝴蝶')
tb=glob.glob(R+'/illustrations-from-familiar*/images/*b-*familiar*.jpg');ta=glob.glob(R+'/illustrations-from-familiar*/images/*a-*familiar*.jpg')
ta=[f for f in ta if '0-0-master' not in f]
add('trees','color',even(tb,30),'',lambda f,i:tree_name(f)+'枝叶')
for i,f in enumerate(even(ta,20),1): jobs.append(dict(set='trees',mode='card',src=f,id=f'os-trees-a{i:02d}',name=tree_name(f)+'画片'))
wi=[f for f in glob.glob(R+'/Early-Woodcut*/*/images/illo*') if f.lower().endswith(('.jpg','.png'))]
add('initials','ink',even(wi,48),'木刻字母')
po=[f for f in glob.glob(R+'/English-printers*/*/images/image*') if f.lower().endswith(('.jpg','.png'))]
add('printers','ink',even(po,48),'印刷花饰')
tl=json.load(open(R+'/papertiles/tiles.json'))
for i,t in enumerate(tl,1):
  f=next(iter(glob.glob(R+f'/papertiles/png/med/{t["id"]}.*')),None)
  if f: jobs.append(dict(set='wallpaper',mode='tile',src=f,id=f'os-wallpaper-{i:02d}',name=f'复古墙纸 {i:02d}',srcurl=t['source']))
json.dump(jobs,open('/home/claude/dl/jobs.json','w'),ensure_ascii=False,indent=0)
from collections import Counter;print(len(jobs),Counter(j['set'] for j in jobs))
print([j['name'] for j in jobs if j['set']=='trees'][:12])
