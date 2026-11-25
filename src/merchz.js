// MerchZ: the products a member can design, and where the art may sit on each. Pure, tested under node.
// No printer is connected yet (Corey's call: designer only for now), so nothing here is a price or an order.
export const PRODUCTS = [
  { key: "shirt", label: "T-shirt", emoji: "👕", area: { x: 0.33, y: 0.3, w: 0.34, h: 0.36 } },
  { key: "hoodie", label: "Hoodie", emoji: "🧥", area: { x: 0.35, y: 0.34, w: 0.3, h: 0.24 } },
  { key: "towel", label: "Towel", emoji: "🧺", area: { x: 0.14, y: 0.22, w: 0.72, h: 0.56 } },
  { key: "bandana", label: "Bandana", emoji: "🧣", area: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } },
  { key: "wavecap", label: "Wave cap", emoji: "🧢", area: { x: 0.3, y: 0.32, w: 0.4, h: 0.3 } },
  { key: "durag", label: "Durag", emoji: "🎽", area: { x: 0.3, y: 0.28, w: 0.4, h: 0.32 } },
  { key: "mug", label: "Mug", emoji: "☕", area: { x: 0.24, y: 0.3, w: 0.38, h: 0.4 } },
  { key: "phonecase", label: "Phone case", emoji: "📱", area: { x: 0.36, y: 0.26, w: 0.28, h: 0.6 }, note: "Which phone it fits is chosen when ordering opens." },
  { key: "sticker", label: "Sticker", emoji: "🏷️", area: { x: 0.22, y: 0.22, w: 0.56, h: 0.56 }, note: "Cut to a rounded square. Art fills it edge to edge." },
  { key: "poster", label: "Poster", emoji: "🖼️", area: { x: 0.26, y: 0.12, w: 0.48, h: 0.76 }, note: "Portrait. Upload art at least 2400 px tall so it prints sharp." },
  // Caps are embroidered, not printed: a small front panel, and thread suits bold, simple art.
  { key: "baseballcap", label: "Baseball cap", emoji: "⚾", area: { x: 0.36, y: 0.3, w: 0.28, h: 0.16 }, note: "Embroidered, not printed: bold, simple art with a few colours stitches best. Fine detail and gradients won't." },
];
export const COLORS = ["#111111", "#ffffff", "#c81d25", "#1d4ed8", "#15803d", "#7e22ce", "#f59e0b", "#ec4899"];
export const productFor = (key) => PRODUCTS.find((p) => p.key === key) || PRODUCTS[0];

/** Fit an image of w×h inside the product's print area on a size×size canvas, at `scale` (0.2..1) and nudged by
 *  dx, dy (-1..1 of the free room). Never leaves the area: art printed off the edge is art lost. */
export function placeArt(productKey, w, h, size, scale = 1, dx = 0, dy = 0) {
  const a = productFor(productKey).area;
  const s = Math.max(0.2, Math.min(1, Number(scale) || 1));
  const aw = a.w * size, ah = a.h * size;
  const k = Math.min(aw / w, ah / h) * s;
  const pw = w * k, ph = h * k;
  const cl = (v) => Math.max(-1, Math.min(1, Number(v) || 0));
  const x = a.x * size + (aw - pw) / 2 + ((aw - pw) / 2) * cl(dx);
  const y = a.y * size + (ah - ph) / 2 + ((ah - ph) / 2) * cl(dy);
  return { x, y, w: pw, h: ph };
}

/** A colour light enough to need dark outlines. */
export const isLight = (hex) => {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160;
};
