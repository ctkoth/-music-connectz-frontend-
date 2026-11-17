// Pixel operations: the magic eraser and the background eraser. Pure — they take
// and change an ImageData-shaped object ({ data, width, height }) — so they run
// under node and are tested there.
//
// "Similar" is the largest per-channel difference in R, G and B, 0..255, and
// `tolerance` is a percentage of that (Photoshop's tolerance works the same way).

const close = (d, i, r, g, b, lim) =>
  Math.max(Math.abs(d[i] - r), Math.abs(d[i + 1] - g), Math.abs(d[i + 2] - b)) <= lim;

const limitOf = (tolerance) => Math.round((Math.max(0, Math.min(100, tolerance)) / 100) * 255);

/**
 * Magic eraser: make transparent every pixel like the one clicked — the connected
 * area by default, or everywhere in the layer when `contiguous` is false.
 * Already-transparent pixels are never a match, so a click on empty space does nothing.
 * Returns how many pixels it cleared.
 */
export function magicErase(img, x, y, { tolerance = 32, contiguous = true } = {}) {
  const { data: d, width: w, height: h } = img;
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return 0;
  const s = (y * w + x) * 4;
  if (d[s + 3] === 0) return 0;
  const [r, g, b] = [d[s], d[s + 1], d[s + 2]];
  const lim = limitOf(tolerance);
  let n = 0;
  if (!contiguous) {
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] && close(d, i, r, g, b, lim)) { d[i + 3] = 0; n++; }
    return n;
  }
  const seen = new Uint8Array(w * h);
  const stack = [y * w + x];
  seen[y * w + x] = 1;
  while (stack.length) {
    const p = stack.pop();
    const i = p * 4;
    if (!d[i + 3] || !close(d, i, r, g, b, lim)) continue;
    d[i + 3] = 0; n++;
    const px = p % w, py = (p - px) / w;
    if (px > 0 && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
    if (px < w - 1 && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
    if (py > 0 && !seen[p - w]) { seen[p - w] = 1; stack.push(p - w); }
    if (py < h - 1 && !seen[p + w]) { seen[p + w] = 1; stack.push(p + w); }
  }
  return n;
}

/**
 * Background eraser, one dab: inside a circle of `size` at (x, y), clear the pixels
 * that look like `colour` (the one sampled where the stroke began, or under each dab
 * when sampling continuously). Edges of the subject survive because they don't match.
 */
export function backgroundDab(img, x, y, size, colour, { tolerance = 25 } = {}) {
  const { data: d, width: w, height: h } = img;
  const rad = Math.max(0.5, size / 2), lim = limitOf(tolerance);
  const [r, g, b] = colour;
  let n = 0;
  for (let yy = Math.max(0, Math.floor(y - rad)); yy <= Math.min(h - 1, Math.ceil(y + rad)); yy++) {
    for (let xx = Math.max(0, Math.floor(x - rad)); xx <= Math.min(w - 1, Math.ceil(x + rad)); xx++) {
      if ((xx - x) ** 2 + (yy - y) ** 2 > rad * rad) continue;
      const i = (yy * w + xx) * 4;
      if (d[i + 3] && close(d, i, r, g, b, lim)) { d[i + 3] = 0; n++; }
    }
  }
  return n;
}

/** The colour at a point as [r, g, b], or null where it is transparent or outside. */
export function sample(img, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null;
  const i = (y * img.width + x) * 4;
  return img.data[i + 3] ? [img.data[i], img.data[i + 1], img.data[i + 2]] : null;
}

/** Dabs along a dragged line, close enough together that the stroke has no gaps. */
export function dabsAlong(a, b, size) {
  const step = Math.max(1, size / 4);
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(dist / step));
  return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * (k + 1)) / n, a[1] + ((b[1] - a[1]) * (k + 1)) / n]);
}
