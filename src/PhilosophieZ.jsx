// PhilosophieZ — a declared philosophy and a declared political outlook, set in ProfileZ and filtered
// from the one member search. Both are declarations, never scores: neither list is ranked (the server
// serves them alphabetically), nothing is guessed from what a member does, and picking a word never moves
// a rating or a skill level.
//
// Both lists come from `GET /api/economy/philosophiez/`. This file types no philosophy and no political
// word. A failed fetch renders nothing — the same rule ReligionZ follows, so a 500 reads as "not switched
// on" rather than "broken".
//
// WHO CAN SEE EACH IS SAID BEFORE ANYTHING IS PICKED, read from the member's own settings (never assumed).
// Politics is private until they open it, and that is the sentence they need before choosing, not after.
import { useEffect, useState } from "react";
import { api } from "./api.js";
import { goToSpot } from "./goto.js";
import { labelMap, toggleKey, whoSees } from "./philosophiez.js";

export function usePhilosophieLists() {
  const [d, setD] = useState(null);
  useEffect(() => {
    let on = true;
    api("/api/economy/philosophiez/", { auth: false }).then((x) => on && setD(x)).catch(() => {});
    return () => { on = false; };
  }, []);
  return d;
}

function Pick({ label, hint, who, value, onChange, rows, emoji }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/45">
        <span aria-hidden>{emoji}</span> {label}
      </label>
      {who && (
        <p className="text-[11px] text-white/55">
          Who can see this: <span className="font-semibold text-white/80">{who}</span>.{" "}
          <button type="button" className="re-link" onClick={() => goToSpot("profilez", "visibility")}>Change who</button>
        </p>
      )}
      {hint && <p className="text-[11px] text-white/40">{hint}</p>}
      <select className="neon-input text-sm" value={value || ""} onChange={(e) => onChange(e.target.value)}
        data-nomemo="true" aria-label={label}>
        <option value="">— hasn't said —</option>
        {rows.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
      </select>
    </div>
  );
}

export default function PhilosophieZ({ philosophy, politics, onPhilosophy, onPolitics, visibility, audiences }) {
  const d = usePhilosophieLists();
  if (!d) return null;
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        <span aria-hidden>⚖️</span> PhilosophieZ — thoughtZ &amp; PoliticZ
      </p>
      <p className="text-[11px] leading-relaxed text-white/40">{d.note} Religion and spirituality live in ReligionZ above.</p>
      <Pick emoji="🧠" label="Philosophy" rows={d.philosophies} value={philosophy} onChange={onPhilosophy}
        who={whoSees(visibility, audiences, "philosophy")} />
      <Pick emoji="🗳️" label="Political outlook" rows={d.politics} value={politics} onChange={onPolitics}
        who={whoSees(visibility, audiences, "politics")} hint={d.politics_note} />
    </div>
  );
}

/** The search filter: chips for each list, OR within a list, undeclared never matches. */
export function PhilosophieFilter({ philosophies, politics, onChange }) {
  const d = usePhilosophieLists();
  if (!d) return null;
  const Group = ({ title, rows, field, value }) => (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-white/30">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((o) => (
          <button key={o.key} type="button"
            onClick={() => onChange({ philosophies, politics, [field]: toggleKey(value, o.key) })}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
              value.includes(o.key) ? "border-mcz-pink/70 bg-mcz-pink/10 text-white shadow-neon"
                : "border-white/10 bg-black/30 text-white/60 hover:bg-white/5"}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/45">
        ⚖️ PhilosophieZ {philosophies.length + politics.length ? `· ${philosophies.length + politics.length} on` : ""}
      </p>
      <Group title="Philosophy" rows={d.philosophies} field="philosophies" value={philosophies} />
      <Group title="Political outlook — only members who opened theirs appear" rows={d.politics} field="politics" value={politics} />
    </div>
  );
}

export { labelMap };
