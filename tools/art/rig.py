# run from the repo root with the parts render saved as parts.png
# builds assets/player_parts.webp (head, torso, arm, leg, helmet side by side) and player_parts_mask.webp (alpha = parts armour recolours)
# from the Higgsfield parts render; prints the rects and joint points that paintedPlayer() in index.html uses
import numpy as np
from PIL import Image
from parts_cut import P
S=.14
PIV={'head':(330,620),'torso':(398,67),'arm':(95,45),'leg':(112,56),'helm':(215,470)}  # joint in source px: neck base, neck top, shoulder, hip, helmet rim
def tintmask(k,im):
    hsv=np.asarray(im.convert('RGB').convert('HSV')).astype(int);H,Sa,V=hsv[...,0],hsv[...,1],hsv[...,2];al=np.asarray(im)[...,3]>0
    if k in('torso','arm'):m=(H>=105)&(H<=150)&(Sa>=35)&(V>=70)
    elif k=='leg':m=((H>=200)&(H<=238)&(Sa>=45)&(V>=40))|(((H>=238)|(H<=20))&(Sa>=80)&(V>=60)&(V<=200))
    elif k=='helm':m=(Sa<40)&(V>=90)&(V<=235)
    else:m=np.zeros_like(al)
    return m&al
out=[];x=0;rows=[]
for k in['head','torso','arm','leg','helm']:
    im=P[k];w,h=round(im.width*S),round(im.height*S);r=im.resize((w,h),Image.LANCZOS)
    m=Image.fromarray((tintmask(k,im)*255).astype(np.uint8)).resize((w,h),Image.LANCZOS)
    out.append((r,m,x));px,py=PIV[k];rows.append(f"{k}:[{x},0,{w},{h},{round(px*S,1)},{round(py*S,1)}]");x+=w+2
W=x;H=max(o[0].height for o in out)
img=Image.new('RGBA',(W,H),(0,0,0,0));msk=Image.new('RGBA',(W,H),(0,0,0,0))
for r,m,x in out:
    img.alpha_composite(r,(x,0));mm=Image.new('RGBA',r.size,(255,255,255,0));mm.putalpha(m);msk.alpha_composite(mm,(x,0))
img.save('assets/player_parts.webp',quality=92,method=6)
msk.save('assets/player_parts_mask.webp',lossless=True,method=6)
print('{'+','.join(rows)+'}',W,H)
