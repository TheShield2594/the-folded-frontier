# cut.py: remove the flat grey background from a Higgsfield sticker render and trim it
import sys, numpy as np
from PIL import Image
from scipy import ndimage
def cut(path, tol=16):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(int)
    h, w, _ = a.shape
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(edge, axis=0)
    d = np.abs(a - bg).max(axis=2)
    like = d < tol
    lab, n = ndimage.label(like)
    ids = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(ids))
    bgmask = ndimage.binary_dilation(bgmask, iterations=2) & (d < tol * 2.5)  # eat the anti-aliased fringe
    alpha = np.where(bgmask, 0, 255).astype(np.uint8)
    out = Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')
    return out.crop(out.getbbox())
if __name__ == '__main__':
    for p in sys.argv[1:]:
        c = cut(p); c.save(p.replace('.png', '_cut.png')); print(p, c.size)
