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

/** The headline score as a ring: the arc fills to the rating (6.5 of 10 is 65% round), the number and
 *  "/10" sit inside. The colour is the rating's own tone, so a 6 is the same colour here as in a row.
 *  No rating draws an empty track with a dash, never a full or empty ring that reads as a score. */
export function RatingRing({ value, exact, size = 168, label, className = "" }) {
  const v = exact ?? value;
  const pct = starPercent(v) ?? 0;
  const stroke = Math.max(8, Math.round(size / 15));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span role="img" aria-label={`${ratingText(exact, value)} out of 10${label ? `, ${label}` : ""}`}
          className={`relative inline-flex shrink-0 items-center justify-center ${ratingTone(v)} ${className}`}
          style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90 overflow-visible" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth={stroke} />
        {v != null && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={`${(c * pct) / 100} ${c}`} className={`transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none ${GLOW}`} />
        )}
      </svg>
      <span className="relative flex flex-col items-center leading-none">
        <span className="font-display font-extrabold tabular-nums" style={{ fontSize: size * 0.34 }}>{ratingText(exact, value)}</span>
        <span className="mt-1 font-bold text-white/40" style={{ fontSize: size * 0.11 }}>/ 10</span>
        {label && <span className="mt-1.5 font-semibold uppercase tracking-widest text-white/50" style={{ fontSize: Math.max(9, size * 0.065) }}>{label}</span>}
      </span>
    </span>
  );
}

/** Number + label + detail, side by side, with the stars on their own line under them.
 *  The stars get the card's full width: beside the label they pushed a two-column card
 *  wider than a phone screen (found by measuring at 360px, not by reading the code). */
export function RatingRow({ value, exact, label, detail, size = "md", outOf = false, className = "" }) {
  return (
    <div className={`min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 ${className}`}>
      <div className="flex items-start gap-2.5">
        <RatingNumber value={value} exact={exact} size={size} outOf={outOf} />
        <span className="min-w-0">
          <span className="block text-[12px] font-semibold text-white/90">{label}</span>
          {detail ? <span className="block text-[11px] leading-snug text-white/60">{detail}</span> : null}
        </span>
      </div>
      <RatingStars value={value} exact={exact} size={size === "xl" ? "lg" : "sm"} className="mt-1.5" />
      {starPercent(exact ?? value) != null && (
        <span aria-hidden="true" className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
          <span className={`block h-full rounded-full bg-current ${ratingTone(exact ?? value)}`} style={{ width: `${starPercent(exact ?? value)}%` }} />
        </span>
      )}
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

/** The mockup's breakdown: one row per dimension, name on the left, "9.4/10" on the right in the
 *  rating's own colour, a bar under them, and the coach's reason under that. Same tone and one-decimal
 *  rule as every other rating; a dimension with no number draws nothing (never a bar that reads as 0). */
export function RatingBreakdown({ rows }) {
  const shown = (rows || []).filter((r) => starPercent(r.exact ?? r.value) != null);
  if (!shown.length) return null;
  return (
    <div className="space-y-2">
      {shown.map((r) => {
        const v = r.exact ?? r.value;
        return (
          <div key={r.key} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-[15px] font-semibold text-white">{r.label}</span>
              <span className={`shrink-0 font-display text-[15px] font-extrabold tabular-nums ${ratingTone(v)}`}>
                {ratingText(r.exact, r.value)}<span className="text-white/35">/10</span>
              </span>
            </div>
            <span aria-hidden="true" className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
              <span className={`block h-full rounded-full bg-current ${ratingTone(v)}`} style={{ width: `${starPercent(v)}%` }} />
            </span>
            {r.detail ? <span className="mt-1.5 block text-[12px] leading-snug text-white/65">{r.detail}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
