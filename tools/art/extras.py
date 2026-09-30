# Pets, the mount, projectile cells, status overlays and the last foe faces (issue #130) into assets/art/.
#   python3 tools/art/extras.py <renders dir>      (run from the repo root; needs Pillow, numpy, scipy)
# The renders dir holds one render per sheet (prompts in tools/art/rig-sheets.json, "extras"): frog.png, kit.png, moth.png,
# crease.png and stag.png (a pet's or the stag's frames in one row), proj.png (the projectile icons, 2 rows of 3),
# status.png (flames, ink blots and drips, water drops in three rows) and faces.png (slime mouth, Grand Nib blink, Folio
# eye white). Sheets come out at exactly the size of the drawn SHEETS strip, since paintSheet() draws into that canvas.
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, os.path.dirname(__file__))
import build, partners

SHEETS = 'assets/art/sheets'

def figures(img, n, thr=16):
    """The n biggest figures in a render, left to right (a faint ghost copy or a speck is left out)."""
    a = np.asarray(img.convert('RGB')).astype(int); bg = np.median(np.concatenate([a[3], a[-4], a[:, 3], a[:, -4]]), axis=0)
    f = np.abs(a - bg).max(axis=2) >= thr; f = ndimage.binary_opening(f, iterations=2)
    lab, k = ndimage.label(ndimage.binary_dilation(f, iterations=6)); sz = ndimage.sum(f, lab, range(1, k + 1)); objs = ndimage.find_objects(lab)
    keep = sorted(np.argsort(-sz)[:n] + 1, key=lambda i: objs[i - 1][1].start); out = []
    for i in keep:
        m = ndimage.binary_fill_holes(f & (lab == i)); ys, xs = np.where(m); sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        out.append(Image.fromarray(np.dstack([a.astype(np.uint8), (m * 255).astype(np.uint8)])[sl], 'RGBA'))
    return out

def styled(figs, box, ppt, lead=None):
    """Every frame restyled (house ink line and cream border) and scaled so the biggest fits box = (w, h) at the sheet's
    ppt (px per tile in the sheet), all by one factor so the frames keep their sizes relative to each other. lead: the
    first frame (the one seen most) fills that fraction of the box instead, and a bigger frame (the frog's leap) is
    shrunk on its own to fit. Returns the frames and each one's scale."""
    fit = lambda f: min(box[0] / f.width, box[1] / f.height); s = min(fit(f) for f in figs) if lead is None else lead * fit(figs[0]); out = []
    for f in figs:
        im, _ = build.restyle(f, ppt / s); a = np.asarray(im)[..., 3] > 8; ys, xs = np.where(a)
        im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)); out.append(im)
    s = min(fit(f) for f in out) if lead is None else lead * fit(out[0])
    return out, [min(s, fit(f)) for f in out]

