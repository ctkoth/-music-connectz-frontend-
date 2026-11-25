// Find an FX chain without scrolling a hundred and thirty options: type to search, and the chains written for
// this kind of track (its role) come first. Applying replaces the track's effects; Undo brings them back, and the
// screen says so before the press. StatZ chains show locked, with the way to try them, when the plan lacks them.
import { useMemo, useState } from "react";
import { STARTERS, chainToInserts } from "./tonePresets.js";
import { PLUGINS } from "./plugins.js";
import { roleOfTrack, searchChains, suitsRole } from "./chainSearch.js";

const PAGE = 30;

export default function FxChainBrowser({ track, onInserts, statzOk = true }) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [msg, setMsg] = useState("");
  const [pct, setPct] = useState(100);     // StatZ: how much of the whole chain is heard (50 = half as present)
  const role = roleOfTrack(track);
  const [group, setGroup] = useState("");
  const found = useMemo(() => searchChains(STARTERS, q, role), [q, role]);
  // Types, in the order they first appear (the ones suiting this track lead), each with how many the search left.
  const groups = useMemo(() => { const m = new Map(); for (const s of found) m.set(s.group, (m.get(s.group) || 0) + 1); return [...m]; }, [found]);
  const list = useMemo(() => {
    const sel = found.filter((s) => !group || s.group === group);
    return groups.flatMap(([g]) => sel.filter((s) => s.group === g));
  }, [found, groups, group]);
  const apply = (s) => {
    if (s.statz && !statzOk) { setMsg(`🔒 ${s.name} is a StatZ chain. Try StatZ free from the sample, or pick another.`); return; }
    const amt = statzOk ? pct : 100;
    onInserts(track.id, chainToInserts(s.chain()).map((i) => {
      if (amt >= 100) return i;
      // An effect with its own mix is blended by that mix, scaled; every other effect by the blend on the insert.
      return PLUGINS[i.type]?.params?.mix ? { ...i, params: { ...i.params, mix: Math.round(i.params.mix * amt / 100) } } : { ...i, amount: amt };
    }));
    setMsg(`${s.name} is on ${track.name}, in place of its effects (Undo brings them back).`);
  };
  return (
    <div className="space-y-1" data-testid="fx-chain-browser">
      <input className="neon-input w-full" type="search" value={q} placeholder={`Search ${STARTERS.length} FX chains — "drum bus", "vocal", "warm"…`}
             aria-label="Search FX chains" onChange={(e) => { setQ(e.target.value); setShown(PAGE); setMsg(""); }} />
      <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Chain types">
        <button type="button" aria-pressed={!group} className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${!group ? "border-mcz-gold text-mcz-gold" : "border-white/20 text-white/70"}`} onClick={() => { setGroup(""); setShown(PAGE); }}>All ({found.length})</button>
        {groups.map(([g, n]) => (
          <button key={g} type="button" aria-pressed={group === g} className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${group === g ? "border-mcz-gold text-mcz-gold" : "border-white/20 text-white/70"}`} onClick={() => { setGroup(g); setShown(PAGE); }}>{g} ({n})</button>
        ))}
      </div>
      <label className={`flex items-center gap-2 text-xs ${statzOk ? "text-white/80" : "text-white/40"}`}
             title={statzOk ? "How much of the whole chain is heard against the untouched sound when you apply it. 50% is half as present." : "StatZ: apply any chain at a set percentage"}>
        Apply at {statzOk ? pct : 100}%{!statzOk && " 🔒 StatZ"}
        <input type="range" min={0} max={100} step={5} value={statzOk ? pct : 100} disabled={!statzOk} aria-label="Chain amount" onChange={(e) => setPct(Number(e.target.value))} />
        <span className="text-white/55">you can still change each effect after</span>
      </label>
      <ul className="max-h-48 space-y-1 overflow-y-auto" aria-label="FX chains">
        {list.slice(0, shown).map((s, i, a) => (
          <li key={s.key}>
            {(i === 0 || a[i - 1].group !== s.group) && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-mcz-gold">{s.group}</p>}
            <button type="button" className="w-full rounded border border-white/10 px-2 py-1 text-left hover:border-mcz-gold" onClick={() => apply(s)}>
              <span className="min-w-0">
                <span className="font-semibold">{s.name}{s.statz && !statzOk ? " 🔒" : ""}</span>
                {suitsRole(s, role) && <span className="ml-1 text-emerald-300">suits this track</span>}
                <span className="block text-white/60">{s.what}</span>
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
