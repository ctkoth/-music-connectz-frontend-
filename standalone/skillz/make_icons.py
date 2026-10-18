#!/usr/bin/env python3
"""The SkillZ web icons, from the supplied sign.

    python standalone/skillz/make_icons.py

Reads icon-source-1024.png (the supplied 2000px art scaled once to 1024px, with its
four white corners filled with the colour beside them — the original is a rounded
square on white) and writes, into public/:

  icons/icon-192.png            any-purpose, full-bleed
  icons/icon-512.png            any-purpose, full-bleed
  icons/icon-512-maskable.png   the sign inside the 80% safe circle, on its own colours
  icons/skillz.png              384px, the hub's header art in THIS shell (the main
                                site keeps its own icons/skillz.png)
  apple-touch-icon.png          180px, opaque
  logo.png                      256px, what the sign-in screens show

Every output is a downscale or a placement of the 1024px source; nothing is upscaled.
The backend's android/tools/make_skillz_assets.py makes the Android art from the same
source, and `src/skillz.test.mjs` fails if the two copies of it differ.

Why the maskable icon is not full-bleed: the name "SkillZ" sits along the bottom edge,
and a maskable icon may be cut to a circle of 80% of its width. SAFE is the largest
art square whose name still clears that circle.
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "icon-source-1024.png")
OUT = os.path.join(HERE, "public")

# The name's bottom edge at 96.5% of the art's height, spanning 15% of its width
# either side of centre (measured off the source).
TITLE_BOTTOM, TITLE_HALF = 0.965, 0.15


def name_clears(side, canvas, circle_fraction=0.8):
    r = canvas * circle_fraction / 2
    return math.hypot(side * TITLE_HALF, side * (TITLE_BOTTOM - 0.5)) <= r


SAFE = 408
assert name_clears(SAFE, 512), "SAFE is too large: the name would clip on a circular mask"
assert not name_clears(512, 512), "the check must be able to fail"


def art():
    return Image.open(SOURCE).convert("RGB")


def fit(img, w):
    out = img.resize((w, w), Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(radius=0.8, percent=30, threshold=2))


def quadrants(a, side):
    """The art's own four corner colours, continued past its edge (see the backend
    generator: the sign is four colour quadrants with a seam on each centre line)."""
    n = a.width
    blk = round(n * 0.04)

    def patch(fx, fy):
        x, y = round(fx * n), round(fy * n)
        return a.crop((x, y, x + blk, y + blk)).resize((1, 1), Image.BOX).getpixel((0, 0))

    q = Image.new("RGB", (2, 2))
    q.putpixel((0, 0), patch(0.20, 0.02))
    q.putpixel((1, 0), patch(0.76, 0.02))
    q.putpixel((0, 1), patch(0.22, 0.945))
    q.putpixel((1, 1), patch(0.74, 0.945))
    return q.resize((side, side), Image.NEAREST)


def maskable(a, side=512, art_side=SAFE, feather=8):
    base = quadrants(a, side)
    f = fit(a, art_side)
    m = Image.new("L", f.size, 0)
    ImageDraw.Draw(m).rectangle((feather, feather, f.width - feather - 1, f.height - feather - 1), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(feather / 2))
    base.paste(f, ((side - art_side) // 2, (side - art_side) // 2), m)
    return base


def main():
    a = art()
    os.makedirs(os.path.join(OUT, "icons"), exist_ok=True)
    fit(a, 192).save(os.path.join(OUT, "icons", "icon-192.png"), optimize=True)
    fit(a, 512).save(os.path.join(OUT, "icons", "icon-512.png"), optimize=True)
    maskable(a).save(os.path.join(OUT, "icons", "icon-512-maskable.png"), optimize=True)
    fit(a, 384).save(os.path.join(OUT, "icons", "skillz.png"), optimize=True)
    fit(a, 180).save(os.path.join(OUT, "apple-touch-icon.png"), optimize=True)
    fit(a, 256).save(os.path.join(OUT, "logo.png"), optimize=True)
    print("SkillZ web icons written to", OUT)


if __name__ == "__main__":
    main()
