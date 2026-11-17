// ImageZ's document model: a canvas size and a stack of layers, and every edit
// to them. Pure — no DOM — so it runs under plain node and is tested there.
//
// `layers[0]` is the TOP of the stack, the order a layers panel lists them in.
// Drawing walks the array backwards (bottom first). Every edit returns a new
// document, so undo is a list of documents.
//
// A paint layer stores its STROKES, not pixels: a stroke is a few numbers, so
// undo is exact and cheap, and a crop or move never resamples somebody's brush
// work.

export const MAX_SIDE = 4096;       // a canvas this size is ~64 MB of pixels in the tab
export const MAX_LAYERS = 50;

export const BLENDS = [
  ["source-over", "Normal"], ["multiply", "Multiply"], ["screen", "Screen"], ["overlay", "Overlay"],
  ["darken", "Darken"], ["lighten", "Lighten"], ["color-dodge", "Color dodge"], ["color-burn", "Color burn"],
  ["hard-light", "Hard light"], ["soft-light", "Soft light"], ["difference", "Difference"], ["exclusion", "Exclusion"],
  ["hue", "Hue"], ["saturation", "Saturation"], ["color", "Color"], ["luminosity", "Luminosity"],
];
const BLEND_KEYS = new Set(BLENDS.map(([k]) => k));

export const ADJ0 = { brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0, grayscale: 0, sepia: 0, invert: 0 };
export const ADJ_RANGE = {
  brightness: [0, 200], contrast: [0, 200], saturate: [0, 300], hue: [-180, 180],
  blur: [0, 40], grayscale: [0, 100], sepia: [0, 100], invert: [0, 100],
};
export const PRESETS = {
  None: ADJ0,
  "B&W": { ...ADJ0, grayscale: 100, contrast: 110 },
  Vintage: { ...ADJ0, sepia: 60, contrast: 95, saturate: 85, brightness: 105 },
  Cool: { ...ADJ0, hue: -20, saturate: 115 },
  Warm: { ...ADJ0, hue: 12, saturate: 120, brightness: 104 },
  Punch: { ...ADJ0, contrast: 130, saturate: 140 },
};

let n = 0;
export const uid = () => `l${Date.now().toString(36)}${(n++).toString(36)}`;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(+v) ? +v : lo));
const side = (v) => Math.round(clamp(v, 1, MAX_SIDE));

export function newDoc(w = 1080, h = 1080, background = "#ffffff") {
  const doc = { w: side(w), h: side(h), layers: [] };
  return background ? addLayer(doc, { kind: "fill", name: "Background", color: background }) : doc;
}

/** The fields every layer has, so nothing downstream has to guess. */
export function makeLayer(spec = {}) {
  const kind = ["image", "text", "paint", "fill"].includes(spec.kind) ? spec.kind : "paint";
  const base = {
    id: spec.id || uid(), kind,
    name: String(spec.name || { image: "Image", text: "Text", paint: "Paint", fill: "Fill" }[kind]).slice(0, 60),
    visible: spec.visible !== false, locked: !!spec.locked,
    opacity: clamp(spec.opacity ?? 100, 0, 100),
    blend: BLEND_KEYS.has(spec.blend) ? spec.blend : "source-over",
    x: Math.round(+spec.x || 0), y: Math.round(+spec.y || 0),
    scale: clamp(spec.scale ?? 1, 0.01, 20), rotate: clamp(spec.rotate ?? 0, -360, 360),
    adj: cleanAdj(spec.adj),
  };
  if (kind === "image") return { ...base, src: spec.src || "", w: side(spec.w || 1), h: side(spec.h || 1) };
  if (kind === "text") return {
    ...base, text: String(spec.text ?? "Your text").slice(0, 500), color: spec.color || "#ffffff",
    size: clamp(spec.size ?? 96, 4, 1000), font: spec.font || "Inter, system-ui, sans-serif", bold: spec.bold !== false,
  };
  if (kind === "fill") return { ...base, color: spec.color || "#ffffff" };
  return { ...base, strokes: Array.isArray(spec.strokes) ? spec.strokes : [] };
}

export function cleanAdj(a) {
  const out = { ...ADJ0 };
  for (const k of Object.keys(ADJ0)) if (a && a[k] != null) out[k] = clamp(a[k], ...ADJ_RANGE[k]);
  return out;
}

/** The CSS filter string a canvas draws a layer through. Empty when nothing is adjusted. */
export function filterOf(adj) {
  const a = cleanAdj(adj);
  const parts = [];
  if (a.brightness !== 100) parts.push(`brightness(${a.brightness}%)`);
  if (a.contrast !== 100) parts.push(`contrast(${a.contrast}%)`);
  if (a.saturate !== 100) parts.push(`saturate(${a.saturate}%)`);
  if (a.hue) parts.push(`hue-rotate(${a.hue}deg)`);
  if (a.blur) parts.push(`blur(${a.blur}px)`);
  if (a.grayscale) parts.push(`grayscale(${a.grayscale}%)`);
  if (a.sepia) parts.push(`sepia(${a.sepia}%)`);
  if (a.invert) parts.push(`invert(${a.invert}%)`);
  return parts.join(" ");
}

/** Add on top of `above` (or on top of everything). Refused past MAX_LAYERS, said by the caller. */
export function addLayer(doc, spec, above = null) {
  if (doc.layers.length >= MAX_LAYERS) return doc;
  const layer = makeLayer(spec);
  const at = above ? Math.max(0, doc.layers.findIndex((l) => l.id === above)) : 0;
  const layers = [...doc.layers];
  layers.splice(at, 0, layer);
  return { ...doc, layers };
}

