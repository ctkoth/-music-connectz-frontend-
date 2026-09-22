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
import { Dumbbell, Loader2, PlayCircle, Sparkles } from "lucide-react";
import { api } from "../api.js";
import { anonId, track } from "../track.js";
import { asList } from "../shape.js";
import { MONEY } from "../resources.js";

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const MUSCLE_LABEL = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", arms: "Arms",
  legs: "Legs", core: "Core", cardio: "Cardio", full_body: "Full Body",
};

const EQUIPMENT_LABEL = {
  bodyweight: "Bodyweight", dumbbell: "Dumbbell", barbell: "Barbell",
  ez_bar: "EZ Bar", kettlebell: "Kettlebell", machine: "Machine",
  cable: "Cable / Pulley", band: "Band",
};

// Same header + door strip every /try/<instrument> page already renders, so
// a visitor who lands here (the landing page routes people to this door
// directly) isn't stuck with the browser's own back button as the only way
// off the screen — the cross-pollination rule applies to the trial doors
// themselves, not just to what they score.
const FALLBACK_DOORS = [{ app_key: "singz", label: "SingZ" }, { app_key: "rapz", label: "RapZ" }];

function Header() {
  return (
    <header className="mb-6 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
        <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
      </Link>
      <Link to="/login" className="text-sm text-white/60 hover:text-white">Sign in</Link>
    </header>
  );
}

function DoorStrip({ doors }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {doors.map((d) => (
        <Link key={d.app_key} to={`/try/${d.app_key}`} className="pill hover:text-white">
          {d.label}
        </Link>
      ))}
      <Link to="/try/bodiez" className="pill pill-on">Lift a set — BodieZ</Link>
    </div>
  );
}

