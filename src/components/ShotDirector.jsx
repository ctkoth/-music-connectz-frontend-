import { useEffect, useState } from "react";
import { Clapperboard, Loader2, Wand2 } from "lucide-react";
import { api } from "../api.js";
import { PROMPTZ } from "../resources.js";
import { StatzSample, useStatzTrial } from "./StatzSample.jsx";

// Video ConnectZ Develop & Direct (StatZ). The coach LISTENS to the part of the
// track the video plays and, for each shot's slot of it, says what it hears and
// offers three shots tied to the lyric, the mood or the beat — each with why.
//   Develop: the member picks each shot.
//   Direct:  the coach picks every shot (its pick is marked, with its reason).
// Both come from one paid plan, and every pick stays editable in the shot fields.
// The slots, the price, the gate and every word of the plan are the server's
// (/api/economy/videoz/develop/); this decides nothing.

export default function ShotDirector({ trackId, startAt, count, look, onShots, onLook }) {
  const { s: trial } = useStatzTrial();
  const [d, setD] = useState(null);
  const [lyrics, setLyrics] = useState("");
  const [mood, setMood] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [plan, setPlan] = useState(null);
  const [picked, setPicked] = useState([]);
  const [mode, setMode] = useState("direct");

  // Re-asked when a StatZ sample starts or ends, so the gate follows it.
  useEffect(() => {
    api("/api/economy/videoz/develop/").then(setD).catch(() => setD(null));
  }, [trial?.active, trial?.is_statz]);

  if (!d) return null;

  const apply = (picks, p = plan) => {
    setPicked(picks);
    onShots(p.slots.map((sl, i) => sl.options[picks[i]]?.shot || ""));
  };

  async function run() {
    setErr(""); setBusy(true);
    try {
      const r = await api("/api/economy/videoz/develop/", { method: "POST", timeoutMs: 150_000,
        body: { track_id: trackId, track_start: Number(startAt) || 0, shots: count, lyrics, mood, look } });
      if (r.unplannable) { setErr(`${r.unplannable} Nothing was charged.`); return; }
      setPlan(r);
      // Direct is the coach's picks; Develop starts there too and the member moves them.
      apply(r.slots.map((sl) => sl.pick ?? 0), r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  const cost = d.free_today ? "Free today — uses one of your daily free prompts"
    : `−${d.cost_cents} ${PROMPTZ}`;

  return (
    <div className="space-y-3 rounded-xl border border-mcz-gold/30 bg-mcz-gold/5 p-3" data-tour="video-develop">
      <div>
        <h4 className="text-sm font-semibold text-mcz-gold">🎬 Develop &amp; Direct</h4>
        <p className="text-[11px] text-white/60">{d.what_it_does}</p>
      </div>

      {!d.allowed ? (
        <>
          <p className="text-xs text-white/60">{d.locked_reason}</p>
          <StatzSample what="Develop & Direct" />
        </>
      ) : (
        <>
          <textarea className="neon-input w-full text-sm" rows={3} maxLength={d.lyrics_max}
            aria-label="Your lyrics (optional)"
            placeholder="Your lyrics for this part (optional) — shots can follow the line that's sung"
            value={lyrics} onChange={(e) => setLyrics(e.target.value)} />
          <input className="neon-input w-full text-sm" maxLength={d.mood_max} aria-label="The mood (optional)"
            placeholder="The mood you want (optional) — e.g. lonely city at 3am"
            value={mood} onChange={(e) => setMood(e.target.value)} />
          <div className="flex flex-wrap items-center gap-3">
            <button className="re-btn !w-auto px-4" disabled={busy || !trackId || !d.configured} onClick={run}>
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
              {plan ? "Plan the shots again" : `Plan ${count} shots to fit the song`}
            </button>
            <span className="text-[11px] text-mcz-ember">{cost}</span>
            <span className="text-[11px] text-white/45">— not charged if it fails. Rendering is priced below, per shot.</span>
          </div>
          {!trackId && <p className="text-[11px] text-white/45">Pick your track first: the coach plans by listening to it.</p>}
          <StatzSample what="Develop & Direct" />
        </>
      )}
      {err && <p role="alert" className="text-xs text-mcz-ember">{err}</p>}

      {plan && (
        <div className="space-y-3">
          {plan.overall && <p className="text-xs text-white/70">{plan.overall}</p>}
          <div role="group" aria-label="Who picks the shots" className="flex flex-wrap gap-2">
            {Object.entries(d.modes || {}).map(([k, label]) => (
              <button key={k} aria-pressed={mode === k} title={label}
                onClick={() => { setMode(k); if (k === "direct") apply(plan.slots.map((sl) => sl.pick ?? 0)); }}
                className={`rounded-full border px-3 py-1 text-xs ${mode === k ? "border-mcz-gold bg-mcz-gold/15 text-white" : "border-white/15 text-white/60"}`}>
                {k === "direct" ? <><Clapperboard size={11} className="mr-1 inline" />Direct — the coach picks</> : "Develop — I pick"}
              </button>
            ))}
          </div>
          {plan.look && plan.look !== look && (
            <p className="text-xs text-white/60">
              Suggested look: <span className="text-white/80">{plan.look}</span>{" "}
              <button className="re-link" onClick={() => onLook(plan.look)}>Use it</button>
            </p>
          )}
          {plan.slots.map((sl, i) => (
            <div key={sl.slot} className="space-y-1 rounded-lg border border-white/10 p-2">
              <p className="text-xs text-white/80">
                <span className="font-mono text-mcz-cyan">Shot {sl.slot} · {sl.at}</span>
                {sl.heard && <> — heard: {sl.heard}</>}{sl.mood && <span className="text-white/45"> · {sl.mood}</span>}
              </p>
              {sl.options.map((o, j) => (
                <label key={j} className={`flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-xs ${picked[i] === j ? "bg-white/10" : ""}`}>
                  <input type="radio" name={`shot-${sl.slot}`} className="mt-0.5" checked={picked[i] === j}
                    onChange={() => { setMode("develop"); apply(picked.map((p, k) => (k === i ? j : p))); }} />
                  <span>
                    <span className="text-white/85">{o.shot}</span>
                    <span className="block text-white/45">Goes with {o.ties_label}{o.why ? ` — ${o.why}` : ""}</span>
                    {sl.pick === j && (
                      <span className="block text-mcz-gold">🎬 Coach's pick{sl.pick_why ? ` — ${sl.pick_why}` : ""}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          ))}
          <p className="text-[11px] text-white/45">The picks are in the shot fields below — change any of them before you make the video.</p>
        </div>
      )}
    </div>
  );
}
