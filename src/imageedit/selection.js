// Selections, and the pixel adjustments that respect them. Pure — a selection is
// { w, h, data: Uint8Array } with 255 = selected, 0 = not, values between = feathered
// — so everything here runs under node and is tested there.

export const emptySel = (w, h) => ({ w, h, data: new Uint8Array(w * h) });
export const allSel = (w, h) => ({ w, h, data: new Uint8Array(w * h).fill(255) });

export function isEmpty(sel) {
  if (!sel) return true;
  for (let i = 0; i < sel.data.length; i++) if (sel.data[i]) return false;
  return true;
}

export function rectSel(w, h, r) {
  const s = emptySel(w, h);
  const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y));
  const x1 = Math.min(w, Math.round(r.x + r.w)), y1 = Math.min(h, Math.round(r.y + r.h));
  for (let y = y0; y < y1; y++) s.data.fill(255, y * w + x0, y * w + x1);
  return s;
}

export function ellipseSel(w, h, r) {
  const s = emptySel(w, h);
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rx = r.w / 2, ry = r.h / 2;
  if (rx <= 0 || ry <= 0) return s;
  for (let y = Math.max(0, Math.floor(r.y)); y < Math.min(h, Math.ceil(r.y + r.h)); y++) {
    for (let x = Math.max(0, Math.floor(r.x)); x < Math.min(w, Math.ceil(r.x + r.w)); x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) s.data[y * w + x] = 255;
    }
  }
  return s;
}

/** Lasso: everything inside the drawn outline (even-odd), closed back to the start. */
export function polygonSel(w, h, pts) {
  const s = emptySel(w, h);
  if (!pts || pts.length < 3) return s;
  for (let y = 0; y < h; y++) {
    const py = y + 0.5, xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py)) xs.push(xi + ((py - yi) / (yj - yi)) * (xj - xi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k] - 0.5)), b = Math.min(w, Math.floor(xs[k + 1] - 0.5) + 1);
      if (b > a) s.data.fill(255, y * w + a, y * w + b);
    }
  }
  return s;
}

/** Magic wand: the pixels like the one clicked (connected, or everywhere), from an ImageData. */
export function wandSel(img, x, y, { tolerance = 32, contiguous = true } = {}) {
  const { data: d, width: w, height: h } = img;
  const s = emptySel(w, h);
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= w || y >= h) return s;
  const k = (y * w + x) * 4;
  const [r, g, b, a] = [d[k], d[k + 1], d[k + 2], d[k + 3]];
  const lim = Math.round((Math.max(0, Math.min(100, tolerance)) / 100) * 255);
  const like = (i) => Math.max(Math.abs(d[i] - r), Math.abs(d[i + 1] - g), Math.abs(d[i + 2] - b), Math.abs(d[i + 3] - a)) <= lim;
  if (!contiguous) {
    for (let p = 0; p < w * h; p++) if (like(p * 4)) s.data[p] = 255;
    return s;
  }
  const seen = new Uint8Array(w * h);
  const stack = [y * w + x];
  seen[y * w + x] = 1;
  while (stack.length) {
    const p = stack.pop();
    if (!like(p * 4)) continue;
    s.data[p] = 255;
    const px = p % w;
    for (const q of [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, p >= w ? p - w : -1, p < w * (h - 1) ? p + w : -1]) {
      if (q >= 0 && !seen[q]) { seen[q] = 1; stack.push(q); }
    }
  }
  return s;
}

/** new | add | subtract | intersect — what Shift and Alt do to a selection in Photoshop. */
export function combine(base, next, mode = "new") {
  if (mode === "new" || !base) return next;
  const out = emptySel(next.w, next.h);
  for (let i = 0; i < out.data.length; i++) {
    const a = base.data[i], b = next.data[i];
    out.data[i] = mode === "add" ? Math.max(a, b) : mode === "subtract" ? Math.min(a, 255 - b) : Math.min(a, b);
  }
  return out;
}

export function invert(sel) {
  const out = emptySel(sel.w, sel.h);
  for (let i = 0; i < out.data.length; i++) out.data[i] = 255 - sel.data[i];
  return out;
}

/** Soften the edge by `r` pixels (two box-blur passes) — Photoshop's Feather. */
export function feather(sel, r) {
  r = Math.round(r);
  if (r < 1) return sel;
  const { w, h } = sel;
  let src = Float32Array.from(sel.data);
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      let acc = 0, n = 0;
      for (let x = -r; x < w; x++) {
        if (x + r < w) { acc += src[y * w + x + r]; n++; }
        if (x - r - 1 >= 0) { acc -= src[y * w + x - r - 1]; n--; }
        if (x >= 0) tmp[y * w + x] = acc / n;
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0, n = 0;
      for (let y = -r; y < h; y++) {
        if (y + r < h) { acc += tmp[(y + r) * w + x]; n++; }
        if (y - r - 1 >= 0) { acc -= tmp[(y - r - 1) * w + x]; n--; }
        if (y >= 0) out[y * w + x] = acc / n;
      }
    }
    src = out;
  }
  return { w, h, data: Uint8Array.from(src, (v) => Math.round(v)) };
}

