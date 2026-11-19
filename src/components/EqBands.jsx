// The band editor shared by TrackZ's channel strip and every DAW's EQ effect: one row per band (type,
// frequency, gain, and width for a bell), "Add a band" while the plan has room, and the count beside it.
// How many is the tier's (`eq_bands`: Free 3, Premium 6, StatZ unlimited — src/eqbands.js); an EQ already
// over the count keeps every band and can still change or remove them, it just cannot add.
import { Lock, Plus, X } from "lucide-react";
import { goToSpot } from "../goto.js";
import { IN_SHELL } from "../standalone.js";
import { BAND_TYPES, F, Q, bandRoom, fmtHz, newBand } from "../eqbands.js";

const toLog = (f) => Math.log(f / F.min) / Math.log(F.max / F.min);
const fromLog = (x) => Math.round(F.min * Math.pow(F.max / F.min, x));
const sdb = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Number(v)).toFixed(1)} dB`;

export default function EqBands({ bands, onChange, gainMax = 12, cap, nextCap, name = "EQ", note = "", compact = false }) {
  const room = bandRoom(bands.length, cap);
  const set = (i, patch) => onChange(bands.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-white/50">
        <span>EQ bands</span>
        <span className="tabular-nums">
          {cap === null ? `${bands.length} · unlimited on your plan` : cap !== undefined ? `${bands.length} of ${cap}` : `${bands.length}`}
        </span>
      </div>
      {bands.map((b, i) => (
        <div key={i} className={`grid gap-2 rounded bg-white/5 p-2 ${compact ? "" : "sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"}`}>
          <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" value={b.type}
            aria-label={`${name} band ${i + 1} type`} onChange={(e) => set(i, { type: e.target.value })}>
            {Object.entries(BAND_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
          <label className="block min-w-0 text-[11px] text-white/60">
            <span className="flex justify-between"><span>Frequency</span><span className="tabular-nums text-white/80">{fmtHz(b.f)}</span></span>
            <input type="range" className="w-full" min={0} max={1} step={0.002} value={toLog(b.f)}
              aria-label={`${name} band ${i + 1} frequency`} aria-valuetext={fmtHz(b.f)}
              onChange={(e) => set(i, { f: fromLog(Number(e.target.value)) })} />
          </label>
          <label className="block min-w-0 text-[11px] text-white/60">
            <span className="flex justify-between"><span>Gain</span><span className="tabular-nums text-white/80">{sdb(b.gain)}</span></span>
            <input type="range" className="w-full" min={-gainMax} max={gainMax} step={0.5} value={b.gain}
              aria-label={`${name} band ${i + 1} gain`} onChange={(e) => set(i, { gain: Number(e.target.value) })}
              onDoubleClick={() => set(i, { gain: 0 })} />
            {b.type === "peaking" && (
              <span className="mt-1 flex items-center gap-2">
                <span className="shrink-0">Width</span>
                <input type="range" className="w-full" min={Q.min} max={Q.max} step={0.1} value={b.q}
                  aria-label={`${name} band ${i + 1} width (Q)`} onChange={(e) => set(i, { q: Number(e.target.value) })} />
                <span className="shrink-0 whitespace-nowrap tabular-nums text-white/80">Q {Number(b.q).toFixed(1)}</span>
              </span>
            )}
          </label>
          <button className="justify-self-end text-white/55 hover:text-mcz-ember" aria-label={`Remove ${name} band ${i + 1}`}
            onClick={() => onChange(bands.filter((_, k) => k !== i))}><X size={14} /></button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {room.ok ? (
          <button className="re-btn !w-auto px-3 text-xs" onClick={() => onChange([...bands, newBand(bands)])}>
            <Plus size={13} /> Add a band{room.left != null ? ` (${room.left} left)` : ""}
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-1 text-mcz-gold">
            <Lock size={12} />
            {cap != null && bands.length > cap ? `${bands.length} bands, over your plan's ${cap}: every one keeps playing; remove some to add new ones` : `${cap ?? bands.length} bands is ${cap != null ? "your plan's limit" : "the most an EQ holds"}`}
            {cap != null && (nextCap ? ` — Premium has ${nextCap}, StatZ unlimited.` : " — StatZ is unlimited.")}
            {cap != null && !IN_SHELL && <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>See plans</button>}
          </span>
        )}
        {note && <span className="text-white/55">{note}</span>}
      </div>
    </div>
  );
}
