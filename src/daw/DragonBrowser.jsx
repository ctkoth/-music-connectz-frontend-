// Studio Dragon's browser: effects, tones and loops, each one drag-and-drop onto a track (an effect or tone onto a track's header,
// a loop onto a lane where it should start) and each one also a button for anybody who is not dragging (a phone, a keyboard).
// It decides nothing: what a drop DOES is Workspace's (the same inserts, tones and imports every DAW already has), and what a plan
// allows is the ladder's: StatZ effects and the loops past the plan's count show locked, with the plan that has them.
import { useEffect, useMemo, useState } from "react";
import { Lock, Plus, Search } from "lucide-react";
import { PLUGINS } from "./plugins.js";
import { STARTERS } from "./tonePresets.js";
import { loopCatalogue, allowedLoops } from "./loops.js";
import { loadLimits } from "../limits.js";
import { DRAG_MIME, encode } from "./dragPayload.js";
import { useTonePresets } from "./TonePresets.jsx";

const TABS = [["effects", "Effects"], ["tones", "Tones"], ["loops", "Loops"]];

function Item({ label, hint, locked, payload, onAdd, addLabel }) {
  return (
    <div draggable={!locked} onDragStart={(e) => { if (locked) { e.preventDefault(); return; } e.dataTransfer.setData(DRAG_MIME, encode(payload)); e.dataTransfer.effectAllowed = "copy"; }}
         className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${locked ? "cursor-not-allowed border-white/5 text-white/35" : "cursor-grab border-white/10 bg-white/5 text-white/85 hover:border-mcz-cyan/50 active:cursor-grabbing"}`}
         title={locked ? hint : `Drag onto a track. ${hint || ""}`.trim()}>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {locked ? <Lock size={11} className="shrink-0" aria-label="Locked on your plan" /> : (
        <button type="button" className="shrink-0 rounded p-0.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label={addLabel} title={addLabel} onClick={onAdd}><Plus size={12} /></button>
      )}
    </div>
  );
}

export default function DragonBrowser({ tracks, statzOk, onTones, onEffect, onTone, onLoop }) {
  const tones = useTonePresets();
  useEffect(() => { onTones?.(tones.state); }, [tones.state]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState("effects");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState("");
  const [lim, setLim] = useState(null);
  const [fam, setFam] = useState("Drums");
  useEffect(() => { loadLimits().then(setLim).catch(() => {}); }, []);
  const to = tracks.find((t) => t.id === target)?.id || tracks[0]?.id || "";
  const cap = lim && "imagez_layers" in lim ? lim.imagez_layers : null;
  const okLoops = useMemo(() => allowedLoops(cap), [cap]);
  const loops = useMemo(() => loopCatalogue(), []);
  const mine = (tones?.state?.presets || []).filter((p) => p.kind === "tone");
  const match = (s) => !q.trim() || String(s).toLowerCase().includes(q.trim().toLowerCase());
  const families = [...new Set(loops.map((l) => l.family))];
  const trackName = tracks.find((t) => t.id === to)?.name || "a track";

  return (
    <aside className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-2" data-tour="dragon-browser" aria-label="Browser">
      <div className="flex gap-1" role="tablist" aria-label="Browser">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`flex-1 rounded-lg px-2 py-1 text-xs ${tab === k ? "bg-mcz-cyan/25 text-white" : "bg-white/5 text-white/60"}`}>{label}</button>
        ))}
      </div>
      <label className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-white/60"><Search size={12} />
        <input className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/35" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the browser" />
      </label>
      {tab !== "loops" && (
        <label className="flex items-center gap-1 text-[11px] text-white/60">Add to
          <select className="neon-input !w-auto min-w-0 flex-1 !py-0.5 text-xs" data-nomemo="true" value={to} onChange={(e) => setTarget(e.target.value)} aria-label="Track the + buttons add to">
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      )}
      <p className="text-[10px] text-white/45">
        {tab === "effects" && "Drag an effect onto a track's name, or press + to add it to the track above."}
        {tab === "tones" && "A tone is a whole chain of effects. Drop it on a track to replace what is on it (Undo brings it back)."}
        {tab === "loops" && "Drag a loop onto a track where it should start, or press + to put it on a new track at the playhead. Made at the session's tempo and key."}
      </p>

      <div className="max-h-[26rem] space-y-1 overflow-y-auto pr-0.5">
        {tab === "effects" && (<>
          {[["Free", false], ["StatZ", true]].map(([g, statz]) => {
            const rows = Object.entries(PLUGINS).filter(([, p]) => !!p.statz === statz && match(p.label));
            return rows.length ? (
              <div key={g} className="space-y-1"><p className="pt-1 text-[10px] uppercase tracking-wider text-white/45">{g}</p>
                {rows.map(([type, p]) => (
                  <Item key={type} label={`${p.emoji || "🎛️"} ${p.label}`} locked={statz && !statzOk} hint={statz && !statzOk ? "A StatZ effect. Try StatZ free from MembershipZ." : ""}
                        payload={{ kind: "effect", type }} addLabel={`Add ${p.label} to ${trackName}`} onAdd={() => onEffect(to, type)} />
                ))}</div>
            ) : null;
          })}
        </>)}
        {tab === "tones" && (<>
          {mine.filter((p) => match(p.name)).length > 0 && (
            <div className="space-y-1"><p className="pt-1 text-[10px] uppercase tracking-wider text-white/45">Mine</p>
              {mine.filter((p) => match(p.name)).map((p) => (
                <Item key={p.id} label={`⭐ ${p.name}`} payload={{ kind: "tone", source: "mine", id: p.id }} addLabel={`Put ${p.name} on ${trackName}`} onAdd={() => onTone(to, { source: "mine", id: p.id })} />
              ))}</div>
          )}
          {[...new Set(STARTERS.map((s) => s.group || "Starters"))].map((g) => {
            const rows = STARTERS.filter((s) => (s.group || "Starters") === g && match(`${s.name} ${g}`));
            return rows.length ? (
              <div key={g} className="space-y-1"><p className="pt-1 text-[10px] uppercase tracking-wider text-white/45">{g}</p>
                {rows.map((s) => (
                  <Item key={s.key} label={s.name} hint={s.what} payload={{ kind: "tone", source: "starter", key: s.key }} addLabel={`Put ${s.name} on ${trackName}`} onAdd={() => onTone(to, { source: "starter", key: s.key })} />
                ))}</div>
            ) : null;
          })}
        </>)}
        {tab === "loops" && (<>
          <div className="flex flex-wrap gap-1">{families.map((f) => (
            <button key={f} type="button" onClick={() => setFam(f)} className={`rounded-full border px-2 py-0.5 text-[11px] ${fam === f ? "border-mcz-cyan/60 bg-mcz-cyan/15 text-mcz-cyan" : "border-white/15 text-white/55"}`}>{f}</button>
          ))}</div>
          {loops.filter((l) => (q.trim() ? true : l.family === fam) && match(`${l.label} ${l.family}`)).map((l) => (
            <Item key={l.id} label={l.label} locked={!okLoops.has(l.id)} hint="More loops are on a higher plan." payload={{ kind: "loop", id: l.id }} addLabel={`Put ${l.label} on a new track`} onAdd={() => onLoop(l.id, null)} />
          ))}
        </>)}
      </div>
    </aside>
  );
}
