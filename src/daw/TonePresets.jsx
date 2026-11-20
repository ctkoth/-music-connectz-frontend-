// The Tone control on a channel strip: put a saved tone on this track, or save this track's chain as
// one. The member's presets and the ceiling are the server's (/api/economy/tonez/); the starters are
// built in (tonePresets.js). Applying replaces the track's effects (Undo brings them back) and costs
// nothing; saving costs nothing and counts against the tier's ceiling, said beside the button.
import { useCallback, useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { KIND_LABEL, STARTERS, chainNeedsStatz, chainToInserts, insertsToChain, presetRoom } from "./tonePresets.js";

export function useTonePresets() {
  const [state, setState] = useState(null);     // GET /tonez/: { presets, count, limit, full, ladder, who }
  const [failed, setFailed] = useState(false);
  useEffect(() => { api("/api/economy/tonez/").then(setState).catch(() => setFailed(true)); }, []);
  // `value` is a DAW insert list for "tone" / "fx", or the object itself for "master" (Mix ConnectZ's
  // settings) and "strip" (a TrackZ channel strip).
  const save = useCallback(async (name, value, id, kind = "tone") => {
    const chain = kind === "master" || kind === "strip" || kind === "vst" ? value : insertsToChain(value);
    const d = await api("/api/economy/tonez/", { method: "POST", body: { kind, name, chain, ...(id ? { id } : {}) } });
    setState(d);
    return d.preset;
  }, []);
  const remove = useCallback(async (id) => { setState(await api(`/api/economy/tonez/${id}/`, { method: "DELETE" })); }, []);
  return { state, failed, save, remove };
}

export default function TonePicker({ tones, inserts, onApply, trackName, statzOk = true, compact = false, placeholder = "🎛️ Tone…", ariaLabel }) {
  const { state, failed, save, remove } = tones;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("tone");      // save as a track TONE or a track FX chain — each has its own ceiling
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  // In the narrow track header the confirmation is one trimmed line that clears itself: a paragraph there grows the block
  // and pushes the FX button out of the track's visible height (found when a picked tone made FX vanish).
  useEffect(() => {
    if (!compact || (!msg && !err)) return undefined;
    const t = setTimeout(() => { setMsg(""); setErr(""); }, 7000);
    return () => clearTimeout(t);
  }, [compact, msg, err]);
  const room = presetRoom(state, kind);
  const all = (state?.presets || []).filter((p) => p.kind === "tone" || p.kind === "fx");
  const mine = all.filter((p) => p.kind === kind);
  const same = mine.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());

  const pick = (value) => {
    setErr(""); setMsg("");
    const [kind, key] = value.split(":");
    if (kind === "s") {
      const s = STARTERS.find((x) => x.key === key);
      if (s && s.statz && !statzOk) { setErr(`${s.name} uses StatZ's plugin-grade effects. Try StatZ free, or pick a starter without 🔒.`); return; }
      if (s) { onApply(chainToInserts(s.chain())); setMsg(`${s.name}: ${s.what} It replaced this track's effects (Undo brings them back).`); }
    } else if (kind === "m") {
      const p = all.find((x) => String(x.id) === key);
      if (p && chainNeedsStatz(p.chain) && !statzOk) { setErr(`"${p.name}" holds StatZ's plugin-grade effects, so it plays again with StatZ or the daily sample.`); return; }
      if (p) { onApply(chainToInserts(p.chain)); setMsg(`${p.name} is on ${trackName}, in place of its effects (Undo brings them back).`); }
    }
  };
  const doSave = async () => {
    setErr(""); setMsg("");
    try {
      const p = await save(name.trim(), inserts, same?.id, kind);
      setMsg(`Saved "${p.name}" as a ${KIND_LABEL[kind].toLowerCase()} preset. It's in the Tone menu of every track, in every DAW.`);
      setSaving(false); setName("");
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="space-y-1">
      <select className="w-full rounded bg-white/10 px-1 py-0.5 text-white/80 [color-scheme:dark]" data-nomemo="true" value=""
              aria-label={ariaLabel || `Put a tone on ${trackName}`} title="Replaces this track's effects — Undo brings them back" onChange={(e) => pick(e.target.value)}>
        <option value="">{placeholder}</option>
        {["tone", "fx"].map((k) => all.some((p) => p.kind === k) && (
          <optgroup key={k} label={`Your ${KIND_LABEL[k].toLowerCase()} presets`}>
            {all.filter((p) => p.kind === k).map((p) => <option key={p.id} value={`m:${p.id}`}>{p.name}</option>)}
          </optgroup>
        ))}
        {[...new Set(STARTERS.map((s) => s.group))].map((g) => (
          <optgroup key={g} label={`${g} starters (built in)`}>
            {STARTERS.filter((s) => s.group === g).map((s) => <option key={s.key} value={`s:${s.key}`}>{s.name}{s.statz && !statzOk ? " 🔒" : ""}</option>)}
          </optgroup>
        ))}
      </select>
      {!failed && !compact && (saving ? (
        <div className="space-y-1 rounded bg-black/40 p-1">
          <div className="flex gap-1" role="radiogroup" aria-label="Save as">
            {["tone", "fx"].map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k}
                      className={`flex-1 rounded px-1 py-0.5 ${kind === k ? "bg-mcz-cyan/30 text-white" : "bg-white/5 text-white/60"}`}
                      onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
            ))}
          </div>
          <p className="text-white/60">{presetRoom(state, kind).line} — each kind has its own room.</p>
          <input className="w-full rounded bg-white/10 px-1 py-0.5 text-white" placeholder="Name, e.g. My vocal" maxLength={60} autoFocus
                 value={name} onChange={(e) => setName(e.target.value)} aria-label="Preset name"
                 onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) doSave(); if (e.key === "Escape") setSaving(false); }} />
          <div className="flex items-center gap-1">
            <button type="button" className="rounded bg-mcz-cyan/30 px-1.5 py-0.5 text-white disabled:opacity-40"
                    disabled={!name.trim() || (!same && !room.ok)} onClick={doSave}>{same ? "Update it" : "Save"}</button>
            <button type="button" className="text-white/50" onClick={() => setSaving(false)}>Cancel</button>
            <span className="ml-auto text-emerald-300">free</span>
          </div>
          {same && <p className="text-white/50">Updates your "{same.name}" with this chain.</p>}
        </div>
      ) : (
        <button type="button" className="flex w-full items-center gap-1 rounded bg-white/5 px-1 py-0.5 text-white/70 hover:text-white disabled:opacity-40"
                disabled={!inserts.length} title={inserts.length ? "" : "Add an effect first"} onClick={() => { setSaving(true); setMsg(""); setErr(""); }}>
          <Save size={10} /> Save as a preset
        </button>
      ))}
      {!room.ok && saving && state && !same && (
        <p className="text-mcz-gold">
          Your plan keeps {state.limit} {KIND_LABEL[kind].toLowerCase()} presets — update or delete one, or Premium keeps {state.ladder?.premium ?? 6}, StatZ unlimited.{" "}
          <button type="button" className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Plans</button>
        </p>
      )}
      {msg && <p className={`text-emerald-300 ${compact ? "truncate" : ""}`} title={compact ? msg : undefined} role="status">{msg}</p>}
      {err && <p className={`text-mcz-ember ${compact ? "truncate" : ""}`} title={compact ? err : undefined} role="alert">{err}</p>}
      {saving && mine.length > 0 && (
        <ul className="space-y-0.5">
          {mine.map((p) => (
            <li key={p.id} className="flex items-center gap-1 text-white/60">
              <button type="button" className="min-w-0 flex-1 truncate text-left hover:text-white" title="Update this one" onClick={() => setName(p.name)}>{p.name}</button>
              <button type="button" aria-label={`Delete preset ${p.name}`} className="text-white/30 hover:text-mcz-ember"
                      onClick={() => { if (window.confirm(`Delete your "${p.name}" preset? Tracks already using it keep their effects.`)) remove(p.id).catch((e) => setErr(e.message)); }}>
                <Trash2 size={10} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
