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
// How many layers a picture may hold is the TIER's (`imagez_layers` from /limits/,
// null = unlimited); the model never caps it, so an unlimited tier is unlimited.
// Brush tips, in ladder order: a tier may use the first `imagez_layers` of them (Free 3, Premium 6, StatZ all).
export const TIPS = [["round", "Round"], ["square", "Square"], ["soft", "Soft"], ["marker", "Marker"],
  ["calligraphy", "Calligraphy"], ["spray", "Spray"], ["chalk", "Chalk"], ["star", "Star"]];
const TIP_KEYS = new Set(TIPS.map(([k]) => k));

export const canAdd = (doc, cap) => cap == null || doc.layers.length < cap;

// The fonts, in LADDER order: a tier's `imagez_fonts` is how many from the top it may use
// (Free the first 3, Premium the first 6, StatZ every one). Most are Google Fonts, loaded by
// `GOOGLE_FONTS_URL` when ImageZ opens; the rest are on nearly every device already.
export const FONTS = [
  ["Inter, system-ui, sans-serif", "Inter"],
  ["'Bebas Neue', sans-serif", "Bebas Neue"],
  ["'Montserrat', sans-serif", "Montserrat"],
  ["'Playfair Display', serif", "Playfair Display"],
  ["'Permanent Marker', cursive", "Permanent Marker"],
  ["'Pacifico', cursive", "Pacifico"],
  ["'Anton', sans-serif", "Anton"],
  ["'Oswald', sans-serif", "Oswald"],
  ["'Lobster', cursive", "Lobster"],
  ["'Bangers', sans-serif", "Bangers"],
  ["'Righteous', sans-serif", "Righteous"],
  ["'Abril Fatface', serif", "Abril Fatface"],
  ["'Dancing Script', cursive", "Dancing Script"],
  ["'Caveat', cursive", "Caveat"],
  ["'Rubik Mono One', monospace", "Rubik Mono One"],
  ["'Press Start 2P', monospace", "Press Start 2P"],
  ["'Monoton', sans-serif", "Monoton"],
  ["'Orbitron', sans-serif", "Orbitron"],
  ["'Russo One', sans-serif", "Russo One"],
  ["'Black Ops One', sans-serif", "Black Ops One"],
  ["'Shrikhand', cursive", "Shrikhand"],
  ["'Rock Salt', cursive", "Rock Salt"],
  ["'Cinzel', serif", "Cinzel"],
  ["'Space Grotesk', sans-serif", "Space Grotesk"],
  ["'Poppins', sans-serif", "Poppins"],
  ["'Archivo Black', sans-serif", "Archivo Black"],
  ["'Satisfy', cursive", "Satisfy"],
  ["'Great Vibes', cursive", "Great Vibes"],
  ["'Fredoka', sans-serif", "Fredoka"],
  ["'Kanit', sans-serif", "Kanit"],
  ["'Teko', sans-serif", "Teko"],
  ["Arial, Helvetica, sans-serif", "Arial"],
  ["Impact, 'Arial Black', sans-serif", "Impact"],
  ["Georgia, 'Times New Roman', serif", "Georgia"],
  ["'Times New Roman', Times, serif", "Times"],
  ["'Courier New', Courier, monospace", "Courier"],
  ["'Comic Sans MS', 'Comic Neue', cursive", "Comic"],
  ["Verdana, Geneva, sans-serif", "Verdana"],
  ["'Trebuchet MS', sans-serif", "Trebuchet"],
  ["system-ui, sans-serif", "System"],
];
export const GOOGLE_FONTS = ["Bebas Neue", "Montserrat", "Playfair Display", "Permanent Marker", "Pacifico", "Anton", "Oswald", "Lobster", "Bangers", "Righteous", "Abril Fatface", "Dancing Script", "Caveat", "Rubik Mono One", "Press Start 2P", "Monoton", "Orbitron", "Russo One", "Black Ops One", "Shrikhand", "Rock Salt", "Cinzel", "Space Grotesk", "Poppins", "Archivo Black", "Satisfy", "Great Vibes", "Fredoka", "Kanit", "Teko"];
export const GOOGLE_FONTS_URL = `https://fonts.googleapis.com/css2?${GOOGLE_FONTS.map((f) => `family=${f.replace(/ /g, "+")}`).join("&")}&display=swap`;
const FONT_KEYS = new Set(FONTS.map(([k]) => k));
// A font typed by name (StatZ: any installed on the device). Only letters, digits, spaces,
// quotes, commas and hyphens — it goes into a CSS font string, so nothing else gets through.
const SAFE_FONT = /^[\w\s,'"-]{1,80}$/;
export const cleanFont = (f) => (FONT_KEYS.has(f) ? f : typeof f === "string" && SAFE_FONT.test(f.trim()) ? `${f.trim()}, ${FONTS[0][0]}` .replace(/(, Inter, system-ui, sans-serif)+$/, ", Inter, system-ui, sans-serif") : FONTS[0][0]);

/** The fonts a tier may pick: the first `cap` of FONTS, all of them when cap is null (unlimited). */
export const fontsFor = (cap) => (cap == null ? FONTS : FONTS.slice(0, Math.max(0, cap)));

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
  const doc = { w: side(w), h: side(h), layers: [], groups: {} };
  return background ? addLayer(doc, { kind: "fill", name: "Background", color: background }) : doc;
}

