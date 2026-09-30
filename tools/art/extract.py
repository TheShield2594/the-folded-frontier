# a hair or hat painted onto the reference head: align the render to the reference, keep what was added, save it as a
# hero piece (4x design px) and print its rect around the head's pivot
import numpy as np, sys, json
from PIL import Image
from scipy import ndimage
S=sys.argv[1];REFS={'':np.asarray(Image.open(S+'/hero/ref_head.png').convert('RGB')).astype(float),'g':np.asarray(Image.open(S+'/hero/ref_head_g.png').convert('RGB')).astype(float)};BGS={'':np.array([200.,200,200]),'g':np.array([70.,150,80])};REF=REFS[''];BG=BGS['']
OX,OY,W,Hh=[int(x) for x in open(S+'/hero/ref_head.txt').read().split(',')];s=38.7/Hh;HX,HY=-16.2,-37.4
def skin(a):
    r,g,b=a[...,0],a[...,1],a[...,2];return (r>150)&(r-b>40)&(g>90)&(r-g>15)
def align(out):
    # match the face (skin below the hairline) at quarter size: scale and shift
    rs=skin(REF[::4,::4]);ys0=(OY+int(Hh*.45))//4;ys1=(OY+Hh)//4;xs0=OX//4;xs1=(OX+W)//4;R=rs[ys0:ys1,xs0:xs1]
    best=(-1,1,0,0);o=Image.fromarray(out.astype(np.uint8))
    for sc in np.arange(.95,1.051,.01):
        q=np.asarray(o.resize((round(2048*sc/4),)*2,Image.BILINEAR)).astype(float);qs=skin(q);c=256*sc-256  # scale about the centre
        for dy in range(-14,15,2):
            for dx in range(-14,15,2):
                y0=int(round(ys0+c+dy));x0=int(round(xs0+c+dx))
                if y0<0 or x0<0 or y0+R.shape[0]>qs.shape[0] or x0+R.shape[1]>qs.shape[1]:continue
                Q=qs[y0:y0+R.shape[0],x0:x0+R.shape[1]];sco=(Q&R).sum()/max(1,(Q|R).sum())
                if sco>best[0]:best=(sco,sc,dx,dy)
    sco,sc,dx,dy=best;c=1024*sc-1024
    # refine at full size around the coarse answer
    img=Image.fromarray(out.astype(np.uint8)).resize((round(2048*sc),)*2,Image.BICUBIC);a=np.asarray(img).astype(float)
    ox=int(round(c+dx*4));oy=int(round(c+dy*4));res=np.zeros((2048,2048,3))+BG;
    sy0,sx0=max(0,oy),max(0,ox);dy0,dx0=sy0-oy,sx0-ox;h=min(2048-dy0,a.shape[0]-sy0);w=min(2048-dx0,a.shape[1]-sx0);res[dy0:dy0+h,dx0:dx0+w]=a[sy0:sy0+h,sx0:sx0+w]
    return res,sco
def cut(name,src,colour=False):
    out=np.asarray(Image.open(src).convert('RGB')).astype(float)
    if out.shape[0]!=2048:out=np.asarray(Image.open(src).convert('RGB').resize((2048,2048),Image.BICUBIC)).astype(float)
    a,sco=align(out);bgd=np.abs(a-BG).max(2)
    d=np.abs(a-REF).max(2);refbg=np.abs(REF-BG).max(2)<10;add=(d>38)&((bgd>14)|~refbg)
    add=ndimage.binary_opening(add,iterations=2);lab,n=ndimage.label(add);sz=ndimage.sum(add,lab,range(1,n+1))
    add=np.isin(lab,[i+1 for i in range(n) if sz[i]>.02*sz.max()]);add=ndimage.binary_fill_holes(add)
    # the new piece's own ink: dark pixels touching it
    ink=(a.max(2)<110)&ndimage.binary_dilation(add,iterations=6)&(d>20);m=add|ink
    sk=ndimage.binary_opening(skin(a)&~ink&(((a[...,2]>118)&(d<55)) if 'straw' in name else (a[...,2]>95)),iterations=1)|((BG[1]-BG[0]>50)&(np.abs(a-BG).max(2)<45))
    m=ndimage.binary_fill_holes(ndimage.binary_closing(m,iterations=2))&~sk
    al=ndimage.gaussian_filter(m.astype(float),.8)
    ys,xs=np.where(m);y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    rgba=np.dstack([a,al*255]).astype(np.uint8)[y0:y1,x0:x1];im=Image.fromarray(rgba,'RGBA')
    rect=[round(HX+(x0-OX)*s,1),round(HY+(y0-OY)*s,1),round((x1-x0)*s,1),round((y1-y0)*s,1)]
    im.resize((round(rect[2]*4),round(rect[3]*4)),Image.LANCZOS).save(f'assets/art/rigs/H.{name}.webp','WEBP',quality=92,method=6)
    Image.fromarray(np.dstack([a,np.full(a.shape[:2],255)]).astype(np.uint8)).save(f'{S}/hero/al_{name.split(".")[-1]}.png')
    print(json.dumps({name:rect}),'align',round(sco,3))
for arg in sys.argv[2:]:
    n,f=arg.split('=');k='g' if n.endswith('@g') else '';n=n.replace('@g','');REF=REFS[k];BG=BGS[k];cut(n,f)
