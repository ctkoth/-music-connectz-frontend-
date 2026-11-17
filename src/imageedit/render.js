// Draws an ImageZ document onto a 2D canvas. The preview and the export call
// the same function, so what was approved on screen is what the file holds.
import { filterOf } from "./layers.js";

/** Load an image from a URL into an <img>, resolved once it can be drawn. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file isn't an image this browser can open."));
    img.src = src;
  });
}

let scratch = null;
function paintCanvas(w, h) {
  if (!scratch) scratch = document.createElement("canvas");
  scratch.width = w; scratch.height = h;
  return scratch;
}

function drawStrokes(ctx, strokes) {
  for (const s of strokes) {
    ctx.save();
    ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
    ctx.lineWidth = s.size; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (s.points.length === 1) {
      ctx.beginPath(); ctx.arc(s.points[0][0], s.points[0][1], s.size / 2, 0, Math.PI * 2); ctx.fill();
    } else if (s.points.some((q) => q.length > 2)) {
      // Pen pressure: each segment is as wide as the pressure at its end, so a light touch draws thin.
      for (let i = 1; i < s.points.length; i++) {
        const a = s.points[i - 1], b = s.points[i];
        ctx.lineWidth = Math.max(0.5, s.size * (b[2] ?? 1));
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.moveTo(...s.points[0]);
      for (const p of s.points.slice(1)) ctx.lineTo(...p);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** One layer, with its own opacity, blend, transform and adjustments. */
export function drawLayer(ctx, doc, l, images) {
  if (!l.visible || !l.opacity) return;
  ctx.save();
  ctx.globalAlpha = l.opacity / 100;
  ctx.globalCompositeOperation = l.blend;
  const f = filterOf(l.adj);
  if (f) ctx.filter = f;
  if (l.kind === "fill") {
    ctx.fillStyle = l.color; ctx.fillRect(0, 0, doc.w, doc.h);
    ctx.restore(); return;
  }
  ctx.translate(l.x, l.y);
  if (l.rotate) {
    const c = centre(l);
    ctx.translate(c[0], c[1]); ctx.rotate((l.rotate * Math.PI) / 180); ctx.translate(-c[0], -c[1]);
  }
  ctx.scale(l.scale, l.scale);
  if (l.kind === "image") {
    const img = images.get(l.src);
    if (img) ctx.drawImage(img, 0, 0, l.w, l.h);
  } else if (l.kind === "text") {
    ctx.fillStyle = l.color; ctx.textBaseline = "top";
    ctx.font = `${l.bold ? "800 " : ""}${l.size}px ${l.font}`;
    l.text.split("\n").forEach((line, i) => ctx.fillText(line, 0, i * l.size * 1.2));
  } else if (l.kind === "paint" && l.strokes.length) {
    // Erasing must only erase this layer, so the strokes are drawn on their own canvas first.
    const pad = 2 * Math.max(doc.w, doc.h);
    const c = paintCanvas(doc.w + pad, doc.h + pad);
    const p = c.getContext("2d");
    p.clearRect(0, 0, c.width, c.height);
    p.translate(pad / 2, pad / 2);
    drawStrokes(p, l.strokes);
    p.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, -pad / 2, -pad / 2);
  }
  ctx.restore();
}

function centre(l) {
  if (l.kind === "image") return [(l.w * l.scale) / 2, (l.h * l.scale) / 2];
  if (l.kind === "text") return [(l.text.length * l.size * 0.3) * l.scale, (l.size * 0.6) * l.scale];
  return [0, 0];
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
    drawLayer(ctx, doc, l, images);
  }
}

/** Render to a fresh canvas and give back a Blob — PNG keeps transparency, JPEG does not. */
export function exportDoc(doc, images, type = "image/png", quality = 0.92, only = null) {
  const c = document.createElement("canvas");
  c.width = doc.w; c.height = doc.h;
  const ctx = c.getContext("2d");
  if (type === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, doc.w, doc.h); }
  // JPEG has no alpha: a white base is drawn first, then the stack over it.
  const tmp = document.createElement("canvas");
  tmp.width = doc.w; tmp.height = doc.h;
  renderDoc(tmp.getContext("2d"), doc, images, { only });
  ctx.drawImage(tmp, 0, 0);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("The browser couldn't write the file."))), type, quality));
}
