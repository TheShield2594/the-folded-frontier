# Builds the painted assets in assets/ from the Higgsfield renders (see CLAUDE.md, "Art: painted vs code-drawn").
#   python3 tools/art/build.py <renders dir>      (run from the repo root; needs Pillow, numpy, scipy)
# The renders dir holds the source PNGs from the Higgsfield project "The Folded Frontier art", named as in RENDERS.
# Every asset goes through restyle(), which redraws the ink outline and cream border at the house thickness from STYLE.md,
# measured in tiles as the art appears in game, so art scaled by different amounts still matches.
import sys, os, math, numpy as np
from PIL import Image
from scipy import ndimage

RENDERS = {'tree': 'tree.png', 'fox': 'fox.png', 'fox2': 'fox2.png', 'trunk': 'trunk.png', 'parts': 'parts.png'}
# armour sets (STYLE.md prompts): head wearing the helmet, torso, arm, leg; build whichever are present
ARMOR = {m: f'armor-{m}.png' for m in ('cu', 'fe', 'au', 'fr', 'ik', 'em')}
INK, CREAM = (0x2a, 0x21, 0x30), (0xfb, 0xf5, 0xe6)
INK_W, BORDER_W = .05, .06  # in tiles, as seen in game (STYLE.md)

def cut(im, tol=16):
    """Remove the flat background (flood fill from the edges) and trim."""
    a = np.asarray(im.convert('RGB')).astype(int)
    bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
    d = np.abs(a - bg).max(axis=2); lab, _ = ndimage.label(d < tol)
    ids = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    m = ndimage.binary_dilation(np.isin(lab, list(ids)), iterations=2) & (d < tol * 2.5)
    out = Image.fromarray(np.dstack([a.astype(np.uint8), np.where(m, 0, 255).astype(np.uint8)]), 'RGBA')
    return out.crop(out.getbbox())

def restyle(im, ppt, border=True):
    """Replace the render's own outline and border with ones of the house thickness. ppt = image pixels per tile in game.
    border=False leaves the cream border off (player parts: the game adds one around the whole figure).
    Returns the new image and the offset (padding) added on each side."""
    kt, bt = INK_W * ppt, (BORDER_W * ppt if border else 0); pad = math.ceil(kt + bt) + 4
    a = np.asarray(im.convert('RGBA')).astype(float); a = np.pad(a, ((pad, pad), (pad, pad), (0, 0)))
    solid = a[..., 3] > 127; din = ndimage.distance_transform_edt(solid)
    mx = a[..., :3].max(axis=2)
    # everything outside the render's ink line (its border, any soft shadow) is replaced: find where the ink starts and ends,
    # as the distance in from the edge where at least half the pixels are ink, then where they stop being
    ring = np.rint(din).astype(int); dark = solid & (mx < 90); ratio = []
    for d in range(1, int(.25 * ppt)):
        sel = ring == d; ratio.append(dark[sel].mean() if sel.any() else 0)
    ratio = np.array(ratio); on = np.argmax(ratio >= .5); off = on + np.argmax(ratio[on:] < .5)
    B = on; K = off - on  # ratio[i] is distance i+1, so B = pixels before the ink and K = ink pixels
    core = din > B + max(0, K - kt)
    dout = ndimage.distance_transform_edt(~core)
    add = max(0., kt - K)  # extra ink ring when the render's ink is thinner than the standard
    out = np.zeros_like(a)
    out[core] = a[core]; out[core, 3] = 255
    ring = ~core
    ink_t = np.clip(add + .5 - dout, 0, 1)  # 1 inside the new ink ring, ramps to 0 over a pixel
    col = np.array(INK, float) * ink_t[..., None] + np.array(CREAM, float) * (1 - ink_t[..., None])
    alpha = np.clip(add + bt + .5 - dout, 0, 1) * 255
    out[ring, :3] = col[ring]; out[ring, 3] = alpha[ring]
    return Image.fromarray(out.astype(np.uint8), 'RGBA'), pad

def fit(im, w, h):
    s = min(w / im.width, h / im.height); return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS), s