export default function BodieZTrial() {
  const [state, setState] = useState(null);
  const [exerciseId, setExerciseId] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [equipment, setEquipment] = useState("");
  const [goalKey, setGoalKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [viewed, setViewed] = useState(false);
  const [doors, setDoors] = useState(FALLBACK_DOORS);

  useEffect(() => {
    api(`/api/economy/bodiez/trial/?anon_id=${encodeURIComponent(anonId())}`, { auth: false })
      .then((d) => {
        setState(d);
        if (!viewed) { track("try_view", { app_key: "bodiez" }); setViewed(true); }
      })
      .catch((e) => setErr(e.message || "Couldn't load the trial."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let on = true;
    api("/api/economy/trialdoorz/", { auth: false })
      .then((d) => { if (on && d?.doors?.length) setDoors(d.doors); })
      .catch(() => {});
    return () => { on = false; };
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
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
        <Header />
        <p className="re-card text-sm text-mcz-pink">{err}</p>
      </div>
    );
  }
  if (!state) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
        <Header />
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      </div>
    );
  }

  const goalPreview = goalKey ? state?.goals?.[goalKey] : null;

  if (result) {
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
        <Header />
        <DoorStrip doors={doors} />
      <div className="mx-auto max-w-md space-y-4">
        <div className="re-card space-y-2 text-center">
          <Dumbbell className="mx-auto text-fuchsia-300" size={28} />
          <p className="text-sm font-semibold text-white">
            {result.exercise.name}
            {result.exercise.demo_url && (
              <a href={result.exercise.demo_url} target="_blank" rel="noreferrer"
                 className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[11px] font-normal text-mcz-cyan hover:underline">
                <PlayCircle size={12} /> Demo
              </a>
            )}
          </p>
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

        {goalPreview && (
          <div className="re-card space-y-1">
            <p className="re-label">{goalPreview.label} scheme, for reference</p>
            <p className="text-xs font-semibold text-fuchsia-200">
              {goalPreview.sets} sets x {goalPreview.reps_low}-{goalPreview.reps_high} reps, {goalPreview.rest_seconds}s rest
            </p>
            <p className="text-[11px] text-white/50">{goalPreview.why}</p>
            <p className="text-[11px] text-white/30">{goalPreview.citation}</p>
          </div>
        )}

        {result.splits && (
          <div className="re-card space-y-1">
            <p className="re-label">Coach builds a full week too</p>
            <p className="text-[11px] text-white/50">
              Pick 1-6 training days and Coach writes one real routine per day —
              full body, upper/lower, push/pull/legs or a body-part split — every
              muscle group covered across the week. Also a member feature.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.values(result.splits).map((s) => (
                <span key={s.label} className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/50">
                  {s.label.replace(/^\d+ days?\/week — /, "")}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.upgrade && (
          <div className="re-card space-y-1 text-center">
            <p className="text-xs text-white/60">
              Coach can build a whole routine — or a whole week — from a goal like this:
              muscle gain, toning or fat loss, real cited rep schemes, not a guess. That's
              a member feature. StatZ gets you Coach on every exercise, BodyMap, Goals and
              Recovery too.
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
      </div>
    );
  }

  if (!state.available) {
    const why = state.already_used ? "You've had your free take for today."
      : state.address_busy ? "This network has used up today's free takes — that's the connection, not you."
      : state.cap_reached ? "Free takes are all spoken for today."
      : "The trial isn't open right now.";
    return (
      <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
        <Header />
        <DoorStrip doors={doors} />
        <div className="re-card space-y-2 text-center">
          <p className="text-sm text-white/70">{why}</p>
          <Link to="/register" className="neon-btn-primary inline-block px-5 py-2 text-sm">Make an account</Link>
        </div>
      </div>
    );
  }

  const allExercises = asList(state.exercises);
  const exercises = equipment ? allExercises.filter((ex) => ex.equipment === equipment) : allExercises;
  const goals = state.goals || {};
  const goal = goalKey ? goals[goalKey] : null;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <Header />
      <DoorStrip doors={doors} />
    <div className="mx-auto max-w-md space-y-3">
      <div className="text-center">
        <Dumbbell className="mx-auto mb-1 text-fuchsia-300" size={28} />
        <h2 className="font-display text-lg font-extrabold text-white">Try BodieZ — log one set</h2>
        <p className="text-xs text-white/45">Free, no account. Real arithmetic, not a guess.</p>
      </div>
      {err && <p className="re-card text-sm text-mcz-pink">{err}</p>}
      <div className="re-card space-y-2">
        <div className="flex gap-2">
          <select className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/40 px-2 py-2 text-xs text-white outline-none"
                  value={equipment} onChange={(e) => { setEquipment(e.target.value); setExerciseId(""); }}>
            <option value="">Any equipment</option>
            {Object.entries(EQUIPMENT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {Object.keys(goals).length > 0 && (
            <select className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/40 px-2 py-2 text-xs text-white outline-none"
                    value={goalKey} onChange={(e) => setGoalKey(e.target.value)}>
              <option value="">Any goal</option>
              {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
            </select>
          )}
        </div>
        {goal && (
          <p className="rounded-lg bg-fuchsia-500/5 px-2.5 py-1.5 text-[11px] text-white/55">
            <span className="font-semibold text-fuchsia-200">
              {goal.sets} sets x {goal.reps_low}-{goal.reps_high} reps, {goal.rest_seconds}s rest
            </span> — {goal.why}
          </p>
        )}
        <select className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
          <option value="">Exercise…</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name} ({MUSCLE_LABEL[ex.muscle_group] || ex.muscle_group})</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input className="neon-input !py-2 flex-1 text-sm" placeholder={goal ? `reps (${goal.reps_low}-${goal.reps_high})` : "reps"}
                 type="number" min="1" value={reps} onChange={(e) => setReps(e.target.value)} />
          <input className="neon-input !py-2 flex-1 text-sm" placeholder="kg (optional)" type="number" min="0" step="0.5"
                 value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <button className="neon-btn-primary w-full py-2 text-sm disabled:opacity-40"
                disabled={!exerciseId || !reps || busy} onClick={submit}>
          {busy ? "Scoring…" : "Log it"}
        </button>
      </div>
    </div>
    </div>
  );
}
