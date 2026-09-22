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
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronDown, ChevronUp, Dumbbell, Loader2, PlayCircle, Sparkles } from "lucide-react";
import { api } from "../api.js";
import { anonId, track } from "../track.js";
import { asList } from "../shape.js";
import { MONEY } from "../resources.js";
import { pickForDay } from "../bodiezPick.js";

const TRIAL_SPLIT_KEY = "mcz_trial_split";

export function storedTrialSplit() {
  try {
    const raw = localStorage.getItem(TRIAL_SPLIT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearTrialSplit() {
  try {
    localStorage.removeItem(TRIAL_SPLIT_KEY);
  } catch {
    /* private-mode browsers throw on storage; losing the draft is survivable */
  }
}

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

// Equipment is a set of TOGGLES, not a single-select — "barbell OR
// dumbbell" is a real answer for somebody who has both at home but not a
// squat rack, and a single-select forced them to filter the library down
// to one at a time and switch back and forth to compare. Selecting none
// means "any equipment", the same as the old select's blank option.
function EquipmentPicker({ selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(EQUIPMENT_LABEL).map(([k, l]) => (
        <button key={k} type="button" onClick={() => onToggle(k)}
                className={`pill ${selected.includes(k) ? "pill-on" : "hover:text-white"}`}>
          {l}
        </button>
      ))}
    </div>
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

// The full week, built for free, no account — the same client-side lookup
// `SplitBuilder` in BodieZ.jsx already runs for members (`pickForDay`), no AI,
// no server round trip, so a stranger gets the SAME real thing a member would
// see rather than a row of split names with nothing behind them. `bodymap` is
// always null here — there is no fatigue history for a browser with no
// account, and `pickForDay` already degrades cleanly without one.
//
// What survives is the difference from a member's build: nothing is saved
// here (there is no account to save it to), so pressing "Keep this week"
// stashes the built days in localStorage and sends the visitor to /register.
// Register.jsx reads it back and posts it as `trial_split`, which only ever
// becomes real BodieZRoutine rows if that registration actually completes —
// the cost/gain rule applied to a whole week instead of one set: free to
// build, kept only if they finish the thing the CTA promises.
function TrialSplitBuilder({ exercises, splits, goals }) {
  const [days, setDays] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [goalKey, setGoalKey] = useState("");
  const [open, setOpen] = useState(false);
  const split = days ? splits?.[days] : null;
  const goal = goalKey ? goals?.[goalKey] : null;

  const toggleEquipment = (k) =>
    setEquipment((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  const preview = useMemo(() => {
    if (!split) return [];
    return split.days.map((day) => ({
      ...day, picks: pickForDay(day.muscles, null, exercises, equipment),
    }));
  }, [split, exercises, equipment]);

  const allPicked = preview.length > 0 && preview.every((d) => d.picks.length > 0);

  function keepThisWeek() {
    const built = preview.map((day) => ({
      title: `${split.label.replace(/^\d+ days?\/week — /, "")} — ${day.label}${goal ? ` — ${goal.label}` : ""}`,
      exercises: day.picks.map((ex, i) => ({
        exercise_id: ex.id, order: i,
        sets: goal ? goal.sets : 3,
        reps: goal ? goal.reps_low : 10,
        weight_kg: null,
      })),
    }));
    try {
      localStorage.setItem(TRIAL_SPLIT_KEY, JSON.stringify(built));
    } catch {
      /* private mode / quota — the CTA still lands on /register either way */
    }
  }

  return (
    <div className="re-card space-y-2">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          <CalendarDays size={14} className="text-mcz-cyan" /> Build a week — free, no account
        </span>
        {open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
      </button>
      {open && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-white/45">
            Pick how many days a week you train and BodieZ builds one real routine per
            day — full body, upper/lower, push/pull/legs or a body-part split, every
            muscle group covered across the week. Nothing saves until you make an
            account — the CTA below is what keeps it.
          </p>
          <div className="flex flex-wrap gap-2">
            <select className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                    value={days} onChange={(e) => setDays(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Days per week…</option>
              {splits && Object.keys(splits).map((k) => (
                <option key={k} value={k}>{splits[k].label}</option>
              ))}
            </select>
            {goals && (
              <select className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                      value={goalKey} onChange={(e) => setGoalKey(e.target.value)}>
                <option value="">General (3 sets x 10)</option>
                {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
              </select>
            )}
          </div>
          <div>
            <p className="mb-1 text-[11px] text-white/40">
              Equipment — pick any that apply, or leave blank for everything
            </p>
            <EquipmentPicker selected={equipment} onToggle={toggleEquipment} />
          </div>
          {goal && (
            <div className="rounded-lg bg-fuchsia-500/5 px-2.5 py-2 text-[11px] text-white/60">
              <p className="font-semibold text-fuchsia-200">
                {goal.sets} sets x {goal.reps_low}-{goal.reps_high} reps, {goal.rest_seconds}s rest — every day
              </p>
              <p className="mt-0.5">{goal.why}</p>
              <p className="mt-1 text-white/35">{goal.citation}</p>
            </div>
          )}
          {preview.length > 0 && (
            <div className="space-y-2">
              {preview.map((day) => (
                <div key={day.label} className="rounded-lg bg-white/5 px-2.5 py-2">
                  <p className="text-xs font-semibold text-white">{day.label}</p>
                  {day.picks.length === 0 ? (
                    <p className="text-[11px] text-mcz-ember">No exercises match this equipment for this day.</p>
                  ) : (
                    day.picks.map((ex) => (
                      <div key={ex.id} className="flex items-center justify-between gap-2 text-[11px] text-white/55">
                        <span>{MUSCLE_LABEL[ex.muscle_group]} — {ex.name}</span>
                        {ex.demo_url && (
                          <a href={ex.demo_url} target="_blank" rel="noreferrer"
                             className="inline-flex shrink-0 items-center gap-0.5 text-mcz-cyan hover:underline">
                            <PlayCircle size={12} /> Demo
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}
          <Link to="/register?trial=1" onClick={keepThisWeek}
                className={`neon-btn-primary block w-full py-2 text-center text-xs ${!allPicked ? "pointer-events-none opacity-40" : ""}`}>
            Make an account — keep this whole week, {days || "…"} real routine{days === 1 ? "" : "s"}
          </Link>
        </div>
      )}
    </div>
  );
}

export default function BodieZTrial() {
  const [state, setState] = useState(null);
  const [exerciseId, setExerciseId] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [equipment, setEquipment] = useState([]);
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
          <TrialSplitBuilder exercises={asList(state?.exercises)} splits={result.splits} goals={state?.goals} />
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
  const exercises = equipment.length
    ? allExercises.filter((ex) => equipment.includes(ex.equipment))
    : allExercises;
  const goals = state.goals || {};
  const goal = goalKey ? goals[goalKey] : null;
  const toggleEquipment = (k) =>
    setEquipment((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

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
        <div>
          <p className="mb-1 text-[11px] text-white/40">
            Equipment — pick any that apply, or leave blank for everything
          </p>
          <EquipmentPicker selected={equipment}
                           onToggle={(k) => { toggleEquipment(k); setExerciseId(""); }} />
        </div>
        <div className="flex gap-2">
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
      {Object.keys(state.splits || {}).length > 0 && (
        <TrialSplitBuilder exercises={allExercises} splits={state.splits} goals={goals} />
      )}
    </div>
    </div>
  );
}
