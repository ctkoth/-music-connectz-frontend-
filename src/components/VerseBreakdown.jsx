import FeatureIcon from "./FeatureIcon.jsx";
import { ratingTone } from "../rating.js";
import { RatingNumber, RatingStars } from "./Rating.jsx";
import { breakdownTable, compareLine } from "../coachParts.js";

// The song, section by section: every verse and chorus with its own grade, on every
// parameter the coach has, so a member can see which verse is stronger and where.
// The numbers, the parameter list and the comparison are the server's
// (`parts`, `part_factors`, `parts_compare`); this only lays them out. A cell the
// coach did not grade is a dash, never a 0, and one section alone names no winner.
export default function VerseBreakdown({ parts, factors, compare, part, className = "" }) {
  const t = breakdownTable(parts, factors);
  if (!t.sections.length) {
    return part?.label ? (
      <p className={`text-[11px] text-mcz-gold ${className}`}>
        The coach did not grade the sections one by one this time. The score above still covers your parts together.
      </p>
    ) : null;
  }
  const line = compareLine(compare);
  return (
    <div className={`space-y-2 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.05] p-3 ${className}`} data-testid="coach-parts" data-tour="bosstake-breakdown">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-mcz-cyan/80"><FeatureIcon name="versez" className="h-6 w-6" /> Verse by verse</p>
      {part?.label && (
        <p className="text-[11px] text-white/70">
          The score above is for <b className="text-white">your parts</b>: {part.label}. The song has its own score below.
        </p>
      )}
      {line && <p className="text-[12px] font-semibold text-white/85">{line}</p>}

      {/* One card per section: the grade large, its stars, and why. */}
      <div className="grid gap-2 sm:grid-cols-2">
        {t.sections.map((s, i) => (
          <div key={i} className={`min-w-0 rounded-lg border p-2.5 ${s.mine ? "border-mcz-cyan/50 bg-mcz-cyan/[0.06]" : "border-white/10 bg-white/[0.04]"}`}>
            <div className="flex items-start gap-2.5">
              <RatingNumber value={s.score} size="md" outOf />
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-white/90">{s.label}{s.mine ? " — yours" : ""}</span>
                {s.why ? <span className="block text-[11px] leading-snug text-white/60">{s.why}</span> : null}
              </span>
            </div>
            <RatingStars value={s.score} size="sm" className="mt-1.5" />
          </div>
        ))}
      </div>

      {/* Every parameter, section beside section. Scrolls sideways inside its own box on a phone. */}
      {t.rows.length > 1 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-x-2 border-spacing-y-0.5 text-[11px]">
            <thead>
              <tr>
                <th className="text-left font-normal text-white/40">Parameter</th>
                {t.sections.map((s, i) => (
                  <th key={i} className={`px-1 text-center font-semibold ${s.mine ? "text-mcz-cyan" : "text-white/70"}`}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r) => (
                <tr key={r.key}>
                  <td className={`whitespace-nowrap pr-2 ${r.key === "_overall" ? "font-semibold text-white/85" : "text-white/65"}`}>{r.label}</td>
                  {r.cells.map((v, i) => (
                    <td key={i} className={`rounded px-1 text-center tabular-nums ${v === null ? "text-white/25" : ratingTone(v)} ${r.best === i ? "bg-white/10 font-extrabold" : ""}`}
                        title={r.best === i ? `${t.sections[i].label} leads ${r.label}` : undefined}>
                      {v === null ? "—" : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] leading-relaxed text-white/35">
        A highlighted number leads that row. A dash means the coach had nothing in that section to grade it on.
        Each section is graded on its own, so two verses by the same artist can differ.
      </p>
    </div>
  );
}
