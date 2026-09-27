# splits the Higgsfield player parts render (parts.png) into its pieces by connected component; IDS are the component labels for that render
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
a=np.asarray(Image.open('parts.png').convert('RGB')).astype(int)
edge=np.concatenate([a[0],a[-1],a[:,0],a[:,-1]]);bg=np.median(edge,axis=0)
d=np.abs(a-bg).max(axis=2);fg=d>=16
lab,n=ndimage.label(fg);objs=ndimage.find_objects(lab)
IDS={'head':1,'torso':6,'arm':9,'leg':10,'helm':8}
P={}
for k,i in IDS.items():
    m=ndimage.binary_fill_holes(lab==i);sl=objs[i-1]
    rgba=np.dstack([a.astype(np.uint8),(m*255).astype(np.uint8)])[sl]
    P[k]=Image.fromarray(rgba,'RGBA')
if __name__=='__main__':
    for k,im in P.items():
        bgi=Image.new('RGBA',im.size,(60,120,200,255));bgi.alpha_composite(im);dr=ImageDraw.Draw(bgi)
        for x in range(0,im.width,50):dr.line([(x,0),(x,12 if x%100 else 30)],fill=(255,255,0),width=3)
        for y in range(0,im.height,50):dr.line([(0,y),(12 if y%100 else 30,y)],fill=(255,255,0),width=3)
        bgi.convert('RGB').save('part_'+k+'.jpg');print(k,im.size)