/** The fields every layer has, so nothing downstream has to guess. */
export function makeLayer(spec = {}) {
  const kind = ["image", "text", "paint", "fill", "shape", "gradient"].includes(spec.kind) ? spec.kind : "paint";
  const base = {
    id: spec.id || uid(), kind,
    name: String(spec.name || { image: "Image", text: "Text", paint: "Paint", fill: "Fill", shape: "Shape", gradient: "Gradient" }[kind]).slice(0, 60),
    visible: spec.visible !== false, locked: !!spec.locked,
    opacity: clamp(spec.opacity ?? 100, 0, 100),
    blend: BLEND_KEYS.has(spec.blend) ? spec.blend : "source-over",
    x: Math.round(+spec.x || 0), y: Math.round(+spec.y || 0),
    scale: clamp(spec.scale ?? 1, 0.01, 20), rotate: clamp(spec.rotate ?? 0, -360, 360),
    adj: cleanAdj(spec.adj),
    flipX: !!spec.flipX, flipY: !!spec.flipY,
    group: typeof spec.group === "string" && spec.group ? spec.group : null,
    style: cleanStyle(spec.style),
    // A layer mask: null for none. Its strokes are in CANVAS coordinates, so moving the
    // layer slides it under the mask, the way Photoshop's unlinked mask behaves.
    // `src` is a picture of the mask (from a selection): its alpha is where the layer shows.
    mask: spec.mask && Array.isArray(spec.mask.strokes)
      ? { strokes: spec.mask.strokes, on: spec.mask.on !== false, fade: cleanFade(spec.mask.fade), src: typeof spec.mask.src === "string" ? spec.mask.src : null }
      : null,
  };
  if (kind === "image") return { ...base, src: spec.src || "", w: side(spec.w || 1), h: side(spec.h || 1) };
  if (kind === "text") return {
    ...base, text: String(spec.text ?? "Your text").slice(0, 500), color: spec.color || "#ffffff",
    size: clamp(spec.size ?? 96, 4, 1000), font: cleanFont(spec.font), bold: spec.bold !== false,
    italic: !!spec.italic, underline: !!spec.underline,
    align: ["left", "center", "right"].includes(spec.align) ? spec.align : "left",
    spacing: clamp(spec.spacing ?? 0, -50, 200), lineHeight: clamp(spec.lineHeight ?? 1.2, 0.6, 4),
    outline: spec.outline || "#000000", outlineW: clamp(spec.outlineW ?? 0, 0, 100),
    shadow: spec.shadow || "#000000", shadowBlur: clamp(spec.shadowBlur ?? 0, 0, 100),
    shadowX: clamp(spec.shadowX ?? 0, -200, 200), shadowY: clamp(spec.shadowY ?? 0, -200, 200),
    arc: clamp(spec.arc ?? 0, -100, 100),
  };
  if (kind === "fill") return { ...base, color: spec.color || "#ffffff" };
  if (kind === "shape") return {
    ...base, shape: ["rect", "ellipse", "line"].includes(spec.shape) ? spec.shape : "rect",
    w: Math.round(clamp(spec.w ?? 200, -MAX_SIDE, MAX_SIDE)), h: Math.round(clamp(spec.h ?? 200, -MAX_SIDE, MAX_SIDE)),
    color: spec.color || "#22d3ee", filled: spec.filled !== false, line: clamp(spec.line ?? 8, 1, 200),
  };
  if (kind === "gradient") return {
    ...base, from: spec.from || "#000000", to: spec.to || "#ffffff",
    style: spec.style === "radial" ? "radial" : "linear", angle: clamp(spec.angle ?? 90, -360, 360),
  };
  return { ...base, strokes: Array.isArray(spec.strokes) ? spec.strokes : [] };
}

