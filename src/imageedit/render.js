// Draws an ImageZ document onto a 2D canvas. The preview and the export call
// the same function, so what was approved on screen is what the file holds.
import { effective, filterOf, hasStyle } from "./layers.js";

/** Load an image from a URL into an <img>, resolved once it can be drawn. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file isn't an image this browser can open."));
    img.src = src;
  });
}

const pool = {};
function scratch(name, w, h) {
  const c = pool[name] || (pool[name] = document.createElement("canvas"));
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  const ctx = c.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.filter = "none";
  ctx.clearRect(0, 0, w, h);
  return [c, ctx];
}

// A small repeatable random source, so a spray or chalk stroke looks the same on every redraw.
function seeded(seed) {
  let x = (seed * 2654435761) >>> 0 || 1;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Every point along a stroke, `step` apart, with its pressure. */
function along(points, step) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, b[2]]);
  }
  return out;
}

/** The stamped tips: each one drawn at points along the stroke. */
function stampStroke(ctx, s) {
  const rnd = seeded(s.seed || 1);
  const step = s.tip === "spray" || s.tip === "chalk" ? Math.max(1, s.size / 6) : s.tip === "star" ? s.size * 0.9 : Math.max(1, s.size / 8);
  for (const [x, y, pr] of along(s.points, step)) {
    const r = (s.size * (pr ?? 1)) / 2;
    if (s.tip === "calligraphy") {
      ctx.beginPath(); ctx.ellipse(x, y, r, Math.max(0.8, r / 4), -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    } else if (s.tip === "spray") {
      for (let k = 0; k < 6; k++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
        ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(1, r / 12), Math.max(1, r / 12));
      }
    } else if (s.tip === "chalk") {
      for (let k = 0; k < 10; k++) {
        const ox = (rnd() - 0.5) * 2 * r, oy = (rnd() - 0.5) * 2 * r;
        if (ox * ox + oy * oy < r * r) ctx.fillRect(x + ox, y + oy, Math.max(1, r / 5), Math.max(1, r / 5));
      }
    } else if (s.tip === "star") {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI) / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    }
  }
}

