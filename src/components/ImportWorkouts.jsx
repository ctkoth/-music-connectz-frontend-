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

export default function ImportWorkouts({ exercises, onImported }) {
  const { s } = useStatzTrial();
  const canMap = !!(s?.is_statz || s?.active);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [mapping, setMapping] = useState(null);
  const [unit, setUnit] = useState(getUnit());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
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
      {msg && <p className="text-xs text-emerald-300">{msg}</p>}
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}
