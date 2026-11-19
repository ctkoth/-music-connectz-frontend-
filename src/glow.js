// The neon glow colour, picked by the member. How many colours they may choose from is the tier's
// (`glow_colors` from /limits/: Free 3, Premium 6, StatZ unlimited, Corey's numbers) — never typed
// here. A tier says how MANY, never whether: everybody gets a glow and a choice.
//
// Pure, no imports: runs under plain node. `apply` is the one DOM write.
export const KEY = "mcz_glow";

// Ordered. The first N are a tier's choices, so the earliest are the everyday ones (the brand's own
// three first), and the rest unlock in the order a member would reach for them.
export const PALETTE = [
  { key: "ember", label: "Ember", hex: "#ff5500" },
  { key: "pink", label: "Pink", hex: "#ff2bd1" },
  { key: "cyan", label: "Cyan", hex: "#22e6ff" },
  { key: "purple", label: "Purple", hex: "#a855f7" },
  { key: "gold", label: "Gold", hex: "#ffcf3f" },
  { key: "emerald", label: "Emerald", hex: "#34d399" },
  { key: "blue", label: "Blue", hex: "#3b82f6" },
  { key: "lime", label: "Lime", hex: "#a3e635" },
  { key: "rose", label: "Rose", hex: "#fb7185" },
  { key: "teal", label: "Teal", hex: "#2dd4bf" },
  { key: "orange", label: "Orange", hex: "#fb923c" },
  { key: "violet", label: "Violet", hex: "#8b5cf6" },
];

/** How many of the palette this tier may pick: `cap` null/undefined is unlimited. */
export const room = (cap) => (cap == null ? PALETTE.length : Math.max(0, Math.min(PALETTE.length, Math.floor(Number(cap)) || 0)));

export const allowed = (key, cap) => PALETTE.slice(0, room(cap)).some((c) => c.key === key);

/** The colour to show: the choice if the tier still allows it, else null (the app's own defaults).
 *  A lapse keeps what was chosen on the device but stops it applying — nothing is taken from the member. */
export function effective(key, cap) {
  const c = PALETTE.find((x) => x.key === key);
  return c && allowed(key, cap) ? c : null;
}

export function load() {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
}
export function save(key) {
  try { key ? localStorage.setItem(KEY, key) : localStorage.removeItem(KEY); } catch { /* blocked: this session only */ }
}

/** Put the colour on the page, or take it off (null → the app's own defaults). */
export function apply(color) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (color) root.style.setProperty("--mcz-glow", color.hex);
  else root.style.removeProperty("--mcz-glow");
}
