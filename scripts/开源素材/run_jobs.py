import json,subprocess,os,sys
from concurrent.futures import ThreadPoolExecutor
jobs=json.load(open('/home/claude/dl/jobs.json'));O='/home/claude/dl/set_out'
def run(j):
  d=os.path.join(O,j['set']);os.makedirs(d,exist_ok=True);out=os.path.join(d,j['id']+'.webp')
  if os.path.exists(out):return 0
  side={'tile':640,'card':520}.get(j['mode'],560)
  r=subprocess.run(['python3','-I','/home/claude/tools/cutout.py',j['mode'],j['src'],out,str(side)],capture_output=True,text=True)
  if r.returncode:print('ERR',j['id'],r.stderr[-200:],flush=True)
  return 1
with ThreadPoolExecutor(2) as ex:n=sum(ex.map(run,jobs))
print('done',n)
