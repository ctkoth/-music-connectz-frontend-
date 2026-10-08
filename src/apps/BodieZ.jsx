// BodieZ 💪🏽 — strength-training and workout planning, Jefit for the routine
// library, Lilith's own scheduler for organizing it.
//
// v1 shipped a movement library, saved routines, and a live/finished session
// log with sets and weight, plus a Progress read built from logged sets
// rather than a formula — the substance rule applied to a gym app: "could a
// member get a good number without doing the work?" No — every number here
// is a count or a sum of what was actually logged.
//
// This adds the piece the blueprint names outright: Inbox/Today/Upcoming/
// Anytime/Someday/Trash for routines, the same bucket shape Lilith already
// gives a task. The Scheduler tab renders it, and never retypes a bucket
// label or emoji the server didn't send — a client that split them itself
// would be the second place they live, and the two would drift.
//
// BodyMap and Coach are both arithmetic over logged sets, never a model —
// the backend module explains why ("a recommendation engine that can't show
// its work is directz_ai_rating with a friendlier name"), and this screen
// follows that by rendering the server's own `why` on every Coach row rather
// than inventing a friendlier sentence for it.
//
// Goals are four kinds — strength, frequency, count, bodyweight — and every
// one reads its progress off data this app already logs, never a member's
// own report of how they're doing. There is deliberately no free-text
// "custom" goal: this screen renders the `kinds` the server sends rather
// than assuming a fifth exists.
//
// Recovery is a daily self check-in — soreness, sleep quality, fatigue —
// never inferred from training data, same reason a coach score is never
// guessed at from a form. `rest_suggested` is a bool with a real, named
// reason attached (trained often this week, or the member's own reading ran
// high), never a blended "readiness score" — the backend module explains why
// at length and cites its reasoning; this screen just renders both reasons
// separately rather than folding them into one number.
//
// Deliberately not built yet: Nutrition, Community, and any XP/streak
// reward. The backend module explains why XP is left out rather than
// guessed at — this screen follows that and shows plain counts instead.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoSrc } from "../media.js";
import {
  Activity, CalendarDays, ChevronDown, ChevronUp, Dumbbell, Loader2, Moon, PlayCircle, Plus, Play,
  MapPin, MessageSquare, Send, Share2, Sparkles, Square, Target, Trash2, Trophy, Wand2, X,
} from "lucide-react";
import { api } from "../api.js";
import { asDict, asList } from "../shape.js";
import { IconImg } from "../App.jsx";
import { MUSCLE_ART } from "../iconManifest.js";
import { pickForDay } from "../bodiezPick.js";
import { getUnit, saveUnit, fromKg, toKg, fmtWeight } from "../weightUnit.js";
import { handOff } from "../handoff.js";

const UnitCtx = createContext("kg");
const useUnit = () => useContext(UnitCtx);

// A labelled input, because a placeholder disappears the moment a number is
// typed and "12" next to "35" doesn't say which one is the weight.
function Field({ label, className = "w-20", ...props }) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</span>
      <input className="neon-input !py-2 w-full text-sm" {...props} />
    </label>
  );
}
import EquipmentPicker, { EQUIPMENT_LABEL, toggleEquipment } from "./EquipmentPicker.jsx";

// Jefit's own eleven groups, plus Full Body (which Jefit doesn't have — see
// migration 0145's docstring on the backend for why it stays: Burpee, Clean
// and Press and the kettlebell lifts genuinely aren't one-muscle movements).
// "Arms" and "Legs" are gone from here, not aliased — a client that still
// rendered them would be showing a label the server can no longer produce.
const MUSCLE_LABEL = {
  abs: "Abs", back: "Back", biceps: "Biceps", cardio: "Cardio", chest: "Chest",
  forearms: "Forearms", glutes: "Glutes", shoulders: "Shoulders", triceps: "Triceps",
  upper_legs: "Upper Legs", lower_legs: "Lower Legs", full_body: "Full Body",
};

// Icon mapping for neon muscle group SVGs
const MUSCLE_ICON_MAP = {
  abs: "/icons/bodiez.absz.svg",
  back: "/icons/bodiez.backz.svg",
  biceps: "/icons/bodiez.bicepz.svg",
  cardio: "/icons/bodiez.cardioz.svg",
  chest: "/icons/bodiez.chestz.svg",
  forearms: "/icons/bodiez.forearmz.svg",
  glutes: "/icons/bodiez.glutez.svg",
  shoulders: "/icons/bodiez.shoulderz.svg",
  triceps: "/icons/bodiez.tricepz.svg",
  upper_legs: "/icons/bodiez.upperlegz.svg",
  lower_legs: "/icons/bodiez.lowerlegz.svg",
  full_body: "/icons/bodiez.fullbodyz.svg",
};

// Corey's own muscle art (bodiez.<muscle>.jpg) leads once it is committed —
// MUSCLE_ART lists only files that exist — and the neon SVGs above are the
// backup, the same order every other icon in the app follows.
const muscleIcon = (m) => MUSCLE_ART[m] || MUSCLE_ICON_MAP[m];

// EQUIPMENT_LABEL moved to EquipmentPicker.jsx — same shape the server's
// EQUIPMENT_CHOICES declare, read to filter by, never retyped as a value the
// server wouldn't recognize. One copy now instead of three (this file had
// its own, the trial door had its own).

// Every BodyMap status the server can send, and how it reads — a color and a
// plain sentence, never retyped anywhere numeric (the counts stay the
// server's).
const BODYMAP_STATUS = {
  recent: { color: "text-emerald-300 bg-emerald-500/10 ring-emerald-400/30", said: "Trained recently" },
  balanced: { color: "text-mcz-cyan bg-mcz-cyan/10 ring-mcz-cyan/30", said: "Balanced" },
  overworked: { color: "text-mcz-ember bg-mcz-ember/10 ring-mcz-ember/30", said: "Overworked" },
  undertrained: { color: "text-amber-300 bg-amber-500/10 ring-amber-400/30", said: "Undertrained" },
  untrained: { color: "text-white/40 bg-white/5 ring-white/10", said: "Never trained" },
};

const TABS = [
  { key: "today", label: "Today" },
  { key: "scheduler", label: "Scheduler" },
  { key: "bodymap", label: "BodyMap" },
  { key: "coach", label: "Coach" },
  { key: "goals", label: "Goals" },
  { key: "recovery", label: "Recovery" },
  { key: "progress", label: "Progress" },
  { key: "stepz", label: "StepZ" },
];