/** Strokes as lines; a third number on a point is pen pressure and sets that segment's width. */
function drawStrokes(ctx, strokes, style) {
  for (const s of strokes) {
    ctx.save();
    style(ctx, s);
    if (["calligraphy", "spray", "chalk", "star"].includes(s.tip)) { stampStroke(ctx, s); ctx.restore(); continue; }
    if (s.tip === "soft") { ctx.shadowColor = s.color || "#fff"; ctx.shadowBlur = s.size / 2; }
    if (s.tip === "marker") ctx.globalAlpha *= 0.55;
    ctx.lineWidth = s.size;
    ctx.lineCap = s.tip === "square" || s.tip === "marker" ? "square" : "round";
    ctx.lineJoin = s.tip === "square" ? "miter" : "round";
    if (s.points.length === 1) {
      const [x, y, pr] = s.points[0];
      ctx.beginPath(); ctx.arc(x, y, (s.size * (pr ?? 1)) / 2, 0, Math.PI * 2); ctx.fill();
    } else if (s.points.some((q) => q.length > 2)) {
      for (let i = 1; i < s.points.length; i++) {
        const a = s.points[i - 1], b = s.points[i];
        ctx.lineWidth = Math.max(0.5, s.size * (b[2] ?? 1));
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.moveTo(s.points[0][0], s.points[0][1]);
      for (const p of s.points.slice(1)) ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
    ctx.restore();
  }
}

const paintStyle = (ctx, s) => {
  ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
};
const maskStyle = (ctx, s) => {
  ctx.globalCompositeOperation = s.hide ? "destination-out" : "source-over";
  ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff";
};

/** Text with its options: font, bold/italic, alignment, letter spacing, line height, outline, shadow, underline. */
function drawText(ctx, l) {
  ctx.textBaseline = "top";
  ctx.textAlign = l.align;
  ctx.font = `${l.italic ? "italic " : ""}${l.bold ? "800 " : ""}${l.size}px ${l.font}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${l.spacing}px`;
  const lines = l.text.split("\n");
  const step = l.size * l.lineHeight;
  if (l.shadowBlur || l.shadowX || l.shadowY) {
    ctx.shadowColor = l.shadow; ctx.shadowBlur = l.shadowBlur; ctx.shadowOffsetX = l.shadowX; ctx.shadowOffsetY = l.shadowY;
  }
  if (l.outlineW) {
    // Outline drawn under the fill, so a thick outline grows outward instead of eating the letters.
    ctx.strokeStyle = l.outline; ctx.lineWidth = l.outlineW * 2; ctx.lineJoin = "round";
    lines.forEach((line, i) => ctx.strokeText(line, 0, i * step));
    ctx.shadowColor = "transparent";
  }
  if (l.arc && lines.length === 1 && lines[0]) {
    // Text on a curve: each letter placed round a circle whose bend is `arc` (−100 sags, +100 arches).
    const text = lines[0];
    const widths = [...text].map((ch) => ctx.measureText(ch).width + l.spacing);
    const total = widths.reduce((a, b) => a + b, 0) || 1;
    const span = (l.arc / 100) * Math.PI;
    const radius = total / Math.abs(span);
    const cx = l.align === "center" ? 0 : l.align === "right" ? -total / 2 : total / 2;
    const cy = span > 0 ? radius : -radius + l.size;
    ctx.textAlign = "center";
    let a = -span / 2;
    [...text].forEach((ch, i) => {
      const mid = a + ((widths[i] / total) * span) / 2;
      ctx.save();
      ctx.translate(cx + Math.sin(mid) * radius * Math.sign(span), cy - Math.cos(mid) * radius * Math.sign(span));
      ctx.rotate(mid);
      if (l.outlineW) { ctx.strokeStyle = l.outline; ctx.lineWidth = l.outlineW * 2; ctx.strokeText(ch, 0, 0); }
      ctx.fillStyle = l.color; ctx.fillText(ch, 0, 0);
      ctx.restore();
      a += (widths[i] / total) * span;
    });
    return;
  }
  ctx.fillStyle = l.color;
  lines.forEach((line, i) => {
    ctx.fillText(line, 0, i * step);
    if (l.underline && line) {
      const w = ctx.measureText(line).width;
      const x0 = l.align === "center" ? -w / 2 : l.align === "right" ? -w : 0;
      ctx.fillRect(x0, i * step + l.size * 1.02, w, Math.max(1, l.size / 14));
    }
  });
}

function size(l, images) {
  if (l.kind === "image") return [l.w, l.h];
  if (l.kind === "shape") return [l.w, l.h];
  if (l.kind === "text") {
    const lines = l.text.split("\n");
    return [Math.max(...lines.map((s) => s.length)) * l.size * 0.6, lines.length * l.size * 1.2];
  }
  void images;
  return [0, 0];
}

/** The layer's own pixels, at full strength, into ctx (which is already transformed to canvas space). */
function body(ctx, doc, l, images) {
  if (l.kind === "fill") { ctx.fillStyle = l.color; ctx.fillRect(0, 0, doc.w, doc.h); return; }
  if (l.kind === "gradient") {
    let g;
    if (l.style === "radial") {
      g = ctx.createRadialGradient(doc.w / 2, doc.h / 2, 0, doc.w / 2, doc.h / 2, Math.hypot(doc.w, doc.h) / 2);
    } else {
      const r = (l.angle * Math.PI) / 180, cx = doc.w / 2, cy = doc.h / 2;
      const half = (Math.abs(doc.w * Math.cos(r)) + Math.abs(doc.h * Math.sin(r))) / 2;
      g = ctx.createLinearGradient(cx - Math.cos(r) * half, cy - Math.sin(r) * half, cx + Math.cos(r) * half, cy + Math.sin(r) * half);
    }
    g.addColorStop(0, l.from); g.addColorStop(1, l.to);
    ctx.fillStyle = g; ctx.fillRect(0, 0, doc.w, doc.h);
    return;
  }
  ctx.translate(l.x, l.y);
  const [w, h] = size(l, images);
  const cx = (w * l.scale) / 2, cy = (h * l.scale) / 2;
  if (l.rotate || l.flipX || l.flipY) {
    ctx.translate(cx, cy);
    if (l.rotate) ctx.rotate((l.rotate * Math.PI) / 180);
    ctx.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
    ctx.translate(-cx, -cy);
  }
  ctx.scale(l.scale, l.scale);
  if (l.kind === "image") {
    const img = images.get(l.src);
    if (img) ctx.drawImage(img, 0, 0, l.w, l.h);
  } else if (l.kind === "text") {
    drawText(ctx, l);
  } else if (l.kind === "shape") {
    ctx.strokeStyle = l.color; ctx.fillStyle = l.color; ctx.lineWidth = l.line; ctx.lineCap = "round";
    ctx.beginPath();
    if (l.shape === "line") { ctx.moveTo(0, 0); ctx.lineTo(l.w, l.h); ctx.stroke(); return; }
    if (l.shape === "ellipse") ctx.ellipse(l.w / 2, l.h / 2, Math.abs(l.w / 2), Math.abs(l.h / 2), 0, 0, Math.PI * 2);
    else ctx.rect(0, 0, l.w, l.h);
    if (l.filled) ctx.fill(); else ctx.stroke();
  } else if (l.kind === "paint" && l.strokes.length) {
    // Erasing must only erase this layer, so the strokes are drawn on their own canvas first.
    const pad = 2 * Math.max(doc.w, doc.h);
    const [c, p] = scratch("paint", doc.w + pad, doc.h + pad);
    p.translate(pad / 2, pad / 2);
    drawStrokes(p, l.strokes, paintStyle);
    ctx.drawImage(c, -pad / 2, -pad / 2);
  }
}

/** One layer, with its own opacity, blend, transform, adjustments, mask and styles. */
export function drawLayer(ctx, doc, l, images, eff = null) {
  const visible = eff ? eff.visible : l.visible, opacity = eff ? eff.opacity : l.opacity;
  if (!visible || !opacity) return;
  const f = filterOf(l.adj);
  const masked = l.mask && l.mask.on && (l.mask.strokes.length || l.mask.fade || l.mask.src);
  const styled = hasStyle(l);
  if (!masked && !styled) {
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.globalCompositeOperation = l.blend;
    if (f) ctx.filter = f;
    body(ctx, doc, l, images);
    ctx.restore();
    return;
  }
  // The layer alone first (masked if it has one), so its styles are drawn from its real outline.
  const [lc, lx] = scratch("layer", doc.w, doc.h);
  if (f) lx.filter = f;
  lx.save(); body(lx, doc, l, images); lx.restore();
  lx.filter = "none";
  if (masked) {
    const [mc, mx] = scratch("mask", doc.w, doc.h);
    const fade = l.mask.fade;
    if (fade) {
      // A gradient mask: white (shown) at `from`%, fading to `to`%, so the layer melts away.
      let g;
      if (fade.style === "radial") g = mx.createRadialGradient(doc.w / 2, doc.h / 2, 0, doc.w / 2, doc.h / 2, Math.hypot(doc.w, doc.h) / 2);
      else {
        const r = (fade.angle * Math.PI) / 180, cx = doc.w / 2, cy = doc.h / 2;
        const half = (Math.abs(doc.w * Math.cos(r)) + Math.abs(doc.h * Math.sin(r))) / 2;
        g = mx.createLinearGradient(cx - Math.cos(r) * half, cy - Math.sin(r) * half, cx + Math.cos(r) * half, cy + Math.sin(r) * half);
      }
      g.addColorStop(0, `rgba(255,255,255,${fade.from / 100})`);
      g.addColorStop(1, `rgba(255,255,255,${fade.to / 100})`);
      mx.fillStyle = g;
    } else mx.fillStyle = "#fff";
    mx.fillRect(0, 0, doc.w, doc.h);
    const pic = l.mask.src && images.get(l.mask.src);
    if (pic) { mx.globalCompositeOperation = "destination-in"; mx.drawImage(pic, 0, 0, doc.w, doc.h); mx.globalCompositeOperation = "source-over"; }
    drawStrokes(mx, l.mask.strokes, maskStyle);
    lx.globalCompositeOperation = "destination-in";
    lx.drawImage(mc, 0, 0);
    lx.globalCompositeOperation = "source-over";
  }
  let out = lc;
  if (styled) {
    const st = l.style;
    const [sc, sx] = scratch("styled", doc.w, doc.h);
    const FAR = 4 * Math.max(doc.w, doc.h);
    // A shadow of the outline alone: the layer is drawn far off the canvas and only its shadow lands.
    const shadowOnly = (color, blur, x, y, alpha) => {
      sx.save();
      sx.globalAlpha = alpha; sx.shadowColor = color; sx.shadowBlur = blur; sx.shadowOffsetX = x + FAR; sx.shadowOffsetY = y;
      sx.drawImage(lc, -FAR, 0);
      sx.restore();
    };
    if (st.shadow.on) shadowOnly(st.shadow.color, st.shadow.blur, st.shadow.x, st.shadow.y, st.shadow.opacity / 100);
    if (st.glow.on) { shadowOnly(st.glow.color, st.glow.blur, 0, 0, st.glow.opacity / 100); shadowOnly(st.glow.color, st.glow.blur / 2, 0, 0, st.glow.opacity / 100); }
    if (st.stroke.on) {
      // The outline grown by `width` (the layer stamped round a circle), then coloured.
      const [kc, kx] = scratch("stroke", doc.w, doc.h);
      const w = st.stroke.width, steps = Math.max(12, Math.round(w * 3));
      for (let k = 0; k < steps; k++) {
        const a = (k / steps) * Math.PI * 2;
        kx.drawImage(lc, Math.cos(a) * w, Math.sin(a) * w);
      }
      kx.globalCompositeOperation = "source-in";
      kx.fillStyle = st.stroke.color; kx.fillRect(0, 0, doc.w, doc.h);
      sx.drawImage(kc, 0, 0);
    }
    sx.drawImage(lc, 0, 0);
    out = sc;
  }
  ctx.save();
  ctx.globalAlpha = opacity / 100;
  ctx.globalCompositeOperation = l.blend;
  ctx.drawImage(out, 0, 0);
  ctx.restore();
}

/** The whole stack, bottom first. `only` limits it to a set of layer ids (merge down uses it). */
export function renderDoc(ctx, doc, images, { checker = false, only = null } = {}) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, doc.w, doc.h);
  if (checker) {
    const s = Math.max(8, Math.round(Math.max(doc.w, doc.h) / 64));
    for (let y = 0; y < doc.h; y += s) for (let x = 0; x < doc.w; x += s) {
      ctx.fillStyle = ((x / s + y / s) & 1) ? "#d8d8d8" : "#f4f4f4";
      ctx.fillRect(x, y, s, s);
    }
  }
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const l = doc.layers[i];
    if (only && !only.has(l.id)) continue;
    drawLayer(ctx, doc, l, images, effective(doc, l));
  }
}

