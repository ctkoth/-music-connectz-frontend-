// Gain staging and stereo field from a prompt (StatZ, or the daily sample) — through Mix ConnectZ's own
// measurements. Each track is measured HERE (`measureTrack`: loudness, brightness, how wide it already is);
// only those numbers, the names, roles and the member's brief go to `/api/economy/mixz/stage/`, which
// answers a fader level and a pan per track with a reason. Nothing changes until Apply, and Undo puts every
// fader back. The price is on the button before it is pressed, from the server; a failed run is not charged.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { PROMPTZ, ENERGY } from "../resources.js";
import { measureTrack, guessRole, panLabel } from "../mastering/multitrack.js";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";

const fmtDb = (v) => `${v > 0 ? "+" : ""}${v} dB`;

export default function StagePanel({ tracks, measure, apply, busy }) {
  const { s: statz } = useStatzTrial();
  const allowed = !!(statz?.is_statz || statz?.active);
  const [info, setInfo] = useState(null);
  const [brief, setBrief] = useState("");
  const [state, setState] = useState("");       // "" | "measuring" | "asking"
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [applied, setApplied] = useState(false);
  useEffect(() => { api("/api/economy/mixz/stage/").then(setInfo).catch(() => setInfo(null)); }, []);

  const run = async () => {
    setErr(""); setRes(null); setApplied(false);
    try {
      setState("measuring");
      const rows = [];
      for (const t of tracks) {
        const { channels, rate } = await measure(t);
        const m = measureTrack(channels, rate);
        rows.push({ name: t.name, role: t.role || guessRole(t.name), lufs: Number.isFinite(m.lufs) ? Math.round(m.lufs * 10) / 10 : null,
                    bright: Number.isFinite(m.bright) ? Math.round(m.bright * 100) / 100 : null, width_db: Number.isFinite(m.widthDb) ? Math.round(m.widthDb) : null });
      }
      setState("asking");
      const d = await api("/api/economy/mixz/stage/", { method: "POST", body: { tracks: rows, brief } });
      setRes({ ...d, moves: (d.moves || []).map((m) => ({ ...m, id: tracks[m.i]?.id, was: { gain: tracks[m.i]?.gain, pan: tracks[m.i]?.pan } })) });
    } catch (e) { setErr(e.message || "Couldn't get a suggestion. Nothing was charged."); } finally { setState(""); }
  };

  const price = info?.price;

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs" data-tour="daw-stage">
      <p className="font-semibold text-white">🎚️ Gain staging &amp; stereo field — from a prompt</p>
      {!allowed ? (
        <>
          <p className="text-white/60">The AI sets a level and a place in the stereo field for each track, with the reason. StatZ's — or try it in the free sample. Setting faders and pans by hand stays free.</p>
          <StatzSample what="AI gain staging and stereo field" />
        </>
      ) : (
        <>
          <p className="text-white/60">{info?.note || "Your tracks are measured on this device; only the numbers and your brief are sent."}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input className="neon-input flex-1 !py-1.5" maxLength={info?.brief_max || 300} value={brief} onChange={(e) => setBrief(e.target.value)}
                   placeholder="e.g. vocal upfront, wide pads, punchy drums" aria-label="What you want the mix to feel like" />
            <button type="button" className="neon-btn-primary !w-auto px-3 !py-1.5" disabled={busy || !!state || info?.price?.can_run === false} onClick={run}>
              {state === "measuring" ? "Measuring…" : state === "asking" ? "Asking…" : "Suggest levels & pans"}
            </button>
            {price && (price.free_today ? <span className="text-emerald-300">free today (a daily prompt)</span>
              : <span className="text-mcz-ember">−{price.cost_cents} {PROMPTZ}</span>)}
            {price?.energy ? <span className="text-mcz-ember">−{price.energy} {ENERGY}</span> : null}
            <span className="text-emerald-300">+ a level &amp; pan per track</span>
          </div>
          <p className="text-white/50">Not charged if it fails. Bass and drums stay centred.</p>
        </>
      )}
      {err && <p role="alert" className="text-mcz-ember">{err}</p>}
      {res && (
        <div className="space-y-1.5">
          {res.field && <p className="text-white/75">{res.field}</p>}
          <ul className="space-y-1">
            {res.moves.map((m) => (
              <li key={m.i} className="rounded-lg bg-black/30 px-2 py-1">
                <span className="font-semibold text-white">{m.name}</span>{" "}
                <span className="text-mcz-cyan">{fmtDb(m.gain_db)} · {panLabel(m.pan)}</span>
                <span className="text-white/50"> (was {fmtDb(m.was.gain ?? 0)} · {panLabel(m.was.pan ?? 0)})</span>
                <span className="block text-white/60">{m.why}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="re-btn !w-auto px-3 !py-1.5" disabled={applied} onClick={() => { apply(res.moves.filter((m) => m.id)); setApplied(true); }}>
              {applied ? "Applied — Undo puts it back" : "Apply to the faders"}
            </button>
            {res.charged_cents > 0 ? <span className="text-mcz-ember">Charged −{res.charged_cents} {PROMPTZ}</span> : <span className="text-white/50">Covered by a free prompt.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
