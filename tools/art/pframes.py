# run from the repo root with the cut player render saved as nbp_cut.png (tools/art/cut.py); the cut coordinates fit that render
# builds assets/player.webp (9 frames, 192x288 each) and assets/player_mask.webp (R hair, G tunic, B legs)
import math, numpy as np
from PIL import Image
from pmask import masks
c,hair,tunic,legs=masks();a=np.asarray(c);h,w=a.shape[:2]
m=np.zeros_like(a);m[...,0]=hair*255;m[...,1]=tunic*255;m[...,2]=legs*255;m[...,3]=a[...,3]
FW,FH=192,288;H0=round(h*FH/228);W0=round(H0*FW/FH);ox=W0//2-690;oy=round(H0*276/FH)-h;k=H0/FH
yy,xx=np.mgrid[0:h,0:w]
upper=(yy<1640)|((yy<1720)&((xx<450)|(xx>955)))
def piece(src,sel):
    b=src.copy();b[~sel]=0;im=Image.new('RGBA',(W0,H0),(0,0,0,0));im.paste(Image.fromarray(b,'RGBA'),(ox,oy));return im
P={}
for nm,src in (('img',a),('mask',m)):
    lg=(yy>=1500)&(xx>=450)&(xx<=955)|~upper
    P[nm]=(piece(src,upper),piece(src,lg&(xx<690)),piece(src,lg&(xx>=690)))
hipL,hipR,feet=(ox+560,oy+1600),(ox+820,oy+1600),(ox+690,oy+h)
F=[{},{'bob':3,'sy':.985}]
for q in range(4):
    s,co=math.sin(q/4*math.pi*2),math.cos(q/4*math.pi*2);F.append({'L':-s*.32,'R':s*.32,'bob':-abs(co)*5+2,'tilt':s*.025})
F+=[{'L':-.35,'R':.25,'tilt':-.06,'sy':1.03},{'L':.3,'R':-.2,'tilt':.05},{'L':.35,'R':-.3,'tilt':.1,'bob':2}]
def frame(p,f):
    up,lL,lR=p;fr=Image.new('RGBA',(W0,H0),(0,0,0,0))
    for lay,ang,piv in ((lL,f.get('L',0),hipL),(lR,f.get('R',0),hipR)):fr.alpha_composite(lay.rotate(-math.degrees(ang),Image.BICUBIC,center=piv))
    fr.alpha_composite(up)
    sy=f.get('sy',1)
    if sy!=1:nh=round(H0*sy);fr2=fr.resize((W0,nh),Image.BICUBIC);fr=Image.new('RGBA',(W0,H0),(0,0,0,0));fr.alpha_composite(fr2.crop((0,max(0,nh-H0),W0,nh)) if nh>H0 else fr2,(0,max(0,H0-nh)-(0 if nh<=H0 else 0)))
    fr=fr.rotate(-math.degrees(f.get('tilt',0)),Image.BICUBIC,center=feet)
    fr=fr.transform(fr.size,Image.AFFINE,(1,0,0,0,1,-f.get('bob',0)*k),Image.BICUBIC)
    return fr.resize((FW,FH),Image.LANCZOS)
for nm,out in (('img','player.webp'),('mask','player_mask.webp')):
    sheet=Image.new('RGBA',(FW*9,FH),(0,0,0,0))
    for i,f in enumerate(F):sheet.alpha_composite(frame(P[nm],f),(i*FW,0))
    if nm=='img':sheet.save('assets/'+out,quality=90,method=6)
    else:sheet.save('assets/'+out,lossless=True,method=6)

