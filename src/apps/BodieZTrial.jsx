// BodieZ's trial door: one logged set, scored with real arithmetic
// (Epley 1RM estimate), no account. Same shape SingZ/RapZ's trial gives a
// stranger — pick something real, get a real number back — but there is no
// mic prompt and nothing sent to a model, so this is its own small screen
// rather than a mode bolted onto TrialTake.jsx's recorder-first flow.
//
// Reuses `anonId()` and `track()` from track.js so the one-free-take ceiling
// this shares with every other trial door (see bodiez_trial.py) is the SAME
// browser id the funnel already keys on — a second id minted here would be
// a second visitor.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dumbbell, Loader2, Sparkles } from "lucide-react";
import { api } from "../api.js";
import { anonId, track } from "../track.js";
import { asList } from "../shape.js";
import { MONEY } from "../resources.js";

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const MUSCLE_LABEL = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", arms: "Arms",
  legs: "Legs", core: "Core", cardio: "Cardio", full_body: "Full Body",
};

export default function BodieZTrial() {
  const [state, setState] = useState(null);
  const [exerciseId, setExerciseId] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [viewed, setViewed] = useState(false);

  useEffect(() => {
    api(`/api/economy/bodiez/trial/?anon_id=${encodeURIComponent(anonId())}`, { auth: false })
      .then((d) => {
        setState(d);
        if (!viewed) { track("try_view", { app_key: "bodiez" }); setViewed(true); }
      })
      .catch((e) => setErr(e.message || "Couldn't load the trial."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api("/api/economy/bodiez/trial/", {
        method: "POST", auth: false,
        body: { anon_id: anonId(), exercise_id: Number(exerciseId), reps: Number(reps),
                weight_kg: weight === "" ? undefined : Number(weight) },
      });
      setResult(r);
      track("try_scored", { app_key: "bodiez" });
      localStorage.setItem("mcz_trial_token", r.claim_token);
    } catch (e) {
      setErr(e.message || "Couldn't score that set.");
      track("try_failed", { app_key: "bodiez", why: "server" });
    } finally {
      setBusy(false);
    }
  };

  if (err && !state) {
    return <p className="re-card text-sm text-mcz-pink">{err}</p>;
  }
  if (!state) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>;
  }

  if (result) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="re-card space-y-2 text-center">
          <Dumbbell className="mx-auto text-fuchsia-300" size={28} />
          <p className="text-sm font-semibold text-white">{result.exercise.name}</p>
          <p className="text-xs text-white/50">{result.reps} reps{result.weight_kg != null ? ` @ ${result.weight_kg}kg` : ""}</p>
          {result.estimated_1rm_kg != null ? (
            <p className="text-3xl font-extrabold text-mcz-cyan">{result.estimated_1rm_kg}kg</p>
          ) : (
            <p className="text-sm text-white/60">No weight — no 1RM estimate to give.</p>
          )}
          {result.estimated_1rm_kg != null && <p className="text-xs text-white/40">estimated one-rep max</p>}
          <p className="text-[11px] text-white/40">{result.estimate_note}</p>
        </div>

        {result.coach_sample && (
          <div className="re-card space-y-1">
            <p className="re-label inline-flex items-center gap-1">
              <Sparkles size={12} className="text-fuchsia-300" /> What Coach would tell you
            </p>
            <p className="text-sm font-semibold text-fuchsia-200">{result.coach_sample.label}</p>
            <p className="text-xs text-white/55">{result.coach_sample.why}</p>
          </div>
        )}

        <Link to={`/register?trial=1`} className="neon-btn-primary block w-full py-3 text-center text-sm">
          Make an account — this exercise becomes a real routine, kept
        </Link>

        {result.upgrade && (
          <div className="re-card space-y-1 text-center">
            <p className="text-xs text-white/60">
              Want Coach on every exercise, BodyMap, Goals and Recovery? That's StatZ.
            </p>
            <p className="text-sm font-semibold text-mcz-cyan">
              {usd(result.upgrade.month_cents)} {MONEY}/mo
              {result.upgrade.founding && !result.upgrade.founding.sold_out && (
                <span className="ml-2 text-mcz-ember">
                  or {usd(result.upgrade.founding.lifetime_cents)} {MONEY} lifetime —
                  {" "}{result.upgrade.founding.remaining} founding seats left
                </span>
              )}
            </p>
            <Link to="/register?trial=1&tier=statz" className="text-xs text-white/50 hover:text-white underline">
              See what StatZ unlocks
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (!state.available) {
    const why = state.already_used ? "You've had your free take for today."
      : state.address_busy ? "This network has used up today's free takes — that's the connection, not you."
      : state.cap_reached ? "Free takes are all spoken for today."
      : "The trial isn't open right now.";
    return (
      <div className="re-card space-y-2 text-center">
        <p className="text-sm text-white/70">{why}</p>
        <Link to="/register" className="neon-btn-primary inline-block px-5 py-2 text-sm">Make an account</Link>
      </div>
    );
  }

  const exercises = asList(state.exercises);

  return (
    <div className="mx-auto max-w-md space-y-3">
      <div className="text-center">
        <Dumbbell className="mx-auto mb-1 text-fuchsia-300" size={28} />
        <h2 className="font-display text-lg font-extrabold text-white">Try BodieZ — log one set</h2>
        <p className="text-xs text-white/45">Free, no account. Real arithmetic, not a guess.</p>
      </div>
      {err && <p className="re-card text-sm text-mcz-pink">{err}</p>}
      <div className="re-card space-y-2">
        <select className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
          <option value="">Exercise…</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name} ({MUSCLE_LABEL[ex.muscle_group] || ex.muscle_group})</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input className="neon-input !py-2 flex-1 text-sm" placeholder="reps" type="number" min="1"
                 value={reps} onChange={(e) => setReps(e.target.value)} />
          <input className="neon-input !py-2 flex-1 text-sm" placeholder="kg (optional)" type="number" min="0" step="0.5"
                 value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <button className="neon-btn-primary w-full py-2 text-sm disabled:opacity-40"
                disabled={!exerciseId || !reps || busy} onClick={submit}>
          {busy ? "Scoring…" : "Log it"}
        </button>
      </div>
    </div>
  );
}
