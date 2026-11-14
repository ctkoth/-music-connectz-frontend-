import { SIZES, STAR_COUNT, STAR_SIZES, ratingText, ratingTone, starPercent } from "../rating.js";

// The one way a rating is drawn. A LARGE number, and beside it what it is and why:
// label on top, the detail under. Used by the coach result, LogZ, the history, the
// coaching board, the post read card and the progress findings, so a rating looks
// the same wherever it turns up — and none of them can show a number alone.

const GLOW = "[filter:drop-shadow(0_0_7px_currentColor)]";
const STARS = "★".repeat(STAR_COUNT);

/** The rating as stars: as many as the number, the last one filled to the decimal
 *  (6.5 is six stars and half of the seventh), glowing in the rating's own colour.
 *  ★ glyphs, never the ⭐ emoji: that one is XP everywhere else in the app. No
 *  rating draws nothing, because an empty row would read as a zero. */
export function RatingStars({ value, exact, size = "md", className = "" }) {
  const v = exact ?? value;
  const pct = starPercent(v);
  if (pct == null) return null;
  return (
    <span role="img" aria-label={`${ratingText(exact, value)} out of ${STAR_COUNT} stars`}
          className={`relative inline-block select-none whitespace-nowrap leading-none ${STAR_SIZES[size] || STAR_SIZES.md} ${className}`}>
      <span aria-hidden="true" className="text-white/15">{STARS}</span>
      <span aria-hidden="true" style={{ width: `${pct}%` }}
            className={`absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-700 ease-out motion-reduce:transition-none ${ratingTone(v)} ${GLOW}`}>
        {STARS}
      </span>
    </span>
  );
}

/** Just the number, coloured, with an optional "/10". */
export function RatingNumber({ value, exact, size = "lg", outOf = false, className = "" }) {
  const big = size === "xl" || size === "lg";
  return (
    <span className={`font-display ${SIZES[size] || SIZES.lg} font-extrabold leading-none tabular-nums ${ratingTone(exact ?? value)} ${big && (exact ?? value) != null ? GLOW : ""} ${className}`}>
      {ratingText(exact, value)}{outOf && <span className="text-[0.4em] font-bold text-white/30">/10</span>}
    </span>
  );
}

/** Number + label + detail, side by side. */
export function RatingRow({ value, exact, label, detail, size = "md", outOf = false, className = "" }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-2.5 ${className}`}>
      <RatingNumber value={value} exact={exact} size={size} outOf={outOf} />
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold text-white/90">{label}</span>
        <RatingStars value={value} exact={exact} size={size === "xl" || size === "lg" ? "lg" : "md"} className="mt-0.5" />
        {detail ? <span className="block text-[11px] leading-snug text-white/60">{detail}</span> : null}
      </span>
    </div>
  );
}

/** A set of RatingRows in the house grid. rows: [{key, label, value, detail}] */
export function RatingGrid({ rows, size = "md" }) {
  if (!rows?.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map((r) => <RatingRow key={r.key} value={r.value} label={r.label} detail={r.detail} size={size} />)}
    </div>
  );
}
