"""Header / search-results / universal art for App Store Connect.

Specs (Apple, creative-assets-specifications): header 3840x1646 (21:9),
search results 3:2 from 1920x1280 to 3840x2560, universal 5244x2950 PNG (16:9).
All RGB, no alpha. Run: python3 appstore/make-creative.py
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
BG = (7, 6, 13)
STOPS = [(0.0, (47, 128, 255)), (0.28, (60, 230, 120)), (0.5, (255, 214, 10)),
         (0.72, (255, 120, 20)), (1.0, (255, 40, 150))]
F = lambda w, s: ImageFont.truetype(f"/usr/share/fonts/opentype/inter/Inter-{w}.otf", s)

def grad(w, h):
    g = Image.new("RGB", (w, 1))
    for x in range(w):
        t = x / max(1, w - 1)
        for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
            if a <= t <= b:
                k = (t - a) / (b - a); g.putpixel((x, 0), tuple(int(ca[i] + (cb[i] - ca[i]) * k) for i in range(3))); break
    return g.resize((w, h))

def rounded(im, r):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, *im.size), r, fill=255)
    out = Image.new("RGBA", im.size); out.paste(im.convert("RGBA"), (0, 0), m); return out

def text_grad(canvas, xy, s, font, anchor="la"):
    m = Image.new("L", canvas.size, 0); ImageDraw.Draw(m).text(xy, s, font=font, fill=255, anchor=anchor)
    bb = m.getbbox(); g = grad(bb[2] - bb[0], bb[3] - bb[1])
    canvas.paste(g, (bb[0], bb[1]), m.crop(bb))

def compose(w, h, mode):
    c = Image.new("RGB", (w, h), BG)
    # soft neon wash behind the mark
    glow = Image.new("RGB", (w, h), BG)
    icon = Image.open(os.path.join(HERE, "icon", "icon-1024.png")).convert("RGB")
    u = min(w, h)
    isz = int(u * (0.62 if mode == "left" else 0.46))
    ix, iy = (int(w * 0.07), (h - isz) // 2) if mode == "left" else ((w - isz) // 2, int(h * 0.16))
    blob = Image.new("RGB", (w, h), BG)
    ImageDraw.Draw(blob).ellipse((ix - isz * .2, iy - isz * .2, ix + isz * 1.2, iy + isz * 1.2), fill=(70, 20, 110))
    blob = blob.filter(ImageFilter.GaussianBlur(u * 0.12))
    c = ImageChops.add(c, blob)
    mark = rounded(icon.resize((isz, isz), Image.LANCZOS), int(isz * 0.2237))
    c.paste(mark, (ix, iy), mark)
    d = ImageDraw.Draw(c)
    if mode == "left":
        tx = ix + isz + int(w * 0.05)
        ts = int(h * 0.15)
        text_grad(c, (tx, int(h * 0.30)), "Music ConnectZ", F("ExtraBold", ts))
        d.text((tx, int(h * 0.30) + int(ts * 1.35)), "Make music with people who show up.", font=F("Medium", int(h * 0.062)), fill=(220, 215, 235))
        d.text((tx, int(h * 0.30) + int(ts * 1.35) + int(h * 0.10)), "Get scored. Get paid. Get better.", font=F("Medium", int(h * 0.062)), fill=(150, 145, 175))
    else:
        cx = w // 2
        ts = int(h * 0.085)
        ty = iy + isz + int(h * 0.07)
        text_grad(c, (cx, ty), "Music ConnectZ", F("ExtraBold", ts), anchor="ma")
        d.text((cx, ty + int(ts * 1.35)), "Make music with people who show up.", font=F("Medium", int(h * 0.036)), fill=(220, 215, 235), anchor="ma")
    return c

out = os.path.join(HERE, "creative")
os.makedirs(out, exist_ok=True)
compose(3840, 1646, "left").save(f"{out}/header-3840x1646.png")
compose(2880, 1920, "center").save(f"{out}/search-results-2880x1920.png")
compose(5244, 2950, "left").save(f"{out}/universal-5244x2950.png")
for f in sorted(os.listdir(out)):
    im = Image.open(f"{out}/{f}"); print(f, im.size, im.mode)
