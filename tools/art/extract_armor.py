# an armour set painted onto the hero's rest pose (ref_armbody.png, no front arm): align, keep what was added, give each
# pixel to the body part under it (helmet: head, chest: torso and anything above mid-thigh, greaves: the front leg),
# save each piece at 4x design px around its part's pivot and print the rects
import numpy as np, sys, json
from PIL import Image
from scipy import ndimage
S=sys.argv[1];REF=np.asarray(Image.open(S+'/hero/ref_armbody.png').convert('RGB')).astype(float);BG=np.array([70.,150,80]);OX,OY,SC=544,300,10
PIV={'head':(50,67),'torso':(48,88),'legA':(52,86)};ORDER=['armB','legB','legA','head','torso']
own=np.full((2048,2048),-1)
for i,n in enumerate(ORDER):
    a=np.asarray(Image.open(f'{S}/hero/own_{n}.png'));m=(a[...,3]>200)&~((a[...,:3].min(2)>225));m=ndimage.binary_erosion(m,iterations=45)
    o=np.zeros((2048,2048),bool);o[OY:OY+m.shape[0],OX:OX+m.shape[1]]=m;own[o]=i
own_body=own>=0;own_core=own>=0;idx=ndimage.distance_transform_edt(own<0,return_distances=False,return_indices=True);own=own[idx[0],idx[1]]
fig=lambda a:np.abs(a-BG).max(2)>40
def align(out):
    R=fig(REF[::4,::4]);ys,xs=np.where(R);y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max();R=R[int(y0+(y1-y0)*.25):y1,x0:x1];yy0=int(y0+(y1-y0)*.25);best=(-1,1,0,0)
    for sc in np.arange(.95,1.051,.01):
        q=np.asarray(Image.fromarray(out.astype(np.uint8)).resize((round(512*sc),)*2,Image.BILINEAR)).astype(float);Q=fig(q);c=256*sc-256
        for dy in range(-12,13):
            for dx in range(-12,13):
                a,b=int(round(yy0+c+dy)),int(round(x0+c+dx));q2=Q[a:a+R.shape[0],b:b+R.shape[1]]
                if q2.shape!=R.shape:continue
                s=(q2&R).sum()/max(1,(q2|R).sum())
                if s>best[0]:best=(s,sc,dx,dy)
    s,sc,dx,dy=best;a=np.asarray(Image.fromarray(out.astype(np.uint8)).resize((round(2048*sc),)*2,Image.BICUBIC)).astype(float)
    ox,oy=int(round(1024*sc-1024+dx*4)),int(round(1024*sc-1024+dy*4));res=np.zeros((2048,2048,3))+BG
    sy0,sx0=max(0,oy),max(0,ox);dy0,dx0=sy0-oy,sx0-ox;h=min(2048-dy0,a.shape[0]-sy0);w=min(2048-dx0,a.shape[1]-sx0);res[dy0:dy0+h,dx0:dx0+w]=a[sy0:sy0+h,sx0:sx0+w];return res,s
def save(a,m,name,piv):
    lab,n=ndimage.label(m);sz=ndimage.sum(m,lab,range(1,n+1))
    if not n:return None
    m=np.isin(lab,[i+1 for i in range(n) if sz[i]>.03*sz.max()]);al=ndimage.gaussian_filter(m.astype(float),.8);ys,xs=np.where(m);y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    im=Image.fromarray(np.dstack([a,al*255]).astype(np.uint8)[y0:y1,x0:x1],'RGBA');r=[round((x0-OX)/SC-piv[0],1),round((y0-OY)/SC-piv[1],1),round((x1-x0)/SC,1),round((y1-y0)/SC,1)]
    im.resize((round(r[2]*4),round(r[3]*4)),Image.LANCZOS).save(f'assets/art/rigs/H.{name}.webp','WEBP',quality=92,method=6);return r
def cut(k,src):
    out=np.asarray(Image.open(src).convert('RGB').resize((2048,2048),Image.BICUBIC)).astype(float);a,s=align(out)
    cream=(a.min(2)>205)&(a[...,0]-a[...,2]>10);d=np.abs(a-REF).max(2);add=(d>40)&(np.abs(a-BG).max(2)>40)&~cream;add=ndimage.binary_opening(add,iterations=2);bx=np.where(own_body.any(0))[0];by=np.where(own_body.any(1))[0];near=np.zeros_like(add);near[max(0,by.min()-260):by.max()+60,max(0,bx.min()-220):bx.max()+260]=True;add&=near
    ink=(a.max(2)<110)&ndimage.binary_dilation(add,iterations=6)&(d>25);m=ndimage.binary_fill_holes(ndimage.binary_closing(add|ink,iterations=2))&~cream
    yy=(np.arange(2048)[:,None]-OY)/SC;xx=(np.arange(2048)[None,:]-OX)/SC;o=own.copy();leg=(o==1)|(o==2);o[leg&(xx>=40.5)]=2;o[leg&(yy<(119 if k=='weave' else 107))]=4;o[o==0]=4
    sk=lambda q:(q[...,0]>150)&(q[...,0]-q[...,2]>40)&(q[...,1]>90)
    # the helmet leaves the face alone: nothing where the model repainted skin, or where the reference had a face feature
    face=(own==3)&own_core&~sk(REF);helm=m&(o==3)&~(sk(a)&(d<45))&~face
    fz=ndimage.binary_dilation((own==3)&own_core&sk(REF),iterations=4);lab,n=ndimage.label(helm)
    helm&=~np.isin(lab,[i+1 for i in range(n) if (fz&(lab==i+1)).sum()>.85*(lab==i+1).sum()])  # stray eyes and brows inside the face
    greave=m&(o==2)&(yy<86+45)
    r={f'helm.{k}':save(a,helm,f'helm.{k}',PIV['head']),f'mail.{k}':save(a,m&(o==4),f'mail.{k}',PIV['torso']),f'greave.{k}':save(a,greave,f'greave.{k}',PIV['legA'])}
    print(json.dumps(r),'align',round(s,3))
for arg in sys.argv[2:]:
    k,f=arg.split('=');cut(k,f)
