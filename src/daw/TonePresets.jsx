// The Tone control on a channel strip: put a saved tone on this track, or save this track's chain as
// one. The member's presets and the ceiling are the server's (/api/economy/tonez/); the starters are
// built in (tonePresets.js). Applying replaces the track's effects (Undo brings them back) and costs
// nothing; saving costs nothing and counts against the tier's ceiling, said beside the button.
import { useCallback, useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { STARTERS, chainToInserts, insertsToChain, presetRoom } from "./tonePresets.js";

export function useTonePresets() {
  const [state, setState] = useState(null);     // GET /tonez/: { presets, count, limit, full, ladder, who }
  const [failed, setFailed] = useState(false);
  useEffect(() => { api("/api/economy/tonez/").then(setState).catch(() => setFailed(true)); }, []);
  const save = useCallback(async (name, inserts, id) => {
    const d = await api("/api/economy/tonez/", { method: "POST", body: { name, chain: insertsToChain(inserts), ...(id ? { id } : {}) } });
    setState(d);
    return d.preset;
  }, []);
  const remove = useCallback(async (id) => { setState(await api(`/api/economy/tonez/${id}/`, { method: "DELETE" })); }, []);
  return { state, failed, save, remove };
}

export default function TonePicker({ tones, inserts, onApply, trackName }) {
  const { state, failed, save, remove } = tones;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const room = presetRoom(state);
  const mine = state?.presets || [];
  const same = mine.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());

  const pick = (value) => {
    setErr(""); setMsg("");
    const [kind, key] = value.split(":");
    if (kind === "s") {
      const s = STARTERS.find((x) => x.key === key);
      if (s) { onApply(chainToInserts(s.chain())); setMsg(`${s.name}: ${s.what} It replaced this track's effects (Undo brings them back).`); }
    } else if (kind === "m") {
      const p = mine.find((x) => String(x.id) === key);
      if (p) { onApply(chainToInserts(p.chain)); setMsg(`${p.name} is on ${trackName}, in place of its effects (Undo brings them back).`); }
    }
  };
  const doSave = async () => {
    setErr(""); setMsg("");
    try {
      const p = await save(name.trim(), inserts, same?.id);
      setMsg(`Saved "${p.name}". It's in the Tone menu of every track, in every DAW.`);
      setSaving(false); setName("");
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="space-y-1">
      <select className="w-full rounded bg-white/10 px-1 py-0.5 text-white/80" data-nomemo="true" value=""
              aria-label={`Put a tone on ${trackName}`} title="Replaces this track's effects — Undo brings them back" onChange={(e) => pick(e.target.value)}>
        <option value="">🎛️ Tone…</option>
        {mine.length > 0 && (
          <optgroup label="Your presets">
            {mine.map((p) => <option key={p.id} value={`m:${p.id}`}>{p.name}</option>)}
          </optgroup>
        )}
        <optgroup label="Voice starters (built in)">
          {STARTERS.map((s) => <option key={s.key} value={`s:${s.key}`}>{s.name}</option>)}
        </optgroup>
      </select>
      {!failed && (saving ? (
        <div className="space-y-1 rounded bg-black/40 p-1">
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
          <Save size={10} /> Save this tone <span className="ml-auto text-white/40">{room.line}</span>
        </button>
      ))}
      {!room.ok && !saving && state && (
        <p className="text-mcz-gold">
          Your plan keeps {state.limit} — update or delete one, or Premium keeps {state.ladder?.premium ?? 6}, StatZ unlimited.{" "}
          <button type="button" className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Plans</button>
        </p>
      )}
      {msg && <p className="text-emerald-300">{msg}</p>}
      {err && <p className="text-mcz-ember">{err}</p>}
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
