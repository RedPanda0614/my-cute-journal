"""公有领域插图 → 透明底素材。
mode=color : 彩图,按纸色抠底,保留颜色
mode=ink   : 黑白木刻/版画,按深浅变透明度,统一成深棕墨色
mode=card  : 整张画片,不抠底,只裁边
mode=tile  : 墙纸纹样,原样缩小
用法: python3 cutout.py MODE 输入文件 输出.webp [最长边]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
Image.MAX_IMAGE_PIXELS = None


def load(path, side=1200):
    im = Image.open(path).convert('RGB')
    m = max(im.size)
    if m > side:
        im = im.resize((round(im.width * side / m), round(im.height * side / m)), Image.LANCZOS)
    return im


def border_color(a):
    h, w = a.shape[:2]
    b = max(4, int(min(h, w) * .03))
    strip = np.concatenate([a[:b].reshape(-1, 3), a[-b:].reshape(-1, 3), a[:, :b].reshape(-1, 3), a[:, -b:].reshape(-1, 3)])
    return np.median(strip, axis=0)


def keep_main(mask, frac=.03, min_px=300, grow=4):
    """只留大块:先膨胀把细茎连起来,再按面积筛掉页码、图注这类小碎块"""
    g = ndi.binary_dilation(mask, iterations=grow)
    lab, n = ndi.label(g, structure=np.ones((3, 3)))
    if n == 0:
        return mask
    areas = ndi.sum(mask, lab, range(1, n + 1))
    big = areas.max()
    ok = np.zeros(n + 1, bool)
    ok[1:] = areas >= max(big * frac, min_px)
    return ok[lab]


def crop_alpha(rgba, pad=6):
    a = np.array(rgba)[:, :, 3]
    ys, xs = np.where(a > 8)
    if not len(xs):
        return rgba
    return rgba.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(rgba.width, xs.max() + pad + 1), min(rgba.height, ys.max() + pad + 1)))


def solidify(alpha, margin=.004, close=.008):
    """剪纸贴纸:外轮廓以内全部不透明(不留窟窿),边上再留一圈细纸边"""
    h, w = alpha.shape
    m = alpha > .3
    r = max(2, round(max(h, w) * close))
    closed = ndi.binary_closing(np.pad(m, r), iterations=r)[r:-r, r:-r] | m
    sil = ndi.binary_fill_holes(closed)
    mg = max(1, round(max(h, w) * margin))
    sil = ndi.binary_dilation(sil, iterations=mg)
    soft = ndi.gaussian_filter(sil.astype(np.float32), .9)
    return np.maximum(alpha, np.clip(soft * 1.15 - .08, 0, 1))


def color_mode(im, t0=16, t1=42):
    a = np.asarray(im).astype(np.float32)
    bg = border_color(a)
    d = np.sqrt(((a - bg) ** 2).sum(axis=2))
    # 比纸色更深/更艳的才算图
    alpha = np.clip((d - t0) / (t1 - t0), 0, 1)
    alpha = ndi.median_filter(alpha, size=3)
    keep = keep_main(alpha > .35)
    alpha = alpha * ndi.binary_dilation(keep, iterations=2)
    # 填掉主体里被误抠的小洞(白花瓣)
    solid = ndi.binary_fill_holes(alpha > .5)
    holes = solid & (alpha <= .5)
    lab, n = ndi.label(holes)
    if n:
        sizes = ndi.sum(holes, lab, range(1, n + 1))
        small = np.zeros(n + 1, bool)
        small[1:] = sizes < alpha.size * .004
        alpha[small[lab]] = 1
    # 轮廓里面保留原书的纸色,不透底
    alpha = solidify(alpha)
    out = np.dstack([a, alpha * 255]).astype(np.uint8)
    return crop_alpha(Image.fromarray(out, 'RGBA'))


def ink_mode(im, ink=(58, 46, 36)):
    a = np.asarray(im).astype(np.float32)
    lum = a @ np.array([.299, .587, .114])
    bg = np.median(np.concatenate([lum[:6].ravel(), lum[-6:].ravel(), lum[:, :6].ravel(), lum[:, -6:].ravel()]))
    dark = np.percentile(lum, 2)
    alpha = np.clip((bg - 12 - lum) / max(30, bg - 12 - dark), 0, 1)
    keep = keep_main(alpha > .3, frac=.02, grow=3)
    alpha = alpha * ndi.binary_dilation(keep, iterations=1)
    return ink_rgba(alpha, ink)


PAPER = np.array([251, 247, 238], np.float32)


def ink_rgba(alpha, ink=(58, 46, 36)):
    """墨线 + 米白纸底,轮廓里面不透明"""
    k = alpha[..., None]
    rgb = PAPER * (1 - k) + np.array(ink, np.float32) * k
    out = np.dstack([rgb, solidify(alpha, margin=.006, close=.012) * 255]).astype(np.uint8)
    return crop_alpha(Image.fromarray(out, 'RGBA'), 3)


def card_mode(im):
    # 画片:去掉外圈的白纸边
    a = np.asarray(im).astype(np.float32)
    bg = border_color(a)
    d = np.sqrt(((a - bg) ** 2).sum(axis=2)) > 30
    rows, cols = np.where(ndi.binary_opening(d, iterations=3))
    if len(rows):
        im = im.crop((cols.min(), rows.min(), cols.max() + 1, rows.max() + 1))
    return im.convert('RGBA')


def main():
    mode, src, dst = sys.argv[1:4]
    side = int(sys.argv[4]) if len(sys.argv) > 4 else 560
    im = load(src, 1400 if mode != 'tile' else side) if mode != 'reink' else None
    if mode == 'reink':  # 已经是透明底墨线的(复古版画):直接按透明度重做
        src_im = Image.open(src).convert('RGBA')
        al = np.asarray(src_im)[..., 3].astype(np.float32) / 255
        al = np.pad(al, 12)
        out = ink_rgba(al)
    else:
        out = {'color': color_mode, 'ink': ink_mode, 'card': card_mode, 'tile': lambda i: i.convert('RGB')}[mode](im)
    m = max(out.size)
    if m > side:
        out = out.resize((round(out.width * side / m), round(out.height * side / m)), Image.LANCZOS)
    if out.mode == 'RGBA':
        out.save(dst, 'WEBP', quality=78, alpha_quality=70, method=4)
    else:
        out.save(dst, 'WEBP', quality=80, method=4)


main()