export default function BodieZ() {
  const [tab, setTab] = useState("today");
  const [unit, setUnitState] = useState(getUnit);
  const setUnit = (u) => { setUnitState(u); saveUnit(u); };
  const [exercises, setExercises] = useState([]);
  const [demoCredit, setDemoCredit] = useState("");
  const [access, setAccess] = useState({ seated_or_lying_only: false, arms_ok: true, legs_ok: true });
  // Set by BodyMap's "Build a day for just this muscle" CTA, read once by
  // MuscleDayBuilder on the Coach tab then cleared — a jump that lands ON
  // the control rather than dumping the member at the top of a new tab.
  const [prefillMuscle, setPrefillMuscle] = useState(null);
  const jumpToMuscleBuild = (muscle) => { setPrefillMuscle(muscle); setTab("coach"); };
  const [board, setBoard] = useState(null);
  const [session, setSession] = useState(null);
  // Kept for the tab's lifetime so a member can post it AND message their
  // coach — each of those leaves BodieZ, and the card must still be here after.
  const [summary, setSummaryState] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("bodiez.summary") || "null"); } catch { return null; }
  });
  const setSummary = (sm) => {
    setSummaryState(sm);
    try { sm ? sessionStorage.setItem("bodiez.summary", JSON.stringify(sm)) : sessionStorage.removeItem("bodiez.summary"); } catch { /* blocked */ }
  };
  const [progress, setProgress] = useState(null);
  const [bodymap, setBodymap] = useState(null);
  const [coach, setCoach] = useState(null);
  const [goals, setGoals] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);
  const [recovery, setRecovery] = useState(null);
  const [steps, setSteps] = useState(null);
  const [stepCoach, setStepCoach] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    setBusy(true);
    Promise.all([
      api("/api/economy/bodiez/exercises/"),
      api("/api/economy/bodiez/board/"),
      api("/api/economy/bodiez/sessions/"),
      api("/api/economy/bodiez/progress/"),
      api("/api/economy/bodiez/bodymap/"),
      api("/api/economy/bodiez/coach/"),
      api("/api/economy/bodiez/goals/"),
      api("/api/economy/bodiez/weightlog/"),
      api("/api/economy/bodiez/recovery/"),
      api("/api/economy/bodiez/steps/").catch(() => ({ steps: [], today_total: 0, daily_goal: 10000 })),
      api("/api/economy/bodiez/stepz/coach/").catch(() => ({ scores: {}, medians: {}, caveat: "" })),
    ]).then(([ex, b, sess, prog, bm, co, g, wl, rec, st, sc]) => {
      setExercises(asList(ex.exercises));
      setDemoCredit(ex.demo_credit || "");
      if (ex.access) setAccess(ex.access);
      setBoard(b);
      const open = asList(sess.sessions).find((s) => !s.ended_at);
      setSession(open || null);
      setProgress(prog);
      setBodymap(bm);
      setCoach(co);
      setGoals(g);
      setWeightLogs(asList(wl.logs));
      setRecovery(rec);
      setSteps(st);
      setStepCoach(sc);
      setErr("");
    }).catch((e) => setErr(e.message || "Couldn't load BodieZ."))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  // One answer, from the server: every exercise comes back flagged
  // `accessible` for THIS member. The full list is kept for names (an old
  // session still names a lift the member can no longer pick); only the
  // pickers get the filtered one.
  const usable = exercises.filter((e) => e.accessible !== false);
  const saveAccess = async (patch) => {
    const next = { ...access, ...patch };
    setAccess(next);  // optimistic — a toggle that lags reads as not working
    try {
      await api("/api/economy/bodiez/access/", { method: "PUT", body: next });
      const ex = await api("/api/economy/bodiez/exercises/");
      setExercises(asList(ex.exercises));
      if (ex.access) setAccess(ex.access);
      setErr("");
    } catch (e) {
      setAccess(access);
      setErr(e.message || "Couldn't save that. Your choice was not changed.");
    }
  };

  const buckets = asDict(board?.buckets);
  const bucketLabels = asList(board?.bucket_labels);
  // Weekdays are the server's list; the member's own named days ride beside
  // them under a "c:<id>" key, so every picker/filter/chip below handles both
  // without knowing there are two kinds. dayBody() is the one place that key
  // is split back into what the API takes.
  const customDays = asList(board?.custom_days);
  const dayTagLabels = [...asList(board?.day_tag_labels),
                        ...customDays.map((d) => ({ key: `c:${d.id}`, label: d.name, custom: true }))];
  // Every routine, flattened across every bucket — TodayView's "start from a
  // routine" picker doesn't care which bucket a routine is sitting in.
  const routines = bucketLabels.flatMap((b) => asList(buckets[b.key]));

  async function startSession(routineId) {
    setErr("");
    try {
      const sess = await api("/api/economy/bodiez/sessions/", {
        method: "POST", body: routineId ? { routine_id: routineId } : {},
      });
      setSession(sess);
    } catch (e) { setErr(e.message); }
  }

  async function finishSession() {
    if (!session) return;
    if (!window.confirm(`End this session? You've been going ${clock(secondsSince(session.started_at))}.`)) return;
    try {
      const done = await api(`/api/economy/bodiez/sessions/${session.id}/`, {
        method: "PATCH", body: { finish: true },
      });
      setSession(null);
      setSummary(done?.summary || null);
      load();
    } catch (e) { setErr(e.message); }
  }

  async function logSet(exerciseId, reps, weightKg) {
    if (!session) return;
    try {
      const s = await api(`/api/economy/bodiez/sessions/${session.id}/sets/`, {
        method: "POST",
        body: { exercise_id: exerciseId, reps, weight_kg: toKg(weightKg, unit) },
      });
      setSession({ ...session, sets: [...session.sets, s] });
    } catch (e) { setErr(e.message); }
  }

  async function addCustomDay(name) {
    try {
      await api("/api/economy/bodiez/custom-days/", { method: "POST", body: { name } });
      setErr(""); load();
      return true;
    } catch (e) { setErr(e.message); return false; }
  }

  async function removeCustomDay(id) {
    try {
      await api(`/api/economy/bodiez/custom-days/${id}/`, { method: "DELETE" });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function createRoutine(title, bucket, dayTag) {
    try {
      await api("/api/economy/bodiez/routines/", {
        method: "POST", body: { title, exercises: [], bucket, ...dayBody(dayTag) },
      });
      load();
    } catch (e) { setErr(e.message); }
  }

  // day_tag and description are the two routine-level fields with no other
  // writer — bucket has moveRoutine, scheduled_for has scheduleRoutine, this
  // is theirs. Both PATCH together since the Scheduler edits them together.
  async function setRoutineGoal(id, goal) {
    try {
      await api(`/api/economy/bodiez/routines/${id}/`, { method: "PATCH", body: { goal } });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function editRoutineMeta(id, dayTag, description) {
    try {
      await api(`/api/economy/bodiez/routines/${id}/`, {
        method: "PATCH", body: { ...dayBody(dayTag), description },
      });
      load();
    } catch (e) { setErr(e.message); }
  }

  // Jefit-style routine building: each entry is
  // { exercise_id, order, sets, reps, weight_kg }. The server's write path
  // for routines/<id>/ already accepts any shape here (confirmed —
  // BodieZRoutineDetailView.patch stores `exercises` as-is beyond checking
  // each exercise_id exists), so this needed no backend change.
  async function saveRoutineExercises(id, exerciseList) {
    try {
      await api(`/api/economy/bodiez/routines/${id}/`, {
        method: "PATCH", body: { exercises: exerciseList },
      });
      load();
    } catch (e) { setErr(e.message); }
  }

  // Coach's "Build a routine" — a routine assembled from BodyMap's own real
  // status (undertrained/untrained muscles first), never a model's guess.
  // It lands in the Scheduler's Inbox exactly like a hand-built routine, so
  // it goes through the same designer to be tweaked or started.
  async function createRoutineFromExercises(title, exerciseList, dayTag, goal) {
    try {
      await api("/api/economy/bodiez/routines/", {
        method: "POST", body: { title, exercises: exerciseList, bucket: "inbox", ...dayBody(dayTag), goal: goal || "" },
      });
      setTab("scheduler");
      load();
    } catch (e) { setErr(e.message); }
  }

  // The split builder's answer to "does BodieZ cover every muscle across a
  // real week": one routine PER DAY, not one routine total. Posted
  // sequentially and reloaded once at the end — `createRoutineFromExercises`
  // reloads per call, which would be N refetches and N tab-switches for a
  // 6-day split; this does the same POSTs without either.
  async function createSplitRoutines(days) {
    try {
      for (const day of days) {
        await api("/api/economy/bodiez/routines/", {
          method: "POST", body: { title: day.title, exercises: day.exercises, bucket: "inbox", goal: day.goal || "" },
        });
      }
      setTab("scheduler");
      load();
    } catch (e) { setErr(e.message); }
  }

  async function deleteRoutine(id) {
    if (!window.confirm("Delete this routine? (Trash is undo-able — this isn't.)")) return;
    try {
      await api(`/api/economy/bodiez/routines/${id}/`, { method: "DELETE" });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function moveRoutine(id, bucket) {
    try {
      await api(`/api/economy/bodiez/routines/${id}/`, { method: "PATCH", body: { bucket } });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function scheduleRoutine(id, dateStr) {
    try {
      await api(`/api/economy/bodiez/routines/${id}/`, {
        method: "PATCH", body: { scheduled_for: dateStr, bucket: dateStr ? "upcoming" : undefined },
      });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function createGoal(body) {
    try {
      await api("/api/economy/bodiez/goals/", { method: "POST", body });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function deleteGoal(id) {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await api(`/api/economy/bodiez/goals/${id}/`, { method: "DELETE" });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function logWeight(weightKg) {
    try {
      await api("/api/economy/bodiez/weightlog/", { method: "POST", body: { weight_kg: toKg(weightKg, unit) } });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function logRecovery(body) {
    try {
      await api("/api/economy/bodiez/recovery/", { method: "POST", body });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function logSteps(count) {
    try {
      await api("/api/economy/bodiez/steps/", { method: "POST", body: { count } });
      load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <UnitCtx.Provider value={unit}>
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="bodiez.png" alt="BodieZ" className="h-11 w-11 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-extrabold">BodieZ</h2>
          <p className="text-xs text-white/45">Strength training and workout planning.</p>
        </div>
        <div className="flex shrink-0 rounded-full bg-white/5 p-0.5 ring-1 ring-white/10" role="group" aria-label="Weight unit">
          {["lb", "kg"].map((u) => (
            <button key={u} onClick={() => setUnit(u)} aria-pressed={unit === u}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${unit === u ? "bg-mcz-cyan/20 text-mcz-cyan" : "text-white/45"}`}>
              {u}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`pill ${tab === t.key ? "!bg-white/15 !text-white" : ""}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AccessPanel access={access} onChange={saveAccess} shown={usable.length} total={exercises.length} />

      {err && <p className="re-card text-sm text-mcz-pink">{err}</p>}

      {busy && !exercises.length ? (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </p>
      ) : (
        <>
          {tab === "today" && (
            <>
            <LbFix onFixed={load} />
            {summary && <SessionSummary summary={summary} onClose={() => setSummary(null)} />}
            <TodayView
              session={session} routines={routines} exercises={exercises} pickable={usable}
              onStart={startSession} onFinish={finishSession} onLogSet={logSet}
              goals={coach?.goals}
            />
            </>
          )}
          {tab === "scheduler" && (
            <SchedulerView buckets={buckets} bucketLabels={bucketLabels} dayTagLabels={dayTagLabels}
                          exercises={exercises} pickable={usable} demoCredit={demoCredit}
                          onCreate={createRoutine} onDelete={deleteRoutine} onMove={moveRoutine}
                          onSchedule={scheduleRoutine} onStart={startSession} sessionOpen={!!session}
                          onSaveExercises={saveRoutineExercises} onEditMeta={editRoutineMeta}
                          customDays={customDays} onAddDay={addCustomDay} onRemoveDay={removeCustomDay}
                          goals={coach?.goals} onSetGoal={setRoutineGoal} />
          )}
          {tab === "bodymap" && (
            <BodyMapView bodymap={bodymap} exercises={usable} onBuildForMuscle={jumpToMuscleBuild} />
          )}
          {tab === "coach" && (
            <CoachView coach={coach} bodymap={bodymap} exercises={usable} dayTagLabels={dayTagLabels}
                      prefillMuscle={prefillMuscle} onPrefillConsumed={() => setPrefillMuscle(null)}
                      onBuildRoutine={createRoutineFromExercises}
                      onBuildSplit={createSplitRoutines} />
          )}
          {tab === "goals" && (
            <GoalsView goals={goals} exercises={exercises} weightLogs={weightLogs}
                      onCreate={createGoal} onDelete={deleteGoal} onLogWeight={logWeight} />
          )}
          {tab === "recovery" && <RecoveryView recovery={recovery} onLog={logRecovery} />}
          {tab === "progress" && <ProgressView progress={progress} />}
          {tab === "stepz" && <StepZView steps={steps} stepCoach={stepCoach} bodymap={bodymap} onLogSteps={logSteps} />}
        </>
      )}
    </div>
    </UnitCtx.Provider>
  );
}

// Fetched once per exercise per session (never re-fetched for the same
// exercise) — "last time" is a real logged row, from `/exercises/<id>/history/`,
// never a suggested target. Cached in state so switching between exercises in
// the same session doesn't re-request numbers that can't have changed mid-set.
function useHistory(exerciseId) {
  const [history, setHistory] = useState(undefined); // undefined = loading, null = no history
  useEffect(() => {
    if (!exerciseId) { setHistory(undefined); return; }
    setHistory(undefined);
    let alive = true;
    api(`/api/economy/bodiez/exercises/${exerciseId}/history/`)
      .then((h) => { if (alive) setHistory(h.last_session || null); })
      .catch(() => { if (alive) setHistory(null); });
    return () => { alive = false; };
  }, [exerciseId]);
  return history;
}

// Before pounds shipped, a US member's "35" went in as 35 kg. Only the member
// knows which unit they meant, so this asks rather than guessing, and the
// server converts each weight once.
function LbFix({ onFixed }) {
  const unit = useUnit();
  const [info, setInfo] = useState(null);
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem("bodiez.lbFixDismissed") === "1"; } catch { return false; }
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  useEffect(() => {
    if (unit !== "lb" || hidden) return;
    api("/api/economy/bodiez/lb-fix/").then(setInfo).catch(() => setInfo(null));
  }, [unit, hidden]);

  if (done) return <p className="re-card text-xs text-emerald-300">{done}</p>;
  if (unit !== "lb" || hidden || !info || (!info.sets && !info.routines)) return null;
  const ex = info.example_kg;
  const dismiss = () => { setHidden(true); try { localStorage.setItem("bodiez.lbFixDismissed", "1"); } catch { /* blocked */ } };
  async function fix() {
    setBusy(true);
    try {
      const r = await api("/api/economy/bodiez/lb-fix/", { method: "POST", body: {} });
      setDone(`Converted ${r.sets} set${r.sets === 1 ? "" : "s"}${r.routines ? ` and ${r.routines} routine${r.routines === 1 ? "" : "s"}` : ""} to the pounds you typed.`);
      onFixed?.();
    } catch (e) { setDone(e.message || "Couldn't convert them."); } finally { setBusy(false); }
  }
  return (
    <div className="re-card space-y-2 border-amber-400/40">
      <p className="text-sm font-semibold text-white">Were these pounds?</p>
      <p className="text-xs text-white/60">
        Before {new Date(info.cutoff).toLocaleDateString()} the weight box was in kg, so{" "}
        {info.sets ? `${info.sets} set${info.sets === 1 ? "" : "s"}` : ""}
        {info.sets && info.routines ? " and " : ""}
        {info.routines ? `${info.routines} routine target${info.routines === 1 ? "" : "s"}` : ""} you typed
        were saved as kilograms.
        {ex != null && ` "${ex}" shows as ${fmtWeight(ex, "lb")} now — converting makes it ${ex} lb.`}
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="neon-btn-primary !w-auto px-3 py-2 text-xs" disabled={busy} onClick={fix}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : null} Yes, convert them to pounds
        </button>
        <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs" onClick={dismiss}>No, they really were kg</button>
      </div>
    </div>
  );
}

function recordLine(r, unit) {
  if (r.kind === "heaviest") return `Heaviest ${r.exercise}: ${fmtWeight(r.value_kg, unit)} (was ${fmtWeight(r.previous_kg, unit)})`;
  if (r.kind === "reps") {
    const at = r.weight_kg == null ? "bodyweight" : fmtWeight(r.weight_kg, unit);
    return `Most reps, ${r.exercise} at ${at}: ${r.reps} (was ${r.previous_reps})`;
  }
  if (r.kind === "session_volume") return `Biggest session: ${fmtWeight(r.value_kg, unit)} lifted (was ${fmtWeight(r.previous_kg, unit)})`;
  return "";
}

// The same words go everywhere it can be sent, so a post, a coach's DM and a
// share sheet all say exactly what the screen said.
// `brief` drops the per-exercise list: a post answers to the tier's character
// limit (400 on Free), and the totals and records are the part worth posting.
function summaryText(sm, unit, brief = false) {
  const lines = [
    `💪 ${sm.routine_title || "Workout"} — ${clock(sm.duration_seconds)}`,
    `${Math.round(fromKg(sm.volume_kg, unit)).toLocaleString()} ${unit} lifted · ${sm.sets} sets · ${sm.reps} reps`,
    ...sm.records.map((r) => `🏆 ${recordLine(r, unit)}`),
    ...(brief ? [] : sm.exercises.map((e) => `• ${e.name}: ${e.sets}×, ${e.reps} reps${e.top_weight_kg != null ? `, top ${fmtWeight(e.top_weight_kg, unit)}` : ""}`)),
  ];
  return lines.join("\n");
}

function SessionSummary({ summary: sm, onClose }) {
  const unit = useUnit();
  const [note, setNote] = useState("");
  const title = `${sm.routine_title || "Workout"} — ${Math.round(fromKg(sm.volume_kg, unit)).toLocaleString()} ${unit} lifted`;
  const text = summaryText(sm, unit);
  const coaches = asList(sm.coaches);

  async function share() {
    try {
      if (navigator.share) { await navigator.share({ title, text }); return; }
      await navigator.clipboard.writeText(text);
      setNote("Copied — paste it anywhere.");
    } catch (e) {
      if (e?.name !== "AbortError") setNote("Couldn't open sharing on this device.");
    }
  }
  const toCoach = (who) => handOff("messagez", "messagez-compose", { people: who ? [who] : [], title, description: text });

  return (
    <div className="re-card space-y-3 border-emerald-400/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="re-label">Session done</p>
          <p className="text-sm font-semibold text-white">{sm.routine_title || "Ad-hoc session"} · {clock(sm.duration_seconds)}</p>
        </div>
        <button className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Close summary">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-2xl font-extrabold text-white">{Math.round(fromKg(sm.volume_kg, unit)).toLocaleString()}</p><p className="re-label">{unit} lifted</p></div>
        <div><p className="text-2xl font-extrabold text-white">{sm.sets}</p><p className="re-label">sets</p></div>
        <div><p className="text-2xl font-extrabold text-white">{sm.reps}</p><p className="re-label">reps</p></div>
      </div>
      {sm.records.length > 0 ? (
        <div className="space-y-1">
          {sm.records.map((r, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs text-amber-200">
              <Trophy size={13} className="mt-0.5 shrink-0" /> {recordLine(r, unit)}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/45">
          No new records this time{sm.firsts.length ? ` — first time logging ${sm.firsts.join(", ")}, so that's your starting mark` : ""}.
        </p>
      )}
      {sm.records.length > 0 && sm.firsts.length > 0 && (
        <p className="text-[11px] text-white/40">First time logging {sm.firsts.join(", ")} — that's your starting mark.</p>
      )}
      <div className="space-y-1">
        {sm.exercises.map((e) => (
          <p key={e.exercise_id} className="text-[11px] text-white/55">
            {e.name}: {e.sets} {e.sets === 1 ? "set" : "sets"}, {e.reps} reps{e.top_weight_kg != null ? `, top ${fmtWeight(e.top_weight_kg, unit)}` : ""}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
        <button className="neon-btn-primary !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" onClick={share}>
          <Share2 size={13} /> Share
        </button>
        {coaches.length > 0 ? coaches.map((c) => (
          <button key={c} className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" onClick={() => toCoach(c)}>
            <MessageSquare size={13} /> Send to coach @{c}
          </button>
        )) : (
          <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" onClick={() => toCoach(null)}>
            <MessageSquare size={13} /> Send to a coach
          </button>
        )}
        <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                onClick={() => handOff("postz", "post-compose", { title, description: summaryText(sm, unit, true).slice(0, 400) })}>
          <Send size={13} /> Post to PostZ
        </button>
        <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                onClick={() => handOff("venuez", "venuez-rooms", { category: "fitness" })}>
          <MapPin size={13} /> Train in person · VenueZ
        </button>
      </div>
      <p className="text-[11px] text-white/35">
        PostZ shows what posting costs before you post; sending a DM is free.
        {coaches.length === 0 && " You have no coach linked in CoachZ yet, so pick who to send it to."}
      </p>
      {note && <p className="text-[11px] text-mcz-cyan">{note}</p>}
    </div>
  );
}

function LastTime({ exerciseId }) {
  const unit = useUnit();
  const last = useHistory(exerciseId);
  if (last === undefined) return <p className="text-[11px] text-white/30">Loading last time…</p>;
  if (!last) return <p className="text-[11px] text-white/30">No history yet for this exercise.</p>;
  return (
    <p className="text-[11px] text-mcz-cyan/80">
      Last time ({new Date(last.started_at).toLocaleDateString()}): {" "}
      {last.sets.map((s, i) => (
        <span key={s.id}>
          {i > 0 && " · "}
          {s.reps}{s.weight_kg != null ? `@${fmtWeight(s.weight_kg, unit)}` : ""}
        </span>
      ))}
    </p>
  );
}

// One row of the logger: the routine's target for this exercise, the real
// last-time reference pulled from history, and a form pre-filled from the
// target so logging a planned set is one tap rather than four fields typed
// from scratch every time.
const secondsSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
const clock = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0"), ss = String(x).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

function useTick() {
  const [, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN((n) => n + 1), 1000); return () => clearInterval(t); }, []);
}

function Elapsed({ since }) {
  useTick();
  return clock(secondsSince(since));
}

const REST_PRESETS = [30, 60, 90, 120, 180];
const REST_KEY = "bodiez.restTarget";
const REST_GOAL_KEY = "bodiez.restGoal";

// Counts up from the last logged set's server timestamp, so a reload or a
// locked phone doesn't reset it — and the number it shows is the same one the
// server stores as rest_seconds on the next set. The target is only a nudge.
// The recommended rest per training goal is the server's (GOALS in
// bodiez.py, each with its citation) — never retyped here.
function RestTimer({ sets, goals, routineGoal }) {
  useTick();
  const goalList = Object.entries(asDict(goals)).filter(([, g]) => g?.rest_seconds);
  // A routine built for a goal starts on that goal's rest; the member's last
  // pick only fills in for a routine (or ad-hoc session) that has none.
  const [goalKey, setGoalKey] = useState(() => {
    if (routineGoal) return routineGoal;
    try { return localStorage.getItem(REST_GOAL_KEY) || ""; } catch { return ""; }
  });
  const [custom, setCustom] = useState(() => {
    try { return Number(localStorage.getItem(REST_KEY)) || 90; } catch { return 90; }
  });
  const goal = goalKey ? asDict(goals)[goalKey] : null;
  const target = goal?.rest_seconds || custom;
  const [alerted, setAlerted] = useState(null);
  const last = sets.reduce((a, s) => (s.created_at && (!a || s.created_at > a.created_at) ? s : a), null);
  const elapsed = last ? secondsSince(last.created_at) : 0;
  const done = last && elapsed >= target;

  useEffect(() => {
    if (!done || alerted === last.id) return;
    setAlerted(last.id);
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* unsupported */ }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); o.frequency.value = 880; o.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.25);
    } catch { /* no audio */ }
  }, [done, alerted, last]);

  if (!last) return null;
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } };
  const pickGoal = (k) => { setGoalKey(k); save(REST_GOAL_KEY, k); };
  const pick = (t) => { setCustom(t); pickGoal(""); save(REST_KEY, String(t)); };
  const pct = Math.min(100, (elapsed / target) * 100);

  return (
    <div className={`re-card space-y-2 ${done ? "border-emerald-400/40" : ""}`}>
      <div className="flex items-baseline justify-between">
        <p className="re-label">Rest since {last.exercise_name || "last set"}</p>
        <p className={`font-mono text-2xl font-bold ${done ? "text-emerald-300" : "text-white"}`}>
          {clock(elapsed)} <span className="text-sm text-white/40">/ {clock(target)}</span>
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${done ? "bg-emerald-400" : "bg-mcz-cyan"}`} style={{ width: `${pct}%` }} />
      </div>
      {goalList.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-white/40">
            {routineGoal && goalKey === routineGoal ? "This routine's goal:" : "Recommended for:"}
          </span>
          {goalList.map(([k, g]) => (
            <button key={k} onClick={() => pickGoal(k)}
                    className={`pill !py-1 text-[11px] ${k === goalKey ? "ring-1 ring-fuchsia-400 text-fuchsia-300" : ""}`}>
              {g.label} · {clock(g.rest_seconds)}
            </button>
          ))}
        </div>
      )}
      {goal && (
        <p className="text-[11px] text-white/45">
          {goal.label}: {goal.sets} sets of {goal.reps_low}-{goal.reps_high}, {clock(goal.rest_seconds)} rest. {goal.why}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-white/40">Or:</span>
        {REST_PRESETS.map((t) => (
          <button key={t} onClick={() => pick(t)}
                  className={`pill !py-1 text-[11px] ${!goal && t === target ? "ring-1 ring-mcz-cyan text-mcz-cyan" : ""}`}>
            {clock(t)}
          </button>
        ))}
        <span className="text-[11px] text-white/40">{done ? "Rested — go." : "Logging your next set saves this rest."}</span>
      </div>
    </div>
  );
}

function LoggerRow({ planned, doneSets, onLogSet }) {
  const unit = useUnit();
  const [reps, setReps] = useState(planned?.reps ? String(planned.reps) : "");
  const [weight, setWeight] = useState(planned?.weight_kg != null ? String(fromKg(planned.weight_kg, unit)) : "");
  // A unit flip re-expresses the planned target; a number the member typed is left as typed.
  useEffect(() => {
    if (planned?.weight_kg != null) setWeight(String(fromKg(planned.weight_kg, unit)));
  }, [unit]); // eslint-disable-line react-hooks/exhaustive-deps
  const targetSets = planned?.sets || 3;
  const done = doneSets.length;

  return (
    <div className="re-card space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{planned.name}</p>
          <p className="text-xs text-white/45">
            {MUSCLE_LABEL[planned.muscle_group] || planned.muscle_group}
            {planned.equipment && ` · ${EQUIPMENT_LABEL[planned.equipment] || planned.equipment}`}
            {" · "}Target {targetSets} sets
            {planned.reps ? ` x${planned.reps}` : ""}
            {planned.weight_kg != null ? ` @ ${fmtWeight(planned.weight_kg, unit)}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${
          done >= targetSets ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                              : "bg-white/5 text-white/50 ring-white/10"}`}>
          {done}/{targetSets} sets
        </span>
      </div>
      <LastTime exerciseId={planned.exercise_id} />
      <div className="flex flex-wrap items-end gap-2">
        <Field label={`Weight (${unit})`} className="w-28" placeholder="optional" type="number" min="0" step="0.5" inputMode="decimal"
               value={weight} onChange={(e) => setWeight(e.target.value)} />
        <Field label="Reps" className="w-24" placeholder="reps" type="number" min="1" max="1000" inputMode="numeric"
               value={reps} onChange={(e) => setReps(e.target.value)} />
        <button className="neon-btn-primary !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                disabled={!reps}
                onClick={() => onLogSet(planned.exercise_id, Number(reps), weight === "" ? "" : Number(weight))}>
          <Plus size={13} /> Log set
        </button>
      </div>
      {doneSets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {doneSets.map((s) => (
            <span key={s.id} className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/60">
              {s.reps}{s.weight_kg != null ? `@${fmtWeight(s.weight_kg, unit)}` : ""}
              {s.rest_seconds != null && <span className="text-white/35"> · {clock(s.rest_seconds)} rest</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TodayView({ session, routines, exercises, pickable, onStart, onFinish, onLogSet, goals }) {
  const unit = useUnit();
  const [exerciseId, setExerciseId] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  // "Done before" is the member's own history (times_done/last_done come off
  // the server, finished sessions only) so a lift they run every week is two
  // taps rather than a hunt through the library. Falls back to the full list
  // whenever there is no history yet, never an empty picker.
  const [pickMode, setPickMode] = useState("done");
  const doneBefore = (pickable || exercises)
    .filter((e) => (e.times_done || 0) > 0)
    .sort((a, b) => String(b.last_done).localeCompare(String(a.last_done)));
  const shownMode = doneBefore.length > 0 ? pickMode : "all";
  const pickList = shownMode === "done" ? doneBefore : (pickable || exercises);

  if (!session) {
    return (
      <div className="re-card space-y-3">
        <p className="text-sm text-white/70">No session in progress.</p>
        <button className="neon-btn-primary !w-auto px-4 py-2 text-sm inline-flex items-center gap-1"
                onClick={() => onStart(null)}>
          <Play size={14} /> Start ad-hoc session
        </button>
        {routines.length > 0 && (
          <div className="space-y-1">
            <p className="re-label">Or start from a routine:</p>
            <div className="flex flex-wrap gap-2">
              {routines.map((r) => (
                <button key={r.id} className="pill" onClick={() => onStart(r.id)}>
                  {r.title} <span className="text-white/40">({asList(r.exercises).length})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const routine = session.routine_id ? routines.find((r) => r.id === session.routine_id) : null;
  const planned = routine ? asList(routine.exercises)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((e) => {
      const ex = exercises.find((x) => x.id === e.exercise_id);
      return { ...e, name: ex?.name || `Exercise #${e.exercise_id}`,
               muscle_group: ex?.muscle_group, equipment: ex?.equipment };
    }) : [];
  const setsByExercise = {};
  for (const s of asList(session.sets)) {
    (setsByExercise[s.exercise_id] ||= []).push(s);
  }
  const loggedExerciseIds = new Set(asList(session.sets).map((s) => s.exercise_id));
  const extraExerciseIds = [...loggedExerciseIds].filter(
    (id) => !planned.some((p) => p.exercise_id === id));

  return (
    <div className="space-y-3">
      <div className="re-card flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {session.routine_title || "Ad-hoc session"}
          </p>
          <p className="text-xs text-white/45">
            Started {new Date(session.started_at).toLocaleTimeString()} ·{" "}
            <span className="font-mono text-mcz-cyan"><Elapsed since={session.started_at} /></span>
          </p>
        </div>
        <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                onClick={onFinish}>
          <Square size={13} /> End session
        </button>
      </div>

      <RestTimer key={session.id} sets={asList(session.sets)} goals={goals} routineGoal={session.routine_goal} />

      {planned.length > 0 && (
        <div className="space-y-2">
          <p className="re-label">Your plan</p>
          {planned.map((p) => (
            <LoggerRow key={p.exercise_id} planned={p} doneSets={setsByExercise[p.exercise_id] || []}
                       onLogSet={onLogSet} />
          ))}
        </div>
      )}

      {extraExerciseIds.map((id) => {
        const ex = exercises.find((x) => x.id === id);
        return (
          <LoggerRow key={id}
                     planned={{ exercise_id: id, name: ex?.name || `Exercise #${id}`,
                                muscle_group: ex?.muscle_group, equipment: ex?.equipment, sets: setsByExercise[id].length }}
                     doneSets={setsByExercise[id]} onLogSet={onLogSet} />
        );
      })}

      <div className="re-card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="re-label">Add an unplanned exercise</p>
          {doneBefore.length > 0 && (
            <div className="flex gap-1">
              {[["done", `Done before (${doneBefore.length})`], ["all", "All exercises"]].map(([k, label]) => (
                <button key={k} onClick={() => { setPickMode(k); setExerciseId(""); }}
                        className={`rounded-full px-2.5 py-1 text-[11px] transition-all ${
                          shownMode === k ? "bg-mcz-cyan/20 text-mcz-cyan ring-1 ring-mcz-cyan/40" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <select className="w-full max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                  value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            <option value="">Exercise…</option>
            {pickList.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({MUSCLE_LABEL[ex.muscle_group] || ex.muscle_group})
                {shownMode === "done" ? ` · ${ex.times_done}× · last ${new Date(ex.last_done).toLocaleDateString()}` : ""}
              </option>
            ))}
          </select>
          <Field label={`Weight (${unit})`} className="w-28" placeholder="optional" type="number" min="0" step="0.5" inputMode="decimal"
                 value={weight} onChange={(e) => setWeight(e.target.value)} />
          <Field label="Reps" className="w-24" placeholder="reps" type="number" min="1" max="1000" inputMode="numeric"
                 value={reps} onChange={(e) => setReps(e.target.value)} />
          <button className="neon-btn-primary !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                  disabled={!exerciseId || !reps}
                  onClick={() => {
                    onLogSet(Number(exerciseId), Number(reps), weight === "" ? "" : Number(weight));
                    setReps(""); setWeight("");
                  }}>
            <Plus size={13} /> Log
          </button>
        </div>
      </div>
    </div>
  );
}

// What the member's body can do — three independent answers, because someone
// who cannot walk can usually use both arms and someone with one arm out of
// action can usually still leg-press. The server decides which exercises that
// leaves (`accessible` on every row); this only asks, and says how many it
// leaves so a restrictive choice is never a silent empty list.
function AccessPanel({ access, onChange, shown, total }) {
  const restricted = access.seated_or_lying_only || !access.arms_ok || !access.legs_ok;
  const [open, setOpen] = useState(restricted);
  const rows = [
    { key: "seated_or_lying_only", on: access.seated_or_lying_only,
      label: "I can't stand or walk", hint: "Only seated or lying exercises",
      set: (v) => ({ seated_or_lying_only: v }) },
    { key: "arms_ok", on: !access.arms_ok,
      label: "I can't use my arms", hint: "Hide anything that needs them",
      set: (v) => ({ arms_ok: !v }) },
    { key: "legs_ok", on: !access.legs_ok,
      label: "I can't use my legs", hint: "Hide anything that needs them, and anything standing",
      set: (v) => ({ legs_ok: !v }) },
  ];
  return (
    <div className="re-card space-y-2">
      <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen(!open)}
              aria-expanded={open}>
        <span className="text-sm font-semibold text-white">
          What I can do
          {restricted && <span className="ml-2 text-[11px] font-normal text-mcz-cyan">showing {shown} of {total} exercises</span>}
        </span>
        <span className="text-[11px] text-white/40">{open ? "Hide" : restricted ? "Change" : "Set up"}</span>
      </button>
      {open && (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <label key={r.key} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
              <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={r.on}
                     onChange={(e) => onChange(r.set(e.target.checked))} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-white">{r.label}</span>
                <span className="block text-[11px] text-white/40">{r.hint}</span>
              </span>
            </label>
          ))}
          <p className="text-[11px] text-white/35">
            This only changes which exercises you are offered. It never changes a rating, a score or a goal.
            Past sessions keep their exercises either way.
          </p>
        </div>
      )}
    </div>
  );
}

// The Jefit signature move: pick exercises off the library, filtered by
// muscle group AND equipment (both already served on every exercise row —
// no backend change needed), give each a target sets/reps/weight, reorder
// and remove. Saved shape is `{exercise_id, order, sets, reps, weight_kg}`,
// which the logger reads back to show a target beside each input.
function RoutineDesigner({ routine, exercises, pickable, demoCredit, onSave, onClose }) {
  const unit = useUnit();
  const [rows, setRows] = useState(
    () => asList(routine.exercises).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((e) => ({ ...e })));
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [dirty, setDirty] = useState(false);

  const filtered = useMemo(() => (pickable || exercises).filter((ex) =>
    (!muscle || ex.muscle_group === muscle)
    && (equipment.length === 0 || equipment.includes(ex.equipment))
  ), [exercises, pickable, muscle, equipment]);

  const addExercise = (exerciseId) => {
    if (rows.some((r) => r.exercise_id === exerciseId)) return;
    setRows([...rows, { exercise_id: exerciseId, sets: 3, reps: 10, weight_kg: null }]);
    setDirty(true);
  };
  const removeExercise = (exerciseId) => {
    setRows(rows.filter((r) => r.exercise_id !== exerciseId));
    setDirty(true);
  };
  const moveRow = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
    setDirty(true);
  };
  const patchRow = (i, patch) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    setRows(next);
    setDirty(true);
  };

  const save = () => {
    onSave(rows.map((r, i) => ({
      exercise_id: r.exercise_id, order: i,
      sets: r.sets ? Number(r.sets) : undefined,
      reps: r.reps ? Number(r.reps) : undefined,
      weight_kg: r.weight_kg === "" || r.weight_kg == null ? null : Number(r.weight_kg),
    })));
    setDirty(false);
  };

  return (
    <div className="re-card space-y-3 border-fuchsia-400/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Designing "{routine.title}"</p>
        <button className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-white/40">
          No exercises yet — add some from the library below.
        </p>
      )}
      {rows.map((r, i) => {
        const ex = exercises.find((x) => x.id === r.exercise_id);
        return (
          <div key={r.exercise_id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <div className="flex flex-col">
              <button className="rounded p-0.5 text-white/30 hover:text-white disabled:opacity-20"
                      disabled={i === 0} onClick={() => moveRow(i, -1)}><ChevronUp size={13} /></button>
              <button className="rounded p-0.5 text-white/30 hover:text-white disabled:opacity-20"
                      disabled={i === rows.length - 1} onClick={() => moveRow(i, 1)}><ChevronDown size={13} /></button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{ex?.name || `#${r.exercise_id}`}</p>
              <p className="text-[11px] text-white/40">
                {MUSCLE_LABEL[ex?.muscle_group] || ex?.muscle_group}
                {ex?.equipment && ` · ${EQUIPMENT_LABEL[ex.equipment] || ex.equipment}`}
                {ex?.demo_url && <> · <DemoLink url={ex.demo_url} /></>}
              </p>
            </div>
            <input className="neon-input !py-1.5 w-20 text-xs" type="number" min="0" step="0.5" placeholder={unit}
                   aria-label={`Target weight (${unit})`} inputMode="decimal"
                   value={r.weight_input ?? (fromKg(r.weight_kg, unit) ?? "")}
                   onChange={(e) => patchRow(i, { weight_input: e.target.value, weight_kg: toKg(e.target.value, unit) })} />
            <input className="neon-input !py-1.5 w-16 text-xs" type="number" min="1" placeholder="sets"
                   aria-label="Sets" inputMode="numeric"
                   value={r.sets ?? ""} onChange={(e) => patchRow(i, { sets: e.target.value })} />
            <span className="text-white/30 text-xs">×</span>
            <input className="neon-input !py-1.5 w-16 text-xs" type="number" min="1" placeholder="reps"
                   aria-label="Reps" inputMode="numeric"
                   value={r.reps ?? ""} onChange={(e) => patchRow(i, { reps: e.target.value })} />
            <button className="rounded p-1.5 text-white/30 hover:bg-white/10 hover:text-mcz-ember"
                    onClick={() => removeExercise(r.exercise_id)}><Trash2 size={13} /></button>
          </div>
        );
      })}

      <button className="neon-btn-primary !w-auto px-4 py-2 text-xs disabled:opacity-40" disabled={!dirty}
              onClick={save}>
        Save routine
      </button>

      <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="re-label">Add from the library</p>
        {demoCredit && <p className="text-[11px] text-white/35">{demoCredit}</p>}
        <select className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          <option value="">All muscle groups</option>
          {Object.entries(MUSCLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <EquipmentPicker selected={equipment}
                         onToggle={(k) => setEquipment((cur) => toggleEquipment(cur, k))} />
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {filtered.map((ex) => {
            const already = rows.some((r) => r.exercise_id === ex.id);
            return (
              <button key={ex.id} disabled={already} onClick={() => addExercise(ex.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                        already ? "bg-white/5 text-white/25" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
                <span className="flex items-center gap-1.5">
                  <Dumbbell size={12} className="shrink-0 text-white/30" /> {ex.name}
                </span>
                <span className="text-white/35">
                  {MUSCLE_LABEL[ex.muscle_group]} · {EQUIPMENT_LABEL[ex.equipment]}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="text-[11px] text-white/30 px-1">No exercises match.</p>}
        </div>
      </div>
    </div>
  );
}

// Same scheduler shape Lilith gives a task, applied to a routine instead:
// Inbox for an idea, Today for what you're doing now, Upcoming for a dated
// training day, Anytime for a backup you can reach for whenever, Someday for
// a program you're not starting yet, Trash for "gone, but not yet forever".
// The Jefit thing this whole file was missing: several distinct routines can
// share one weekday, member picks at run time which "Mon" they're doing. So
// day_tag is not the workflow bucket (inbox/today/…) and not a calendar date
// (scheduled_for) — it's a recurring label a routine can carry independent of
// either, and several routines can carry the SAME one. `dayFilter` is what
// makes that visible: "3 Monday routines" at a glance instead of scrolling.
// "c:12" is one of the member's own days, anything else a weekday key. A
// routine carries one or the other; the server clears whichever isn't sent.
const dayBody = (v) => (typeof v === "string" && v.startsWith("c:")
  ? { day_tag: "", custom_day_id: Number(v.slice(2)) }
  : { day_tag: v || "", custom_day_id: null });
const routineDay = (r) => (r.custom_day_id ? `c:${r.custom_day_id}` : r.day_tag || "");

function DayTagPicker({ value, labels, onChange, className }) {
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)}
            className={className || "rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-white outline-none"}>
      <option value="">No day</option>
      {labels.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
    </select>
  );
}

function SchedulerView({ buckets, bucketLabels, dayTagLabels, exercises, pickable, demoCredit, onCreate, onDelete, onMove, onSchedule,
                          onStart, sessionOpen, onSaveExercises, onEditMeta, goals, onSetGoal,
                          customDays = [], onAddDay, onRemoveDay }) {
  const [title, setTitle] = useState("");
  const [dayName, setDayName] = useState("");
  const [newDayTag, setNewDayTag] = useState("");
  const [bucket, setBucket] = useState("inbox");
  const [dayFilter, setDayFilter] = useState("");
  const [designing, setDesigning] = useState(null);
  const allRows = asList(buckets[bucket]);
  const rows = dayFilter ? allRows.filter((r) => routineDay(r) === dayFilter) : allRows;
  const otherBuckets = bucketLabels.filter((b) => b.key !== bucket);
  const designingRoutine = designing != null ? allRows.find((r) => r.id === designing) : null;
  const dayLabel = (k) => dayTagLabels.find((d) => d.key === k)?.label || k;
  // Counts across the WHOLE bucket, not the filtered view, so the chip row
  // itself is the "you have 3 Monday routines" readout.
  const dayCounts = dayTagLabels.reduce((acc, d) => {
    acc[d.key] = allRows.filter((r) => routineDay(r) === d.key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="re-card flex flex-wrap gap-2">
        <input className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="New routine name"
               value={title} onChange={(e) => setTitle(e.target.value)} />
        <DayTagPicker value={newDayTag} labels={dayTagLabels} onChange={setNewDayTag}
                      className="neon-input !py-2 !w-auto text-sm" />
        <button className="neon-btn-primary !w-auto px-4 py-2 text-xs"
                onClick={() => { if (title.trim()) { onCreate(title.trim(), bucket, newDayTag); setTitle(""); setNewDayTag(""); } }}>
          Create
        </button>
      </div>

      <div className="re-card space-y-2">
        <p className="re-label">My days</p>
        <p className="text-[11px] text-white/45">
          Name your own days (Leg day, Gym with Sam) and tag routines with them next to Mon–Sun.
        </p>
        {customDays.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {customDays.map((d) => (
              <span key={d.id} className="inline-flex items-center gap-1 rounded-full bg-mcz-cyan/15 px-2.5 py-1 text-[11px] text-mcz-cyan ring-1 ring-mcz-cyan/30">
                {d.name}
                <button className="text-mcz-cyan/60 hover:text-mcz-ember" title="Delete this day (routines keep everything, they just lose the tag)"
                        onClick={() => { if (window.confirm(`Delete the day "${d.name}"? Its routines are kept, untagged.`)) onRemoveDay(d.id); }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="New day, e.g. Leg day" maxLength={30}
                 value={dayName} onChange={(e) => setDayName(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter" && dayName.trim()) onAddDay(dayName.trim()).then((ok) => ok && setDayName("")); }} />
          <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs" disabled={!dayName.trim()}
                  onClick={() => onAddDay(dayName.trim()).then((ok) => ok && setDayName(""))}>
            Add day
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {bucketLabels.map((b) => (
          <button key={b.key} onClick={() => { setBucket(b.key); setDesigning(null); setDayFilter(""); }}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-all ${
              bucket === b.key ? "bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-400/40"
                               : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
            {b.label}
            <span className="text-white/35">{asList(buckets[b.key]).length}</span>
          </button>
        ))}
      </div>

      {dayTagLabels.some((d) => dayCounts[d.key] > 0) && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setDayFilter("")}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition-all ${
                    !dayFilter ? "bg-mcz-cyan/20 text-mcz-cyan ring-1 ring-mcz-cyan/40" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
            All
          </button>
          {dayTagLabels.filter((d) => dayCounts[d.key] > 0).map((d) => (
            <button key={d.key} onClick={() => setDayFilter(dayFilter === d.key ? "" : d.key)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition-all ${
                      dayFilter === d.key ? "bg-mcz-cyan/20 text-mcz-cyan ring-1 ring-mcz-cyan/40" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
              {d.label} <span className="text-white/35">{dayCounts[d.key]}</span>
            </button>
          ))}
        </div>
      )}

      {designingRoutine && (
        <RoutineDesigner routine={designingRoutine} exercises={exercises} pickable={pickable} demoCredit={demoCredit}
                          onSave={(list) => { onSaveExercises(designingRoutine.id, list); }}
                          onClose={() => setDesigning(null)} />
      )}

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
          Nothing in here.
        </p>
      )}
      {rows.map((r) => (
        <div key={r.id} className="re-card space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-semibold text-white">{r.title}</p>
                {routineDay(r) && (
                  <span className="shrink-0 rounded-full bg-mcz-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-mcz-cyan ring-1 ring-mcz-cyan/30">
                    {dayLabel(routineDay(r))}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/45">
                {asList(r.exercises).length} exercise{asList(r.exercises).length === 1 ? "" : "s"}
                {r.scheduled_for && (
                  <span className="ml-2 inline-flex items-center gap-1 text-mcz-cyan">
                    <CalendarDays size={11} /> {r.scheduled_for}
                  </span>
                )}
              </p>
              {r.description && <p className="text-[11px] text-white/40 mt-0.5">{r.description}</p>}
            </div>
            <div className="flex gap-2">
              {bucket !== "trash" && (
                <>
                  <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                          onClick={() => setDesigning(designing === r.id ? null : r.id)}>
                    <Dumbbell size={13} /> {designing === r.id ? "Close" : "Design"}
                  </button>
                  <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                          disabled={sessionOpen}
                          title={sessionOpen ? "Finish your open session first" : "Start a session from this routine"}
                          onClick={() => onStart(r.id)}>
                    <Play size={13} /> Start
                  </button>
                </>
              )}
              <button className="rounded p-2 text-white/30 hover:bg-white/10 hover:text-mcz-ember"
                      onClick={() => onDelete(r.id)} title="Delete permanently">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {bucket === "upcoming" ? (
              <input type="date" defaultValue={r.scheduled_for || ""}
                     className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-white outline-none"
                     onChange={(e) => onSchedule(r.id, e.target.value)} />
            ) : (
              <button onClick={() => {
                        const d = window.prompt("Schedule for (YYYY-MM-DD):", "");
                        if (d) onSchedule(r.id, d);
                      }}
                      className="text-[11px] text-white/40 hover:text-white/70 inline-flex items-center gap-1">
                <CalendarDays size={12} /> Schedule
              </button>
            )}
            <DayTagPicker value={routineDay(r)} labels={dayTagLabels}
                          onChange={(v) => onEditMeta(r.id, v, r.description || "")} />
            {goals && (
              <select value={r.goal || ""} onChange={(e) => onSetGoal(r.id, e.target.value)}
                      className="rounded border border-white/[0.08] bg-black/40 px-1.5 py-0.5 text-[11px] text-white/70 outline-none">
                <option value="">No goal</option>
                {Object.entries(goals).map(([k, g]) => (
                  <option key={k} value={k}>{g.label} · {clock(g.rest_seconds)} rest</option>
                ))}
              </select>
            )}
            <button onClick={() => {
                      const d = window.prompt("Routine description:", r.description || "");
                      if (d != null) onEditMeta(r.id, routineDay(r), d);
                    }}
                    className="text-[11px] text-white/40 hover:text-white/70">
              {r.description ? "Edit note" : "Add note"}
            </button>
            {otherBuckets.map((b) => (
              <button key={b.key} onClick={() => onMove(r.id, b.key)}
                      className="text-[11px] text-white/40 hover:text-white/70">
                Move to {b.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Which muscles were trained recently, which are going stale, which are
// getting hit every session — every status and count is the server's own
// word, never a fabricated 0-100 "balance score" nobody could check.
//
// volume_score IS a score out of 10, and it earns the exception: it's
// `sets_last_7d ÷ target_weekly_sets`, and BOTH numbers it's built from are
// printed right beside it, so it's a ratio a member can check, not a black
// box. Clicking a card expands it — the score's own citation, and every
// exercise the library has for that muscle, because "here's your number" and
// "here's nowhere to take it" is the exact dead end the cross-pollination
// rule exists to close.
function BodyMapView({ bodymap, exercises, onBuildForMuscle }) {
  const unit = useUnit();
  const [open, setOpen] = useState(null);
  if (!bodymap) return null;
  const muscles = asList(bodymap.muscles);
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/45">
        Trailing {bodymap.window_days} days. "Overworked" counts separate training
        days, not sets — five sets in one session isn't five sessions. Tap a
        muscle for your score and every exercise the library has for it.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {muscles.map((m) => {
          const s = BODYMAP_STATUS[m.status] || BODYMAP_STATUS.untrained;
          const isOpen = open === m.muscle_group;
          const pool = (exercises || []).filter((ex) => ex.muscle_group === m.muscle_group);
          return (
            <div key={m.muscle_group} className={`re-card min-w-0 space-y-2 ${isOpen ? "sm:col-span-2" : ""}`}>
              <button className="flex w-full items-center justify-between gap-2 text-left"
                      onClick={() => setOpen(isOpen ? null : m.muscle_group)}>
                <div className="flex min-w-0 items-center gap-2">
                  {muscleIcon(m.muscle_group) && (
                    <img src={muscleIcon(m.muscle_group)} alt={m.label} className="h-8 w-8 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white flex flex-wrap items-center gap-1.5">
                      {m.label}
                      <span className="rounded-full bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-200 ring-1 ring-fuchsia-400/30">
                        {m.volume_score}/10
                      </span>
                      {m.coach_rating != null ? (
                        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200 ring-1 ring-emerald-400/30"
                              title={m.coach_why}>
                          Coach {m.coach_rating}/10
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-white/35 ring-1 ring-white/10"
                              title={m.coach_why}>
                          Coach: not rated yet
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white/45">
                      {m.last_trained
                        ? `Last trained ${new Date(m.last_trained).toLocaleDateString()}`
                        : "Never trained"}
                      {m.sets_last_7d > 0 && ` · ${m.sets_last_7d} set${m.sets_last_7d === 1 ? "" : "s"} this week`}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.color}`}>
                  {s.said}
                </span>
              </button>
              {isOpen && (
                <div className="space-y-2 border-t border-white/10 pt-2">
                  <div className="space-y-1 rounded-lg bg-white/[0.03] p-2">
                    <p className="text-xs font-semibold text-white/70">
                      Coach rating{m.coach_rating != null ? `: ${m.coach_rating}/10` : ": not rated yet"}
                    </p>
                    <p className="text-[11px] text-white/50">{m.coach_why}</p>
                    {asList(m.coach_exercises).map((e) => (
                      <p key={e.exercise_id} className="text-[11px] text-white/60">
                        <span className={e.trend === "up" ? "text-emerald-300" : e.trend === "down" ? "text-mcz-ember" : "text-white/50"}>
                          {e.trend === "up" ? "▲ up" : e.trend === "down" ? "▼ down" : "● held"}
                        </span>{" "}
                        {e.exercise_name}: {e.metric === "reps"
                          ? `${e.earlier_best} → ${e.latest} reps (best set)`
                          : `${fmtWeight(e.earlier_best, unit)} → ${fmtWeight(e.latest, unit)} (est. max)`}
                      </p>
                    ))}
                    <p className="text-[10px] text-white/30">{bodymap.rating_caveat}</p>
                  </div>
                  <p className="text-[11px] text-white/35">
                    Score = {m.sets_last_7d} set{m.sets_last_7d === 1 ? "" : "s"} logged this week ÷{" "}
                    {bodymap.target_weekly_sets}-set weekly target, capped at 10. {bodymap.volume_citation}
                  </p>
                  {pool.length === 0 ? (
                    <p className="text-xs text-white/40">No exercises in the library for {m.label} yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {pool.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between gap-2 text-xs text-white/60">
                          <span>{ex.name} <span className="text-white/30">· {EQUIPMENT_LABEL[ex.equipment]}</span></span>
                          <DemoLink url={ex.demo_url} />
                        </div>
                      ))}
                    </div>
                  )}
                  {onBuildForMuscle && (
                    <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-[11px] inline-flex items-center gap-1"
                            onClick={() => onBuildForMuscle(m.muscle_group)}>
                      <Dumbbell size={12} /> Build a day for just {m.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Which muscles BodyMap has real status for and haven't been trained enough
// — "untrained" first, then "undertrained" — read off the SAME status this
// screen's BodyMap tab already shows, never a fresh guess. Picking exercises
// this way is arithmetic over real training-load data, same as every other
// number Coach shows; it never touches a rating or a skill level.
const NEED_ORDER = { untrained: 0, undertrained: 1, balanced: 2, recent: 3, overworked: 4 };

function buildBalancedRoutine(bodymap, exercises, equipment) {
  const matches = (ex) => {
    if (!equipment) return true;
    if (Array.isArray(equipment)) return equipment.length === 0 || equipment.includes(ex.equipment);
    return ex.equipment === equipment;
  };
  const muscles = asList(bodymap?.muscles)
    .slice()
    .sort((a, b) => (NEED_ORDER[a.status] ?? 9) - (NEED_ORDER[b.status] ?? 9));
  const picked = [];
  for (const m of muscles) {
    if (m.muscle_group === "cardio") continue;
    const pool = exercises.filter((ex) => ex.muscle_group === m.muscle_group && matches(ex));
    if (pool.length === 0) continue;
    picked.push(pool[0]);
    if (picked.length >= 6) break;
  }
  return picked;
}

// A demo link when the server has a real one — never a placeholder, never
// fabricated. See BodieZExercise.demo_url's own docstring: nothing here has
// been through the malware scan WidgetZ requires before a link is framed, so
// this always opens outside, the same way an unscanned member link does.
function DemoLink({ url }) {
  if (!url) return null;
  return (
    <a href={demoSrc(url)} target="_blank" rel="noreferrer"
       className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-mcz-cyan hover:underline">
      <PlayCircle size={12} /> Demo
    </a>
  );
}

// Goal picker: which REAL, cited rep/set/rest scheme Build a Routine writes
// onto every pick. `goals` comes from the server (BodieZCoachView) — never
// retyped here, or this becomes the second place "8-12 reps for hypertrophy"
// lives, and the two drift the way a tier number always does.
function BuildRoutine({ bodymap, exercises, goals, onBuildRoutine }) {
  const [equipment, setEquipment] = useState([]);
  const [goalKey, setGoalKey] = useState("");
  const [open, setOpen] = useState(false);
  const picks = useMemo(() => buildBalancedRoutine(bodymap, exercises, equipment),
    [bodymap, exercises, equipment]);
  const goal = goalKey ? goals?.[goalKey] : null;

  return (
    <div className="re-card space-y-2">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          <Wand2 size={14} className="text-fuchsia-300" /> Build a routine from BodyMap
        </span>
        {open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
      </button>
      {open && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-white/45">
            Picks one exercise per muscle group, starting with whatever BodyMap
            calls untrained or undertrained — real training-load data, not a guess.
          </p>
          {goals && (
            <select className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                    value={goalKey} onChange={(e) => setGoalKey(e.target.value)}>
              <option value="">General (3 sets x 10)</option>
              {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
            </select>
          )}
          <EquipmentPicker selected={equipment}
                           onToggle={(k) => setEquipment((cur) => toggleEquipment(cur, k))} />
          {goal && (
            <div className="rounded-lg bg-fuchsia-500/5 px-2.5 py-2 text-[11px] text-white/60">
              <p className="font-semibold text-fuchsia-200">
                {goal.sets} sets x {goal.reps_low}-{goal.reps_high} reps, {goal.rest_seconds}s rest
              </p>
              <p className="mt-0.5">{goal.why}</p>
              <p className="mt-1 text-white/35">{goal.citation}</p>
            </div>
          )}
          {picks.length === 0 ? (
            <p className="text-xs text-white/40">Not enough BodyMap data yet — log a session first.</p>
          ) : (
            <div className="space-y-1">
              {picks.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between gap-2 text-xs text-white/60">
                  <span>{MUSCLE_LABEL[ex.muscle_group]} — {ex.name}</span>
                  <DemoLink url={ex.demo_url} />
                </div>
              ))}
            </div>
          )}
          <button className="neon-btn-primary !w-auto px-4 py-2 text-xs disabled:opacity-40"
                  disabled={picks.length === 0}
                  onClick={() => onBuildRoutine(
                    `Coach routine — ${goal ? goal.label : "General"} — ${new Date().toLocaleDateString()}`,
                    picks.map((ex, i) => ({
                      exercise_id: ex.id, order: i,
                      sets: goal ? goal.sets : 3,
                      reps: goal ? goal.reps_low : 10,
                      weight_kg: null,
                    })),
                    "", goalKey
                  )}>
            <Plus size={13} /> Save to Scheduler
          </button>
        </div>
      )}
    </div>
  );
}

// pickForDay moved to ../bodiezPick.js — the trial door's split builder
// needs it too, and it must not drag this whole file (BodyMap, sessions,
// progress, recovery) into Register's bundle just to reuse one lookup. See
// that file's own comment for why.

// "Does BodieZ cover every muscle in split days, 1-6 days a week?" — it
// didn't, until this. `splits` is the server's SPLITS table (bodiez.py) —
// real, named conventions (full body / upper-lower / push-pull-legs /
// body-part split), never invented here. Picking a day count previews
// every day's label and muscles before anything saves, then writes one
// real BodieZRoutine per day in one batch.
function SplitBuilder({ bodymap, exercises, goals, splits, onBuildSplit }) {
  const [days, setDays] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [goalKey, setGoalKey] = useState("");
  const [open, setOpen] = useState(false);
  const split = days ? splits?.[days] : null;
  const goal = goalKey ? goals?.[goalKey] : null;

  const preview = useMemo(() => {
    if (!split) return [];
    return split.days.map((day) => ({
      ...day, picks: pickForDay(day.muscles, bodymap, exercises, equipment),
    }));
  }, [split, bodymap, exercises, equipment]);

  const allPicked = preview.length > 0 && preview.every((d) => d.picks.length > 0);

  return (
    <div className="re-card space-y-2">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          <CalendarDays size={14} className="text-mcz-cyan" /> Build a week — split by training days
        </span>
        {open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
      </button>
      {open && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-white/45">
            Pick how many days a week you train and BodieZ builds one real routine
            per day — full body, upper/lower, push/pull/legs or a body-part split,
            each covering every muscle group across the week.
          </p>
          <div className="flex flex-wrap gap-2">
            <select className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                    value={days} onChange={(e) => setDays(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Days per week…</option>
              {splits && Object.keys(splits).map((k) => (
                <option key={k} value={k}>{splits[k].label}</option>
              ))}
            </select>
            {goals && (
              <select className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                      value={goalKey} onChange={(e) => setGoalKey(e.target.value)}>
                <option value="">General (3 sets x 10)</option>
                {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
              </select>
            )}
          </div>
          <EquipmentPicker selected={equipment}
                           onToggle={(k) => setEquipment((cur) => toggleEquipment(cur, k))} />
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
                        <DemoLink url={ex.demo_url} />
                      </div>
                    ))
                  )}
                </div>
              ))}
              {days > 1 && (
                <p className="text-[11px] text-white/35">
                  "Arms" appears on more than one day above where the split names a Push and a
                  Pull day — the library doesn't separate biceps from triceps, so the whole arms
                  bucket rides on both rather than being silently dropped from one.
                </p>
              )}
            </div>
          )}
          <button className="neon-btn-primary !w-auto px-4 py-2 text-xs disabled:opacity-40"
                  disabled={!allPicked}
                  onClick={() => onBuildSplit(preview.map((day) => ({
                    title: `${split.label.replace(/^\d+ days?\/week — /, "")} — ${day.label}${goal ? ` — ${goal.label}` : ""}`,
                    exercises: day.picks.map((ex, i) => ({
                      exercise_id: ex.id, order: i,
                      sets: goal ? goal.sets : 3,
                      reps: goal ? goal.reps_low : 10,
                      weight_kg: null,
                    })),
                    goal: goalKey,
                  })))}>
            <Plus size={13} /> Save {days || ""} routine{days === 1 ? "" : "s"} to Scheduler
          </button>
        </div>
      )}
    </div>
  );
}

// The other half of "does BodieZ cover every muscle": SplitBuilder answers it
// with the server's own named conventions (upper/lower, push/pull/legs), and
// those conventions all assume legs are trainable. A member training around a
// disability — two upper-body days a week, split by which muscles rather than
// by a textbook's push/pull label — has no named split to reach for, and
// forcing one on them would mean training legs on a day they can't. This
// picks straight off the real muscle groups instead: no split name, no
// assumption about which muscles belong on which day, just what the member
// says today's day is for. Same exercise-and-goal machinery as BuildRoutine.
// Cardio and Full Body are left off the toggle row for the same reason
// SplitBuilder never assigns either to a day — "cardio day" and "full body
// day" aren't what picking muscles for a day means.
function MuscleDayBuilder({ exercises, goals, dayTagLabels, initialMuscle, onInitialMuscleConsumed, onBuildRoutine }) {
  const MUSCLES = ["abs", "back", "biceps", "chest", "forearms", "glutes",
                    "shoulders", "triceps", "upper_legs", "lower_legs"];
  const [muscles, setMuscles] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [goalKey, setGoalKey] = useState("");
  const [dayTag, setDayTag] = useState("");
  const [perMuscle, setPerMuscle] = useState(2);
  const [open, setOpen] = useState(false);
  const goal = goalKey ? goals?.[goalKey] : null;

  // BodyMap's "Build a day for just this muscle" lands HERE, on the control,
  // pre-selected and open — the same rule `goToSpot` follows everywhere else
  // in this app: a jump that dumps a member at the top of a tab they then
  // have to go hunting through is where the cross-pollination rule dies.
  useEffect(() => {
    if (!initialMuscle) return;
    setMuscles([initialMuscle]);
    setOpen(true);
    onInitialMuscleConsumed?.();
  }, [initialMuscle]);

  const toggleMuscle = (m) =>
    setMuscles((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const matches = (ex) => equipment.length === 0 || equipment.includes(ex.equipment);
  const picks = useMemo(() => {
    const out = [];
    for (const m of muscles) {
      const pool = exercises.filter((ex) => ex.muscle_group === m && matches(ex));
      out.push(...pool.slice(0, perMuscle));
    }
    return out;
  }, [muscles, exercises, equipment, perMuscle]);

  const dayLabel = dayTagLabels.find((d) => d.key === dayTag)?.label;

  return (
    <div className="re-card space-y-2">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          <Dumbbell size={14} className="text-emerald-300" /> Build a day — pick the muscles yourself
        </span>
        {open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
      </button>
      {open && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-white/45">
            No named split — just the muscles this day trains. Good for training around what
            you can do, not what a textbook split assumes: e.g. biceps + triceps + forearms +
            shoulders one day, chest + back + abs the next, however many days a week suits you.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLES.map((m) => (
              <button key={m} onClick={() => toggleMuscle(m)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-all ${
                        muscles.includes(m) ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40"
                                            : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                {muscleIcon(m) && (
                  <img src={muscleIcon(m)} alt={MUSCLE_LABEL[m]} className="h-4 w-4 flex-shrink-0" />
                )}
                {MUSCLE_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {dayTagLabels.length > 0 && (
              <DayTagPicker value={dayTag} labels={dayTagLabels} onChange={setDayTag}
                            className="neon-input !py-1.5 !w-auto text-xs" />
            )}
            {goals && (
              <select className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                      value={goalKey} onChange={(e) => setGoalKey(e.target.value)}>
                <option value="">General (3 sets x 10)</option>
                {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
              </select>
            )}
            <select className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                    value={perMuscle} onChange={(e) => setPerMuscle(Number(e.target.value))}>
              <option value={1}>1 exercise per muscle</option>
              <option value={2}>2 exercises per muscle</option>
              <option value={3}>3 exercises per muscle</option>
            </select>
          </div>
          <EquipmentPicker selected={equipment}
                           onToggle={(k) => setEquipment((cur) => toggleEquipment(cur, k))} />
          {goal && (
            <div className="rounded-lg bg-fuchsia-500/5 px-2.5 py-2 text-[11px] text-white/60">
              <p className="font-semibold text-fuchsia-200">
                {goal.sets} sets x {goal.reps_low}-{goal.reps_high} reps, {goal.rest_seconds}s rest
              </p>
              <p className="mt-0.5">{goal.why}</p>
              <p className="mt-1 text-white/35">{goal.citation}</p>
            </div>
          )}
          {muscles.length === 0 ? (
            <p className="text-xs text-white/40">Pick at least one muscle group above.</p>
          ) : picks.length === 0 ? (
            <p className="text-xs text-mcz-ember">No exercises match that equipment for these muscles.</p>
          ) : (
            <div className="space-y-1">
              {picks.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between gap-2 text-xs text-white/60">
                  <span>{MUSCLE_LABEL[ex.muscle_group]} — {ex.name}</span>
                  <DemoLink url={ex.demo_url} />
                </div>
              ))}
            </div>
          )}
          <button className="neon-btn-primary !w-auto px-4 py-2 text-xs disabled:opacity-40"
                  disabled={picks.length === 0}
                  onClick={() => onBuildRoutine(
                    `${dayLabel ? `${dayLabel} — ` : ""}${muscles.map((m) => MUSCLE_LABEL[m]).join("/")}${goal ? ` — ${goal.label}` : ""}`,
                    picks.map((ex, i) => ({
                      exercise_id: ex.id, order: i,
                      sets: goal ? goal.sets : 3,
                      reps: goal ? goal.reps_low : 10,
                      weight_kg: null,
                    })),
                    dayTag, goalKey
                  )}>
            <Plus size={13} /> Save to Scheduler
          </button>
        </div>
      )}
    </div>
  );
}

// One recommendation per exercise, built from comparing the member's own
// last two logged sessions — arithmetic, not a model, and every row shows
// the numbers behind it rather than asking to be trusted. "Build a routine"
// above it is the same rule applied to a whole routine instead of one
// exercise: it reads BodyMap's real status, never invents one.
function CoachView({ coach, bodymap, exercises, dayTagLabels, prefillMuscle, onPrefillConsumed, onBuildRoutine, onBuildSplit }) {
  if (!coach) return null;
  const rows = asList(coach.exercises);
  const labels = asDict(coach.labels);
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/45 inline-flex items-center gap-1">
        <Activity size={12} /> Built from your own logged sets — no AI, no guessing.
        An exercise untouched {coach.stale_after_days}+ days gets flagged to reintroduce or swap.
      </p>

      {bodymap && exercises?.length > 0 && (
        <>
          <BuildRoutine bodymap={bodymap} exercises={exercises} goals={coach.goals} onBuildRoutine={onBuildRoutine} />
          <SplitBuilder bodymap={bodymap} exercises={exercises} goals={coach.goals} splits={coach.splits}
                        onBuildSplit={onBuildSplit} />
          <MuscleDayBuilder exercises={exercises} goals={coach.goals} dayTagLabels={dayTagLabels || []}
                            initialMuscle={prefillMuscle} onInitialMuscleConsumed={onPrefillConsumed}
                            onBuildRoutine={onBuildRoutine} />
        </>
      )}

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
          Log a couple of sessions and Coach will have something to say.
        </p>
      )}
      {rows.map((row) => (
        <div key={row.exercise_id} className="re-card space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">{row.exercise_name}</p>
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-200 ring-1 ring-fuchsia-400/30">
              <Sparkles size={11} /> {labels[row.recommendation] || row.recommendation}
            </span>
          </div>
          <p className="text-xs text-white/60">{row.why}</p>
        </div>
      ))}
    </div>
  );
}

// A progress bar built from server numbers only — `pct` null renders as
// "no data yet" rather than a fabricated 0%, the same distinction BodyMap's
// `untrained` status makes for a muscle group nothing has touched.
function GoalBar({ pct }) {
  if (pct == null) {
    return <p className="text-[11px] text-white/40">No data logged toward this yet.</p>;
  }
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-mcz-cyan transition-all"
           style={{ width: `${Math.max(2, pct)}%` }} />
    </div>
  );
}

function NewGoalForm({ kinds, exercises, onCreate }) {
  const unit = useUnit();
  const [kind, setKind] = useState(kinds[0]?.key || "count");
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [targetReps, setTargetReps] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const submit = () => {
    if (!title.trim() || !targetValue) return;
    if (kind === "strength" && !exerciseId) return;
    const inKg = kind === "strength" || kind === "bodyweight";
    onCreate({
      kind, title: title.trim(), target_value: inKg ? toKg(targetValue, unit) : Number(targetValue),
      exercise_id: kind === "strength" ? Number(exerciseId) : undefined,
      target_reps: kind === "strength" && targetReps ? Number(targetReps) : undefined,
      target_date: targetDate || undefined,
    });
    setTitle(""); setTargetValue(""); setExerciseId(""); setTargetReps(""); setTargetDate("");
  };

  return (
    <div className="re-card space-y-2">
      <p className="re-label">New goal</p>
      <div className="flex flex-wrap gap-2">
        <select className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                value={kind} onChange={(e) => setKind(e.target.value)}>
          {kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>
        <input className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="Name this goal"
               value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {kind === "strength" && (
          <select className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                  value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            <option value="">Exercise…</option>
            {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        )}
        <input className="neon-input !py-2 w-28 text-sm" type="number" min="0" step="0.5"
               placeholder={kind === "strength" ? unit : kind === "frequency" ? "x/week" : kind === "bodyweight" ? `target ${unit}` : "target"}
               value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
        {kind === "strength" && (
          <input className="neon-input !py-2 w-24 text-sm" type="number" min="1" placeholder="reps (opt.)"
                 value={targetReps} onChange={(e) => setTargetReps(e.target.value)} />
        )}
        <input className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-white outline-none"
               type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <button className="neon-btn-primary !w-auto px-4 py-2 text-xs inline-flex items-center gap-1" onClick={submit}>
          <Plus size={13} /> Set goal
        </button>
      </div>
    </div>
  );
}

function GoalsView({ goals, exercises, weightLogs, onCreate, onDelete, onLogWeight }) {
  const unit = useUnit();
  const [weightInput, setWeightInput] = useState("");
  if (!goals) return null;
  const rows = asList(goals.goals);
  const kinds = asList(goals.kinds);
  const needsWeightLog = rows.some((g) => g.kind === "bodyweight");

  return (
    <div className="space-y-3">
      <NewGoalForm kinds={kinds} exercises={exercises} onCreate={onCreate} />

      {needsWeightLog && (
        <div className="re-card space-y-2">
          <p className="re-label">Log your weight</p>
          <div className="flex flex-wrap items-center gap-2">
            <input className="neon-input !py-2 w-28 text-sm" type="number" min="0" step="0.1"
                   placeholder={unit} value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
            <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs"
                    onClick={() => { if (weightInput) { onLogWeight(Number(weightInput)); setWeightInput(""); } }}>
              Log
            </button>
            {weightLogs[0] && (
              <span className="text-[11px] text-white/40">
                Last: {fmtWeight(weightLogs[0].weight_kg, unit)} on {new Date(weightLogs[0].logged_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
          No goals set yet.
        </p>
      )}
      {rows.map((g) => (
        <div key={g.id} className="re-card space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Target size={13} className="shrink-0 text-fuchsia-300" /> {g.title}
              </p>
              <p className="text-xs text-white/45">
                {g.exercise_name ? `${g.exercise_name} — ` : ""}
                target {g.kind === "strength" || g.kind === "bodyweight" ? fmtWeight(g.target_value, unit) : g.target_value}
                {g.target_reps ? ` x${g.target_reps}` : ""}
                {g.target_date && ` by ${g.target_date}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {g.achieved && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                  Achieved ✓
                </span>
              )}
              <button className="rounded p-2 text-white/30 hover:bg-white/10 hover:text-mcz-ember"
                      onClick={() => onDelete(g.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <GoalBar pct={g.pct} />
          {g.current_value != null && (
            <p className="text-[11px] text-white/40">
              Currently {g.kind === "strength" || g.kind === "bodyweight" ? fmtWeight(g.current_value, unit) : g.current_value}
              {g.pct != null && ` · ${g.pct}%`}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

const REST_REASON_LABEL = {
  trained_often: "Trained several days this week",
  self_reported: "Your last check-in ran high",
};

// A daily check-in, and a rest signal with its real reasons stated
// separately — never a blended "readiness score", because a number built
// from self-report AND training load averaged together is a number nobody
// could check.
function RecoveryView({ recovery, onLog }) {
  const [soreness, setSoreness] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [notes, setNotes] = useState("");
  if (!recovery) return null;
  const logs = asList(recovery.logs);
  const reasons = asList(recovery.rest_suggested_because);

  const submit = () => {
    onLog({ soreness, sleep_quality: sleepQuality, fatigue, notes: notes.trim() });
    setNotes("");
  };

  const Scale = ({ label, value, onChange }) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-white/60">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)}
                  className={`h-7 w-7 rounded-full text-[11px] font-semibold transition ${
                    value === n ? "bg-mcz-cyan text-black" : "bg-white/10 text-white/50 hover:bg-white/20"
                  }`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {recovery.rest_suggested && (
        <div className="re-card flex items-start gap-2 border-mcz-cyan/40 bg-mcz-cyan/10">
          <Moon size={16} className="mt-0.5 shrink-0 text-mcz-cyan" />
          <div>
            <p className="text-sm font-semibold text-mcz-cyan">A rest day might be worth it.</p>
            <p className="text-xs text-white/50">
              {reasons.map((r) => REST_REASON_LABEL[r] || r).join(" — ")}
            </p>
          </div>
        </div>
      )}

      <div className="re-card space-y-2">
        <p className="re-label">Today's check-in</p>
        <Scale label="Soreness" value={soreness} onChange={setSoreness} />
        <Scale label="Sleep quality" value={sleepQuality} onChange={setSleepQuality} />
        <Scale label="Fatigue" value={fatigue} onChange={setFatigue} />
        <input className="neon-input !py-2 w-full text-sm" placeholder="Notes (optional)"
               value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={280} />
        <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={submit}>
          Log today
        </button>
      </div>

      <div className="space-y-1">
        {logs.length === 0 && <p className="text-xs text-white/40">No check-ins yet.</p>}
        {logs.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
            <span className="text-white/70">{new Date(l.logged_at).toLocaleDateString()}</span>
            <span className="text-white/50">
              Soreness {l.soreness} · Sleep {l.sleep_quality} · Fatigue {l.fatigue}
              {l.notes && ` — ${l.notes}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressView({ progress }) {
  const unit = useUnit();
  if (!progress) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="re-card text-center">
        <p className="text-2xl font-extrabold text-white">{progress.sessions_completed}</p>
        <p className="re-label">Sessions completed</p>
      </div>
      <div className="re-card text-center">
        <p className="text-2xl font-extrabold text-white">{progress.sets_logged}</p>
        <p className="re-label">Sets logged</p>
      </div>
      <div className="re-card text-center">
        <p className="text-2xl font-extrabold text-white">{Math.round(fromKg(progress.total_volume_kg, unit)).toLocaleString()}</p>
        <p className="re-label">Total volume ({unit})</p>
      </div>
    </div>
  );
}

function StepZView({ steps, stepCoach, bodymap, onLogSteps }) {
  const [stepInput, setStepInput] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [showCoach, setShowCoach] = useState(false);

  if (!steps) return null;

  const todayTotal = steps.today_total || 0;
  const dailyGoal = steps.daily_goal || 10000;
  const percentComplete = Math.min((todayTotal / dailyGoal) * 100, 100);
  const stepList = asList(steps.steps || []);
  const coachScores = stepCoach?.scores || {};
  const coachMedians = stepCoach?.medians || {};
  const coachCaveat = stepCoach?.caveat || "Step quality measures consistency, efficiency and form during exercises.";
  const overallScore = stepCoach?.overall_score || null;
  const totalStepCount = stepCoach?.total_steps || 0;
  const stepCountByMuscle = stepCoach?.step_counts || {};

  async function handleLogSteps() {
    const count = parseInt(stepInput, 10);
    if (!count || count < 0) {
      alert("Please enter a valid number of steps");
      return;
    }
    setIsLogging(true);
    try {
      await onLogSteps(count);
      setStepInput("");
    } finally {
      setIsLogging(false);
    }
  }

  const muscleScores = Object.entries(coachMedians).map(([muscle, score]) => ({
    muscle: MUSCLE_LABEL[muscle] || muscle,
    score,
    stepCount: stepCountByMuscle[muscle] || 0,
    status: bodymap?.status?.[muscle] || "unknown",
  })).sort((a, b) => (b.score || 0) - (a.score || 0));

  const dimensionLabels = {
    cadence: "Cadence 🎯",
    form: "Form 💪",
    efficiency: "Efficiency ⚡",
    stability: "Stability 🛡️",
    endurance: "Endurance 🔥",
  };

  return (
    <div className="space-y-5">
      <div className="re-card">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-extrabold text-emerald-300">{todayTotal.toLocaleString()}</p>
            <p className="re-label">Steps today</p>
            <p className="mt-1 text-xs text-white/50">Goal: {dailyGoal.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-mcz-cyan">{Math.round(percentComplete)}%</p>
            <p className="re-label">Complete</p>
          </div>
        </div>

        <div className="mt-4 h-2 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-mcz-cyan to-emerald-400 transition-all duration-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {overallScore !== null && (
        <div className="re-card">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowCoach(!showCoach)}
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles size={16} className="text-fuchsia-300" />
              <span className="font-semibold">Step Quality Coach</span>
            </span>
            {showCoach ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
          </button>

          {showCoach && (
            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-emerald-300">{Math.round(overallScore)}/10</p>
                  <p className="text-xs text-white/50">Overall quality</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-mcz-cyan">{totalStepCount.toLocaleString()}</p>
                  <p className="text-xs text-white/50">Total steps</p>
                </div>
              </div>

              {Object.entries(coachScores).map(([key, score]) => (
                score !== null && (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{dimensionLabels[key] || key}</span>
                      <span className="text-sm font-extrabold text-emerald-300">{Math.round(score)}/10</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-mcz-cyan to-emerald-400"
                        style={{ width: `${Math.min(score * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              ))}

              <p className="text-xs text-white/40 pt-2">{coachCaveat}</p>
            </div>
          )}
        </div>
      )}

      {muscleScores.length > 0 && (
        <div className="re-card">
          <p className="mb-3 text-sm font-semibold">Step quality & count by muscle group</p>
          <div className="space-y-2">
            {muscleScores.map((m) => (
              <div key={m.muscle} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/80">{m.muscle}</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-mcz-cyan font-semibold">{m.stepCount.toLocaleString()} steps</span>
                    <span className="text-emerald-300 font-extrabold">{Math.round(m.score || 0)}/10</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-mcz-cyan to-emerald-400"
                    style={{ width: `${Math.min((m.score || 0) * 10, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="re-card space-y-3">
        <p className="text-sm font-semibold">Log steps</p>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            placeholder="Enter steps"
            value={stepInput}
            onChange={(e) => setStepInput(e.target.value)}
            disabled={isLogging}
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none disabled:opacity-50"
          />
          <button
            className="neon-btn-primary !w-auto shrink-0 px-4 py-2 disabled:opacity-50"
            onClick={handleLogSteps}
            disabled={isLogging}
          >
            {isLogging ? <Loader2 className="animate-spin" size={16} /> : "Log"}
          </button>
        </div>
        <p className="text-xs text-white/40">
          Log steps from your smartwatch or type them in. Each entry adds to today's total.
        </p>
        {stepCoach?.total_steps > 0 && (
          <p className="text-xs text-white/50">
            Last 7 days: <span className="font-semibold text-emerald-300">{stepCoach.total_steps.toLocaleString()}</span> steps
            {stepCoach.avg_per_logged_day != null && <> · {stepCoach.avg_per_logged_day.toLocaleString()} on the days you logged</>}
            {stepCoach.caveat && <span className="block pt-1 text-white/40">{stepCoach.caveat}</span>}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-white/70">Recent logs</p>
        {stepList.length === 0 && (
          <p className="text-xs text-white/40">No steps logged yet today.</p>
        )}
        {stepList.map((log) => (
          <div key={log.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <span className="text-xs text-white/70">
              {new Date(log.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-sm font-semibold text-emerald-300">+{log.count.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {stepList.length > 0 && (
        <div className="re-card text-center">
          <p className="text-xs text-white/50">Total entries today: {stepList.length}</p>
        </div>
      )}
    </div>
  );
}
