# run from the repo root with the trunk render cut to trunk_cut.png (tools/art/cut.py)
# builds assets/trunk.webp: two 256x128 pieces stacked (seamless middle bark tile, then the root base), 2x of the 128x64 atlas region
import numpy as np
from PIL import Image
c=Image.open('trunk_cut.png');a=np.asarray(c).astype(float);h,w=a.shape[:2]
s=226/w;T=round(128/s);O=140
cols=np.where(a[1200,:,3]>0)[0];cx=(cols[0]+cols[-1])/2
mid=a[920:920+T+O].copy();t=np.linspace(0,1,O)[:,None,None]
mid[:O]=mid[T:T+O]*(1-t)+mid[:O]*t;mid=mid[:T]
base=a[h-T:h]
out=Image.new('RGBA',(256,256),(0,0,0,0))
for i,p in enumerate([mid,base]):
    im=Image.fromarray(np.clip(p,0,255).astype(np.uint8),'RGBA');im=im.resize((round(w*s),128),Image.LANCZOS)
    out.alpha_composite(im,(round(128-cx*s),i*128))
out.save('assets/trunk.webp',quality=90,method=6)