/** The smallest box holding every selected pixel, or null. */
export function bounds(sel) {
  let x0 = sel.w, y0 = sel.h, x1 = -1, y1 = -1;
  for (let y = 0; y < sel.h; y++) for (let x = 0; x < sel.w; x++) {
    if (sel.data[y * sel.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Keep only the selected part of an ImageData (copy), or clear it (delete). In place. */
export function keepSelected(img, sel) {
  for (let p = 0; p < sel.data.length; p++) img.data[p * 4 + 3] = Math.round((img.data[p * 4 + 3] * sel.data[p]) / 255);
  return img;
}
export function clearSelected(img, sel) {
  for (let p = 0; p < sel.data.length; p++) img.data[p * 4 + 3] = Math.round((img.data[p * 4 + 3] * (255 - sel.data[p])) / 255);
  return img;
}

/** Paint a colour into the selection (Edit → Fill), in place, over what is there. */
export function fillSelected(img, sel, [r, g, b]) {
  const d = img.data;
  for (let p = 0; p < sel.data.length; p++) {
    const a = sel.data[p] / 255;
    if (!a) continue;
    const i = p * 4, under = d[i + 3] / 255, out = a + under * (1 - a);
    d[i] = Math.round((r * a + d[i] * under * (1 - a)) / out);
    d[i + 1] = Math.round((g * a + d[i + 1] * under * (1 - a)) / out);
    d[i + 2] = Math.round((b * a + d[i + 2] * under * (1 - a)) / out);
    d[i + 3] = Math.round(out * 255);
  }
  return img;
}

// ── Levels and Curves: a 256-entry table per adjustment, applied inside the selection ──

/** Levels: input black/white points, midtone gamma (1 = none), output black/white. */
export function levelsLUT({ inBlack = 0, inWhite = 255, gamma = 1, outBlack = 0, outWhite = 255 } = {}) {
  const lut = new Uint8Array(256), span = Math.max(1, inWhite - inBlack), g = Math.max(0.1, Math.min(9.99, gamma));
  for (let v = 0; v < 256; v++) {
    const t = Math.max(0, Math.min(1, (v - inBlack) / span)) ** (1 / g);
    lut[v] = Math.round(outBlack + t * (outWhite - outBlack));
  }
  return lut;
}

/** Curves: a smooth curve through [input, output] points (0..255), monotone so it never folds back. */
export function curveLUT(points) {
  const pts = [...(points || [])].map(([x, y]) => [Math.max(0, Math.min(255, x)), Math.max(0, Math.min(255, y))]).sort((a, b) => a[0] - b[0]);
  if (!pts.length || pts[0][0] > 0) pts.unshift([0, pts.length ? pts[0][1] : 0]);
  if (pts.at(-1)[0] < 255) pts.push([255, pts.at(-1)[1]]);
  const n = pts.length, dx = [], m = [], t = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0] || 1; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (!m[i]) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  const lut = new Uint8Array(256);
  let seg = 0;
  for (let v = 0; v < 256; v++) {
    while (seg < n - 2 && v > pts[seg + 1][0]) seg++;
    const [x0, y0] = pts[seg], [x1, y1] = pts[seg + 1], hgt = x1 - x0 || 1, s = (v - x0) / hgt;
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
    lut[v] = Math.round(Math.max(0, Math.min(255, h00 * y0 + h10 * hgt * t[seg] + h01 * y1 + h11 * hgt * t[seg + 1])));
  }
  return lut;
}

/** Apply a table to R, G and B, blended by the selection (everywhere when there is none). In place. */
export function applyLUT(img, lut, sel = null) {
  const d = img.data;
  for (let p = 0; p < d.length / 4; p++) {
    const a = sel ? sel.data[p] / 255 : 1;
    if (!a) continue;
    const i = p * 4;
    for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] + (lut[d[i + c]] - d[i + c]) * a);
  }
  return img;
}

// ── Retouching brushes, one dab at a time, on an ImageData ──

function inCircle(w, h, x, y, size, fn) {
  const rad = Math.max(0.5, size / 2);
  for (let yy = Math.max(0, Math.floor(y - rad)); yy <= Math.min(h - 1, Math.ceil(y + rad)); yy++) {
    for (let xx = Math.max(0, Math.floor(x - rad)); xx <= Math.min(w - 1, Math.ceil(x + rad)); xx++) {
      const d2 = (xx - x) ** 2 + (yy - y) ** 2;
      if (d2 <= rad * rad) fn(xx, yy, 1 - Math.sqrt(d2) / rad);
    }
  }
}

/** Clone stamp: copy from `src` (a snapshot taken when the stroke began) at an offset. */
export function cloneDab(img, src, x, y, dx, dy, size, sel = null) {
  const { width: w, height: h } = img;
  inCircle(w, h, x, y, size, (xx, yy) => {
    const sx = xx + dx, sy = yy + dy;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
    const a = sel ? sel.data[yy * w + xx] / 255 : 1;
    if (!a) return;
    const i = (yy * w + xx) * 4, j = (Math.round(sy) * w + Math.round(sx)) * 4;
    for (let c = 0; c < 4; c++) img.data[i + c] = Math.round(img.data[i + c] + (src.data[j + c] - img.data[i + c]) * a);
  });
}

/** Blur brush: each pixel in the dab becomes the average of its 3×3 neighbourhood, softer at the rim. */
export function blurDab(img, x, y, size, strength = 0.5, sel = null) {
  const { width: w, height: h, data: d } = img;
  const copy = new Map();
  inCircle(w, h, x, y, size + 2, (xx, yy) => copy.set(yy * w + xx, [d[(yy * w + xx) * 4], d[(yy * w + xx) * 4 + 1], d[(yy * w + xx) * 4 + 2], d[(yy * w + xx) * 4 + 3]]));
  const px = (xx, yy) => copy.get(yy * w + xx) || [d[(yy * w + xx) * 4], d[(yy * w + xx) * 4 + 1], d[(yy * w + xx) * 4 + 2], d[(yy * w + xx) * 4 + 3]];
  inCircle(w, h, x, y, size, (xx, yy, edge) => {
    const a = (sel ? sel.data[yy * w + xx] / 255 : 1) * strength * Math.min(1, edge * 2);
    if (!a) return;
    const acc = [0, 0, 0, 0];
    let n = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const nx = xx + ox, ny = yy + oy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = px(nx, ny);
      for (let c = 0; c < 4; c++) acc[c] += q[c];
      n++;
    }
    const i = (yy * w + xx) * 4;
    for (let c = 0; c < 4; c++) d[i + c] = Math.round(d[i + c] + (acc[c] / n - d[i + c]) * a);
  });
}