/** A gradient across a mask: the layer goes from `from`% visible to `to`% visible along `angle`. Null for none. */
export function cleanFade(f) {
  if (!f) return null;
  return {
    from: clamp(f.from ?? 100, 0, 100), to: clamp(f.to ?? 0, 0, 100),
    angle: clamp(f.angle ?? 90, -360, 360), style: f.style === "radial" ? "radial" : "linear",
  };
}

/** Layer styles (Photoshop's fx): drop shadow, outer glow, stroke. Null when none is on. */
export function cleanStyle(st) {
  if (!st) return null;
  const sh = st.shadow || {}, gl = st.glow || {}, sk = st.stroke || {};
  const out = {
    shadow: { on: !!sh.on, color: sh.color || "#000000", blur: clamp(sh.blur ?? 12, 0, 200), x: clamp(sh.x ?? 8, -500, 500), y: clamp(sh.y ?? 8, -500, 500), opacity: clamp(sh.opacity ?? 60, 0, 100) },
    glow: { on: !!gl.on, color: gl.color || "#22d3ee", blur: clamp(gl.blur ?? 24, 0, 200), opacity: clamp(gl.opacity ?? 80, 0, 100) },
    stroke: { on: !!sk.on, color: sk.color || "#ffffff", width: clamp(sk.width ?? 4, 1, 100) },
  };
  return out.shadow.on || out.glow.on || out.stroke.on ? out : { ...out, none: true };
}
export const hasStyle = (l) => !!(l.style && !l.style.none);

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

