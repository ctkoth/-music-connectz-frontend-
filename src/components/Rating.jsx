import { SIZES, ratingText, ratingTone } from "../rating.js";

// The one way a rating is drawn. A LARGE number, and beside it what it is and why:
// label on top, the detail under. Used by the coach result, LogZ, the history, the
// coaching board, the post read card and the progress findings, so a rating looks
// the same wherever it turns up — and none of them can show a number alone.

/** Just the number, coloured, with an optional "/10". */
export function RatingNumber({ value, exact, size = "lg", outOf = false, className = "" }) {
  return (
    <span className={`font-display ${SIZES[size] || SIZES.lg} font-extrabold leading-none tabular-nums ${ratingTone(exact ?? value)} ${className}`}>
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
