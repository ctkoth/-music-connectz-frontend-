// Timing (StatZ, or the daily sample): line tracks up against a reference and catch a flipped polarity.
// Everything is measured on this device (`align.js`) and nothing is sent anywhere, so it costs no credits; it is
// StatZ's because it acts for the member (Corey's rule for automations). It says what it found per track before
// anything moves; Apply moves regions and flips polarity, and Undo puts both back.
import { useState } from "react";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";
import { bestLag, reduce, verdict } from "./align.js";

export default function TimingPanel({ tracks, measure, apply, busy }) {
  const { s: statz } = useStatzTrial();
  const allowed = !!(statz?.is_statz || statz?.active);
  const pick = () => (tracks.find((t) => t.role === "beat") || tracks[0])?.id || "";
  const [refId, setRefId] = useState(pick);
  const [rows, setRows] = useState(null);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");
  const [applied, setApplied] = useState(false);
  const ref = tracks.find((t) => t.id === refId) || tracks[0];

  const check = async () => {
    setErr(""); setRows(null); setApplied(false); setWorking(true);
    try {
      const r = await measure(ref);
      const a = reduce(r.channels, r.rate);
      const out = [];
      for (const t of tracks) {
        if (t.id === ref.id) continue;
        const m = await measure(t);
        const v = verdict(bestLag(a, reduce(m.channels, m.rate)));
        out.push({ id: t.id, name: t.name, ...v, wantFlip: v.flip });
      }
      setRows(out);
    } catch (e) { setErr(e.message || "Couldn't measure the tracks."); } finally { setWorking(false); }
  };
  const todo = (rows || []).filter((r) => r.move || r.wantFlip);

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs" data-tour="daw-timing">
      <p className="font-semibold text-white">⏱️ Fix timing &amp; polarity</p>
      {!allowed ? (
        <>
          <p className="text-white/60">Lines every track up against a reference and catches one whose polarity is flipped. StatZ's — or try it in the free sample. Dragging a region by hand stays free.</p>
          <StatzSample what="Fixing timing and polarity" />
        </>
      ) : (
        <>
          <p className="text-white/60">Measured on this device; nothing is sent and it costs <span className="text-emerald-300">no credits</span>. It works when a track is part of the reference (stems against the full song, two mics on one source); a different part is left alone.</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-white/70">Reference
              <select className="neon-input !w-auto !py-1" value={ref?.id || ""} data-nomemo="true" onChange={(e) => { setRefId(e.target.value); setRows(null); }}>
                {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <button type="button" className="neon-btn-primary !w-auto px-3 !py-1.5" disabled={busy || working || tracks.length < 2} onClick={check}>
              {working ? "Measuring…" : "Check timing"}
            </button>
          </div>
        </>
      )}
      {err && <p role="alert" className="text-mcz-ember">{err}</p>}
      {rows && (
        <div className="space-y-1.5">
          <ul className="space-y-1">
            {rows.map((r) => <li key={r.id} className="rounded-lg bg-black/30 px-2 py-1"><span className="font-semibold text-white">{r.name}</span> <span className="text-white/60">{r.why}</span></li>)}
          </ul>
          {todo.length ? (
            <button type="button" className="re-btn !w-auto px-3 !py-1.5" disabled={applied}
                    onClick={() => { apply(todo.map((r) => ({ id: r.id, move: r.move, flip: r.wantFlip }))); setApplied(true); }}>
              {applied ? "Applied — Undo puts it back" : `Apply to ${todo.length} track${todo.length === 1 ? "" : "s"}`}
            </button>
          ) : <p className="text-emerald-300">Nothing to fix against this reference.</p>}
        </div>
      )}
    </div>
  );
}
