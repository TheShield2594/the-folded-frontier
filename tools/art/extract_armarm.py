# arm armour painted onto the hero's arm (ref_arm_g.png): align on the sleeve, keep what was added (never the hand),
# save it at 4x design px in the arm's own frame (the arm picture's rect around its pivot) and print the rect
import numpy as np, sys, json
from PIL import Image
from scipy import ndimage
S=sys.argv[1];REF=np.asarray(Image.open(S+'/hero/ref_arm_g.png').convert('RGB')).astype(float);BG=np.array([70.,150,80])
AX,AY,AW,AH=[int(v) for v in open(S+'/hero/ref_arm.txt').read().split(',')];K=120/3485*.85;RX,RY=-6.8,-2.6
fig=lambda a:np.abs(a-BG).max(2)>40
def align(out):
    R=fig(REF[::4,::4]);best=(-1,1,0,0)
    for sc in np.arange(.95,1.051,.01):
        q=np.asarray(Image.fromarray(out.astype(np.uint8)).resize((round(400*sc),)*2,Image.BILINEAR)).astype(float);Q=fig(q);c=200*sc-200
        for dy in range(-12,13):
            for dx in range(-12,13):
                y0,x0=int(round(c+dy)),int(round(c+dx))
                if y0<0 or x0<0:continue
                q2=Q[y0:y0+400,x0:x0+400]
                if q2.shape!=R.shape:continue
                s=(q2&R).sum()/max(1,(q2|R).sum())
                if s>best[0]:best=(s,sc,dx,dy)
    s,sc,dx,dy=best;a=np.asarray(Image.fromarray(out.astype(np.uint8)).resize((round(1600*sc),)*2,Image.BICUBIC)).astype(float)
    ox,oy=int(round(800*sc-800+dx*4)),int(round(800*sc-800+dy*4));res=np.zeros((1600,1600,3))+BG
    sy0,sx0=max(0,oy),max(0,ox);dy0,dx0=sy0-oy,sx0-ox;h=min(1600-dy0,a.shape[0]-sy0);w=min(1600-dx0,a.shape[1]-sx0);res[dy0:dy0+h,dx0:dx0+w]=a[sy0:sy0+h,sx0:sx0+w];return res,s
sk=lambda q:(q[...,0]>150)&(q[...,0]-q[...,2]>40)&(q[...,1]>90)
def cut(k,src):
    out=np.asarray(Image.open(src).convert('RGB').resize((1600,1600),Image.BICUBIC)).astype(float);a,s=align(out)
    d=np.abs(a-REF).max(2);add=(d>40)&fig(a)&~(sk(a)&(d<45));near=np.zeros_like(add);near[max(0,AY-150):AY+AH+60,max(0,AX-160):AX+AW+160]=True;add&=near;add=ndimage.binary_opening(add,iterations=2)
    lab,n=ndimage.label(add);sz=ndimage.sum(add,lab,range(1,n+1));add=np.isin(lab,[i+1 for i in range(n) if sz[i]>.03*sz.max()])
    ink=(a.max(2)<110)&ndimage.binary_dilation(add,iterations=6)&(d>25)&~sk(REF);m=ndimage.binary_fill_holes(ndimage.binary_closing(add|ink,iterations=2))&~(sk(a)&(d<45))
    al=ndimage.gaussian_filter(m.astype(float),.8);ys,xs=np.where(m);y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    im=Image.fromarray(np.dstack([a,al*255]).astype(np.uint8)[y0:y1,x0:x1],'RGBA');r=[round(RX+(x0-AX)*K,1),round(RY+(y0-AY)*K,1),round((x1-x0)*K,1),round((y1-y0)*K,1)]
    im.resize((round(r[2]*4),round(r[3]*4)),Image.LANCZOS).save(f'assets/art/rigs/H.brace.{k}.webp','WEBP',quality=92,method=6);print(json.dumps({f'brace.{k}':r}),'align',round(s,3))
for arg in sys.argv[2:]:
    k,f=arg.split('=');cut(k,f)
