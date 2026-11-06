import json,subprocess,os,glob
from concurrent.futures import ThreadPoolExecutor
jobs=json.load(open('/home/claude/dl/jobs.json'));O1='/home/claude/dl/set_out';O='/home/claude/dl/set_out2'
todo=[]
for j in jobs:
  if os.path.exists(f"{O1}/{j['set']}/{j['id']}.webp"):todo.append((j['mode'],j['src'],f"{O}/{j['set']}/{j['id']}.webp",{'tile':640,'card':520}.get(j['mode'],560)))
for f in glob.glob('/home/claude/dl/open_out/os-va-*.webp'):todo.append(('reink',f,f"{O}/vintage/{os.path.basename(f)}",560))
def run(t):
  mode,src,out,side=t;os.makedirs(os.path.dirname(out),exist_ok=True)
  if os.path.exists(out):return 0
  r=subprocess.run(['python3','-I','/home/claude/tools/cutout.py',mode,src,out,str(side)],capture_output=True,text=True)
  if r.returncode:print('ERR',out,r.stderr[-200:],flush=True)
  return 1
with ThreadPoolExecutor(2) as ex:print('done',sum(ex.map(run,todo)),'of',len(todo),flush=True)
