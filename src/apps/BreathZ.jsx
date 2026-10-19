import { useEffect, useRef, useState } from "react";
import { Loader2, Square } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { IconImg } from "../App.jsx";
import { RatingRow } from "../components/Rating.jsx";
import { PHASE_WORD, planFor, totalSeconds } from "../breathPlan.js";

// BreathZ — breath training. Free, because a member who can fix a weakness for
// nothing should be told so, and Breath is the score nothing in the app used to help
// with ("your breath runs out" and then a drill list with no breathing in it).
//
// What it will not do, said on the screen: a timer cannot measure a breath. A
// session earns XP and a streak for turning up and never moves a rating — the
// measurement is the coach's Breath score on the member's takes, shown here beside
// the practice. Patterns, what each is for and why, the minimum that counts and the
// daily number that earn XP are all the server's (/api/economy/breathz/).
export default function BreathZ() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [pick, setPick] = useState(null);
  const [bpm, setBpm] = useState("");
  const [run, setRun] = useState(null);        // { plan, i, started }
  const [done, setDone] = useState(null);      // the server's answer for the session just finished
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const load = () => api("/api/economy/breathz/").then((r) => { setD(r); setPick((p) => p || r.patterns[0]?.key); })
    .catch((e) => setErr(e.message));
  useEffect(() => { load(); return () => clearTimeout(timer.current); }, []);

  const pattern = d?.patterns.find((p) => p.key === pick);
  const plan = pattern ? planFor(pattern, bpm) : [];

  function start() {
    setDone(null); setErr("");
    const started = Date.now();
    setRun({ plan, i: 0, started });
    const step = (i) => {
      if (i >= plan.length) return finish(started);
      setRun({ plan, i, started });
      timer.current = setTimeout(() => step(i + 1), plan[i].seconds * 1000);
    };
    step(0);
  }
  function stop() { clearTimeout(timer.current); setRun(null); }

  async function finish(started) {
    setRun(null); setBusy(true);
    try {
      const r = await api("/api/economy/breathz/", { method: "POST", body: {
        pattern: pick, seconds: Math.round((Date.now() - started) / 1000), bpm: Number(bpm) || undefined } });
      setDone(r); load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const now = run && run.plan[run.i];
  // The circle grows on the in-breath and shrinks on the out-breath over exactly the
  // step's length; a hold leaves it where it is.
  const scale = !now ? 0.6 : now.phase === "in" ? 1 : now.phase === "out" ? 0.55 : undefined;
  const b = d?.breath;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="breathz.png" alt="BreathZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">BreathZ</h2>
          <p className="text-sm text-white/60">Breath training for your next take. Free — always.</p>
        </div>
      </header>

      {err && <p role="alert" className="text-sm text-mcz-ember">{err}</p>}
      {!d && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

      {d && (
        <>
          <p className="rounded-lg bg-white/5 px-3 py-2 text-[12px] text-white/65">{d.caveat}</p>

          {/* The measurement lives with the coach; this is the practice beside it. */}
          <div className="grid gap-2 sm:grid-cols-2">
            <RatingRow size="lg" value={b?.average} label="Your Breath score on takes"
                       detail={b?.average != null
                         ? (b.recent != null && b.earlier != null ? `Recent ${b.recent} · earlier ${b.earlier} · ${b.takes} takes` : `${b.takes} takes`)
                         : b?.why} />
            <RatingRow size="lg" value={d.streak} label="Day streak"
                       detail={`${d.counted_today} of ${d.counted_per_day} sessions counted today · ${d.xp} XP`} />
          </div>
          <button className="re-link text-[12px]" onClick={() => goToSpot("rapz", "rapz:progress")}>See my Breath history in the coach</button>

          <div className="neon-frame space-y-4 p-4" data-tour="breathz-pacer">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Pick a breathing pattern">
              {d.patterns.map((p) => (
                <button key={p.key} aria-pressed={pick === p.key} disabled={!!run} onClick={() => setPick(p.key)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${pick === p.key
                          ? "border-mcz-cyan bg-mcz-cyan/15 text-white" : "border-white/15 text-white/70 hover:border-white/40"}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {pattern && (
              <div className="space-y-1 text-sm">
                <p className="text-white/85">{pattern.what}</p>
                <p className="text-[12px] text-white/55">Why: {pattern.why}</p>
                <p className="text-[12px] text-white/45">
                  {pattern.rounds} rounds · about {totalSeconds(plan)}s · {pattern.xp} ⭐ XP when you finish (free)
                </p>
                {pattern.bpm_based && (
                  <label className="flex items-center gap-2 text-[12px] text-white/60">
                    Your tempo
                    <input type="number" min={40} max={220} className="neon-input !w-24" placeholder={String(pattern.bpm_default)}
                           value={bpm} disabled={!!run} onChange={(e) => setBpm(e.target.value)} />
                    BPM
                  </label>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex h-44 w-44 items-center justify-center">
                <div className="h-44 w-44 rounded-full border-4 border-mcz-cyan/60 bg-mcz-cyan/10 shadow-neon"
                     style={{ transform: scale != null ? `scale(${scale})` : undefined,
                              transition: now ? `transform ${now.seconds}s linear` : "transform 0.4s ease" }} />
              </div>
              <p className="font-display text-2xl font-extrabold text-white" aria-live="polite">
                {now ? PHASE_WORD[now.phase] : busy ? "Logging…" : "Ready when you are"}
              </p>
              {now && <p className="text-[12px] text-white/50">Round {now.round} of {pattern.rounds}</p>}
              {run
                ? <button className="re-btn !w-auto px-5" onClick={stop}><Square size={14} /> Stop (nothing is logged)</button>
                : <button className="neon-btn-primary !w-auto px-6" disabled={!pattern || busy} onClick={start}>
                    {busy ? <Loader2 className="animate-spin" size={16} /> : null} Start
                  </button>}
            </div>

            {done && (
              <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
                {done.counted ? `Done — +${done.xp_awarded} ⭐ XP, ${done.streak}-day streak.` : done.detail}
                {done.note ? ` ${done.note}` : ""}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
