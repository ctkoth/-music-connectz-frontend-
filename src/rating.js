// How a rating is read and drawn — ONE place, so every rating in the app has the
// same metrics and the same layout: a large number, its label, and the detail
// that goes with it (see components/Rating.jsx).
//
// Corey's rule: ratings are consistent. A 6 is the same colour on the coach, in
// LogZ, on a post and on the history; "7.4" is never "7" on one screen and "7.4"
// on the next; and no number stands alone. `rating.test.mjs` fails if a screen
// brings its own colour thresholds back.

/** Tailwind colour for a 1–10 number. The one set of thresholds. */
export const ratingTone = (n) =>
  n == null ? "text-white/30" : n >= 8 ? "text-emerald-300" : n >= 5 ? "text-mcz-gold" : "text-mcz-ember";

/** The number as the member was shown it: one decimal when there is one. */
export const ratingText = (exact, score) => {
  const v = exact != null ? exact : score;
  if (v == null || v === "") return "—";
  return Number.isInteger(Number(v)) ? String(v) : Number(v).toFixed(1);
};

/** The most confident moment the coach filed under one dimension, as a sentence. */
export function heardFor(heard, dim) {
  const rows = (heard || []).filter((h) => h.dim === dim && h.what);
  if (!rows.length) return "";
  const top = rows.reduce((a, b) => ((b.confidence || 1) > (a.confidence || 1) ? b : a));
  return `${top.t ? `${top.t} · ` : ""}${top.what}`;
}

// Corey: the number is the loudest thing on the card. One size step up everywhere.
export const SIZES = { xl: "text-7xl", lg: "text-5xl", md: "text-3xl", sm: "text-xl" };

/** How much of a row of `outOf` stars a rating fills, as a percent. 6.5 of 10 is
 *  65: six whole stars and half of the seventh. Out-of-range is clamped, and no
 *  rating is null (no stars drawn), never an empty row that reads as a zero. */
export function starPercent(value, outOf = 10) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || outOf <= 0) return null;
  return Math.round(Math.max(0, Math.min(outOf, n)) / outOf * 1000) / 10;
}

export const STAR_COUNT = 10;
export const STAR_SIZES = { xl: "text-3xl", lg: "text-2xl", md: "text-sm", sm: "text-[11px]" };