/** Smudge: drag the colour under the brush along with it. `carry` holds what is being dragged. */
export function smudgeDab(img, carry, x, y, size, strength = 0.6, sel = null) {
  const { width: w, height: h, data: d } = img;
  const r = Math.round(size / 2);
  inCircle(w, h, x, y, size, (xx, yy, edge) => {
    const key = (Math.round(yy - y) + r) * (2 * r + 1) + (Math.round(xx - x) + r);
    const i = (yy * w + xx) * 4;
    const held = carry.get(key);
    const a = (sel ? sel.data[yy * w + xx] / 255 : 1) * strength * Math.min(1, edge * 2);
    if (held && a) for (let c = 0; c < 4; c++) d[i + c] = Math.round(d[i + c] + (held[c] - d[i + c]) * a);
    carry.set(key, [d[i], d[i + 1], d[i + 2], d[i + 3]]);
  });
}

/**
 * Healing brush: copy texture from the source like the clone stamp, then shift its colour so the
 * patch matches the average of where it lands — a blemish takes the surrounding skin's tone.
 */
export function healDab(img, src, x, y, dx, dy, size, sel = null) {
  const { width: w, height: h } = img;
  const rad = Math.max(1, size / 2);
  const mean = (data, cx, cy) => {
    const acc = [0, 0, 0]; let n = 0;
    for (let yy = Math.max(0, Math.floor(cy - rad)); yy <= Math.min(h - 1, Math.ceil(cy + rad)); yy++) {
      for (let xx = Math.max(0, Math.floor(cx - rad)); xx <= Math.min(w - 1, Math.ceil(cx + rad)); xx++) {
        const d2 = (xx - cx) ** 2 + (yy - cy) ** 2;
        if (d2 > rad * rad || d2 < (rad * 0.7) ** 2) continue;   // the ring round the edge
        const i = (yy * w + xx) * 4;
        for (let c = 0; c < 3; c++) acc[c] += data[i + c];
        n++;
      }
    }
    return n ? acc.map((v) => v / n) : null;
  };
  const here = mean(img.data, x, y), there = mean(src.data, x + dx, y + dy);
  const shift = here && there ? here.map((v, c) => v - there[c]) : [0, 0, 0];
  inCircle(w, h, x, y, size, (xx, yy, edge) => {
    const sx = Math.round(xx + dx), sy = Math.round(yy + dy);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
    const a = (sel ? sel.data[yy * w + xx] / 255 : 1) * Math.min(1, edge * 3);
    if (!a) return;
    const i = (yy * w + xx) * 4, j = (sy * w + sx) * 4;
    for (let c = 0; c < 3; c++) img.data[i + c] = Math.round(img.data[i + c] + (src.data[j + c] + shift[c] - img.data[i + c]) * a);
  });
}