/** Add on top of `above` (or on top of everything). The tier's ceiling is checked by the caller with canAdd. */
export function addLayer(doc, spec, above = null) {
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

/** Put a layer at index `to` in the stack (0 = top) — what dragging a row in the layers panel does. */
export function moveLayerTo(doc, id, to) {
  const i = doc.layers.findIndex((l) => l.id === id);
  if (i < 0) return doc;
  const j = Math.max(0, Math.min(doc.layers.length - 1, Math.round(to)));
  if (i === j) return doc;
  const layers = [...doc.layers];
  const [l] = layers.splice(i, 1);
  layers.splice(j, 0, l);
  return { ...doc, layers };
}

// ── Groups: a folder of layers. A layer names its group; the group carries a name, whether
// it is shown, an opacity that multiplies its layers', and whether its rows are folded. ──

export const groupOf = (doc, l) => (l.group && doc.groups?.[l.group]) || null;

/** What actually draws: a hidden group hides its layers, and its opacity multiplies theirs. */
export function effective(doc, l) {
  const g = groupOf(doc, l);
  if (!g) return { visible: l.visible, opacity: l.opacity };
  return { visible: l.visible && g.visible, opacity: Math.round((l.opacity * g.opacity) / 100) };
}

/** Put layers in a new group and pull them together in the stack, at the topmost one's place. */
export function groupLayers(doc, ids, name = "Group") {
  const set = new Set(ids);
  const members = doc.layers.filter((l) => set.has(l.id) && !(l.kind === "fill" && l === doc.layers.at(-1)));
  if (!members.length) return doc;
  const gid = `g${uid()}`;
  const at = doc.layers.findIndex((l) => l.id === members[0].id);
  const rest = doc.layers.filter((l) => !members.includes(l));
  const before = doc.layers.slice(0, at).filter((l) => !members.includes(l)).length;
  const layers = [...rest];
  layers.splice(before, 0, ...members.map((l) => ({ ...l, group: gid })));
  return { ...doc, layers, groups: { ...(doc.groups || {}), [gid]: { name: String(name).slice(0, 60), visible: true, opacity: 100, open: true } } };
}

export function ungroup(doc, gid) {
  const { [gid]: _gone, ...groups } = doc.groups || {};
  void _gone;
  return { ...doc, groups, layers: doc.layers.map((l) => (l.group === gid ? { ...l, group: null } : l)) };
}

export function updateGroup(doc, gid, patch) {
  const g = doc.groups?.[gid];
  if (!g) return doc;
  const next = { ...g, ...patch };
  next.opacity = clamp(next.opacity, 0, 100);
  next.name = String(next.name || "Group").slice(0, 60);
  return { ...doc, groups: { ...doc.groups, [gid]: next } };
}

// ── Snapping: a moving box lands on the canvas's edges and centre and on other layers' edges ──

/** Returns the snapped x/y and the guide lines to draw ({ v: [x…], h: [y…] }). */
export function snap(doc, movingId, box, threshold) {
  const vx = [0, doc.w / 2, doc.w], hy = [0, doc.h / 2, doc.h];
  for (const l of doc.layers) {
    if (l.id === movingId || !l.visible || l.kind === "fill" || l.kind === "gradient") continue;
    const b = boxOf(l, doc);
    if (!b) continue;
    vx.push(b.x, b.x + b.w / 2, b.x + b.w); hy.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  const best = (edges, targets) => {
    let pick = null;
    for (const e of edges) for (const t of targets) {
      const d = t - e;
      if (Math.abs(d) <= threshold && (!pick || Math.abs(d) < Math.abs(pick.d))) pick = { d, t };
    }
    return pick;
  };
  const sx = best([box.x, box.x + box.w / 2, box.x + box.w], vx);
  const sy = best([box.y, box.y + box.h / 2, box.y + box.h], hy);
  return { dx: sx ? sx.d : 0, dy: sy ? sy.d : 0, guides: { v: sx ? [sx.t] : [], h: sy ? [sy.t] : [] } };
}

/** Merge is done by the renderer (it has the pixels); this only says whether there is anything below. */
export const below = (doc, id) => doc.layers[doc.layers.findIndex((l) => l.id === id) + 1] || null;

export function addStroke(doc, id, stroke) {
  const l = layerOf(doc, id);
  if (!l || l.kind !== "paint" || !stroke?.points?.length) return doc;
  // Stored in the layer's own coordinates, so moving the layer moves the paint.
  const s = {
    color: stroke.color || "#000000", size: clamp(stroke.size ?? 12, 1, 500), erase: !!stroke.erase,
    tip: TIP_KEYS.has(stroke.tip) ? stroke.tip : "round", seed: Math.floor(Number(stroke.seed) || 0) % 100000,
    // A third number is pen pressure (0..1) from a tablet like a Wacom; a mouse leaves it off.
    points: stroke.points.map(([px, py, pr]) => {
      const pt = [Math.round((px - l.x) * 10) / 10, Math.round((py - l.y) * 10) / 10];
      return pr == null ? pt : [...pt, Math.round(clamp(pr, 0, 1) * 100) / 100];
    }),
  };
  return { ...doc, layers: doc.layers.map((x) => (x.id === id ? { ...x, strokes: [...x.strokes, s] } : x)) };
}

/**
 * Graded opacity by stack order: the top layer at `top`%, the bottom at `bottom`%,
 * evenly between. Background fills are left alone, so the picture keeps its base.
 */
export function gradeOpacity(doc, top = 100, bottom = 20) {
  const t = clamp(top, 0, 100), b = clamp(bottom, 0, 100);
  const ids = doc.layers.filter((l) => !(l.kind === "fill" && l === doc.layers.at(-1))).map((l) => l.id);
  if (!ids.length) return doc;
  const step = ids.length > 1 ? (b - t) / (ids.length - 1) : 0;
  const at = new Map(ids.map((id, i) => [id, Math.round(t + step * i)]));
  return { ...doc, layers: doc.layers.map((l) => (at.has(l.id) ? { ...l, opacity: at.get(l.id) } : l)) };
}

/** Replace a layer by a new one of any kind in the same slot (the pixel erasers turn a layer into a picture). */
export function replaceLayer(doc, id, spec) {
  return { ...doc, layers: doc.layers.map((l) => (l.id === id ? makeLayer({ ...spec, id }) : l)) };
}

/** Paint on a layer's mask: `hide` takes the layer away there, otherwise it brings it back. */
export function addMaskStroke(doc, id, stroke) {
  const l = layerOf(doc, id);
  if (!l || !l.mask || !stroke?.points?.length) return doc;
  const s = {
    hide: !!stroke.hide, size: clamp(stroke.size ?? 24, 1, 500),
    points: stroke.points.map(([px, py, pr]) => (pr == null ? [Math.round(px), Math.round(py)] : [Math.round(px), Math.round(py), Math.round(clamp(pr, 0, 1) * 100) / 100])),
  };
  return { ...doc, layers: doc.layers.map((x) => (x.id === id ? { ...x, mask: { ...x.mask, strokes: [...x.mask.strokes, s] } } : x)) };
}

/** A shape from a drag: its corner and size, with a line keeping its direction. */
export function shapeFromDrag(a, b, shape) {
  if (shape === "line") return { x: Math.round(a[0]), y: Math.round(a[1]), w: Math.round(b[0] - a[0]), h: Math.round(b[1] - a[1]) };
  return { x: Math.round(Math.min(a[0], b[0])), y: Math.round(Math.min(a[1], b[1])), w: Math.round(Math.abs(b[0] - a[0])), h: Math.round(Math.abs(b[1] - a[1])) };
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
    layers: doc.layers.map((l) => shiftMask(l.kind === "fill" || l.kind === "gradient" ? l : { ...l, x: l.x - r.x, y: l.y - r.y }, -r.x, -r.y)),
  };
}

function shiftMask(l, dx, dy) {
  if (!l.mask || (!dx && !dy)) return l;
  return { ...l, mask: { ...l.mask, strokes: l.mask.strokes.map((s) => ({ ...s, points: s.points.map(([x, y, ...r]) => [x + dx, y + dy, ...r]) })) } };
}

/** Change the canvas size; `anchor` "center" keeps content centred, "topleft" leaves it. */
export function resizeCanvas(doc, w, h, anchor = "center") {
  const W = side(w), H = side(h);
  const dx = anchor === "center" ? Math.round((W - doc.w) / 2) : 0;
  const dy = anchor === "center" ? Math.round((H - doc.h) / 2) : 0;
  return { ...doc, w: W, h: H, layers: doc.layers.map((l) => shiftMask(l.kind === "fill" || l.kind === "gradient" ? l : { ...l, x: l.x + dx, y: l.y + dy }, dx, dy)) };
}

/** Image size: scale the whole picture by `k` (layers, masks and all), keeping the proportions. */
export function scaleDoc(doc, k) {
  k = clamp(k, 0.01, 20);
  const W = side(doc.w * k), H = side(doc.h * k);
  const kx = W / doc.w, ky = H / doc.h;
  const mask = (l) => (!l.mask ? l.mask : { ...l.mask, strokes: l.mask.strokes.map((st) => ({ ...st, size: st.size * kx, points: st.points.map(([x, y, ...r]) => [x * kx, y * ky, ...r]) })) });
  return {
    ...doc, w: W, h: H,
    layers: doc.layers.map((l) => (l.kind === "fill" || l.kind === "gradient"
      ? { ...l, mask: mask(l) }
      : { ...l, x: Math.round(l.x * kx), y: Math.round(l.y * ky), scale: l.scale * kx, mask: mask(l) })),
  };
}

/** Rotate the whole canvas a quarter turn (dir 1 = clockwise, -1 = anticlockwise); every layer turns with it. */
export function rotateDoc(doc, dir = 1) {
  const W = doc.h, H = doc.w;
  const turn = ([x, y]) => (dir > 0 ? [doc.h - y, x] : [y, doc.w - x]);
  const mask = (l) => (!l.mask ? l.mask : { ...l.mask, strokes: l.mask.strokes.map((st) => ({ ...st, points: st.points.map(([x, y, ...r]) => [...turn([x, y]), ...r]) })) });
  const layers = doc.layers.map((l) => {
    if (l.kind === "fill") return { ...l, mask: mask(l) };
    if (l.kind === "gradient") return { ...l, angle: l.angle + 90 * dir, mask: mask(l) };
    const b = boxOf(l, doc);
    if (!b) return { ...l, mask: mask(l) };
    // Each layer turns about its own centre (as rotate does), and that centre moves to its turned place.
    const [cx, cy] = turn([b.x + b.w / 2, b.y + b.h / 2]);
    const r = ((l.rotate + 90 * dir + 540) % 360) - 180;
    return { ...l, rotate: r, x: Math.round(l.x + (cx - (b.x + b.w / 2))), y: Math.round(l.y + (cy - (b.y + b.h / 2))), mask: mask(l) };
  });
  return { ...doc, w: W, h: H, layers };
}

/** Fit an image of iw×ih inside the canvas, centred, never enlarged. */
export function fitImage(doc, iw, ih) {
  const scale = Math.min(1, doc.w / iw, doc.h / ih);
  return { scale, x: Math.round((doc.w - iw * scale) / 2), y: Math.round((doc.h - ih * scale) / 2) };
}

/** Rough box for picking a layer with the move tool (ignores rotation; text width is estimated). */
export function boxOf(l, doc) {
  if (l.kind === "fill" || l.kind === "gradient") return { x: 0, y: 0, w: doc.w, h: doc.h };
  if (l.kind === "shape") {
    const x0 = Math.min(0, l.w), y0 = Math.min(0, l.h), pad = l.filled && l.shape !== "line" ? 0 : l.line / 2;
    return { x: l.x + (x0 - pad) * l.scale, y: l.y + (y0 - pad) * l.scale, w: (Math.abs(l.w) + pad * 2) * l.scale, h: (Math.abs(l.h) + pad * 2) * l.scale };
  }
  if (l.kind === "image") return { x: l.x, y: l.y, w: l.w * l.scale, h: l.h * l.scale };
  if (l.kind === "text") {
    const lines = l.text.split("\n");
    const wide = Math.max(...lines.map((s) => s.length)) * (l.size * 0.6 + l.spacing);
    const off = l.align === "center" ? wide / 2 : l.align === "right" ? wide : 0;
    return { x: l.x - off * l.scale, y: l.y, w: wide * l.scale, h: lines.length * l.size * l.lineHeight * l.scale };
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
    if (!l.visible || l.locked || l.kind === "fill" || l.kind === "gradient") continue;
    const b = boxOf(l, doc);
    if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return l.id;
  }
  return null;
}

// ── a project file: the whole layered document, to reopen later ──
export const PROJECT_VERSION = 1;

/** The document as JSON, with each image's pixels supplied by `dataOf(src)` (a data: URL). */
export async function toProject(doc, dataOf) {
  const layers = [];
  for (const l of doc.layers) {
    let x = l.kind === "image" ? { ...l, src: await dataOf(l.src) } : l;
    if (x.mask?.src) x = { ...x, mask: { ...x.mask, src: await dataOf(x.mask.src) } };
    layers.push(x);
  }
  return JSON.stringify({ imagez: PROJECT_VERSION, w: doc.w, h: doc.h, layers, groups: doc.groups || {} });
}

/** Read a project file back. Every layer goes through makeLayer, so a hand-edited file cannot carry junk. */
export function fromProject(text) {
  let p;
  try { p = JSON.parse(text); } catch { throw new Error("That isn't an ImageZ project file."); }
  if (!p || p.imagez !== PROJECT_VERSION || !Array.isArray(p.layers)) throw new Error("That isn't an ImageZ project file.");
  const groups = {};
  for (const [gid, g] of Object.entries(p.groups && typeof p.groups === "object" ? p.groups : {})) {
    if (/^g[\w]{1,40}$/.test(gid) && g) groups[gid] = { name: String(g.name || "Group").slice(0, 60), visible: g.visible !== false, opacity: clamp(g.opacity ?? 100, 0, 100), open: g.open !== false };
  }
  const doc = { w: Math.round(clamp(p.w, 1, MAX_SIDE)), h: Math.round(clamp(p.h, 1, MAX_SIDE)), layers: [], groups };
  doc.layers = p.layers.map((l) => makeLayer({ ...l, id: uid() }))
    .filter((l) => l.kind !== "image" || /^data:image\//.test(l.src))
    .map((l) => (l.group && !groups[l.group] ? { ...l, group: null } : l))
    .map((l) => (l.mask?.src && !/^data:image\//.test(l.mask.src) ? { ...l, mask: { ...l.mask, src: null } } : l));
  return doc;
}
