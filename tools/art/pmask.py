# colour masks (hair, tunic, legs) for the player render, used by pframes.py
from PIL import Image
import numpy as np
def masks():
    c=Image.open('nbp_cut.png');a=np.asarray(c);al=a[...,3]>0
    hsv=np.asarray(c.convert('RGB').convert('HSV')).astype(int);H,S,V=hsv[...,0],hsv[...,1],hsv[...,2]
    yy=np.arange(a.shape[0])[:,None]*np.ones(a.shape[1],int)[None,:]
    red=(H>=238)|(H<=16)
    hair=al&red&(V>=55)&(V<=150)&(S>=50)&(yy<1000)
    tunic=al&(H>=105)&(H<=150)&(S>=35)&(V>=70)
    legs=al&(yy>1590)&(((H>=200)&(H<=238)&(S>=45)&(V>=45)&(V<=150))|(red&(S>=80)&(V>=100)&(V<=190)&(yy>1830)))
    return c,hair,tunic,legs
