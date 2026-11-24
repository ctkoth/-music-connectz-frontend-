// Find an FX chain without scrolling a hundred and thirty options: type to search, and the chains written for
// this kind of track (its role) come first. Applying replaces the track's effects; Undo brings them back, and the
// screen says so before the press. StatZ chains show locked, with the way to try them, when the plan lacks them.
import { useMemo, useState } from "react";
import { STARTERS, chainToInserts } from "./tonePresets.js";
import { roleOfTrack, searchChains, suitsRole } from "./chainSearch.js";

const PAGE = 30;

export default function FxChainBrowser({ track, onInserts, statzOk = true }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [msg, setMsg] = useState("");
  const role = roleOfTrack(track);
  const list = useMemo(() => searchChains(STARTERS, q, role), [q, role]);
  const apply = (s) => {
    if (s.statz && !statzOk) { setMsg(`🔒 ${s.name} is a StatZ chain. Try StatZ free from the sample, or pick another.`); return; }
    onInserts(track.id, chainToInserts(s.chain()));
    setMsg(`${s.name} is on ${track.name}, in place of its effects (Undo brings them back).`);
  };
  return (
    <div className="space-y-1" data-testid="fx-chain-browser">
      <input className="neon-input w-full" type="search" value={q} placeholder={`Search ${STARTERS.length} FX chains — "drum bus", "vocal", "warm"…`}
             aria-label="Search FX chains" onChange={(e) => { setQ(e.target.value); setShown(PAGE); setMsg(""); }} />
      <ul className="max-h-56 space-y-1 overflow-y-auto" aria-label="FX chains">
        {list.slice(0, shown).map((s) => (
          <li key={s.key}>
            <button type="button" className="re-btn !w-full !justify-start text-left" onClick={() => apply(s)}>
              <span className="min-w-0">
                <span className="font-semibold">{s.name}{s.statz && !statzOk ? " 🔒" : ""}</span>
                {suitsRole(s, role) && <span className="ml-1 text-emerald-300">suits this track</span>}
                <span className="block text-white/60">{s.group} · {s.what}</span>
              </span>
            </button>
          </li>
        ))}
        {!list.length && <li className="text-white/60">No chain matches "{q}". Clear the search to see all {STARTERS.length}.</li>}
      </ul>
      {list.length > shown && <button type="button" className="re-btn !w-auto px-2 py-0.5" onClick={() => setShown((n) => n + PAGE)}>Show more ({list.length - shown} left)</button>}
      {msg && <p className="text-white/70" role="status">{msg}</p>}
    </div>
  );
}
