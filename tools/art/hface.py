"""Face transplant for painted human heads (docs/ART.md). The human rig's head has 8 expression variants that differ only in
the eyes, mouth and brows. Given each variant's drawn head (from rigSkin, as hparts/<foe>.head[.v].png), face_mask() finds
the pixels that change between them, blank() gives a reference head with the face painted over in skin colour (for the
model to repaint), and features() lifts each variant's features to lay over the painted blank head."""
import numpy as np; from PIL import Image
V=['','.blink','.happy','.hurt','.ko','.surprised','.sad','.angry']
def load(f): return [np.asarray(Image.open(f'hparts/{f}.head{v}.png').convert('RGBA')).astype(int) for v in V]
def face_mask(f):
    a=load(f); st=np.stack([x[...,:3] for x in a]); U=(st.max(0)-st.min(0)).max(-1)>30
    U=__import__('scipy.ndimage',fromlist=['x']).binary_dilation(U,iterations=1)&(a[0][...,3]>0)
    cols=st[:,U].reshape(-1,3); vals,cnt=np.unique(cols//8,axis=0,return_counts=True); skin=vals[cnt.argmax()]*8+4
    return a,U,skin
def blank(f):
    a,U,skin=face_mask(f); b=a[0].copy(); b[U,:3]=skin; return Image.fromarray(b.astype(np.uint8))
def features(f):
    a,U,skin=face_mask(f); out=[]
    for x in a:
        m=U&(np.abs(x[...,:3]-skin).max(-1)>40)&(x[...,3]>0); y=np.zeros_like(x); y[m]=x[m]; out.append(Image.fromarray(y.astype(np.uint8)))
    return out
