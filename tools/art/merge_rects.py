# add or update HPIC entries in src/rig.js from the extract scripts' printed rects
import json,re,sys
R={}
for f in sys.argv[1:]:
    for l in open(f):
        if l.startswith('{'):R.update({k:v for k,v in json.loads(l.split(' align')[0]).items() if v})
p='src/rig.js';s=open(p).read()
for k,v in R.items():
    e="'%s':['H.%s',%s]"%(k,k,','.join(str(x) for x in v));pat=re.compile(r"'%s':\['H\.%s',[-\d.,]+\]"%(re.escape(k),re.escape(k)))
    if pat.search(s):s=pat.sub(e,s)
    else:
        i=s.index("const HPIC={");j=s.index("};",i);s=s[:j]+",\n  "+e+s[j:]
open(p,'w').write(s);print(len(R),'rects')
