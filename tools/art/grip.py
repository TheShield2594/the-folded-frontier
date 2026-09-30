import numpy as np, sys
from PIL import Image
from scipy import ndimage
S=sys.argv[1];src=sys.argv[2]
REF=np.asarray(Image.open(S+'/hero/ref_arm.png').convert('RGB')).astype(float);AX,AY,AW,AH=[int(v) for v in open(S+'/hero/ref_arm.txt').read().split(',')]
out=np.asarray(Image.open(src).convert('RGB').resize((1600,1600),Image.BICUBIC)).astype(float)
teal=lambda a:(a[...,2]>a[...,0]+15)&(a[...,1]>a[...,0]+15)&(a.max(2)<200)
# align on the sleeve (it should be unchanged): scale and shift
R=teal(REF[::4,::4]);best=(-1,1,0,0)
for sc in np.arange(.94,1.061,.01):
    q=np.asarray(Image.fromarray(out.astype(np.uint8)).resize((round(400*sc),)*2,Image.BILINEAR)).astype(float);Q=teal(q);c=200*sc-200
    for dy in range(-12,13):
        for dx in range(-12,13):
            y0,x0=int(round(c+dy)),int(round(c+dx))
            if y0<0 or x0<0:continue
            q2=Q[y0:y0+400,x0:x0+400]
            if q2.shape!=R.shape:continue
            s=(q2&R).sum()/max(1,(q2|R).sum())
            if s>best[0]:best=(s,sc,dx,dy)
s,sc,dx,dy=best;print('align',round(s,3),sc,dx,dy)
a=np.asarray(Image.fromarray(out.astype(np.uint8)).resize((round(1600*sc),)*2,Image.BICUBIC)).astype(float)
ox,oy=int(round(800*sc-800+dx*4)),int(round(800*sc-800+dy*4));al=np.full((1600,1600,3),200.);h=min(1600,a.shape[0]-oy);w=min(1600,a.shape[1]-ox);al[:h,:w]=a[oy:oy+h,ox:ox+w]
green=(al[...,1]>al[...,0]+25)&(al[...,1]>al[...,2]+20)
skn=(al[...,0]>150)&(al[...,0]-al[...,2]>40);near=ndimage.binary_dilation(skn,iterations=6)
green|=(al.max(2)<120)&ndimage.binary_dilation(green,iterations=10)&~near
fig=(np.abs(al-200).max(2)>14)&~green;fig=ndimage.binary_opening(fig,iterations=2)
lab,n=ndimage.label(fig);sz=ndimage.sum(fig,lab,range(1,n+1));fig=lab==(np.argmax(sz)+1);fig=ndimage.binary_fill_holes(fig)
# the stick's band: rows holding green, across the fist
gy,gx=np.where(green);b0,b1=gy.min(),gy.max();print('stick rows',b0,b1,'x',gx.min(),gx.max())
band=np.zeros_like(fig);band[b0-6:b1+7,:]=True
fingers=fig&band
# the arm's grip picture fills the union of the plain arm's box and its own
ys,xs=np.where(fig);y0,y1,x0,x1=min(ys.min(),AY),max(ys.max()+1,AY+AH),min(xs.min(),AX),max(xs.max()+1,AX+AW)
K=120/3485*4
def save(mask,path,box):
    A=ndimage.gaussian_filter(mask.astype(float),.7);rgba=np.dstack([al,A*255]).astype(np.uint8)[box[0]:box[1],box[2]:box[3]]
    im=Image.fromarray(rgba,'RGBA');im.resize((round(im.width*K),round(im.height*K)),Image.LANCZOS).save(path,'WEBP',quality=92,method=6)
save(fig,'assets/art/rigs/H.arm.grip.webp',(y0,y1,x0,x1))
save(fingers,'assets/art/rigs/H.fist.webp',(y0,y1,x0,x1))
# the plain arm on the same box
base=np.asarray(Image.open(S+'/hero/raw_arm.png').convert('RGBA'));B=np.zeros((y1-y0,x1-x0,4),np.uint8);B[AY-y0:AY-y0+AH,AX-x0:AX-x0+AW]=base
Image.fromarray(B,'RGBA').resize((round((x1-x0)*K),round((y1-y0)*K)),Image.LANCZOS).save('assets/art/rigs/H.arm.webp','WEBP',quality=92,method=6)
# in design px from the old arm box's top-left, and where the stick's centre is (the grip)
d=K/4;print('box offset',round((x0-AX)*d,2),round((y0-AY)*d,2),'size',round((x1-x0)*d,2),round((y1-y0)*d,2),'grip',round(((gx.min()+gx.max())/2-AX)*d,2),round(((b0+b1)/2-AY)*d,2))
