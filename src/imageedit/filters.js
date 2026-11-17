// Filters and toning: pure operations on an ImageData-shaped object ({ data, width, height }),
// each limited to a selection when one is given (sel.data: 0..255 per pixel). Tested under node.

const lerp = (a, b, t) => a + (b - a) * t;
const at = (sel, p) => (sel ? sel.data[p] / 255 : 1);

/** Paint bucket: fill the connected area like the clicked pixel with a colour. Returns pixels filled. */
export function bucketFill(img, x, y, [r, g, b], { tolerance = 32, contiguous = true, sel = null } = {}) {
  const { data: d, width: w, height: h } = img;
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return 0;
  const k = (y * w + x) * 4;
  const ref = [d[k], d[k + 1], d[k + 2], d[k + 3]];
  const lim = Math.round((Math.max(0, Math.min(100, tolerance)) / 100) * 255);
  const like = (i) => Math.max(Math.abs(d[i] - ref[0]), Math.abs(d[i + 1] - ref[1]), Math.abs(d[i + 2] - ref[2]), Math.abs(d[i + 3] - ref[3])) <= lim;
  const paint = (p) => {
    const a = at(sel, p);
    if (!a) return 0;
    const i = p * 4;
    d[i] = Math.round(lerp(d[i], r, a)); d[i + 1] = Math.round(lerp(d[i + 1], g, a)); d[i + 2] = Math.round(lerp(d[i + 2], b, a));
    d[i + 3] = Math.round(lerp(d[i + 3], 255, a));
    return 1;
  };
  let n = 0;
  if (!contiguous) {
    const hits = [];
    for (let p = 0; p < w * h; p++) if (like(p * 4)) hits.push(p);
    for (const p of hits) n += paint(p);
    return n;
  }
  const seen = new Uint8Array(w * h), stack = [y * w + x], hits = [];
  seen[y * w + x] = 1;
  while (stack.length) {
    const p = stack.pop();
    if (!like(p * 4)) continue;
    hits.push(p);
    const px = p % w;
    for (const q of [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < w * (h - 1) ? p + w : -1]) {
      if (q >= 0 && !seen[q]) { seen[q] = 1; stack.push(q); }
    }
  }
  for (const p of hits) n += paint(p);
  return n;
}

/** Dodge (lighten), burn (darken) or sponge (desaturate, or saturate with a negative strength) in a round dab. */
export function toneDab(img, x, y, size, mode, strength = 0.3, sel = null) {
  const { width: w, height: h, data: d } = img;
  const rad = Math.max(0.5, size / 2);
  for (let yy = Math.max(0, Math.floor(y - rad)); yy <= Math.min(h - 1, Math.ceil(y + rad)); yy++) {
    for (let xx = Math.max(0, Math.floor(x - rad)); xx <= Math.min(w - 1, Math.ceil(x + rad)); xx++) {
      const dist = Math.hypot(xx - x, yy - y);
      if (dist > rad) continue;
      const p = yy * w + xx, i = p * 4;
      const k = strength * Math.min(1, (1 - dist / rad) * 2) * at(sel, p);
      if (!k || !d[i + 3]) continue;
      if (mode === "dodge") for (let c = 0; c < 3; c++) d[i + c] = Math.round(lerp(d[i + c], 255, k * 0.5));
      else if (mode === "burn") for (let c = 0; c < 3; c++) d[i + c] = Math.round(lerp(d[i + c], 0, k * 0.5));
      else {
        const grey = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, Math.round(lerp(d[i + c], grey, k))));
      }
    }
  }
}

function blend(img, out, sel) {
  for (let p = 0; p < img.data.length / 4; p++) {
    const a = at(sel, p);
    if (!a) continue;
    for (let c = 0; c < 4; c++) img.data[p * 4 + c] = Math.round(lerp(img.data[p * 4 + c], out[p * 4 + c], a));
  }
  return img;
}