def sheet(name, figs, fw, fh, ppt, ground, align=None, pad=2, lead=None, anchor=None):
    """figs to SHEETS[name]: frames of fw x fh side by side. ground: the figure stands on the bottom edge (walkers and the
    stag), else it floats in the middle. align: 'ink' puts each frame where its ink best overlaps the first frame's (fliers,
    so the body stays put while the wings change), 'x' lines the frames up across by their upper halves (walkers whose
    legs change), None centres each frame. anchor(first frame) gives the x that goes on the frame's centre line instead of
    the middle of the frames' bounds (the stag's saddle, which the rider sits over)."""
    ims, ss = styled(figs, (fw - 2 * pad, fh - 2 * pad), ppt, lead)
    # work at 4x the sheet, then shrink once
    K = 4; ims = [im.resize((max(1, round(im.width * s * K)), max(1, round(im.height * s * K))), Image.LANCZOS) for im, s in zip(ims, ss)]
    pos = [(-(im.width // 2), -(im.height // 2)) for im in ims]
    if align == 'ink':
        ref = partners.ink(ims[0]); pos = [(0, 0)] + [partners.shift(ref, partners.ink(im)) for im in ims[1:]]
    elif align == 'x':
        top = lambda im: partners.ink(im)[:im.height // 2]; ref = top(ims[0])
        pos = [(0, 0)] + [(partners.shift(ref, top(im))[0], 0) for im in ims[1:]]
    x0 = min(p[0] for p in pos); x1 = max(p[0] + im.width for p, im in zip(pos, ims)); cx = (x0 + x1) / 2 if anchor is None else pos[0][0] + anchor(ims[0])
    y0 = min(p[1] for p in pos); y1 = max(p[1] + im.height for p, im in zip(pos, ims)); cy = (y0 + y1) / 2
    out = Image.new('RGBA', (fw * len(ims), fh))
    for i, (im, (dx, dy)) in enumerate(zip(ims, pos)):
        c = Image.new('RGBA', (fw * K, fh * K)); x = round(fw * K / 2 - cx + dx)
        y = fh * K - pad * K - im.height if ground else round(fh * K / 2 - cy + dy)
        c.alpha_composite(im, (x, y)); out.alpha_composite(c.resize((fw, fh), Image.LANCZOS), (i * fw, 0))
    os.makedirs(SHEETS, exist_ok=True); out.save(os.path.join(SHEETS, name + '.png'), optimize=True)
    return out

def pets(d):
    """pet_<k>: 2 frames of 96x96, one tile across (96 px per tile); ground pets stand on the bottom edge."""
    for k, ground, align, lead in (('frog', 1, None, .85), ('kit', 1, 'x', None), ('moth', 0, 'ink', None), ('crease', 0, 'ink', None)):
        p = os.path.join(d, k + '.png')
        if not os.path.exists(p): continue
        sheet('pet_' + k, figures(Image.open(p), 2), 96, 96, 96, ground, align, lead=lead)

def stag(d):
    """stag: 3 frames of 160x112 at 60 px per tile (stand, gallop, gallop), hooves on the bottom edge. The rider sits
    MOUNTS.stag.lift tiles up, on the saddle."""
    p = os.path.join(d, 'stag.png')
    def saddle(im):  # the middle of the red saddle blanket
        a = np.asarray(im).astype(int); red = (a[..., 0] > 170) & (a[..., 1] < 110) & (a[..., 2] < 100) & (a[..., 3] > 200); return np.where(red.any(axis=0))[0].mean()
    if os.path.exists(p): sheet('stag', figures(Image.open(p), 3), 160, 112, 60, 1, 'x', anchor=saddle)

def unpanel(img):
    """Paint out the white rules some renders draw between grid cells, so they aren't taken for a sticker."""
    a = np.asarray(img.convert('RGB')).copy(); bg = np.median(np.concatenate([a[3], a[-4], a[:, 3], a[:, -4]]), axis=0)
    light = a.min(axis=2) > 235
    for ax in (0, 1):
        line = light.mean(axis=ax) > .6; idx = np.where(line)[0]
        for i in idx:
            if ax == 0: a[:, max(0, i - 2):i + 3] = bg
            else: a[max(0, i - 2):i + 3] = bg
    return Image.fromarray(a)

def projectiles(d):
    """The projectile icons: atlas cells, 2 rows of 3 (the iceshard item's own cell is C.shard)."""
    p = os.path.join(d, 'proj.png')
    if os.path.exists(p): build.icon_cells(unpanel(Image.open(p)), 2, 3, ['inkball', 'fireball', 'bubble', 'crescent', 'foldwave', 'shard'])

# SHEETS.pstatus (render.js): 3 frames of 96x144, the stickers placed where the drawn ones are
FLAMES = [(26, 126, 26, 'o'), (70, 128, 30, 'o'), (34, 98, 20, 'y'), (66, 84, 22, 'y'), (22, 72, 18, 'o'), (76, 58, 16, 'y')]
BLOTS = [(44, 86, 6), (58, 98, 4.5), (40, 56, 4), (62, 40, 3.5), (50, 112, 4)]
DRIPS = [(36, 62, 14), (60, 104, 12), (48, 90, 10)]
DROPS = [(30, 40, 4), (70, 52, 3.5), (26, 80, 4.5), (74, 96, 4), (40, 20, 3.5), (62, 24, 3)]

def status(d):
    p = os.path.join(d, 'status.png')
    if not os.path.exists(p): return
    st = build.row_stickers(Image.open(p), 3, [6, 8, 6]); fl, bl, dr, wa = st[:6], st[6:11], st[11:14], st[14:]
    K = 4; out = Image.new('RGBA', (288 * K, 144 * K))
    def put(f, im, x, y, w, h):  # im fitted into the box x, y, w, h (sheet px of frame f), restyled at its final size
        s = min(w * K / im.width, h * K / im.height); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        im, pad = build.restyle(im, 48 * K); out.alpha_composite(im, (round(f * 96 * K + x * K + (w * K - im.width) / 2), round(y * K + (h * K - im.height) / 2)))
    oi = yi = 0
    for x, y, h, c in FLAMES:
        im = fl[[0, 2, 4][oi % 3]] if c == 'o' else fl[[1, 3, 5][yi % 3]]; oi += c == 'o'; yi += c == 'y'
        put(0, im, x - h * .45, y - h, h * .9, h)
    for i, (x, y, r) in enumerate(BLOTS): put(1, bl[i], x - r * 1.1, y - r * 1.1, r * 2.9, r * 2.9)
    for i, (x, y, l) in enumerate(DRIPS): put(1, dr[i], x - 4, y - 1, 8, l + 5)
    for i, (x, y, r) in enumerate(DROPS): put(2, wa[i], x - r * 1.2, y - r * 2.2, r * 2.4, r * 3.6)
    os.makedirs(SHEETS, exist_ok=True); out.resize((288, 144), Image.LANCZOS).save(os.path.join(SHEETS, 'pstatus.png'), optimize=True)

def faces(d):
    """The faces the painted foes kept drawn: the slime's mouth, the Grand Nib's blink and the Folio's eye white. The mouth
    and the blink are a few design px across, less than the house ink line is thick, so they keep the render's own line
    (restyle would ink them solid) and are only cut out and fitted, at 2x like every rig part."""
    p = os.path.join(d, 'faces.png')
    if not os.path.exists(p): return
    mouth, blink, eye = build.row_stickers(Image.open(p), 1, 3)
    for name, im, (w, h) in (('slime.mouth', mouth, (8, 5)), ('nib.eye.blink', blink, (36, 4))):
        im.resize((w * 2, h * 2), Image.LANCZOS).save(os.path.join('assets/art/rigs', name + '.webp'), 'WEBP', quality=90, method=6)
    im, _ = build.restyle(eye, eye.width / (84 / 60), border=False); a = np.asarray(im)[..., 3] > 8; ys, xs = np.where(a)
    im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)).resize((168, 128), Image.LANCZOS).save('assets/art/rigs/folio.eye.webp', 'WEBP', quality=90, method=6)

if __name__ == '__main__':
    d = sys.argv[1]
    pets(d); stag(d); projectiles(d); status(d); faces(d)
