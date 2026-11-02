// How a clip LOOKS — VideoZ's filters, adjustments and framing as pure maths,
// so they run under plain node and are tested there. The engine (render.js)
// draws with these; nothing about a look is decided anywhere else.

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Adjustments, each in a unit a member can read on the slider.
export const ADJUST = {
  brightness: { label: "Brightness", min: -50, max: 50, unit: "%" },
  contrast: { label: "Contrast", min: -50, max: 50, unit: "%" },
  saturation: { label: "Saturation", min: -100, max: 100, unit: "%" },
  warmth: { label: "Warmth", min: -50, max: 50, unit: "" },
  sepia: { label: "Sepia", min: 0, max: 100, unit: "%" },
  blur: { label: "Soft focus", min: 0, max: 8, unit: "px" },
  vignette: { label: "Vignette", min: 0, max: 100, unit: "%" },
};
export const NEUTRAL = Object.freeze({ brightness: 0, contrast: 0, saturation: 0, warmth: 0, sepia: 0, blur: 0, vignette: 0 });

// Filters are named starting points; every one is just a set of the
// adjustments above, so picking one and then moving a slider is one model.
export const FILTERS = {
  none: { label: "None", adj: {} },
  vivid: { label: "Vivid", adj: { contrast: 12, saturation: 35 } },
  warm: { label: "Warm", adj: { warmth: 30, saturation: 8 } },
  cool: { label: "Cool", adj: { warmth: -30, contrast: 6 } },
  bw: { label: "B&W", adj: { saturation: -100, contrast: 10 } },
  noir: { label: "Noir", adj: { saturation: -100, contrast: 40, brightness: -10, vignette: 60 } },
  vintage: { label: "Vintage", adj: { sepia: 45, contrast: -10, saturation: -20, vignette: 40 } },
  matte: { label: "Matte", adj: { contrast: -25, brightness: 6, saturation: -15 } },
  dream: { label: "Dream", adj: { brightness: 10, blur: 2, saturation: 15 } },
};

export const MOTIONS = {
  none: { label: "Still" },
  in: { label: "Slow zoom in" },
  out: { label: "Slow zoom out" },
};
export const ZOOM = 0.12;   // how far a photo's slow zoom travels over its time on screen

export const TEXT_SPOTS = ["top", "middle", "bottom"];
export const TEXT_MAX = 80;


/** The look of a clip: its filter's adjustments with the member's own on top, every value clamped. */
export function lookOf(clip) {
  const base = FILTERS[clip?.filter]?.adj || {};
  const own = clip?.adj || {};
  const out = {};
  for (const [k, spec] of Object.entries(ADJUST)) {
    out[k] = clamp(num(own[k] ?? base[k], 0), spec.min, spec.max);
  }
  return out;
}

/** Where a w×h picture lands in a W×H frame: `cover` fills and crops, `contain` fits and letterboxes. */
export function fitRect(w, h, W, H, mode = "cover", zoom = 1) {
  if (!(w > 0 && h > 0)) return { x: 0, y: 0, w: W, h: H };
  const s = (mode === "contain" ? Math.min(W / w, H / h) : Math.max(W / w, H / h)) * zoom;
  const dw = w * s, dh = h * s;
  return { x: (W - dw) / 2, y: (H - dh) / 2, w: dw, h: dh };
}

/** A photo's slow zoom at `into` seconds of `len`. */
export function zoomAt(motion, into, len) {
  const p = len > 0 ? clamp(into / len, 0, 1) : 0;
  if (motion === "in") return 1 + ZOOM * p;
  if (motion === "out") return 1 + ZOOM * (1 - p);
  return 1;
}

/** The look as a canvas `filter` string (warmth and vignette are drawn as overlays, not filters). */
export function cssFilter(look) {
  const parts = [];
  if (look.brightness) parts.push(`brightness(${(1 + look.brightness / 100).toFixed(3)})`);
  if (look.contrast) parts.push(`contrast(${(1 + look.contrast / 100).toFixed(3)})`);
  if (look.saturation) parts.push(`saturate(${(1 + look.saturation / 100).toFixed(3)})`);
  if (look.sepia) parts.push(`sepia(${(look.sepia / 100).toFixed(3)})`);
  if (look.blur) parts.push(`blur(${look.blur}px)`);
  return parts.join(" ") || "none";
}

/**
 * The same look applied to raw pixels, for a browser whose canvas has no
 * `filter` (Safari). Matches the CSS filter maths for brightness, contrast,
 * saturation and sepia; soft focus has no cheap pixel version and is skipped,
 * which the screen says. Mutates and returns `data` (RGBA bytes).
 */
export function adjustPixels(data, look) {
  const b = 1 + (look.brightness || 0) / 100;
  const c = 1 + (look.contrast || 0) / 100;
  const s = 1 + (look.saturation || 0) / 100;
  const sp = clamp((look.sepia || 0) / 100, 0, 1);
  if (b === 1 && c === 1 && s === 1 && sp === 0) return data;
  // CSS saturate() matrix.
  const sm = [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ];
  const q = 1 - sp;
  const pm = [
    0.393 + 0.607 * q, 0.769 - 0.769 * q, 0.189 - 0.189 * q,
    0.349 - 0.349 * q, 0.686 + 0.314 * q, 0.168 - 0.168 * q,
    0.272 - 0.272 * q, 0.534 - 0.534 * q, 0.131 + 0.869 * q,
  ];
  const off = 0.5 - 0.5 * c;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255, g = data[i + 1] / 255, bl = data[i + 2] / 255;
    r *= b; g *= b; bl *= b;
    r = r * c + off; g = g * c + off; bl = bl * c + off;
    let r2 = sm[0] * r + sm[1] * g + sm[2] * bl;
    let g2 = sm[3] * r + sm[4] * g + sm[5] * bl;
    let b2 = sm[6] * r + sm[7] * g + sm[8] * bl;
    if (sp) {
      const r3 = pm[0] * r2 + pm[1] * g2 + pm[2] * b2;
      const g3 = pm[3] * r2 + pm[4] * g2 + pm[5] * b2;
      b2 = pm[6] * r2 + pm[7] * g2 + pm[8] * b2;
      r2 = r3; g2 = g3;
    }
    data[i] = clamp(Math.round(r2 * 255), 0, 255);
    data[i + 1] = clamp(Math.round(g2 * 255), 0, 255);
    data[i + 2] = clamp(Math.round(b2 * 255), 0, 255);
  }
  return data;
}

/** Warmth as a tint laid over the frame: amber when warm, blue when cool, never both. */
export function warmthTint(warmth) {
  const w = clamp(num(warmth, 0), -50, 50);
  if (!w) return null;
  const a = (Math.abs(w) / 50) * 0.22;
  return w > 0 ? `rgba(255,150,40,${a.toFixed(3)})` : `rgba(60,140,255,${a.toFixed(3)})`;
}


/** Picture-in-picture: shrink a placed picture to `scale`% and shift it by x/y
 * (each a % of the frame, centre 0). 100 / 0 / 0 is the picture untouched. */
export function placeRect(r, { scale = 100, x = 0, y = 0 } = {}, W, H) {
  const s = clamp(num(scale, 100), 5, 300) / 100;
  const w = r.w * s, h = r.h * s;
  const cx = r.x + r.w / 2 + (clamp(num(x, 0), -100, 100) / 100) * W;
  const cy = r.y + r.h / 2 + (clamp(num(y, 0), -100, 100) / 100) * H;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