/** Render to a fresh canvas and give back a Blob — PNG keeps transparency, JPEG does not. */
export function exportDoc(doc, images, type = "image/png", quality = 0.92, only = null, scale = 1) {
  const c = document.createElement("canvas");
  c.width = Math.round(doc.w * scale); c.height = Math.round(doc.h * scale);
  const ctx = c.getContext("2d");
  // JPEG has no alpha: a white base is drawn first, then the stack over it.
  if (type === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); }
  const tmp = document.createElement("canvas");
  tmp.width = doc.w; tmp.height = doc.h;
  renderDoc(tmp.getContext("2d"), doc, images, { only });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tmp, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("The browser couldn't write the file."))), type, quality));
}

/** One layer alone, as pixels on a canvas the size of the picture — opacity, blend and mask left out. */
export function rasterize(doc, l, images) {
  const c = document.createElement("canvas");
  c.width = doc.w; c.height = doc.h;
  drawLayer(c.getContext("2d"), doc, { ...l, visible: true, opacity: 100, blend: "source-over", mask: null, style: null }, images);
  return c;
}

/** The colour under a canvas point, as #rrggbb — what the eyedropper picks up. */
export function colourAt(canvas, x, y) {
  const d = canvas.getContext("2d").getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** An image URL as a data: URL, for a project file. */
export async function dataUrlOf(src) {
  if (src.startsWith("data:")) return src;
  const blob = await (await fetch(src)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Couldn't read an image back to save the project."));
    r.readAsDataURL(blob);
  });
}

