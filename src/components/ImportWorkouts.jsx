// Bring routines or logged workouts in from a CSV / pasted text. The parsing is
// workoutImport.js; this only shows what it understood BEFORE anything is saved
// (what will be created, what was not recognised) and then posts through the
// same endpoints the rest of BodieZ uses. Importing is free and open to every
// tier. StatZ members additionally map the columns by hand, which matters only
// for an export the auto-detect does not know — a tier says how much control,
// never whether somebody can bring their own history. No resource moves here.
import { useMemo, useState } from "react";
import { api } from "../api.js";
import { getUnit } from "../weightUnit.js";
import { useStatzTrial } from "./StatzSample.jsx";
import { FIELDS, parseWorkouts, resolveRows, toRoutines, toWorkouts } from "../workoutImport.js";

export default function ImportWorkouts({ exercises, onImported, muscles = {}, equipment = {} }) {
  const { s } = useStatzTrial();
  const canMap = !!(s?.is_statz || s?.active);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [mapping, setMapping] = useState(null);
  const [unit, setUnit] = useState(getUnit());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  // Missing names the member chooses to keep as their OWN exercises: the server
  // needs a muscle and equipment for each, and defaults the rest cautiously
  // (standing, needs arms and legs), so a custom lift is hidden from a member
  // it would not suit rather than offered to them.
  const [mine, setMine] = useState({});
  const [err, setErr] = useState("");

  const parsed = useMemo(() => parseWorkouts(text, { mapping }), [text, mapping]);
  const { matched, missing } = useMemo(() => resolveRows(parsed.rows, exercises), [parsed, exercises]);
  const effUnit = parsed.unit || unit;
  const hasDates = matched.some((r) => r.date);

  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMapping(null); setText(await f.text());
  };

  const addMine = async () => {
    setBusy(true); setErr(""); setMsg("");
    let made = 0; const failed = [];
    for (const name of missing) {
      const d = mine[name] || {};
      if (!d.muscle_group || !d.equipment) { failed.push(`${name}: pick a muscle and equipment`); continue; }
      try {
        await api("/api/economy/bodiez/exercises/custom/", { method: "POST", body: { name, ...d, positions: ["standing"] } });
        made += 1;
      } catch (e) { failed.push(`${name}: ${e.message}`); }
    }
    setBusy(false);
    setMsg(made ? `Added ${made} of your own exercise${made === 1 ? "" : "s"}. They're private to you.` : "");
    if (failed.length) setErr(failed.join("; "));
    if (made) onImported?.();
  };

  const redeem = async () => {
    setBusy(true); setErr(""); setMsg("");
    try {
      const r = await api("/api/economy/bodiez/routines/redeem/", { method: "POST", body: { code: code.trim() } });
      setMsg(`Added “${r.title}” to your routines.${r.left_out ? ` ${r.left_out} lift${r.left_out === 1 ? " was" : "s were"} left out — they're the sender's own exercises.` : ""}`);
      setCode(""); onImported?.();
    } catch (e) { setErr(e.message || "That code didn't work."); }
    finally { setBusy(false); }
  };

  const run = async (kind) => {
    setBusy(true); setErr(""); setMsg("");
    let made = 0; const failed = [];
    try {
      if (kind === "routines") {
        for (const r of toRoutines(matched, effUnit)) {
          try { await api("/api/economy/bodiez/routines/", { method: "POST", body: { ...r, bucket: "inbox", source: "member" } }); made += 1; }
          catch (e) { failed.push(`${r.title}: ${e.message}`); }
        }
      } else {
        const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        for (const w of toWorkouts(matched, effUnit, today)) {
          try { await api("/api/economy/bodiez/sessions/past/", { method: "POST", body: w }); made += 1; }
          catch (e) { failed.push(`${w.date}: ${e.message}`); }
        }
      }
      setMsg(`Imported ${made} ${kind === "routines" ? "routine" : "workout"}${made === 1 ? "" : "s"}.${
        failed.length ? ` ${failed.length} failed — ${failed.join("; ")}` : ""}`);
      if (made) { setText(""); onImported?.(); }
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs" onClick={() => setOpen(true)}>
        Import routines or workouts
      </button>
    );
  }
  return (
    <div className="re-card space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Import</p>
        <button className="text-xs text-white/50 hover:text-white" onClick={() => setOpen(false)}>Close</button>
      </div>
      <p className="text-[11px] text-white/50">
        Paste a CSV/TSV export (Strong, Hevy, Jefit, a spreadsheet) or lines like “Bench Press 3x10 60”.
        Exercises not in the library are listed, never guessed. Nothing is saved until you choose below. Free.
      </p>
      <input type="file" accept=".csv,.tsv,.txt,text/*" onChange={pickFile} className="text-xs text-white/60" aria-label="Choose a file" />
      <textarea className="neon-input w-full text-xs" rows={5} aria-label="Pasted workouts" value={text}
                onChange={(e) => { setText(e.target.value); setMapping(null); }} placeholder="Paste here…" />

      {text && parsed.header.length > 0 && (
        canMap ? (
          <div className="space-y-1">
            <p className="re-label">Columns <span className="normal-case text-white/30">· StatZ: match them yourself</span></p>
            <div className="flex flex-wrap gap-2">
              {FIELDS.map((f) => (
                <label key={f} className="text-[11px] text-white/60">{f}
                  <select className="ml-1 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-xs text-white"
                          value={(mapping || parsed.columns || {})[f] ?? ""}
                          onChange={(e) => {
                            const base = { ...(mapping || parsed.columns || {}) };
                            if (e.target.value === "") delete base[f]; else base[f] = Number(e.target.value);
                            setMapping(base);
                          }}>
                    <option value="">—</option>
                    {parsed.header.map((h, i) => <option key={i} value={i}>{h || `col ${i + 1}`}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-white/40">Columns were matched automatically. StatZ lets you pick them by hand for an export this misreads.</p>
        )
      )}

      {text && (
        <>
          <label className="text-[11px] text-white/60">Weights are in
            <select className="ml-1 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-xs text-white"
                    value={effUnit} disabled={!!parsed.unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="kg">kg</option><option value="lb">lb</option>
            </select>
            {parsed.unit && <span className="ml-1 text-white/35">(the file says so)</span>}
          </label>
          <p className="text-xs text-white/70">
            Understood {matched.length} line{matched.length === 1 ? "" : "s"}.
            {missing.length > 0 && <span className="text-mcz-ember"> Not in the library, left out: {missing.join(", ")}.</span>}
          </p>
          {missing.length > 0 && (
            <div className="space-y-1 rounded-lg bg-white/[0.03] p-2">
              <p className="text-[11px] text-white/50">Keep them as your own exercises (private to you) — say what each works:</p>
              {missing.map((n) => (
                <div key={n} className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
                  <span className="min-w-0 flex-1 truncate">{n}</span>
                  <select aria-label={`${n} muscle`} className="rounded border border-white/10 bg-black/40 px-1 py-0.5 text-xs text-white"
                          value={mine[n]?.muscle_group || ""} onChange={(e) => setMine({ ...mine, [n]: { ...mine[n], muscle_group: e.target.value } })}>
                    <option value="">muscle…</option>
                    {Object.entries(muscles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select aria-label={`${n} equipment`} className="rounded border border-white/10 bg-black/40 px-1 py-0.5 text-xs text-white"
                          value={mine[n]?.equipment || ""} onChange={(e) => setMine({ ...mine, [n]: { ...mine[n], equipment: e.target.value } })}>
                    <option value="">equipment…</option>
                    {Object.entries(equipment).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              ))}
              <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" disabled={busy} onClick={addMine}>Add as my exercises</button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="neon-btn-primary !w-auto px-3 py-2 text-xs" disabled={busy || !matched.length} onClick={() => run("routines")}>
              Save as routine{toRoutines(matched, effUnit).length === 1 ? "" : "s"} ({toRoutines(matched, effUnit).length})
            </button>
            <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs" disabled={busy || !matched.length} onClick={() => run("workouts")}
                    title={hasDates ? "One logged workout per date" : "No dates in the file — logged as today"}>
              Log as workout{toWorkouts(matched, effUnit, "t").length === 1 ? "" : "s"} ({toWorkouts(matched, effUnit, "t").length})
            </button>
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
        <input className="neon-input !py-1.5 min-w-0 flex-1 text-xs" aria-label="Share code" placeholder="Got a routine code from a friend? Paste it"
               value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" disabled={busy || !code.trim()} onClick={redeem}>Add it</button>
      </div>
      {msg && <p className="text-xs text-emerald-300">{msg}</p>}
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}
