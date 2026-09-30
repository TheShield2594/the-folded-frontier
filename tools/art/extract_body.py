# an accessory painted onto the hero's body (ref_body.png, green): align, keep what was added, split it into the part in
# front of the body and the part behind it (filled in where the body hid it), save both at 4x design px, print their rects
import numpy as np, sys, json
from PIL import Image
from scipy import ndimage
S=sys.argv[1];REF=np.asarray(Image.open(S+'/hero/ref_body.png').convert('RGB')).astype(float);BG=np.array([70.,150,80]);OX,OY,SC=544,300,10
body=np.zeros(REF.shape[:2],bool);ba=np.asarray(Image.open(S+'/hero/body_canvas.png'))[...,3]>128;body[OY:OY+ba.shape[0],OX:OX+ba.shape[1]]=ba
core=ndimage.binary_erosion(body,iterations=48)  # the figure without its ink line and cream edge
fig=lambda a:np.abs(a-BG).max(2)>40
def align(out):
    R=fig(REF[::4,::4]);ys,xs=np.where(R);y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max();xm=(x0+x1)//2;R=R[y0:y1,xm:x1]
    best=(-1,1,0,0)
    for sc in np.arange(.95,1.051,.01):
        q=np.asarray(Image.fromarray(out.astype(np.uint8)).resize((round(512*sc),)*2,Image.BILINEAR)).astype(float);Q=fig(q);c=256*sc-256
        for dy in range(-12,13):
            for dx in range(-12,13):
                yy,xx=int(round(y0+c+dy)),int(round(xm+c+dx));q2=Q[yy:yy+R.shape[0],xx:xx+R.shape[1]]
                if q2.shape!=R.shape:continue
                s=(q2&R).sum()/max(1,(q2|R).sum())
                if s>best[0]:best=(s,sc,dx,dy)
    s,sc,dx,dy=best;a=np.asarray(Image.fromarray(out.astype(np.uint8)).resize((round(2048*sc),)*2,Image.BICUBIC)).astype(float)
    ox,oy=int(round(1024*sc-1024+dx*4)),int(round(1024*sc-1024+dy*4));res=np.zeros((2048,2048,3))+BG;h=min(2048,a.shape[0]-oy);w=min(2048,a.shape[1]-ox);res[:h,:w]=a[oy:oy+h,ox:ox+w];return res,s
def save(a,m,name,piv,fill=None,src=None):
    if not m.any():print(name,'empty');return None
    if fill is not None:  # colours for the hidden pixels: the nearest painted pixel
        idx=ndimage.distance_transform_edt(~(src if src is not None else m),return_distances=False,return_indices=True);a=a.copy();hid=fill&~m;a[hid]=a[idx[0][hid],idx[1][hid]];m=m|fill
    al=ndimage.gaussian_filter(m.astype(float),.8);ys,xs=np.where(m);y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    im=Image.fromarray(np.dstack([a,al*255]).astype(np.uint8)[y0:y1,x0:x1],'RGBA');r=[round((x0-OX)/SC-piv[0],1),round((y0-OY)/SC-piv[1],1),round((x1-x0)/SC,1),round((y1-y0)/SC,1)]
    im.resize((round(r[2]*4),round(r[3]*4)),Image.LANCZOS).save(f'assets/art/rigs/H.{name}.webp','WEBP',quality=92,method=6);return r
def cut(name,src,piv,dofill):
    out=np.asarray(Image.open(src).convert('RGB').resize((2048,2048),Image.BICUBIC)).astype(float);a,s=align(out)
    cream=(a.min(2)>205)&(a[...,0]-a[...,2]>10);d=np.abs(a-REF).max(2);add=(d>40)&(np.abs(a-BG).max(2)>40)&~cream;add=ndimage.binary_opening(add,iterations=2)
    lab,n=ndimage.label(add);sz=ndimage.sum(add,lab,range(1,n+1));add=np.isin(lab,[i+1 for i in range(n) if sz[i]>.01*sz.max()])
    ink=(a.max(2)<110)&ndimage.binary_dilation(add,iterations=6)&(d>25);m=ndimage.binary_fill_holes(ndimage.binary_closing(add|ink,iterations=2))&~cream
    front=m&ndimage.binary_dilation(core,iterations=3);back=m&~front
    def big(x,f=.05):
        lab,n=ndimage.label(x);sz=ndimage.sum(x,lab,range(1,n+1));return np.isin(lab,[i+1 for i in range(n) if sz[i]>f*sz.max()]) if n else x
    front=big(front);back=big(back)
    # behind the body: fill the cape in from its back edge to the body's middle, over the rows it spans
    ys,xs=np.where(back);fill=None
    if len(ys) and dofill:
        bx=np.where(body.any(0))[0];mid=(bx.min()+bx.max())//2;fill=np.zeros_like(m);r0,r1=ys.min(),ys.max()
        for y in range(r0,r1+1):
            row=np.where(back[y])[0]
            if len(row):fill[y,row.min():mid]=body[y,row.min():mid]
        fill&=~ndimage.binary_dilation(front,iterations=2)
    rb=save(a,back,name+'.b',piv,fill,back&(a.max(2)>110));rf=save(a,front,name+'.f',piv)
    print(json.dumps({name+'.b':rb,name+'.f':rf}),'align',round(s,3))
for arg in sys.argv[2:]:
    n,f,px,py,fl=arg.split(':');cut(n,f,(float(px),float(py)),fl=='1')