/** A selection as a canvas: white where selected (alpha = how much), clear elsewhere. */
export function selCanvas(sel) {
  const c = document.createElement("canvas");
  c.width = sel.w; c.height = sel.h;
  const ctx = c.getContext("2d");
  const im = ctx.createImageData(sel.w, sel.h);
  for (let p = 0; p < sel.data.length; p++) { const i = p * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = sel.data[p]; }
  ctx.putImageData(im, 0, 0);
  return c;
}

/** The overlay that shows a selection: everything outside dimmed, the edge traced in cyan. */
export function selOverlay(sel) {
  const c = document.createElement("canvas");
  c.width = sel.w; c.height = sel.h;
  const ctx = c.getContext("2d");
  const im = ctx.createImageData(sel.w, sel.h);
  const { w, h, data } = sel;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, i = p * 4, on = data[p] > 127;
    const edge = on && (x === 0 || y === 0 || x === w - 1 || y === h - 1 || data[p - 1] <= 127 || data[p + 1] <= 127 || data[p - w] <= 127 || data[p + w] <= 127);
    if (edge) { im.data[i] = 34; im.data[i + 1] = 211; im.data[i + 2] = 238; im.data[i + 3] = 255; }
    else if (!on) im.data[i + 3] = 90;
  }
  ctx.putImageData(im, 0, 0);
  return c;
}