export const layerOf = (doc, id) => doc.layers.find((l) => l.id === id) || null;

export function updateLayer(doc, id, patch) {
  return { ...doc, layers: doc.layers.map((l) => (l.id === id ? makeLayer({ ...l, ...patch, id: l.id, kind: l.kind }) : l)) };
}

export function removeLayer(doc, id) {
  return { ...doc, layers: doc.layers.filter((l) => l.id !== id) };
}

export function duplicateLayer(doc, id) {
  const l = layerOf(doc, id);
  if (!l) return doc;
  return addLayer(doc, { ...l, id: uid(), name: `${l.name} copy`.slice(0, 60), x: l.x + 20, y: l.y + 20 }, id);
}

/** dir -1 = up the stack (toward index 0), +1 = down. */
export function moveLayer(doc, id, dir) {
  const i = doc.layers.findIndex((l) => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= doc.layers.length) return doc;
  const layers = [...doc.layers];
  [layers[i], layers[j]] = [layers[j], layers[i]];
  return { ...doc, layers };
}

/** Merge is done by the renderer (it has the pixels); this only says whether there is anything below. */
export const below = (doc, id) => doc.layers[doc.layers.findIndex((l) => l.id === id) + 1] || null;

export function addStroke(doc, id, stroke) {
  const l = layerOf(doc, id);
  if (!l || l.kind !== "paint" || !stroke?.points?.length) return doc;
  // Stored in the layer's own coordinates, so moving the layer moves the paint.
  const s = {
    color: stroke.color || "#000000", size: clamp(stroke.size ?? 12, 1, 500), erase: !!stroke.erase,
    // A third number is pen pressure (0..1) from a tablet like a Wacom; a mouse leaves it off.
    points: stroke.points.map(([px, py, pr]) => {
      const pt = [Math.round((px - l.x) * 10) / 10, Math.round((py - l.y) * 10) / 10];
      return pr == null ? pt : [...pt, Math.round(clamp(pr, 0, 1) * 100) / 100];
    }),
  };
  return { ...doc, layers: doc.layers.map((x) => (x.id === id ? { ...x, strokes: [...x.strokes, s] } : x)) };
}

/** Normalise a dragged rectangle and keep it inside the canvas. Null when it has no area. */
export function cropRect(doc, a, b) {
  const x0 = Math.round(clamp(Math.min(a[0], b[0]), 0, doc.w)), x1 = Math.round(clamp(Math.max(a[0], b[0]), 0, doc.w));
  const y0 = Math.round(clamp(Math.min(a[1], b[1]), 0, doc.h)), y1 = Math.round(clamp(Math.max(a[1], b[1]), 0, doc.h));
  if (x1 - x0 < 2 || y1 - y0 < 2) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Crop the canvas. Layers keep their pixels; they are shifted, never resampled. */
export function crop(doc, r) {
  if (!r) return doc;
  return {
    ...doc, w: side(r.w), h: side(r.h),
    layers: doc.layers.map((l) => (l.kind === "fill" ? l : { ...l, x: l.x - r.x, y: l.y - r.y })),
  };
}

/** Change the canvas size; `anchor` "center" keeps content centred, "topleft" leaves it. */
export function resizeCanvas(doc, w, h, anchor = "center") {
  const W = side(w), H = side(h);
  const dx = anchor === "center" ? Math.round((W - doc.w) / 2) : 0;
  const dy = anchor === "center" ? Math.round((H - doc.h) / 2) : 0;
  return { ...doc, w: W, h: H, layers: doc.layers.map((l) => (l.kind === "fill" ? l : { ...l, x: l.x + dx, y: l.y + dy })) };
}

/** Fit an image of iw×ih inside the canvas, centred, never enlarged. */
export function fitImage(doc, iw, ih) {
  const scale = Math.min(1, doc.w / iw, doc.h / ih);
  return { scale, x: Math.round((doc.w - iw * scale) / 2), y: Math.round((doc.h - ih * scale) / 2) };
}

/** Rough box for picking a layer with the move tool (ignores rotation; text width is estimated). */
export function boxOf(l, doc) {
  if (l.kind === "fill") return { x: 0, y: 0, w: doc.w, h: doc.h };
  if (l.kind === "image") return { x: l.x, y: l.y, w: l.w * l.scale, h: l.h * l.scale };
  if (l.kind === "text") {
    const lines = l.text.split("\n");
    const wide = Math.max(...lines.map((s) => s.length)) * l.size * 0.6;
    return { x: l.x, y: l.y, w: wide * l.scale, h: lines.length * l.size * 1.2 * l.scale };
  }
  const pts = l.strokes.flatMap((s) => s.points.map(([px, py]) => [px, py, s.size]));
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), pad = Math.max(...pts.map((p) => p[2])) / 2;
  return {
    x: l.x + (Math.min(...xs) - pad) * l.scale, y: l.y + (Math.min(...ys) - pad) * l.scale,
    w: (Math.max(...xs) - Math.min(...xs) + pad * 2) * l.scale, h: (Math.max(...ys) - Math.min(...ys) + pad * 2) * l.scale,
  };
}

/** The topmost visible, unlocked layer under a point — what a click with the move tool grabs. */
export function pick(doc, x, y) {
  for (const l of doc.layers) {
    if (!l.visible || l.locked || l.kind === "fill") continue;
    const b = boxOf(l, doc);
    if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return l.id;
  }
  return null;
}
