// Tab-highlight glow colors. Premium unlocks the standard 8; StatZ unlocks 32.

export const STANDARD_8 = [
  "#22e6ff", "#ff2bd1", "#a855f7", "#ffcf3f",
  "#4ade80", "#fb923c", "#f43f5e", "#4da6ff",
];

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// 32 evenly-spaced neon hues for StatZ.
export const STATZ_32 = Array.from({ length: 32 }, (_, i) => hslToHex(Math.round((i * 360) / 32), 88, 62));

function darken(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, "0");

// CSS-variable overrides that recolor the primary + its glow from one accent.
export function accentStyle(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex || "")) return {};
  return {
    "--primary": hex,
    "--primary-dark": darken(hex, 0.6),
    "--glow": `0 0 18px ${alpha(hex, 0.5)}, 0 0 34px ${alpha(hex, 0.28)}`,
  };
}

// Which palette a tier may pick from. Free can't customize (locked to default).
export function accentOptionsFor(tier) {
  const t = (tier || "").toLowerCase();
  if (t.includes("statz") || t.includes("stats")) return { tier: "StatZ", colors: STATZ_32, locked: false };
  if (t.includes("premium") || t.includes("pro")) return { tier: "Premium", colors: STANDARD_8, locked: false };
  return { tier: "Free", colors: STANDARD_8, locked: true };
}
