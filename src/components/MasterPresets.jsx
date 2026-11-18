// Mix ConnectZ's mastering presets: the style, loudness, intensity, EQ trims, DynamicZ and VocalZ
// settings saved under a name ("Club loud", "My podcast") and put back on the controls in one tap.
// They are the member's on every device (/api/economy/tonez/, kind "master"), with their own ceiling
// — the tier's preset count, separate from DAW tones and FX. Free; nothing is mastered until Master it.
import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { goToSpot } from "../goto.js";
import { useTonePresets } from "../daw/TonePresets.jsx";
import { presetRoom } from "../daw/tonePresets.js";

export default function MasterPresets({ settings, onApply }) {
  const tones = useTonePresets();
  const { state, failed, save, remove } = tones;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  if (failed) return null;
  const mine = (state?.presets || []).filter((p) => p.kind === "master");
  const room = presetRoom(state, "master");
  const same = mine.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());

  const doSave = async () => {
    setErr(""); setMsg("");
    try {
      const p = await save(name.trim(), settings, same?.id, "master");
      setMsg(`Saved "${p.name}" — it's in this menu on every device.`);
      setSaving(false); setName("");
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs" data-tour="mixz-presets">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-white/80">Your mastering presets</h3>
        <span className="text-white/45">{room.line}</span>
        <span className="text-emerald-300">free</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" value="" aria-label="Put a mastering preset on the controls"
                disabled={!mine.length}
                onChange={(e) => { const p = mine.find((x) => String(x.id) === e.target.value); if (p) { onApply(p.chain); setMsg(`"${p.name}" is on the controls. Press Master it to hear it.`); } }}>
          <option value="">{mine.length ? "Use one of yours…" : "None saved yet"}</option>
          {mine.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {!saving && <button type="button" className="re-btn !w-auto px-3" onClick={() => { setSaving(true); setMsg(""); setErr(""); }}><Save size={13} /> Save these settings</button>}
      </div>
      {saving && (
        <div className="flex flex-wrap items-center gap-2">
          <input className="neon-input !w-48 !py-1 text-xs" placeholder="Name, e.g. Club loud" maxLength={60} autoFocus value={name}
                 aria-label="Preset name" onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) doSave(); if (e.key === "Escape") setSaving(false); }} />
          <button type="button" className="neon-btn-primary !w-auto px-3" disabled={!name.trim() || (!same && !room.ok)} onClick={doSave}>{same ? "Update it" : "Save"}</button>
          <button type="button" className="re-link" onClick={() => setSaving(false)}>Cancel</button>
          {!same && !room.ok && state && (
            <span className="text-mcz-gold">Your plan keeps {state.limit} mastering presets — update or delete one, or Premium keeps {state.ladder?.premium ?? 6}, StatZ unlimited.{" "}
              <button type="button" className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Plans</button></span>
          )}
        </div>
      )}
      {saving && mine.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {mine.map((p) => (
            <li key={p.id} className="flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-white/70">
              <button type="button" title="Update this one" onClick={() => setName(p.name)}>{p.name}</button>
              <button type="button" aria-label={`Delete preset ${p.name}`} className="text-white/30 hover:text-mcz-ember"
                      onClick={() => { if (window.confirm(`Delete your "${p.name}" mastering preset?`)) remove(p.id).catch((e) => setErr(e.message)); }}><Trash2 size={11} /></button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-white/40">Keeps how it sounds (style, loudness, intensity, EQ, DynamicZ, VocalZ). Your track presets in the DAWs have their own room.</p>
      {msg && <p className="text-emerald-300">{msg}</p>}
      {err && <p className="text-mcz-ember">{err}</p>}
    </div>
  );
}
