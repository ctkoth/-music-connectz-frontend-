import { RatingNumber } from "./Rating.jsx";
import { spotlight } from "../goto.js";

// CoachZ best score: the highest overall each AI coach has given this member, on every profile. The list is
// the server's (`coach_best`, already filtered by the member's own visibility setting); a coach with no scored
// take is absent, and nothing renders at all when there is nothing to show — never a "0" and never an
// invented score. `best` is the number the member was SHOWN, drawn the house way (RatingNumber).
export default function CoachBest({ rows, className = "", audience = "" }) {
  const list = (rows || []).filter((r) => r && r.best != null);
  if (!list.length) return null;
  return (
    <section aria-label="CoachZ best score" className={`rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 ${className}`}>
      <p className="text-[12px] font-bold uppercase tracking-widest text-white/70">CoachZ best score</p>
      <ul className="mt-1.5 divide-y divide-white/10">
        {list.map((r) => (
          <li key={r.app} className="flex items-center justify-between gap-3 py-1.5">
            <span className="min-w-0 truncate text-[14px] text-white/85">{r.emoji} {r.label}
              <span className="ml-2 text-[11px] text-white/50">{r.takes} take{r.takes === 1 ? "" : "s"} scored</span></span>
            <RatingNumber value={r.best} size="md" outOf />
          </li>
        ))}
      </ul>
      {/* Owner only: who sees this is the member's own setting, and the control that sets it is one tap away. */}
      {audience && (
        <p className="mt-1.5 text-[12px] text-white/60">
          Visible to <b className="text-white/85">{audience}</b> ·{" "}
          <button type="button" className="underline" onClick={() => spotlight("visibility")}>Change who sees this</button>
        </p>
      )}
    </section>
  );
}
