# Partner frame sheets (issue #127) to assets/art/rigs/p_<key>.root+all[.<frame>].webp.
#   python3 tools/art/partners.py <renders dir>      (run from the repo root; needs Pillow, numpy, scipy)
# The renders dir holds lumi.png, snip.png, smudge.png and ember.png: one render per partner, its frames in one row
# (prompts in tools/art/rig-sheets.json, "partners"). The walkers (Snip, Smudge) go through build.frame_set(), feet on the
# bottom edge. The fliers (Lumi, Ember) have no feet to stand on, so their frames are placed where their ink best overlaps the
# idle frame's (aligned_set), so the body stays put while the wings or the face change.
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage, signal
sys.path.insert(0, os.path.dirname(__file__))
import build

def columns(img, n, thr=16, join=3, rows=1, opn=8):
    """The biggest figure in each of n equal columns (of each of rows equal rows, reading order) as RGBA crops. Only the
    biggest piece of each cell is kept, so a shadow or motion lines painted beside the figure are left out."""
    a = np.asarray(img.convert('RGB')).astype(int); H, W = a.shape[:2]; out = []
    for r in range(rows):
      for c in range(n):
        x0, x1 = int(c * W / n), int((c + 1) * W / n); q = a[int(r * H / rows):int((r + 1) * H / rows), x0:x1]
        bg = np.median(np.concatenate([q[3], q[-4], q[:, 3], q[:, -4]]), axis=0); f = np.abs(q - bg).max(axis=2) >= thr
        lab, k = ndimage.label(ndimage.binary_dilation(f, iterations=join)); sz = ndimage.sum(f, lab, range(1, k + 1))
        m = ndimage.binary_opening(ndimage.binary_fill_holes(f & (lab == np.argmax(sz) + 1)), iterations=opn)  # thin specks and rays off
        m = ndimage.binary_fill_holes(m); cl, cn = ndimage.label(m); m = cl == np.argmax(ndimage.sum(m, cl, range(1, cn + 1))) + 1; ys, xs = np.where(m)
        sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        out.append(Image.fromarray(np.dstack([q.astype(np.uint8), (m * 255).astype(np.uint8)])[sl], 'RGBA'))
    return out

def trim(im, l=0, r=0):
    """Cut a fraction off the left or right of a figure: a neighbour's ray or motion lines joined to it."""
    return im.crop((round(im.width * l), 0, round(im.width * (1 - r)), im.height))

def ink(im):
    a = np.asarray(im); return (a[..., :3].max(axis=2) < 90) & (a[..., 3] > 127)

def shift(ref, mov):
    """(dx, dy) that puts mov's ink over ref's ink."""
    c = signal.fftconvolve(ref.astype(float), mov[::-1, ::-1].astype(float), mode='full')
    y, x = np.unravel_index(np.argmax(c), c.shape); return x - (mov.shape[1] - 1), y - (mov.shape[0] - 1)

def deglow(im):
    """A frame painted glowing (a flare) draws its outline warm brown, not ink, so restyle() can't find it: turn those
    pixels to ink first (the glow and rays outside the outline are then dropped like any render's border)."""
    a = np.asarray(im).copy(); r, g, b = (a[..., i].astype(int) for i in range(3))
    a[(r < 205) & (g < 105) & (b < 95) & (r - b > 20) | (a[..., :3].max(axis=2) < 90), :3] = build.INK; return Image.fromarray(a, 'RGBA')

def inlay(base, fig, ppt):
    """base (a restyled frame) with fig's painting inside its ink line, placed where their ink lines up: for a frame that
    only changes inside the outline and was painted glowing (Lumi's flare), whose own outline can't be found."""
    a = np.asarray(base).copy(); fa = np.asarray(fig.convert('RGBA')); dx, dy = shift(ink(base), ink(deglow(fig)))
    inside = ndimage.binary_erosion(a[..., 3] > 127, iterations=int(build.INK_W * ppt) + 3); ys, xs = np.where(inside)
    fy, fx = ys - dy, xs - dx; ok = (fy >= 0) & (fy < fa.shape[0]) & (fx >= 0) & (fx < fa.shape[1]) & (fa[np.clip(fy, 0, fa.shape[0] - 1), np.clip(fx, 0, fa.shape[1] - 1), 3] > 127)
    a[ys[ok], xs[ok], :3] = fa[fy[ok], fx[ok], :3]; return Image.fromarray(a, 'RGBA')

def aligned_set(figs, name, frames, tiles=1.2, h=320, out='assets/art/rigs', inlaid=()):
    """Like build.frame_set(), but each frame goes where its ink overlaps the idle frame's the most. inlaid frames keep
    the idle frame's outline with their own painting inside (inlay)."""
    ppt = figs[frames['']].height / tiles; st = {}
    for v, i in frames.items():
        im, _ = build.restyle(figs[i], ppt, border=False); a = np.asarray(im)[..., 3] > 8; ys, xs = np.where(a)
        st[v] = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    for v in inlaid: st[v] = inlay(st[''], figs[frames[v]], ppt)
    ref = ink(st['']); pos = {}
    for v, im in st.items(): pos[v] = (0, 0) if v == '' else shift(ref, ink(im))
    x0 = min(p[0] for p in pos.values()); y0 = min(p[1] for p in pos.values())
    x1 = max(p[0] + st[v].width for v, p in pos.items()); y1 = max(p[1] + st[v].height for v, p in pos.items())
    # centre the idle frame on the canvas across, so the rig's pivot stays in the middle of the figure
    cx = pos[''][0] + st[''].width / 2; half = max(cx - x0, x1 - cx); W = int(2 * half) + 2; Hh = y1 - y0; os.makedirs(out, exist_ok=True)
    for v, im in st.items():
        c = Image.new('RGBA', (W, Hh)); c.alpha_composite(im, (int(round(W / 2 - cx + pos[v][0])), pos[v][1] - y0))
        c.resize((round(W * h / Hh), h), Image.LANCZOS).save(os.path.join(out, name + ('.' + v if v else '') + '.webp'), 'WEBP', quality=90, method=6)

def lumi(img):
    figs = columns(img, 4); figs[1] = trim(figs[1], r=.05)  # the flare's rays reach into the blink frame
    aligned_set(figs, 'p_lumi.root+all', {'': 0, 'blink': 1, 'flare': 2, 'cheer': 3}, inlaid=('flare',))

def ember(img):
    figs = columns(img, 5, thr=24); figs[3] = deglow(figs[3])
    aligned_set(figs, 'p_ember.root+all', {'': 0, 'flap': 1, 'blink': 2, 'flare': 3, 'cheer': 4})

def snip(img):
    # frame 4 (the second step) came out frowning, so the standing frame is the second step (docs/ART.md: keep the face between frames that alternate)
    build.frame_set(build.blobs(img), 'p_snip.root+all', {'': 0, 'blink': 1, 'w1': 2, 'w2': 0, 'snip': 4, 'snip2': 5, 'cheer': 6}, tiles=1)

def smudge(img):
    figs = columns(img, 3, rows=2); figs[5] = trim(figs[5], l=.1)  # motion lines behind the wagging tail
    build.frame_set(figs, 'p_smudge.root+all', {'': 0, 'blink': 1, 'w1': 2, 'w2': 3, 'dig': 4, 'cheer': 5}, tiles=1)

if __name__ == '__main__':
    d = sys.argv[1]
    for k, fn in (('lumi', lumi), ('snip', snip), ('smudge', smudge), ('ember', ember)):
        p = os.path.join(d, k + '.png')
        if os.path.exists(p): fn(Image.open(p))