def trees(src):
    """trees.webp: bright and dark canopy, 512x512 each (2x of the 256 atlas region, drawn 5 tiles wide)."""
    c = cut(src['tree']); s0 = 424 / max(c.size); ppt = 512 / 5 / s0
    c, _ = restyle(c, ppt); c, _ = fit(c, 440, 440)
    def dark(im):
        a = np.asarray(im).copy(); hsv = np.asarray(im.convert('RGB').convert('HSV')).astype(float); sat = hsv[..., 1] > 60
        hsv[..., 0] = np.where(sat, (hsv[..., 0] + 12) % 256, hsv[..., 0]); hsv[..., 2] = np.where(sat, hsv[..., 2] * .8, hsv[..., 2])
        a[..., :3] = np.asarray(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')); return Image.fromarray(a, 'RGBA')
    out = Image.new('RGBA', (1024, 512), (0, 0, 0, 0))
    for i, im in enumerate([c, dark(c)]): out.alpha_composite(im, (i * 512 + 256 - im.width // 2, 256 - im.height // 2))
    out.save('assets/trees.webp', quality=88, method=6)

def fox(src):
    """foldfox.webp: 2 frames of 256x192 (2x of EN.foldfox 128x96; 60 px per tile at 1x)."""
    a, b = cut(src['fox']), cut(src['fox2']); s = min(248 / a.width, 176 / a.height); ppt = 120 / s
    out = Image.new('RGBA', (512, 192), (0, 0, 0, 0))
    for i, c in enumerate([a, b]):
        c, pad = restyle(c, ppt); r = c.resize((round(c.width * s), round(c.height * s)), Image.LANCZOS)
        if r.width > 254: r, _ = fit(r, 254, 190)
        out.alpha_composite(r, (i * 256 + 128 - r.width // 2, 190 - r.height))
    out.save('assets/foldfox.webp', quality=90, method=6)

def trunk(src):
    """trunk.webp: seamless bark tile then root base, 256x128 each (2x of the 128x64 atlas pieces, drawn 2 tiles wide)."""
    c = cut(src['trunk']); s = 226 / c.width; ppt = 128 / s
    c, pad = restyle(c, ppt); a = np.asarray(c).astype(float); h, w = a.shape[:2]
    T = round(128 / s); O = 140; cols = np.where(a[pad + 1200, :, 3] > 0)[0]; cx = (cols[0] + cols[-1]) / 2
    mid = a[pad + 920:pad + 920 + T + O].copy(); t = np.linspace(0, 1, O)[:, None, None]
    mid[:O] = mid[T:T + O] * (1 - t) + mid[:O] * t; mid = mid[:T]
    base = a[h - pad - T:h - pad]
    out = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    for i, p in enumerate([mid, base]):
        im = Image.fromarray(np.clip(p, 0, 255).astype(np.uint8), 'RGBA').resize((round(w * s), 128), Image.LANCZOS)
        out.alpha_composite(im, (round(128 - cx * s), i * 128))
    out.save('assets/trunk.webp', quality=90, method=6)

# player parts: component labels in parts.png and joint points in its source pixels (neck base, neck top, shoulder, hip)
PART_IDS = {'head': 1, 'torso': 6, 'arm': 9, 'leg': 10, 'helm': 8}
PART_PIV = {'head': (330, 620), 'torso': (398, 67), 'arm': (95, 45), 'leg': (112, 56), 'helm': (0, 0)}
PART_S = .14  # source px to 2x frame px (192x288 frames, 120 px per tile)

def parts(src):
    """player_parts.webp + player_parts_mask.webp; prints the RIG table for index.html."""
    a = np.asarray(src['parts'].convert('RGB')).astype(int)
    bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
    lab, _ = ndimage.label(np.abs(a - bg).max(axis=2) >= 16); objs = ndimage.find_objects(lab)
    ppt = 120 / PART_S; x = 0; pieces = []; rows = []
    for k, i in PART_IDS.items():
        m = ndimage.binary_fill_holes(lab == i); sl = objs[i - 1]
        im = Image.fromarray(np.dstack([a.astype(np.uint8), (m * 255).astype(np.uint8)])[sl], 'RGBA')
        tint = tintmask(k, im)
        im, pad = restyle(im, ppt, border=False); tint = np.pad(tint, pad)
        w, h = round(im.width * PART_S), round(im.height * PART_S)
        r = im.resize((w, h), Image.LANCZOS); tm = Image.fromarray((tint * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)
        px, py = PART_PIV[k]; pieces.append((r, tm, x))
        rows.append(f"{k}:[{x},0,{w},{h},{round((px + pad) * PART_S, 1)},{round((py + pad) * PART_S, 1)}]"); x += w + 2
    W, H = x, max(p[0].height for p in pieces)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); msk = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for r, tm, x in pieces:
        img.alpha_composite(r, (x, 0)); mm = Image.new('RGBA', r.size, (255, 255, 255, 0)); mm.putalpha(tm); msk.alpha_composite(mm, (x, 0))
    img.save('assets/player_parts.webp', quality=92, method=6); msk.save('assets/player_parts_mask.webp', lossless=True, method=6)
    print('RIG={' + ','.join(rows) + '}')

def tintmask(k, im):
    """What armour recolours: tunic and sleeves (mail), trousers and boots (greaves), helmet metal."""
    hsv = np.asarray(im.convert('RGB').convert('HSV')).astype(int); H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]; al = np.asarray(im)[..., 3] > 0
    if k in ('torso', 'arm'): m = (H >= 105) & (H <= 150) & (S >= 35) & (V >= 70)
    elif k == 'leg': m = ((H >= 200) & (H <= 238) & (S >= 45) & (V >= 40)) | (((H >= 238) | (H <= 20)) & (S >= 80) & (V >= 60) & (V <= 200))
    elif k == 'helm': m = (S < 40) & (V >= 90) & (V <= 235)
    else: m = np.zeros_like(al)
    return m & al

def inked_pieces(img, n=4, grow=2):
    """Split a parts sheet into its n pieces, left to right, each cut out as exactly its filled ink outline (plus a couple of
    pixels of anti-aliasing), since restyle() replaces everything outside the ink anyway. This ignores the render's border,
    its soft shadows and the blurry ghost blobs image models sometimes add, and keeps pale fills (chainmail) that are close
    to the background grey. Returns (piece, (x, y) of its top-left in the render)."""
    a = np.asarray(img.convert('RGB')).astype(int); ink = a.max(axis=2) < 90
    core = ndimage.binary_fill_holes(ndimage.binary_closing(ink, iterations=2))
    lab, m = ndimage.label(core); sz = ndimage.sum(core, lab, range(1, m + 1)); out = []
    for k in np.argsort(-sz)[:n] + 1:
        mask = ndimage.binary_dilation(lab == k, iterations=grow)
        ys, xs = np.where(mask); sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        out.append(((xs.min(), ys.min()), Image.fromarray(np.dstack([a.astype(np.uint8), (mask * 255).astype(np.uint8)])[sl], 'RGBA')))
    return [(im, o) for o, im in sorted(out, key=lambda t: t[0][0])]

# joint points per armour render, in whole-render px (neck base, neck top, shoulder, hip); a new render needs its own
ARMOR_PIV = {'cu': {'head': (331, 749), 'torso': (954, 371), 'arm': (1313, 368), 'leg': (1604, 354)},
             'au': {'head': (369, 752), 'torso': (950, 371), 'arm': (1369, 383), 'leg': (1713, 375)},
             'fe': {'head': (290, 760), 'torso': (945, 335), 'arm': (1378, 350), 'leg': (1680, 345)},
             'fr': {'head': (375, 780), 'torso': (1000, 353), 'arm': (1440, 365), 'leg': (1678, 322)},
             'ik': {'head': (350, 760), 'torso': (985, 360), 'arm': (1380, 375), 'leg': (1698, 360)},
             'em': {'head': (372, 760), 'torso': (985, 350), 'arm': (1365, 350)}}  # emberite leg: the render's boot has no outline; regenerate it
HEAD_FIX = {'fe': 1.15}  # renders that drew the head small for the torso
BASE_H = {'head': 625, 'torso': 563, 'arm': 509, 'leg': 598}  # base part heights inside their ink outline in parts.png, so armour pieces match their size

def armor(img, m):
    """armor_<m>.webp: helmeted head, torso, arm, leg (ink only, no tint mask); prints the ARMOR_RIG entry."""
    ks = [k for k in ('head', 'torso', 'arm', 'leg') if k in ARMOR_PIV[m]]  # a piece left out falls back to the tinted plain part
    cand = inked_pieces(img, 8)
    def owner(pt):  # the piece whose box holds this joint point (the leg can be bigger or smaller than a ghost blob)
        return min(cand, key=lambda c: max(c[1][0] - pt[0], pt[0] - c[1][0] - c[0].width, c[1][1] - pt[1], pt[1] - c[1][1] - c[0].height))
    ps = [owner(ARMOR_PIV[m][k]) for k in ks]
    x = 0; pieces = []; rows = []; st = PART_S * BASE_H['torso'] / ps[1][0].height
    for k, (im, (ox, oy)) in zip(ks, ps):
        s = st * 1.04 * HEAD_FIX.get(m, 1) if k == 'head' else PART_S * BASE_H[k] / im.height  # heads by the torso's scale: crests and plumes vary in height
        im, pad = restyle(im, 120 / s, border=False)
        w, h = round(im.width * s), round(im.height * s); r = im.resize((w, h), Image.LANCZOS)
        px, py = ARMOR_PIV[m][k]; px -= ox; py -= oy; pieces.append((r, x))
        rows.append(f"{k}:[{x},0,{w},{h},{round((px + pad) * s, 1)},{round((py + pad) * s, 1)}]"); x += w + 2
    out = Image.new('RGBA', (x, max(r.height for r, _ in pieces)), (0, 0, 0, 0))
    for r, x in pieces: out.alpha_composite(r, (x, 0))
    out.save(f'assets/armor_{m}.webp', quality=92, method=6)
    print(f"{m}:{{" + ','.join(rows) + '}')

if __name__ == '__main__':
    d = sys.argv[1]; src = {k: Image.open(os.path.join(d, f)) for k, f in RENDERS.items()}
    trees(src); fox(src); trunk(src); parts(src)
    for m, f in ARMOR.items():
        if os.path.exists(os.path.join(d, f)): armor(Image.open(os.path.join(d, f)), m)
