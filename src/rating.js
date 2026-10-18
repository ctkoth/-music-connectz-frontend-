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

export const SIZES = { xl: "text-5xl", lg: "text-3xl", md: "text-2xl", sm: "text-lg" };