/** Box blur of radius r, used by sharpen (unsharp mask). Returns a new array. */
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let c = 0; c < 4; c++) {
    let acc = 0, n = 0;
    for (let x = -r; x < w; x++) {
      if (x + r < w) { acc += src[(y * w + x + r) * 4 + c]; n++; }
      if (x - r - 1 >= 0) { acc -= src[(y * w + x - r - 1) * 4 + c]; n--; }
      if (x >= 0) tmp[(y * w + x) * 4 + c] = acc / n;
    }
  }
  for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let acc = 0, n = 0;
    for (let y = -r; y < h; y++) {
      if (y + r < h) { acc += tmp[((y + r) * w + x) * 4 + c]; n++; }
      if (y - r - 1 >= 0) { acc -= tmp[((y - r - 1) * w + x) * 4 + c]; n--; }
      if (y >= 0) out[(y * w + x) * 4 + c] = acc / n;
    }
  }
  return out;
}

export const FILTERS = {
  sharpen: { label: "Sharpen", amount: [0, 300, 100], radius: [1, 10, 1] },
  blur: { label: "Blur", radius: [1, 50, 4] },
  noise: { label: "Add noise", amount: [0, 100, 15] },
  pixelate: { label: "Pixelate", radius: [2, 100, 12] },
  posterize: { label: "Posterize", amount: [2, 16, 5] },
  threshold: { label: "Threshold", amount: [0, 255, 128] },
  vignette: { label: "Vignette", amount: [0, 100, 50] },
  emboss: { label: "Emboss", amount: [0, 100, 100] },
};

/**
 * Apply a filter by key with its settings ({ amount, radius }), inside the selection if one is given.
 * `rand` is the random source for noise, so a test can make it repeatable.
 */
export function applyFilter(img, key, { amount = 50, radius = 4 } = {}, sel = null, rand = Math.random) {
  const { data: d, width: w, height: h } = img;
  const out = new Uint8ClampedArray(d);
  if (key === "blur") {
    const b = boxBlur(boxBlur(d, w, h, Math.round(radius)), w, h, Math.round(radius));
    for (let i = 0; i < d.length; i++) out[i] = b[i];
  } else if (key === "sharpen") {
    const b = boxBlur(d, w, h, Math.round(radius)), k = amount / 100;
    for (let i = 0; i < d.length; i++) out[i] = (i % 4 === 3) ? d[i] : d[i] + (d[i] - b[i]) * k;
  } else if (key === "noise") {
    const k = (amount / 100) * 128;
    for (let p = 0; p < w * h; p++) { const n = (rand() * 2 - 1) * k; for (let c = 0; c < 3; c++) out[p * 4 + c] = d[p * 4 + c] + n; }
  } else if (key === "pixelate") {
    const s = Math.max(2, Math.round(radius));
    for (let by = 0; by < h; by += s) for (let bx = 0; bx < w; bx += s) {
      const acc = [0, 0, 0, 0]; let n = 0;
      for (let y = by; y < Math.min(h, by + s); y++) for (let x = bx; x < Math.min(w, bx + s); x++) { for (let c = 0; c < 4; c++) acc[c] += d[(y * w + x) * 4 + c]; n++; }
      for (let y = by; y < Math.min(h, by + s); y++) for (let x = bx; x < Math.min(w, bx + s); x++) for (let c = 0; c < 4; c++) out[(y * w + x) * 4 + c] = acc[c] / n;
    }
  } else if (key === "posterize") {
    const lv = Math.max(2, Math.round(amount)), step = 255 / (lv - 1);
    for (let i = 0; i < d.length; i++) if (i % 4 !== 3) out[i] = Math.round(Math.round(d[i] / step) * step);
  } else if (key === "threshold") {
    for (let p = 0; p < w * h; p++) { const i = p * 4, v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] >= amount ? 255 : 0; out[i] = out[i + 1] = out[i + 2] = v; }
  } else if (key === "vignette") {
    const cx = w / 2, cy = h / 2, far = Math.hypot(cx, cy), k = amount / 100;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const f = 1 - k * Math.max(0, (Math.hypot(x - cx, y - cy) / far - 0.35) / 0.65) ** 1.5, i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) out[i + c] = d[i + c] * f;
    }
  } else if (key === "emboss") {
    const k = amount / 100;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, j = (Math.min(h - 1, y + 1) * w + Math.min(w - 1, x + 1)) * 4, q = (Math.max(0, y - 1) * w + Math.max(0, x - 1)) * 4;
      for (let c = 0; c < 3; c++) out[i + c] = lerp(d[i + c], 128 + (d[j + c] - d[q + c]), k);
    }
  } else return img;
  return blend(img, out, sel);
}
