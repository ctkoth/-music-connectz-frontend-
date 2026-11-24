// Autotune (StatZ, or the daily sample): one track's voice snapped to a key, rendered on this device and laid down
// as a NEW TAKE on that track — the original is the previous take in the playlist menu, so nothing is lost. It
// costs no credits (nothing leaves the device); it is StatZ's because it is a pro effect, the same line as the
// plugin-grade inserts. Best on one voice at a time, and the panel says so before it is pressed.
import { useEffect, useRef, useState } from "react";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";
import { NOTE_NAMES, SCALES, autotune } from "./autotune.js";

export default function AutotunePanel({ tracks, measure, onRendered, toWav, busy }) {
  const { s } = useStatzTrial();
  const allowed = !!(s?.is_statz || s?.active);
  const [open, setOpen] = useState(false);
  const [trackId, setTrackId] = useState("");
  const [key, setKey] = useState(0);
  const [scale, setScale] = useState("major");
  const [speed, setSpeed] = useState(20);
  const [amount, setAmount] = useState(100);     // how much of the correction is applied: 100 = fully on the note, 0 = untouched
  const box = useRef(null);
  // A track's FX menu has an Auto-Tune entry: it opens this panel on that track.
  useEffect(() => {
    const on = (e) => { setOpen(true); if (e.detail?.trackId) setTrackId(e.detail.trackId); setTimeout(() => box.current?.scrollIntoView?.({ behavior: "smooth", block: "center" }), 50); };
    window.addEventListener("mcz-autotune", on);
    return () => window.removeEventListener("mcz-autotune", on);
  }, []);
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState("");
  const tr = tracks.find((t) => t.id === trackId) || tracks.find((t) => /vo|vox|lead|sing|rap/i.test(t.name)) || tracks[0];

  const run = async () => {
    if (!tr) return;
    setErr(""); setWorking(true);
    try {
      const { channels, rate } = await measure(tr);
      await new Promise((r) => setTimeout(r, 0));
      const res = autotune(channels, rate, { key, scale, speedMs: speed, amount });
      if (res.voicedShare < 0.05) { setErr(`No singing found on ${tr.name} — autotune needs a voice (or one instrument) holding notes.`); return; }
      const buf = new AudioBuffer({ numberOfChannels: res.channels.length, length: res.channels[0].length, sampleRate: rate });
      res.channels.forEach((c, i) => buf.copyToChannel(c, i));
      await onRendered(tr.id, toWav(buf, 24), `${tr.name} · tuned ${NOTE_NAMES[key]} ${scale}`, res.avgCents);
    } catch (e) { setErr(e.message || "Couldn't tune that track."); } finally { setWorking(false); }
  };

  return (
    <div ref={box} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs" data-tour="daw-autotune">
      <button type="button" className="font-semibold text-white" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        🎤 Autotune {open ? "▴" : "▾"} <span className="font-normal text-white/55">— pitch correction to a key · StatZ</span>
      </button>
      {open && (!allowed ? (
        <div className="mt-2 space-y-1">
          <p className="text-white/60">Snaps a voice to the key: hard and robotic, or natural. StatZ's — or try it in the free sample. Moving a whole track up or down in key stays free.</p>
          <StatzSample what="Autotune" />
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-white/70">Track
              <select className="neon-input !w-auto !py-1" data-nomemo="true" value={tr?.id || ""} onChange={(e) => setTrackId(e.target.value)}>
                {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></label>
            <label className="flex items-center gap-1 text-white/70">Key
              <select className="neon-input !w-auto !py-1" value={key} onChange={(e) => setKey(Number(e.target.value))}>
                {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
              </select></label>
            <label className="flex items-center gap-1 text-white/70">Scale
              <select className="neon-input !w-auto !py-1" value={scale} onChange={(e) => setScale(e.target.value)}>
                {Object.entries(SCALES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select></label>
            <label className="flex items-center gap-1 text-white/70">Speed {speed === 0 ? "instant (robotic)" : `${speed} ms`}
              <input type="range" min={0} max={200} step={5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Retune speed" /></label>
            <label className="flex items-center gap-1 text-white/70">Amount {amount}%
              <input type="range" min={0} max={100} step={5} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Correction amount" /></label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="neon-btn-primary !w-auto px-3 !py-1.5" disabled={busy || working || !tr} onClick={run}>{working ? "Tuning…" : `Tune ${tr?.name || "a track"}`}</button>
            <span className="text-emerald-300">No credits · on your device</span>
            <span className="text-white/55">Lands as a new take — the original stays one switch away. Best on one voice at a time.</span>
          </div>
        </div>
      ))}
      {err && <p role="alert" className="mt-1 text-mcz-ember">{err}</p>}
    </div>
  );
}
