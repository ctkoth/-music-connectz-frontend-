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
import Term from "../components/Term.jsx";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { demoSrc } from "../media.js";
import {
  Activity, BellRing, CalendarDays, ChevronDown, ChevronUp, Copy, Dumbbell, Link2, Loader2, Moon, Pencil, PlayCircle, Plus, Play,
  MapPin, MessageSquare, Send, Share2, Sparkles, Square, Target, Trash2, Trophy, Unlink, Wand2, X,
} from "lucide-react";
import { useDragReorder, DragGrip } from "../useDragReorder.jsx";
import { moveItem, moveRun, moveWithinRun } from "../dragReorder.js";
import { api } from "../api.js";
import { asDict, asList } from "../shape.js";
import { IconImg } from "../App.jsx";
import { MUSCLE_ART } from "../iconManifest.js";
import { pickForDay } from "../bodiezPick.js";
import { estimateRoutineSeconds, fmtEstimate, routineTimeNote } from "../routineTime.js";
import { getUnit, saveUnit, fromKg, toKg, fmtWeight } from "../weightUnit.js";
import EquipmentFit from "./EquipmentFit.jsx";
import PlanRating from "./PlanRating.jsx";
import { equipmentOf } from "../equipmentFit.js";
import { PAGE as LOG_PAGE, durationText, filterKey, filtersActive, logQuery, mergeRows, refreshLimit, totalsLine } from "../sessionLog.js";
import { changeText, againstWhat, liftChange, repsChangeText, direction } from "../sessionChange.js";
import { primeRestBeep, restBeep, beepState, restClock, shouldBeep, UNLOCK_EVENTS } from "../restBeep.js";
import { lastWeightKg, lastWeightSource, byEntered, typedKey, boxValue } from "../lastWeight.js";
import { handOff } from "../handoff.js";
import { badge, blocks, pairWith, partnerOf, holdFor, linkWithNext, nextInPair, normalize, unlink } from "../supersets.js";
import ImportWorkouts from "../components/ImportWorkouts.jsx";
import PairWithCoach from "../components/PairWithCoach.jsx";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";
import PromoPost from "../components/PromoPost.jsx";
import CoachVoice from "../components/CoachVoice.jsx";
import HashtagCount, { hashtagBody } from "../components/HashtagCount.jsx";
import { PROMPTZ } from "../resources.js";
import { IN_SHELL } from "../standalone.js";
import { AICoachView, AskAI, BodieZAIProvider } from "../components/BodieZAI.jsx";

const UnitCtx = createContext("kg");
const useUnit = () => useContext(UnitCtx);

// A labelled input, because a placeholder disappears the moment a number is
// typed and "12" next to "35" doesn't say which one is the weight.
function Field({ label, className = "w-20", hint = "", ...props }) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {label}{hint && <span className="ml-1 font-normal normal-case tracking-normal text-mcz-cyan/70">{hint}</span>}
      </span>
      <input className="neon-input !py-2 w-full text-sm" {...props} />
    </label>
  );
}
import EquipmentPicker, { EQUIPMENT_LABEL, toggleEquipment } from "./EquipmentPicker.jsx";
import { ExerciseSwap, SwapRow, useSwappedPicks } from "./ExerciseSwap.jsx";
import ExercisePicker, { CustomExerciseForm, ExerciseCtx, MUSCLE_LABEL } from "./ExercisePicker.jsx";
import { suggest } from "../exerciseSearch.js";
import { useRemembered, useRememberedNumber } from "../useRemembered.js";

// Jefit's own eleven groups, plus Full Body (which Jefit doesn't have — see
// migration 0145's docstring on the backend for why it stays: Burpee, Clean
// and Press and the kettlebell lifts genuinely aren't one-muscle movements).
// "Arms" and "Legs" are gone from here, not aliased — a client that still
// rendered them would be showing a label the server can no longer produce.
// MUSCLE_LABEL lives in ExercisePicker.jsx (one list; the picker needs it too).

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
  // Every past session, editable — the place to find a log from last spring and fix it.
  { key: "sessionz", label: "SessionZ" },
  { key: "routinez", label: "RoutineZ" },
  { key: "scheduler", label: "Scheduler" },
  { key: "bodymap", label: "BodyMap" },
  { key: "coach", label: "Insights" },
  { key: "goals", label: "Goals" },
  { key: "recovery", label: "Recovery" },
  { key: "progress", label: "Progress" },
  { key: "stepz", label: "StepZ" },
  // The AI coach sends workout logs and videos to Google for the read, which the
  // standalone BodieZ app's Play listing and data-safety answers do not cover, so
  // the shell never offers it (nothing mounts the provider there, and every AskAI
  // renders nothing without it).
  ...(IN_SHELL ? [] : [{ key: "ai", label: "AI coach" }]),
];

const MaybeAI = ({ children }) => (IN_SHELL ? children : <BodieZAIProvider>{children}</BodieZAIProvider>);

export default function BodieZ() {
  const [tab, setTab] = useState("today");
  const [unit, setUnitState] = useState(getUnit);
  const setUnit = (u) => { setUnitState(u); saveUnit(u); };
  const [exercises, setExercises] = useState([]);
  const [demoCredit, setDemoCredit] = useState("");
  const [access, setAccess] = useState({ seated_or_lying_only: false, arms_ok: true, legs_ok: true, one_arm_only: false, one_leg_only: false });
  // Set by BodyMap's "Build a day for just this muscle" CTA, read once by
  // MuscleDayBuilder on the Coach tab then cleared — a jump that lands ON
  // the control rather than dumping the member at the top of a new tab.
  const [prefillMuscle, setPrefillMuscle] = useState(null);
  const jumpToMuscleBuild = (muscle) => { setPrefillMuscle(muscle); setTab("routinez"); };
  // Set by a routine card's "Log past session" button (pen-and-paper workouts
  // logged after the fact) — jumps to Today, opens "Log a past workout" and
  // fills in that routine, instead of leaving the member to find it again in
  // a dropdown. Read once by PastWorkout, then cleared.
  const [prefillPastRoutine, setPrefillPastRoutine] = useState(null);
  const jumpToLogPast = (routineId) => { setPrefillPastRoutine(routineId); setTab("today"); };
  // Set by a goal card's "Train this" button — a goal shows a target and a
  // current value, with nothing to act on. Jumps to Today and, once a
  // session is running (started here or already open), pre-selects the
  // goal's exercise in "Add an unplanned exercise" so logging a set toward
  // it is the very next thing, not a hunt through the picker. Read once.
  const [prefillGoalExercise, setPrefillGoalExercise] = useState(null);
  const jumpToTrainGoal = (exerciseId) => { setPrefillGoalExercise(exerciseId); setTab("today"); };
  // Set by SessionSummary's "Edit this workout" — the card shown right after
  // finishing had no way to fix a session's own numbers (a dangling session
  // left open for hours shows 0 sets and a nonsense duration, with nothing
  // to do about it but hunt for it in a history list). Jumps to SessionZ
  // and opens the editor on this exact session. Read once.
  const [prefillEditSession, setPrefillEditSession] = useState(null);
  const jumpToEditSession = (sessionId) => { setPrefillEditSession(sessionId); setTab("sessionz"); };
  // LookZMaxZ's body-photo reading hands a muscle over through sessionStorage (it is another tab,
  // not a child of this one) — read once and cleared, so it lands on the builder and only once.
  useEffect(() => {
    try {
      const m = sessionStorage.getItem("bodiez.prefillMuscle");
      if (m) { sessionStorage.removeItem("bodiez.prefillMuscle"); jumpToMuscleBuild(m); }
    } catch { /* blocked */ }
  }, []);
  const [board, setBoard] = useState(null);
  const [session, setSession] = useState(null);
  // Finished workouts, newest first — RoutineZ lists them so a logged one can
  // be edited or turned into a routine rather than only read back as records.
  const [history, setHistory] = useState([]);
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
      setHistory(asList(sess.sessions).filter((s) => s.ended_at));
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
  // routine" picker and the past-workout picker don't care which bucket a
  // routine is sitting in — except Trash: a routine the member threw away must
  // not come back as something to train from. Everything the Coach saves lands
  // in Inbox, so it is offered in both pickers from the moment it is saved.
  const routines = bucketLabels.filter((b) => b.key !== "trash").flatMap((b) => asList(buckets[b.key]));

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

  // The one writer for custom exercises, shared by every picker through
  // ExerciseCtx. The new row is appended locally (it is already in the shape
  // the list endpoint serves), so the member can log it the moment it exists.
  const createExercise = async (body) => {
    const ex = await api("/api/economy/bodiez/exercises/custom/", { method: "POST", body });
    setExercises((cur) => [...cur, ex]);
    return ex;
  };

  async function logSet(exerciseId, reps, weightKg, side = "") {
    if (!session) return;
    try {
      const s = await api(`/api/economy/bodiez/sessions/${session.id}/sets/`, {
        method: "POST",
        body: { exercise_id: exerciseId, reps, weight_kg: toKg(weightKg, unit), one_sided: side },
      });
      // Functional, because "copy last time" logs several sets back to back and
      // each would otherwise overwrite the last with a stale copy of the session.
      setSession((cur) => (cur ? { ...cur, sets: [...cur.sets, s] } : cur));
    } catch (e) { setErr(e.message); }
  }

  // Dragging a logged set: a display order only — rest, time and weight are untouched.
  // The server's answer replaces the session, so a failed drag snaps back.
  async function reorderSets(ids) {
    if (!session) return;
    const was = session;
    setSession((cur) => {
      if (!cur) return cur;
      const byId = Object.fromEntries(cur.sets.map((x) => [x.id, x]));
      return { ...cur, sets: ids.map((id, k) => ({ ...byId[id], position: k + 1 })) };
    });
    try {
      const sess = await api(`/api/economy/bodiez/sessions/${was.id}/order/`, { method: "POST", body: { ids } });
      setSession((cur) => (cur && cur.id === sess.id ? { ...cur, sets: sess.sets } : cur));
    } catch (e) { setSession(was); setErr(e.message || "Couldn't move that set."); }
  }

  async function addCustomDay(name) {
    try {
      await api("/api/economy/bodiez/custom-days/", { method: "POST", body: { name } });
      setErr(""); load();
      return true;
    } catch (e) { setErr(e.message); return false; }
  }

  async function removeCustomDay(id) {
    if (!window.confirm("Delete this day? It can't be undone.")) return;
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
  // `meta` ({title, description}) rides along when the designer renamed the
  // routine — one PATCH, so a rename and its exercises can't half-save.
  async function saveRoutineExercises(id, exerciseList, meta = {}) {
    try {
      await api(`/api/economy/bodiez/routines/${id}/`, {
        method: "PATCH", body: { exercises: exerciseList, ...meta },
      });
      setErr("");
      load();
      return true;
    } catch (e) { setErr(e.message); return false; }
  }

  // A routine made from a list of lifts without leaving the screen it was asked for on (createRoutineFromExercises
  // below jumps to RoutineZ, which is right for the Planner's builders and wrong inside SessionZ). Throws on a
  // refusal so the caller can show the server's own sentence; `source: "coach"` because the Planner made it.
  async function saveNewRoutine(title, exerciseList, goal = "") {
    await api("/api/economy/bodiez/routines/", {
      method: "POST", body: { title, exercises: exerciseList, bucket: "inbox", goal: goal || "", source: "coach" },
    });
    load();
    return true;
  }

  // A copy to change without losing the one already run — coach-built or not.
  async function copyRoutine(id) {
    try {
      await api(`/api/economy/bodiez/routines/${id}/copy/`, { method: "POST", body: {} });
      load();
    } catch (e) { setErr(e.message); }
  }

  // A logged workout -> a new routine (the server picks each lift's top set
  // as the target; the workout itself is untouched).
  async function routineFromSession(id, title) {
    try {
      await api(`/api/economy/bodiez/sessions/${id}/routine/`, { method: "POST", body: title ? { title } : {} });
      setErr("");
      load();
      return true;
    } catch (e) { setErr(e.message); return false; }
  }

  async function deleteSession(id) {
    if (!window.confirm("Delete this workout and every set in it? Records, BodyMap and goals will no longer count it. This can't be undone.")) return;
    try {
      await api(`/api/economy/bodiez/sessions/${id}/`, { method: "DELETE" });
      load();
    } catch (e) { setErr(e.message); }
  }

  // Sets first, then the note/date: a refused set changes nothing, and the
  // error says which set — the server checks the whole list before writing.
  async function saveSessionEdit(id, { sets, notes, date }) {
    const done = await api(`/api/economy/bodiez/sessions/${id}/sets/`, { method: "PUT", body: { sets } });
    await api(`/api/economy/bodiez/sessions/${id}/`, { method: "PATCH", body: date ? { notes, date } : { notes } });
    load();
    return done?.summary || null;
  }

  // Coach's "Build a routine" — a routine assembled from BodyMap's own real
  // status (undertrained/untrained muscles first), never a model's guess.
  // It lands in RoutineZ (and the Scheduler's Inbox) like a hand-built routine, so
  // it goes through the same designer to be tweaked or started.
  async function createRoutineFromExercises(title, exerciseList, dayTag, goal) {
    try {
      await api("/api/economy/bodiez/routines/", {
        method: "POST", body: { title, exercises: exerciseList, bucket: "inbox", ...dayBody(dayTag), goal: goal || "", source: "coach" },
      });
      setTab("routinez");
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
          method: "POST", body: { title: day.title, exercises: day.exercises, bucket: "inbox", goal: day.goal || "", source: "coach" },
        });
      }
      setTab("routinez");
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
    <ExerciseCtx.Provider value={{ create: createExercise }}>
    <MaybeAI>
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

      {err && <p role="alert" className="re-card text-sm text-mcz-ember">{err}</p>}

      {busy && !exercises.length ? (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </p>
      ) : (
        <>
          {tab === "today" && (
            <>
            <LbFix onFixed={load} />
            {summary && (
              <SessionSummary summary={summary} onClose={() => setSummary(null)}
                             onEdit={() => { jumpToEditSession(summary.session_id); setSummary(null); }}
                             onSaveRoutine={(name) => routineFromSession(summary.session_id, name)}
                             onOpenRoutineZ={() => { setTab("routinez"); }} />
            )}
            <TodayView
              session={session} routines={routines} exercises={exercises} pickable={usable}
              onStart={startSession} onFinish={finishSession} onLogSet={logSet} onReorderSets={reorderSets}
              goals={coach?.goals}
              initialExerciseId={prefillGoalExercise} onInitialExerciseConsumed={() => setPrefillGoalExercise(null)}
            />
            <PastWorkout exercises={exercises} pickable={usable} routines={routines}
                         onSaved={(sm) => { setSummary(sm); load(); }}
                         initialRoutineId={prefillPastRoutine} onInitialRoutineConsumed={() => setPrefillPastRoutine(null)} />
            </>
          )}
          {tab === "sessionz" && (
            <SessionZView exercises={exercises} pickable={usable} refreshKey={history} routines={routines}
                          sessionOpen={!!session} onStart={(id) => { startSession(id); setTab("today"); }}
                          onOpenToday={() => setTab("today")} onSaveExercises={saveRoutineExercises} onSaveNew={saveNewRoutine}
                          onOpenRoutineZ={() => setTab("routinez")}
                          prefillEditSession={prefillEditSession} onEditConsumed={() => setPrefillEditSession(null)}
                          onSaveSession={saveSessionEdit} onRoutineFromSession={routineFromSession}
                          onDeleteSession={deleteSession} onLogPast={() => jumpToLogPast(null)} />
          )}
          {tab === "routinez" && (
            <RoutineZView routines={routines} exercises={exercises} pickable={usable}
                          demoCredit={demoCredit} coach={coach} bodymap={bodymap} dayTagLabels={dayTagLabels}
                          prefillMuscle={prefillMuscle} onPrefillConsumed={() => setPrefillMuscle(null)}
                          onLogPast={jumpToLogPast} onOpenSessionZ={() => setTab("sessionz")} onSaveNew={saveNewRoutine}
                          planCaveat={board?.plan_caveat}
                          onBuildRoutine={createRoutineFromExercises} onBuildSplit={createSplitRoutines}
                          onCreate={(title) => createRoutine(title, "inbox", "")}
                          onSaveExercises={saveRoutineExercises} onCopy={copyRoutine} onDelete={deleteRoutine}
                          onImported={load}
                          onStart={(id) => { startSession(id); setTab("today"); }} sessionOpen={!!session} />
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
            <CoachView coach={coach} onOpenRoutineZ={() => setTab("routinez")} />
          )}
          {tab === "goals" && (
            <GoalsView goals={goals} exercises={exercises} weightLogs={weightLogs}
                      onCreate={createGoal} onDelete={deleteGoal} onLogWeight={logWeight} onTrain={jumpToTrainGoal} />
          )}
          {tab === "recovery" && <RecoveryView recovery={recovery} onLog={logRecovery} />}
          {tab === "progress" && <ProgressView progress={progress} />}
          {tab === "stepz" && <StepZView steps={steps} stepCoach={stepCoach} bodymap={bodymap} onLogSteps={logSteps} />}
          {tab === "ai" && !IN_SHELL && <AICoachView exercises={exercises} />}
        </>
      )}
    </div>
    </MaybeAI>
    </ExerciseCtx.Provider>
    </UnitCtx.Provider>
  );
}

// Fetched once per exercise per session (never re-fetched for the same
// exercise) — "last time" is a real logged row, from `/exercises/<id>/history/`,
// never a suggested target. Cached in state so switching between exercises in
// the same session doesn't re-request numbers that can't have changed mid-set.
function useHistory(exerciseId, side = "") {
  const [history, setHistory] = useState(undefined); // undefined = loading, null = no history
  useEffect(() => {
    if (!exerciseId) { setHistory(undefined); return; }
    setHistory(undefined);
    let alive = true;
    // Last time done THE SAME WAY — a one-arm row is not last week's two-arm row.
    api(`/api/economy/bodiez/exercises/${exerciseId}/history/${side ? `?one_sided=${side}` : ""}`)
      .then((h) => { if (alive) setHistory(h.last_session || null); })
      .catch(() => { if (alive) setHistory(null); });
    return () => { alive = false; };
  }, [exerciseId, side]);
  return history;
}

// A set done with ONE arm or ONE leg is not the same set done with both, so it
// is marked as such and compared only with its own kind (records, ratings and
// "last time" all do). The choice is remembered per exercise, because somebody
// who does a lift one-sided does it that way every time.
const SIDE_LABEL = { "": "Both", arm: "One arm", leg: "One leg" };
const sideKey = (id) => `bodiez.side.${id}`;
function useSide(exerciseId) {
  const read = () => { try { return localStorage.getItem(sideKey(exerciseId)) || ""; } catch { return ""; } };
  const [side, setSide] = useState(read);
  useEffect(() => { setSide(read()); }, [exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (v) => { setSide(v); try { v ? localStorage.setItem(sideKey(exerciseId), v) : localStorage.removeItem(sideKey(exerciseId)); } catch { /* blocked */ } };
  return [side, set];
}
function SidePick({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Done with">
      <span className="text-[11px] text-white/40">Done with</span>
      {Object.entries(SIDE_LABEL).map(([k, label]) => (
        <button key={k || "both"} onClick={() => onChange(k)} aria-pressed={value === k}
                className={`rounded-full px-2.5 py-1 text-[11px] transition-all ${
                  value === k ? "bg-mcz-cyan/20 text-mcz-cyan ring-1 ring-mcz-cyan/40" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
          {label}
        </button>
      ))}
    </div>
  );
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
    `💪 ${sm.routine_title || "Workout"}${sm.duration_seconds != null ? ` — ${clock(sm.duration_seconds)}` : ""}`,
    `${Math.round(fromKg(sm.volume_kg, unit)).toLocaleString()} ${unit} lifted · ${sm.sets} sets · ${sm.reps} reps`,
    ...(sm.vs_last ? [`${changeText(sm.vs_last.volume_delta_kg, sm.vs_last.volume_delta_pct, (kg) => fmtWeight(kg, unit)) || repsChangeText(sm.vs_last)} vs ${againstWhat(sm.vs_last)}`] : []),
    ...sm.records.map((r) => `🏆 ${recordLine(r, unit)}`),
    ...(brief ? [] : sm.exercises.map((e) => `• ${e.name}: ${e.sets}×, ${e.reps} reps${e.top_weight_kg != null ? `, top ${fmtWeight(e.top_weight_kg, unit)}` : ""}`)),
  ];
  return lines.join("\n");
}

// The AI coach's read of a finished workout. "Coach" means the AI coach everywhere in this app,
// so this is BodieZ's door to it: the price sits beside the button before it is pressed, a
// failed run is not charged, and the words can be read aloud in the member's chosen voice
// (Premium samples any voice, StatZ saves one; CoachVoice and the server own that rule).
function AICoachRead({ sessionId }) {
  const [spec, setSpec] = useState(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let on = true;
    api(`/api/economy/bodiez/sessions/${sessionId}/ai-coach/`).then((d) => { if (on) setSpec(d); }).catch(() => {});
    return () => { on = false; };
  }, [sessionId]);

  async function ask() {
    setBusy(true); setErr("");
    try {
      const d = await api(`/api/economy/bodiez/sessions/${sessionId}/ai-coach/`, { method: "POST", body: {} });
      setText(d.text || "");
    } catch (e) { setErr(e.message || "The AI coach couldn't read that. Nothing was charged."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button className="neon-btn-primary !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" disabled={busy} onClick={ask}>
          {busy ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
          {busy ? "Reading your sets…" : text ? "Ask the AI coach again" : "Send to AI coach"}
        </button>
        {spec && (spec.cost.free_today
          ? <span className="text-[11px] text-emerald-300">free today</span>
          : <span className="text-[11px] text-mcz-ember">−{spec.cost.amount} {PROMPTZ}</span>)}
        <span className="text-[11px] text-white/40">A failed read is not charged.</span>
      </div>
      {err && <p role="alert" className="text-[11px] text-mcz-ember">{err}</p>}
      {text && (
        <div className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
          <p className="re-label"><Term k="ai_coach">AI coach</Term></p>
          <p className="whitespace-pre-wrap text-sm text-white/85">{text}</p>
          <CoachVoice text={text} />
        </div>
      )}
    </div>
  );
}

function SessionSummary({ summary: sm, onClose, onEdit, onSaveRoutine, onOpenRoutineZ }) {
  const unit = useUnit();
  const [note, setNote] = useState("");
  // A custom session has no routine behind it. Ending it is the moment to keep it: the server turns each lift into a
  // row (sets = how many were done, target = the TOP set, never an average), and the session itself stays as logged.
  const [routineName, setRoutineName] = useState(`Custom workout — ${new Date(sm.started_at).toLocaleDateString()}`);
  const [savedAs, setSavedAs] = useState("");
  const [saving, setSaving] = useState(false);
  const canSaveRoutine = !!onSaveRoutine && sm.sets > 0 && !sm.routine_title;
  const saveRoutine = async () => {
    setSaving(true);
    try { const name = routineName.trim().slice(0, 80) || "Custom workout"; if (await onSaveRoutine(name)) setSavedAs(name); }
    finally { setSaving(false); }
  };
  const title = `${sm.routine_title || "Workout"} — ${Math.round(fromKg(sm.volume_kg, unit)).toLocaleString()} ${unit} lifted`;
  const text = summaryText(sm, unit);
  const coaches = asList(sm.coaches);
  const fmt = (kg) => fmtWeight(kg, unit);
  const vs = sm.vs_last;
  // Ending a session happens at the bottom of a long screen, and this card is at the top:
  // bring it into view and announce it, or "did that work?" is the member's next thought.
  const cardRef = useRef(null);
  useEffect(() => { try { cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* old browser */ } }, [sm.session_id]);

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
    <div ref={cardRef} role="status" aria-live="polite" className="re-card space-y-3 border-emerald-400/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="re-label text-emerald-300">✓ Session ended</p>
          <p className="text-sm font-semibold text-white">{sm.routine_title || "Ad-hoc session"}{sm.duration_seconds != null ? ` · ${clock(sm.duration_seconds)}` : " · logged afterwards"}</p>
        </div>
        <button className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Close summary">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-2xl font-extrabold text-white">{Math.round(fromKg(sm.volume_kg, unit)).toLocaleString()}</p><p className="re-label">total {unit} lifted</p></div>
        <div><p className="text-2xl font-extrabold text-white">{sm.sets}</p><p className="re-label">sets</p></div>
        <div><p className="text-2xl font-extrabold text-white">{sm.reps}</p><p className="re-label">reps</p></div>
      </div>
      {sm.sets > 0 && (
        <div className="rounded-lg bg-white/5 p-2.5 text-xs space-y-0.5" data-testid="vs-last">
          {vs ? (
            <>
              <p className="text-white/80">
                <span className={`font-semibold ${direction(vs.volume_delta_kg) === "up" ? "text-emerald-300" : "text-white"}`}>
                  {changeText(vs.volume_delta_kg, vs.volume_delta_pct, fmt) || repsChangeText(vs) || "= same as last time"}
                </span>{" "}
                vs {againstWhat(vs)}
              </p>
              <p className="text-[11px] text-white/45">
                Then: {Math.round(fromKg(vs.volume_kg, unit)).toLocaleString()} {unit} · {vs.sets} sets · {vs.reps} reps.
                {vs.sets_delta !== 0 ? ` ${vs.sets_delta > 0 ? "+" : "−"}${Math.abs(vs.sets_delta)} sets` : ""}
                {vs.duration_delta_seconds != null && Math.abs(vs.duration_delta_seconds) >= 60
                  ? ` · ${clock(Math.abs(vs.duration_delta_seconds))} ${vs.duration_delta_seconds > 0 ? "longer" : "shorter"}` : ""}
                {vs.volume_delta_kg < 0 ? " A lighter session isn't a worse one — deloads and short days look like this." : ""}
              </p>
              {asList(vs.not_repeated).length > 0 && (
                <p className="text-[11px] text-white/45">Not done this time: {vs.not_repeated.join(", ")}.</p>
              )}
            </>
          ) : (
            <p className="text-white/55">First session logged — nothing to compare it to yet. This is your starting mark.</p>
          )}
        </div>
      )}
      {sm.sets === 0 ? (
        // A session that sat open with nothing logged — the most likely story
        // behind a 0-set, hours-long "workout" — has no record to report and
        // nothing honest to share. Say so, and lead with the fix.
        <p className="text-xs text-white/45">Nothing was logged. Edit it to add what you actually did, or delete it below.</p>
      ) : sm.records.length > 0 ? (
        <div className="space-y-1">
          <p className="re-label text-amber-200">🏆 {sm.records.length} new record{sm.records.length === 1 ? "" : "s"}</p>
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
      {canSaveRoutine && (
        <div className="space-y-1.5 rounded-lg bg-white/5 p-2.5 text-xs" data-testid="save-routine">
          {savedAs ? (
            <p className="flex flex-wrap items-center gap-2 text-emerald-300">
              Saved “{savedAs}” to RoutineZ.
              {onOpenRoutineZ && <button type="button" className="rounded-full border border-emerald-300/40 px-3 py-0.5 text-[11px]" onClick={onOpenRoutineZ}>Open RoutineZ</button>}
            </p>
          ) : (
            <>
              <p className="text-white/70">This was a custom session. Save it to RoutineZ to run it again — each lift's top set becomes the target.</p>
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label="Routine name" className="neon-input !py-1.5 min-w-0 flex-1 basis-40 text-xs" maxLength={80}
                       value={routineName} onChange={(e) => setRoutineName(e.target.value)} />
                <button type="button" className="neon-btn-primary !w-auto px-3 py-1.5 text-xs" disabled={saving} onClick={saveRoutine}>
                  Save to RoutineZ
                </button>
                <span className="text-white/40">Free · the workout stays as logged.</span>
              </div>
            </>
          )}
        </div>
      )}
      <div className="space-y-1">
        {sm.exercises.map((e) => (
          <p key={e.exercise_id} className="text-[11px] text-white/55">
            {e.name}: {e.sets} {e.sets === 1 ? "set" : "sets"}, {e.reps} reps{e.top_weight_kg != null ? `, top ${fmtWeight(e.top_weight_kg, unit)}` : ""}
            {liftChange(e, fmt) && <span className={liftChange(e, fmt).includes("▲") ? " text-emerald-300/80" : " text-white/45"}> · {liftChange(e, fmt)}</span>}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
        {/* A session's own numbers are the member's to fix right here —
            nothing logged, or a set typed in wrong, is as reachable as
            sharing it. Primary when there is nothing honest to share yet. */}
        <button className={`!w-auto px-3 py-2 text-xs inline-flex items-center gap-1 ${sm.sets === 0 ? "neon-btn-primary" : "neon-btn-ghost"}`}
                onClick={onEdit}>
          <Pencil size={13} /> Edit this workout
        </button>
        {sm.sets > 0 && (
          <button className="neon-btn-primary !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" onClick={share}>
            <Share2 size={13} /> Share
          </button>
        )}
        {coaches.length > 0 ? coaches.map((c) => (
          <button key={c} className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" onClick={() => toCoach(c)}>
            <MessageSquare size={13} /> Message @{c} (a person)
          </button>
        )) : (
          <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" onClick={() => toCoach(null)}>
            <MessageSquare size={13} /> Message someone
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
      {sm.sets > 0 && <AICoachRead sessionId={sm.session_id} />}
      <p className="text-[11px] text-white/35">
        PostZ shows what posting costs before you post; sending a DM is free. “Coach” always means the AI coach —
        a person you message is named as a person.
        {coaches.length === 0 && " You have no one linked in CoachZ yet, so pick who to message."}
      </p>
      {note && <p className="text-[11px] text-mcz-cyan">{note}</p>}
    </div>
  );
}

function LastTime({ exerciseId, side = "" }) {
  return <LastTimeView last={useHistory(exerciseId, side)} side={side} />;
}
function LastTimeView({ last, side = "" }) {
  const unit = useUnit();
  if (last === undefined) return <p className="text-[11px] text-white/30">Loading last time…</p>;
  if (!last) return <p className="text-[11px] text-white/30">No history yet {side ? `for this exercise done with ${SIDE_LABEL[side].toLowerCase()}` : "for this exercise"}.</p>;
  return (
    <p className="text-[11px] text-mcz-cyan/80">
      Last time{side ? ` (${SIDE_LABEL[side].toLowerCase()})` : ""} ({new Date(last.started_at).toLocaleDateString()}): {" "}
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

// ---- Rest alerts: StatZ's, or the daily free sample's -------------------------------
//
// The in-page beep and vibration above are everybody's. What StatZ adds is the
// part that reaches a member who has put the phone down: a notification when rest
// is up, and the screen kept awake so the clock keeps running at all. Both are
// honest about their limit — a browser tab on a locked phone is paused by the OS,
// which no page can prevent, so "keep the screen on" is the thing that actually
// keeps it running and the notification covers switching to another app. It is a
// client-only feature, so it is gated here by the sample/tier state the server
// serves; nothing it does costs us or the member a resource.
const ALERT_KEY = "bodiez.restAlerts";
const AWAKE_KEY = "bodiez.keepAwake";

function readPref(k) { try { return localStorage.getItem(k) === "1"; } catch { return false; } }
function writePref(k, v) { try { localStorage.setItem(k, v ? "1" : "0"); } catch { /* blocked */ } }

function useRestAlertPrefs() {
  const { s } = useStatzTrial();
  const allowed = !!(s?.is_statz || s?.active);
  const [notify, setNotifyRaw] = useState(() => readPref(ALERT_KEY));
  const [awake, setAwakeRaw] = useState(() => readPref(AWAKE_KEY));
  const [perm, setPerm] = useState(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));
  const setAwake = (v) => { setAwakeRaw(v); writePref(AWAKE_KEY, v); };
  const setNotify = async (v) => {
    if (v && typeof Notification !== "undefined" && Notification.permission === "default") {
      try { setPerm(await Notification.requestPermission()); } catch { /* unsupported */ }
    }
    setNotifyRaw(v);
    writePref(ALERT_KEY, v);
  };
  // The sample ending locks both again without touching what the member chose:
  // `allowed` gates the effect, the saved preference is theirs.
  useEffect(() => {
    if (!allowed || !awake || typeof navigator === "undefined" || !("wakeLock" in navigator)) return undefined;
    let lock = null;
    const grab = async () => { try { lock = await navigator.wakeLock.request("screen"); } catch { /* hidden or refused */ } };
    const again = () => { if (document.visibilityState === "visible") grab(); };
    grab();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      try { lock?.release?.(); } catch { /* already released */ }
    };
  }, [allowed, awake]);
  return { s, allowed, notify: allowed && notify, awake: allowed && awake, perm,
           rawNotify: notify, rawAwake: awake, setNotify, setAwake };
}

function fireRestNotification(next) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (document.visibilityState !== "hidden") return;      // on screen, the beep is enough
    new Notification("Rest's up", { body: next ? `Next: ${next}` : "Go.", tag: "bodiez-rest" });
  } catch { /* a notification is a nicety */ }
}

function RestAlertsControl({ prefs }) {
  const wakeOk = typeof navigator !== "undefined" && "wakeLock" in navigator;
  return (
    <div className="re-card space-y-1.5" data-tour="bodiez-rest-alerts">
      <p className="re-label flex items-center gap-1.5"><BellRing size={13} /> Rest alerts</p>
      {prefs.allowed ? (
        <>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
            <input type="checkbox" checked={prefs.rawNotify} onChange={(e) => prefs.setNotify(e.target.checked)} />
            Notify me when rest is up (if you have switched apps)
          </label>
          {prefs.rawNotify && prefs.perm === "denied" && (
            <p className="text-[11px] text-mcz-ember">Notifications are blocked for this site. Allow them in your browser's site settings.</p>
          )}
          {prefs.perm === "unsupported" && <p className="text-[11px] text-white/45">This browser can't show notifications.</p>}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
            <input type="checkbox" checked={prefs.rawAwake} disabled={!wakeOk}
                   onChange={(e) => prefs.setAwake(e.target.checked)} />
            Keep my screen on during the workout
          </label>
          {!wakeOk && <p className="text-[11px] text-white/45">This browser can't keep the screen on.</p>}
          <p className="text-[11px] text-white/35">
            A locked phone pauses a web page, which nothing here can prevent. Keeping the screen on keeps the
            rest clock running; the notification covers switching to another app.
          </p>
        </>
      ) : (
        <StatzSample what="Rest alerts" />
      )}
    </div>
  );
}

const REST_PRESETS = [30, 60, 90, 120, 180];
const REST_KEY = "bodiez.restTarget";
const REST_GOAL_KEY = "bodiez.restGoal";

// Counts up from the last logged set's server timestamp, so a reload or a
// locked phone doesn't reset it — and the number it shows is the same one the
// server stores as rest_seconds on the next set. The target is only a nudge.
// The recommended rest per training goal is the server's (GOALS in
// bodiez.py, each with its citation) — never retyped here.
function RestTimer({ sets, goals, routineGoal, hold = "", nextName = "", alerts = null }) {
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
  const { left, over, done } = restClock(elapsed, target);

  // Unlock the beep on the member's own taps. A browser starts audio suspended unless a
  // gesture made or resumed it, and by the time rest ends there is no gesture to lean on.
  useEffect(() => {
    const prime = () => primeRestBeep();
    for (const ev of UNLOCK_EVENTS) document.addEventListener(ev, prime, { passive: true, capture: true });
    return () => { for (const ev of UNLOCK_EVENTS) document.removeEventListener(ev, prime, { capture: true }); };
  }, []);

  // A phone in a pocket or folded shut has no screen to watch; the tab title is the one cue
  // every browser lets a hidden page change, and it is put back the moment they return.
  const titleRef = useRef(null);
  useEffect(() => {
    const restore = () => { if (titleRef.current != null) { document.title = titleRef.current; titleRef.current = null; } };
    if (done && !hold && document.visibilityState === "hidden") {
      if (titleRef.current == null) titleRef.current = document.title;
      document.title = "Rest over — go";
    } else restore();
    document.addEventListener("visibilitychange", restore);
    return () => document.removeEventListener("visibilitychange", restore);
  }, [done, hold]);

  useEffect(() => {
    // Halfway through a superset nobody is resting, so nothing should say they are.
    if (hold || !last || !done || alerted === last.id) return;
    setAlerted(last.id);
    // A reload long after the set is a finished rest, not one that just ended: mark it, stay quiet.
    if (!shouldBeep({ done, over, alreadyAlerted: false })) return;
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* unsupported, e.g. iPhone */ }
    restBeep();
    if (alerts?.notify) fireRestNotification(nextName);
  }, [done, alerted, last, hold]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!last) return null;
  if (hold) {
    return (
      <div className="re-card border-fuchsia-400/30">
        <p className="text-sm text-fuchsia-200">
          Superset — go straight to <span className="font-semibold">{hold}</span>. Rest starts after it.
        </p>
      </div>
    );
  }
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } };
  const pickGoal = (k) => { setGoalKey(k); save(REST_GOAL_KEY, k); };
  const pick = (t) => { setCustom(t); pickGoal(""); save(REST_KEY, String(t)); };
  const pct = Math.min(100, (elapsed / target) * 100);

  return (
    <div className={`re-card space-y-2 ${done ? "border-emerald-400/40" : ""}`}>
      <div className="flex items-baseline justify-between">
        <p className="re-label">Rest after {last.exercise_name || "last set"}</p>
        <p className={`font-mono text-2xl font-bold ${done ? "text-emerald-300" : "text-white"}`}
           aria-label={done ? "Rest is over" : `${clock(left)} of rest left`}>
          {clock(left)} <span className="text-sm font-normal text-white/40">{done ? (over > 0 ? `over by ${clock(over)}` : "rest over") : `left of ${clock(target)}`}</span>
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
        <button type="button" className="pill !py-1 text-[11px]"
                onClick={() => { primeRestBeep(); restBeep(); try { navigator.vibrate?.(80); } catch { /* unsupported */ } }}>Test beep</button>
        <span className="text-[11px] text-white/40">{done ? "Rested — go." : "Beeps when it hits 0:00. Logging your next set saves the rest you actually took."}</span>
        {beepState() === "ready"
          ? <span className="text-[11px] text-emerald-300/80">Sound on</span>
          : beepState() === "unsupported"
            ? <span className="text-[11px] text-white/45">This browser can't play the beep — watch the clock{typeof navigator !== "undefined" && navigator.vibrate ? " or feel for the buzz" : ""}.</span>
            : <span className="text-[11px] text-amber-300/90">Sound is off until you tap once — press Test beep (and check your phone isn't on silent).</span>}
      </div>
    </div>
  );
}

function LoggerRow({ planned, doneSets, onLogSet, tag = "", isNext = false, onSwap = null, swapFrom = [], allExercises = [],
                     grip = null, onReorder = null }) {
  const unit = useUnit();
  const dndSets = useDragReorder(`live-${planned.exercise_id}`, (from, to) => onReorder?.(from, to));
  const [swapOpen, setSwapOpen] = useState(false);
  const [reps, setReps] = useState(planned?.reps ? String(planned.reps) : "");
  const targetSets = planned?.sets || 3;
  const done = doneSets.length;
  const [side, setSide] = useSide(planned.exercise_id);
  const last = useHistory(planned.exercise_id, side);
  const lastDone = doneSets[doneSets.length - 1];
  // The weight box opens on the last weight entered for this lift, done this way: the
  // latest set of it today, else the last finished session, else the routine's target.
  // Derived each render, so a unit flip re-expresses it and logging a set (which changes
  // `done`) hands a typed number back to the auto-fill — which is that set's weight.
  const lw = { sets: byEntered(doneSets), side, last, plannedKg: planned?.weight_kg ?? null };
  const [typed, setTyped] = useState(null);
  const box = boxValue(typed, typedKey(planned.exercise_id, side, done), lastWeightKg(lw), fromKg, unit);
  const weight = box.value;
  const weightHint = box.auto ? ({ set: "last set", history: "last time", plan: "target" })[lastWeightSource(lw)] : "";
  // Repeat / copy re-log EXISTING numbers as new sets, in the unit the member
  // sees; the server stamps the real time, so rest between them is true.
  const shown = (kg) => (kg != null ? fromKg(kg, unit) : "");
  const repeatLast = () => onLogSet(planned.exercise_id, lastDone.reps, shown(lastDone.weight_kg), lastDone.one_sided || "");
  const copyLastTime = async () => {
    for (const st of last.sets) await onLogSet(planned.exercise_id, st.reps, shown(st.weight_kg), st.one_sided || "");
  };

  return (
    <div className="re-card space-y-2">
      <div className="flex items-center justify-between gap-2">
        {grip}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {tag && <span className="mr-1.5 rounded bg-fuchsia-500/20 px-1 py-0.5 text-[10px] font-bold text-fuchsia-300">{tag}</span>}
            {planned.name}
            {isNext && <span className="ml-1.5 text-[11px] font-normal text-emerald-300">next</span>}
          </p>
          <p className="text-xs text-white/45">
            {MUSCLE_LABEL[planned.muscle_group] || planned.muscle_group}
            {planned.equipment && ` · ${EQUIPMENT_LABEL[planned.equipment] || planned.equipment}`}
            {" · "}Target {targetSets} sets
            {planned.reps ? ` x${planned.reps}` : ""}
            {planned.weight_kg != null ? ` @ ${fmtWeight(planned.weight_kg, unit)}` : ""}
          </p>
        </div>
        {onSwap && (
          <button type="button" className="shrink-0 rounded px-1.5 text-[11px] text-mcz-cyan hover:bg-white/10"
                  onClick={() => setSwapOpen(!swapOpen)}>
            {swapOpen ? "Done" : "Change"}
          </button>
        )}
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${
          done >= targetSets ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                              : "bg-white/5 text-white/50 ring-white/10"}`}>
          {done}/{targetSets} sets
        </span>
      </div>
      {swapOpen && onSwap && (
        <ExerciseSwap current={planned.exercise_id} all={allExercises} choices={swapFrom} onPick={onSwap}
                      note={`Do a different lift in this slot, today only — your saved routine isn't changed. Sets you've already logged stay under ${planned.name}.`} />
      )}
      <LastTimeView last={last} side={side} />
      <SidePick value={side} onChange={setSide} />
      <div className="flex flex-wrap gap-2">
        {lastDone && (
          <button type="button" className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" onClick={repeatLast}>
            Repeat last set ({lastDone.reps}{lastDone.weight_kg != null ? `@${fmtWeight(lastDone.weight_kg, unit)}` : ""})
          </button>
        )}
        {last && last.sets.length > 0 && (
          <button type="button" className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" onClick={copyLastTime}>
            Copy last time ({last.sets.length} set{last.sets.length === 1 ? "" : "s"})
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field label={`Weight (${unit})`} hint={weightHint} className="w-28" placeholder="optional" type="number" min="0" step="0.5" inputMode="decimal"
               value={weight} onChange={(e) => setTyped({ key: typedKey(planned.exercise_id, side, done), v: e.target.value })} />
        <Field label="Reps" className="w-24" placeholder="reps" type="number" min="1" max="1000" inputMode="numeric"
               value={reps} onChange={(e) => setReps(e.target.value)} />
        <button className="neon-btn-primary !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                disabled={!reps}
                onClick={() => onLogSet(planned.exercise_id, Number(reps), weight === "" ? "" : Number(weight), side)}>
          <Plus size={13} /> Log set
        </button>
      </div>
      {doneSets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {doneSets.map((s, si) => (
            <span key={s.id} {...(onReorder && doneSets.length > 1 ? dndSets.row(si) : {})}
                  className={`inline-flex items-center rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/60${dndSets.rowClass(si)}`}>
              {onReorder && doneSets.length > 1 && <DragGrip label="Drag this set" size={11} {...dndSets.grip(si)} />}
              {s.reps}{s.weight_kg != null ? `@${fmtWeight(s.weight_kg, unit)}` : ""}
              {s.one_sided && <span className="text-mcz-cyan/70"> · {SIDE_LABEL[s.one_sided].toLowerCase()}</span>}
              {s.rest_seconds != null && <span className="text-white/35"> · {clock(s.rest_seconds)} rest</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TodayView({ session, routines, exercises, pickable, onStart, onFinish, onLogSet, goals, onReorderSets,
                      initialExerciseId = null, onInitialExerciseConsumed }) {
  const unit = useUnit();
  const restPrefs = useRestAlertPrefs();
  const [exerciseId, setExerciseId] = useState("");
  const [reps, setReps] = useState("");
  const [typedWeight, setTypedWeight] = useState(null);
  // "Done before" is the member's own history (times_done/last_done come off
  // the server, finished sessions only) so a lift they run every week is two
  // taps rather than a hunt through the library. Falls back to the full list
  // whenever there is no history yet, never an empty picker.
  const [unplannedSide, setUnplannedSide] = useSide(exerciseId);
  const unplannedLast = useHistory(exerciseId || null, unplannedSide);
  // Today-only swaps: planned exercise id -> the lift actually being done.
  const [swaps, setSwaps] = useState({});
  // Today-only order of the plan (dragged), kept for this session on this device. The
  // saved routine is not changed, the same as a swap.
  const orderKey = session ? `mcz_bodiez_order_${session.id}` : "";
  const [order, setOrderState] = useState([]);
  useEffect(() => {
    if (!orderKey) return;
    try { setOrderState(JSON.parse(localStorage.getItem(orderKey) || "[]")); } catch { setOrderState([]); }
  }, [orderKey]);
  const setOrder = (ids) => {
    setOrderState(ids);
    try { localStorage.setItem(orderKey, JSON.stringify(ids)); } catch { /* blocked */ }
  };
  const planBlocksRef = useRef([]);
  const dndPlan = useDragReorder("today-ex", (from, to) => {
    const moved = moveItem(planBlocksRef.current, from, to);
    setOrder(moved.flatMap((b) => (b.single ? [b.single.orig_id] : b.pair.map((x) => x.orig_id))));
  });
  // A logged set dragged inside its exercise: the exercise's sets take the same slots
  // in the whole session's order, in their new order.
  const reorderWithin = (exerciseId, from, to) => {
    const all = asList(session?.sets);
    const mine = all.filter((x) => x.exercise_id === exerciseId);
    const moved = moveItem(mine, from, to);
    let k = 0;
    onReorderSets?.(all.map((x) => (x.exercise_id === exerciseId ? moved[k++].id : x.id)));
  };
  // A goal card's "Train this" hands the exercise over this way. The
  // "unplanned exercise" picker only exists once a session is running, so
  // this waits for one rather than consuming the handoff on arrival — a
  // member who looks at Today without starting a session still gets it
  // pre-selected the moment they do.
  useEffect(() => {
    if (!initialExerciseId || !session) return;
    setExerciseId(String(initialExerciseId));
    onInitialExerciseConsumed?.();
  }, [initialExerciseId, session]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!session) {
    return (
      <div className="re-card space-y-3">
        <p className="text-sm text-white/70">No session in progress.</p>
        <button className="neon-btn-primary !w-auto px-4 py-2 text-sm inline-flex items-center gap-1"
                onClick={() => onStart(null)}>
          <Play size={14} /> Start a custom session
        </button>
        <p className="text-[11px] text-white/45">
          Log it lift by lift. When you end it, you can save it to RoutineZ to run again.
        </p>
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
  const rank = (id) => { const k = order.indexOf(id); return k < 0 ? Infinity : k; };
  const planned = routine ? asList(routine.exercises)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .sort((a, b) => rank(a.exercise_id) - rank(b.exercise_id))
    .map((e) => {
      const id = swaps[e.exercise_id] ?? e.exercise_id;
      const ex = exercises.find((x) => x.id === id);
      return { ...e, orig_id: e.exercise_id, exercise_id: id, name: ex?.name || `Exercise #${id}`,
               muscle_group: ex?.muscle_group, equipment: ex?.equipment };
    }) : [];
  // Swap one slot for another lift. Refused when that lift is already in the plan.
  const swapProps = (p) => ({
    swapFrom: (pickable || exercises).filter((x) => x.id === p.exercise_id || !planned.some((q) => q.exercise_id === x.id)),
    allExercises: exercises,
    onSwap: (id) => setSwaps((cur) => ({ ...cur, [p.orig_id]: id })),
  });
  const setsByExercise = {};
  for (const s of asList(session.sets)) {
    (setsByExercise[s.exercise_id] ||= []).push(s);
  }
  const loggedExerciseIds = new Set(asList(session.sets).map((s) => s.exercise_id));
  // The most recent set, and the lift a rest alert should point at when it fires.
  const lastLogged = asList(session.sets).reduce(
    (a, x) => (x.created_at && (!a || x.created_at > a.created_at) ? x : a), null);
  const upNext = (() => {
    for (const b of blocks(planned)) {
      if (b.single) {
        const p = b.single;
        if ((setsByExercise[p.exercise_id] || []).length < (p.sets || 3)) return p.name;
      } else {
        const n = nextInPair(b.pair, (setsByExercise[b.pair[0].exercise_id] || []).length,
                             (setsByExercise[b.pair[1].exercise_id] || []).length);
        if (n !== null) return b.pair[n].name;
      }
    }
    return "";
  })();
  const extraExerciseIds = [...loggedExerciseIds].filter(
    (id) => !planned.some((p) => p.exercise_id === id));
  // The unplanned box opens on the last weight entered for the picked lift, done this
  // way: today's latest set of it, else its last finished session.
  const unplannedDone = exerciseId ? (setsByExercise[Number(exerciseId)] || []) : [];
  const ulw = { sets: byEntered(unplannedDone), side: unplannedSide, last: unplannedLast };
  const unplannedKey = typedKey(exerciseId, unplannedSide, unplannedDone.length);
  const ubox = boxValue(typedWeight, unplannedKey, exerciseId ? lastWeightKg(ulw) : null, fromKg, unit);
  const weight = ubox.value;
  const weightHint = ubox.auto ? ({ set: "last set", history: "last time" })[lastWeightSource(ulw)] : "";

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

      <RestTimer key={session.id} sets={asList(session.sets)} goals={goals} routineGoal={session.routine_goal}
                 hold={holdFor(planned, setsByExercise, lastLogged?.exercise_id)?.name || ""}
                 nextName={upNext} alerts={restPrefs} />
      <RestAlertsControl prefs={restPrefs} />

      {planned.length > 0 && (
        <div className="space-y-2">
          <p className="re-label">Your plan <span className="font-normal normal-case text-white/35">— drag ⋮⋮ to change today's order</span></p>
          {(planBlocksRef.current = blocks(planned)).map((b, bi) => {
            const grip = <DragGrip label="Drag this exercise" {...dndPlan.grip(bi)} />;
            if (b.single) {
              const p = b.single;
              return (
                <div key={p.exercise_id} {...dndPlan.row(bi)} className={`rounded-xl${dndPlan.rowClass(bi)}`}>
                  <LoggerRow planned={p} doneSets={setsByExercise[p.exercise_id] || []} grip={grip}
                             onReorder={(f, t) => reorderWithin(p.exercise_id, f, t)}
                             onLogSet={onLogSet} {...swapProps(p)} />
                </div>
              );
            }
            const [x, y] = b.pair;
            const dx = (setsByExercise[x.exercise_id] || []).length;
            const dy = (setsByExercise[y.exercise_id] || []).length;
            const nxt = nextInPair(b.pair, dx, dy);
            // "next" only inside a pair that is under way. Three untouched pairs would
            // each say it, and a marker that is on three rows at once marks nothing.
            const started = dx + dy > 0;
            return (
              <div key={`${x.exercise_id}-${y.exercise_id}`} {...dndPlan.row(bi)}
                   className={`space-y-2 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/[0.03] p-2${dndPlan.rowClass(bi)}`}>
                <p className="flex items-center gap-1 px-1 text-[11px] text-fuchsia-200/80">
                  {grip}
                  <span className="font-bold">Superset {b.group}</span> — {x.name}, then {y.name}, back to back.
                  Rest after both.{nxt === null ? " Both done." : ""}
                </p>
                <LoggerRow planned={x} doneSets={setsByExercise[x.exercise_id] || []} onLogSet={onLogSet} {...swapProps(x)}
                           onReorder={(f, t) => reorderWithin(x.exercise_id, f, t)}
                           tag={`${b.group}1`} isNext={started && nxt === 0} />
                <LoggerRow planned={y} doneSets={setsByExercise[y.exercise_id] || []} onLogSet={onLogSet} {...swapProps(y)}
                           onReorder={(f, t) => reorderWithin(y.exercise_id, f, t)}
                           tag={`${b.group}2`} isNext={started && nxt === 1} />
              </div>
            );
          })}
        </div>
      )}

      {extraExerciseIds.map((id) => {
        const ex = exercises.find((x) => x.id === id);
        return (
          <LoggerRow key={id}
                     planned={{ exercise_id: id, name: ex?.name || `Exercise #${id}`,
                                muscle_group: ex?.muscle_group, equipment: ex?.equipment, sets: setsByExercise[id].length }}
                     doneSets={setsByExercise[id]} onLogSet={onLogSet}
                     onReorder={(f, t) => reorderWithin(id, f, t)} />
        );
      })}

      <div className="re-card space-y-2">
        <p className="re-label">{routine ? "Add an unplanned exercise" : "Pick a lift to log"}</p>
        {!routine && asList(session.sets).length === 0 && (
          <p className="text-[11px] text-white/45">
            A custom session: pick a lift, log its sets, then the next. End it when you're done and save it to RoutineZ.
          </p>
        )}
        <ExercisePicker exercises={pickable || exercises} all={exercises} value={exerciseId} onChange={setExerciseId} />
        {exerciseId && <SidePick value={unplannedSide} onChange={setUnplannedSide} />}
        {exerciseId && unplannedLast && unplannedLast.sets.length > 0 && (
          <button type="button" className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs"
                  onClick={async () => {
                    for (const st of unplannedLast.sets) {
                      await onLogSet(Number(exerciseId), st.reps, st.weight_kg != null ? fromKg(st.weight_kg, unit) : "", st.one_sided || "");
                    }
                  }}>
            Copy last time ({unplannedLast.sets.length} set{unplannedLast.sets.length === 1 ? "" : "s"})
          </button>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Field label={`Weight (${unit})`} hint={weightHint} className="w-28" placeholder="optional" type="number" min="0" step="0.5" inputMode="decimal"
                 value={weight} onChange={(e) => setTypedWeight({ key: unplannedKey, v: e.target.value })} />
          <Field label="Reps" className="w-24" placeholder="reps" type="number" min="1" max="1000" inputMode="numeric"
                 value={reps} onChange={(e) => setReps(e.target.value)} />
          <button className="neon-btn-primary !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                  disabled={!exerciseId || !reps}
                  onClick={() => {
                    onLogSet(Number(exerciseId), Number(reps), weight === "" ? "" : Number(weight), unplannedSide);
                    setReps("");  // the weight stays: logging the set makes it the last one entered
                  }}>
            <Plus size={13} /> Log
          </button>
        </div>
      </div>
    </div>
  );
}

// "Write about this workout" — a finished session becomes a poem, lyric,
// caption or post through Sentence ConnectZ's own writer. The brief is built
// server-side from the session's own logged sets (apps/economy/bodiez.py's
// `workout_topic`), never from anything typed here, the same way a coach
// take's promo post is: a tangible, saveable, editable, shareable thing comes
// out the other end of a PromptZ spend, per the cost/gain rule, not a number
// with no reason behind it.
function WorkoutWrite({ sessionId, onClose }) {
  const [spec, setSpec] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [kind, setKind] = useState("");
  const [tags, setTags] = useRemembered("bodiez-write-hashtags", "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [runErr, setRunErr] = useState("");

  useEffect(() => {
    let on = true;
    api(`/api/economy/bodiez/sessions/${sessionId}/write/`)
      .then((d) => { if (!on) return; setSpec(d); setKind(d.kinds?.[0]?.key || "poem"); })
      .catch((e) => { if (on) setLoadErr(e.message || "Couldn't check the price."); });
    return () => { on = false; };
  }, [sessionId]);

  async function write() {
    setBusy(true); setRunErr("");
    try {
      setResult(await api(`/api/economy/bodiez/sessions/${sessionId}/write/`,
        { method: "POST", body: { kind, ...hashtagBody(tags) } }));
    } catch (e) { setRunErr(e.message || "Couldn't write that. Nothing was charged."); }
    finally { setBusy(false); }
  }

  if (result) {
    return (
      <PromoPost promo={result} onClose={onClose}
                 title={spec.kinds.find((k) => k.key === result.kind)?.label || "What it wrote"}
                 note="Written from this workout's own logged sets only — nothing invented. It's saved in Sentence ConnectZ, so if you use it in a release, battle or deal, K-Oth's royalty applies to the part you keep." />
    );
  }

  return (
    <div className="re-card space-y-2">
      <div className="flex items-center justify-between">
        <p className="re-label">Write about this workout</p>
        <button className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>
      {loadErr && <p role="alert" className="text-[11px] text-mcz-ember">{loadErr}</p>}
      {!spec && !loadErr && <p className="text-[11px] text-white/40">Checking the price…</p>}
      {spec && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {spec.kinds.map((k) => (
              <button key={k.key} onClick={() => setKind(k.key)}
                      className={`pill ${kind === k.key ? "!bg-white/15 !text-white" : ""}`}>
                {k.emoji} {k.label}
              </button>
            ))}
          </div>
          {(kind === "caption" || kind === "post") && <HashtagCount value={tags} onChange={setTags} />}
          <div className="flex flex-wrap items-center gap-2">
            <button className="neon-btn-primary !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                    disabled={busy} onClick={write}>
              {busy ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />}
              {busy ? "Writing…" : "Write it"}
            </button>
            {spec.cost.free_today
              ? <span className="text-[11px] text-emerald-300">free today</span>
              : <span className="text-[11px] text-mcz-ember">−{spec.cost.amount} {PROMPTZ}</span>}
          </div>
          {runErr && <p className="text-[11px] text-mcz-ember">{runErr}</p>}
        </>
      )}
    </div>
  );
}

// Log a workout that already happened. Sent as one request (the server
// validates every set or saves none), lands as a finished session on that
// date, and answers with the same summary a live one does — so the records it
// beat are shown, judged against earlier sessions only. It is flagged
// `backfilled` server-side: no rest times or duration exist for it, and none
// are invented. No cost, no gain: nothing here moves a resource.
// `editing` (a finished session) turns this into the editor for a workout
// already logged: same rows, same validation, saved through `onSaveEdit`.
// Its sets keep their ids, so a set that was logged live keeps the rest time
// the server measured; the date is only editable on one typed in afterwards,
// because a live one's time was measured, not chosen.
function PastWorkout({ exercises, pickable, routines = [], onSaved, editing = null, onSaveEdit, onCancel,
                        initialRoutineId = null, onInitialRoutineConsumed }) {
  const unit = useUnit();
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const editDate = editing ? new Date(new Date(editing.started_at).getTime() - new Date(editing.started_at).getTimezoneOffset() * 60000).toISOString().slice(0, 10) : null;
  const [open, setOpenState] = useState(!!editing);
  const setOpen = (v) => { setOpenState(v); if (!v && editing) onCancel?.(); };
  const [date, setDate] = useState(editDate || todayStr);
  const [notes, setNotes] = useState(editing?.notes || "");
  // The member's order (`position`, set when a workout is typed in, edited or dragged),
  // then the order things happened for a set logged live and never moved.
  const [sets, setSets] = useState(() => (editing ? asList(editing.sets).slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0) || a.id - b.id).map((st) => ({
    id: st.id, exercise_id: st.exercise_id, reps: st.reps, weight_kg: st.weight_kg, one_sided: st.one_sided || "" })) : []));
  const [routineId, setRoutineId] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [typedWeight, setTypedWeight] = useState(null);
  const [reps, setReps] = useState("");
  const [side, setSide] = useSide(exerciseId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [swapping, setSwapping] = useState(null);   // index of the exercise group being edited
  const list = pickable || exercises;
  const nameOf = (id) => exercises.find((e) => e.id === id)?.name || `Exercise #${id}`;
  const last = useHistory(exerciseId || null, side);
  // The weight box opens on the last weight entered for this lift, done this way: the latest
  // set of it already in THIS workout, else its last finished session. Adding a set changes
  // the count in the key, which hands a typed number back to the auto-fill.
  const mineHere = exerciseId ? sets.filter((st) => st.exercise_id === Number(exerciseId)) : [];
  const lwHere = { sets: mineHere, side, last };
  const boxKey = typedKey(exerciseId, side, mineHere.length);
  const wbox = boxValue(typedWeight, boxKey, exerciseId ? lastWeightKg(lwHere) : null, fromKg, unit);
  const weight = wbox.value;
  const weightHint = wbox.auto ? ({ set: "last set", history: "last time" })[lastWeightSource(lwHere)] : "";

  // A routine fills in the whole workout — every exercise, its planned sets,
  // reps and weight, and the way the member usually does each one (one arm,
  // one leg) — so logging the session you did is correcting numbers rather
  // than adding sixteen sets by hand. Nothing is saved until Save.
  const pickRoutine = (id) => {
    const r = routines.find((x) => String(x.id) === String(id));
    if (!r) { setRoutineId(""); return; }
    if (sets.length > 0 && !window.confirm("Replace the sets you've added with this routine's?")) return;
    const rows = [];
    for (const e of asList(r.exercises).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      let remembered = "";
      try { remembered = localStorage.getItem(sideKey(e.exercise_id)) || ""; } catch { /* blocked */ }
      for (let i = 0; i < (Number(e.sets) || 3); i++) {
        rows.push({ exercise_id: e.exercise_id, reps: Number(e.reps) || 10,
                    weight_kg: e.weight_kg != null && e.weight_kg !== "" ? Number(e.weight_kg) : null, one_sided: remembered });
      }
    }
    setRoutineId(r.id);
    setSets(rows);
  };
  // "Log past session" on a routine card hands the routine over this way —
  // open the panel already filled in, rather than leaving the member to
  // find the same routine again in the dropdown below.
  useEffect(() => {
    if (!initialRoutineId) return;
    setOpenState(true);
    pickRoutine(initialRoutineId);
    onInitialRoutineConsumed?.();
  }, [initialRoutineId]);
  const patchSet = (i, patch) => setSets(sets.map((st, k) => (k === i ? { ...st, ...patch } : st)));

  // Copy: bring a lift in the way it was last done (every set, same weights and
  // the same one-arm/one-leg marker), or repeat a set you have just entered —
  // correcting numbers is faster than typing them again.
  const copyLastTime = () => setSets([...sets, ...last.sets.map((st) => ({
    exercise_id: Number(exerciseId), reps: st.reps, weight_kg: st.weight_kg, one_sided: st.one_sided || "" }))]);
  // The copy is a NEW set: it must not carry the original's id, or an edit
  // would read it as the same row twice.
  const repeatSet = (i) => setSets([...sets.slice(0, i + 1), { ...sets[i], id: undefined }, ...sets.slice(i + 1)]);

  const addSet = () => {
    if (!exerciseId || !reps) return;
    setSets([...sets, { exercise_id: Number(exerciseId), reps: Number(reps), weight_kg: weight === "" ? null : toKg(Number(weight), unit), one_sided: side }]);
    setReps("");  // exercise stays, and so does the weight: the added set is now the last one entered
  };

  async function save() {
    setBusy(true); setErr("");
    if (editing) {
      try {
        const sm = await onSaveEdit(editing.id, { sets, notes, date: editing.backfilled && date !== editDate ? date : undefined });
        onSaved(sm);
      } catch (e) { setErr(e.message || "Couldn't save that. Nothing was changed."); }
      finally { setBusy(false); }
      return;
    }
    try {
      const done = await api("/api/economy/bodiez/sessions/past/", { method: "POST", body: { date, notes, sets, routine_id: routineId || undefined } });
      setSets([]); setNotes(""); setRoutineId(""); setOpen(false);
      onSaved(done.summary);
    } catch (e) { setErr(e.message || "Couldn't save that workout. Nothing was saved."); }
    finally { setBusy(false); }
  }

  const grouped = [];
  sets.forEach((st, i) => {
    const last = grouped[grouped.length - 1];
    if (last && last.exercise_id === st.exercise_id) last.rows.push({ ...st, i });
    else grouped.push({ exercise_id: st.exercise_id, rows: [{ ...st, i }] });
  });
  // Drag an exercise (all its sets go with it) or one set inside its exercise.
  const exOf = (st) => st.exercise_id;
  const groupOf = (i) => grouped.findIndex((g) => g.rows.some((r) => r.i === i));
  const dndEx = useDragReorder("pw-ex", (from, to) => { setSets(moveRun(sets, exOf, from, to)); setSwapping(null); });
  const dndSet = useDragReorder("pw-set", (from, to) => setSets(moveItem(sets, from, to)),
                                (from, to) => groupOf(from) === groupOf(to));

  if (!open) {
    return (
      <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" onClick={() => setOpen(true)}>
        <CalendarDays size={13} /> Log a past workout
      </button>
    );
  }


  return (
    <div className="re-card space-y-3">
      <div className="flex items-center justify-between">
        <p className="re-label">{editing ? `Edit workout — ${editing.routine_title || "Workout"}` : "Log a past workout"}</p>
        <button className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Date" className="w-44" type="date" max={todayStr} value={date} onChange={(e) => setDate(e.target.value)}
               disabled={!!editing && !editing.backfilled}
               title={editing && !editing.backfilled ? "Logged live — it keeps the time it happened" : undefined} />
        {!editing && routines.length > 0 && (
          <label className="block min-w-0 flex-1">
            <span className="re-label">Routine</span>
            <select aria-label="Routine" className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                    value={routineId} onChange={(e) => pickRoutine(e.target.value)}>
              <option value="">Start from a routine…</option>
              {routines.map((r) => <option key={r.id} value={r.id}>{r.title} ({asList(r.exercises).length})</option>)}
            </select>
          </label>
        )}
      </div>

      {grouped.map((g, gi) => (
        <div key={gi} {...dndEx.row(gi)} className={`rounded-lg bg-white/5 px-3 py-2${dndEx.rowClass(gi)}`}>
          <div className="flex items-center justify-between gap-2">
            <DragGrip label="Drag this exercise" {...dndEx.grip(gi)} />
            <p className="min-w-0 flex-1 text-xs font-semibold text-white">
              {nameOf(g.exercise_id)}
              {exercises.find((e) => e.id === g.exercise_id)?.equipment && (
                <span className="ml-1.5 font-normal text-white/40">
                  · {EQUIPMENT_LABEL[exercises.find((e) => e.id === g.exercise_id).equipment] || exercises.find((e) => e.id === g.exercise_id).equipment}
                </span>
              )}
            </p>
            <button type="button" className="rounded px-1.5 text-[11px] text-mcz-cyan hover:bg-white/10"
                    onClick={() => setSwapping(swapping === gi ? null : gi)}>
              {swapping === gi ? "Done" : "Edit"}
            </button>
          </div>
          {swapping === gi && (
            <div className="mt-2 space-y-2">
              <ExerciseSwap current={g.exercise_id} all={exercises} choices={list}
                            note={`Change this exercise (all ${g.rows.length} set${g.rows.length === 1 ? "" : "s"}). Weights and reps stay as typed.`}
                            onPick={(id) => {
                              const idxs = new Set(g.rows.map((r) => r.i));
                              setSets(sets.map((st, k) => (idxs.has(k) ? { ...st, exercise_id: id } : st)));
                            }} />
              <button type="button" className="text-[11px] text-mcz-ember hover:underline"
                      onClick={() => { const idxs = new Set(g.rows.map((r) => r.i)); setSets(sets.filter((_, k) => !idxs.has(k))); setSwapping(null); }}>
                Remove this exercise
              </button>
            </div>
          )}
          {g.rows.map((r) => (
            <div key={r.i} {...dndSet.row(r.i)}
                 className={`flex items-center justify-between gap-2 rounded py-0.5 text-xs text-white/70${dndSet.rowClass(r.i)}`}>
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {g.rows.length > 1 && <DragGrip label="Drag this set" size={12} {...dndSet.grip(r.i)} />}
                <input aria-label="Weight" type="number" min="0" step="0.5" inputMode="decimal" placeholder="bw"
                       className="w-20 rounded border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-white outline-none"
                       value={r.weight_kg != null ? String(fromKg(r.weight_kg, unit)) : ""}
                       onChange={(e) => patchSet(r.i, { weight_kg: e.target.value === "" ? null : toKg(Number(e.target.value), unit) })} />
                <span className="text-white/35">{unit} ×</span>
                <input aria-label="Reps" type="number" min="1" max="1000" inputMode="numeric"
                       className="w-16 rounded border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-white outline-none"
                       value={r.reps} onChange={(e) => patchSet(r.i, { reps: Number(e.target.value) || "" })} />
                {r.one_sided && <span className="text-mcz-cyan/70">{SIDE_LABEL[r.one_sided].toLowerCase()}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button className="rounded px-1.5 text-[11px] text-mcz-cyan hover:bg-white/10" onClick={() => repeatSet(r.i)} aria-label="Repeat this set">Repeat</button>
                <button className="text-white/30 hover:text-mcz-ember" onClick={() => setSets(sets.filter((_, k) => k !== r.i))} aria-label="Remove set"><X size={12} /></button>
              </span>
            </div>
          ))}
        </div>
      ))}

      {exerciseId && <SidePick value={side} onChange={setSide} />}
      <div className="flex flex-wrap items-end gap-2">
        <ExercisePicker exercises={list} all={exercises} value={exerciseId} onChange={setExerciseId} />
        <Field label={`Weight (${unit})`} hint={weightHint} className="w-28" placeholder="optional" type="number" min="0" step="0.5" inputMode="decimal"
               value={weight} onChange={(e) => setTypedWeight({ key: boxKey, v: e.target.value })} />
        <Field label="Reps" className="w-24" placeholder="reps" type="number" min="1" max="1000" inputMode="numeric"
               value={reps} onChange={(e) => setReps(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && addSet()} />
        <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" disabled={!exerciseId || !reps} onClick={addSet}>
          <Plus size={13} /> Add set
        </button>
        {exerciseId && last && last.sets.length > 0 && (
          <button type="button" className="neon-btn-ghost !w-auto px-3 py-2 text-xs" onClick={copyLastTime}>
            Copy last time ({last.sets.length} set{last.sets.length === 1 ? "" : "s"})
          </button>
        )}
      </div>

      <input aria-label="Note (optional)" className="neon-input !py-2 w-full text-sm" placeholder="Note (optional)" maxLength={2000}
             value={notes} onChange={(e) => setNotes(e.target.value)} />
      {err && <p role="alert" className="text-xs text-mcz-ember">{err}</p>}
      <button className="neon-btn-primary !w-auto px-4 py-2 text-sm disabled:opacity-50" disabled={busy || sets.length === 0 || sets.some((st) => !st.reps)} onClick={save}>
        {busy ? <Loader2 className="animate-spin" size={14} /> : `${editing ? "Save changes" : "Save workout"} (${sets.length} set${sets.length === 1 ? "" : "s"})`}
      </button>
      <p className="text-[11px] text-white/40">
        {editing
          ? "Your records, body map and goals are recounted from the edited sets. Sets you keep keep their measured rest; new ones have none."
          : "Counts toward your records, body map and goals like any workout. Rest times and duration aren't recorded for one you log afterwards."}
      </p>
    </div>
  );
}

// What the member's body can do — three independent answers, because someone
// who cannot walk can usually use both arms and someone with one arm out of
// action can usually still leg-press. The server decides which exercises that
// leaves (`accessible` on every row); this only asks, and says how many it
// leaves so a restrictive choice is never a silent empty list.
function AccessPanel({ access, onChange, shown, total }) {
  const restricted = access.seated_or_lying_only || !access.arms_ok || !access.legs_ok
    || access.one_arm_only || access.one_leg_only;
  const [open, setOpen] = useState(restricted);
  const rows = [
    { key: "seated_or_lying_only", on: access.seated_or_lying_only,
      label: "I can't stand or walk", hint: "Only seated or lying exercises",
      set: (v) => ({ seated_or_lying_only: v }) },
    { key: "arms_ok", on: !access.arms_ok,
      label: "I can't use my arms", hint: "Hide anything that needs them",
      set: (v) => ({ arms_ok: !v, ...(v ? { one_arm_only: false } : {}) }) },
    // One-arm / one-leg sit between "fine" and "can't": they keep what can be
    // done a side at a time. Mutually exclusive with the stricter answer.
    { key: "one_arm_only", on: !!access.one_arm_only && access.arms_ok, disabled: !access.arms_ok,
      label: "I can only use one arm", hint: "Only exercises done one arm at a time",
      set: (v) => ({ one_arm_only: v, ...(v ? { arms_ok: true } : {}) }) },
    { key: "legs_ok", on: !access.legs_ok,
      label: "I can't use my legs", hint: "Hide anything that needs them, and anything standing",
      set: (v) => ({ legs_ok: !v, ...(v ? { one_leg_only: false } : {}) }) },
    { key: "one_leg_only", on: !!access.one_leg_only && access.legs_ok, disabled: !access.legs_ok,
      label: "I can only use one leg", hint: "Only exercises that work one leg at a time",
      set: (v) => ({ one_leg_only: v, ...(v ? { legs_ok: true } : {}) }) },
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
              <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={r.on} disabled={r.disabled}
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
function RoutineDesigner({ routine, exercises, pickable, demoCredit, onSave, onClose, restSeconds }) {
  const unit = useUnit();
  const [rows, setRows] = useState(
    () => asList(routine.exercises).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((e) => ({ ...e })));
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Name and note are edited here too, so ANY routine — the Coach's, the
  // trial's, one built from a workout — can be made fully the member's own.
  const [title, setTitle] = useState(routine.title || "");
  const [description, setDescription] = useState(routine.description || "");
  const [saving, setSaving] = useState(false);
  const [swapIdx, setSwapIdx] = useState(null);   // row whose exercise is being changed
  const [swapErr, setSwapErr] = useState("");

  // Type to narrow, pick a muscle to narrow again; the member's own lifts come first.
  const filtered = useMemo(() => suggest(
    (pickable || exercises).filter((ex) => equipment.length === 0 || equipment.includes(ex.equipment)), q, muscle,
  ), [exercises, pickable, muscle, equipment, q]);

  const addExercise = (exerciseId) => {
    if (rows.some((r) => r.exercise_id === exerciseId)) return;
    setRows([...rows, { exercise_id: exerciseId, sets: 3, reps: 10, weight_kg: null }]);
    setDirty(true);
  };
  // A superset is two rows side by side, so every edit that can pull them apart
  // goes through `normalize`: a lone label left behind would claim a pair that
  // is not there. Linking by hand is the free half of supersets; the Coach
  // choosing the partner is `PairWithCoach`.
  const removeExercise = (exerciseId) => {
    setRows(normalize(rows.filter((r) => r.exercise_id !== exerciseId)));
    setDirty(true);
  };
  const moveRow = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setRows(normalize(next));
    setDirty(true);
  };
  // Drag to reorder (the shared pattern in useDragReorder). Same `normalize` as the
  // arrows, so a superset a drop pulls apart is dropped rather than left claiming a
  // partner that is no longer beside it.
  const dnd = useDragReorder("routine", (from, to) => {
    setRows(normalize(moveItem(rows, from, to)));
    setDirty(true);
    setSwapIdx(null);
  });
  const link = (i) => {
    const next = linkWithNext(rows, i);
    if (next) { setRows(next); setDirty(true); }
  };
  const apart = (i) => { setRows(unlink(rows, i)); setDirty(true); };
  // Any two lifts, not only neighbours: the partner moves to directly below, and a pair
  // either was already in comes apart first (`pairWith` says how).
  const pairUp = (i, j) => {
    const next = pairWith(rows, i, j);
    if (next) { setRows(next); setDirty(true); setSwapIdx(null); }
  };
  // Same sets, reps and weight and the same place in any superset — only the lift changes.
  const swapExercise = (i, id) => {
    if (!id || Number(id) === rows[i].exercise_id) return;
    if (rows.some((r, k) => k !== i && r.exercise_id === Number(id))) { setSwapErr("That exercise is already in this routine."); return; }
    setSwapErr("");
    patchRow(i, { exercise_id: Number(id), added: undefined });
  };
  const patchRow = (i, patch) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    setRows(next);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const ok = await onSave(rows.map((r, i) => ({
      exercise_id: r.exercise_id, order: i,
      sets: r.sets ? Number(r.sets) : undefined,
      reps: r.reps ? Number(r.reps) : undefined,
      weight_kg: r.weight_kg === "" || r.weight_kg == null ? null : Number(r.weight_kg),
      ...(r.group ? { group: r.group } : {}),
      ...(r.added ? { added: true } : {}),
    })), { title: title.trim() || routine.title, description: description.trim() });
    setSaving(false);
    // Stays dirty when the save failed, so the button still offers it.
    if (ok !== false) setDirty(false);
  };

  return (
    <div className="re-card space-y-3 border-fuchsia-400/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Editing "{routine.title}"</p>
        <button className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input aria-label="Routine name" className="neon-input !py-2 min-w-0 flex-1 text-sm" maxLength={80}
               value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
        <input aria-label="Routine note" className="neon-input !py-2 min-w-0 flex-1 text-sm" maxLength={200}
               placeholder="Note (optional)"
               value={description} onChange={(e) => { setDescription(e.target.value); setDirty(true); }} />
      </div>
      <RoutineTime items={rows} restSeconds={restSeconds} />

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-white/40">
          No exercises yet — add some from the library below.
        </p>
      )}
      {rows.map((r, i) => {
        const ex = exercises.find((x) => x.id === r.exercise_id);
        const tag = badge(rows, i);
        return (
          <div key={i} {...dnd.row(i)}
               className={`flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-3 py-2 ${
                 tag ? "border-l-2 border-fuchsia-400/60" : ""}${dnd.rowClass(i)}`}>
            <DragGrip {...dnd.grip(i)} />
            <div className="flex flex-col">
              <button className="rounded p-0.5 text-white/30 hover:text-white disabled:opacity-20"
                      disabled={i === 0} onClick={() => moveRow(i, -1)}><ChevronUp size={13} /></button>
              <button className="rounded p-0.5 text-white/30 hover:text-white disabled:opacity-20"
                      disabled={i === rows.length - 1} onClick={() => moveRow(i, 1)}><ChevronDown size={13} /></button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {tag && <span className="mr-1.5 rounded bg-fuchsia-500/20 px-1 py-0.5 text-[10px] font-bold text-fuchsia-300"
                              title="Superset: done back to back, rest after the pair">{tag}</span>}
                {ex?.name || `#${r.exercise_id}`}
                {r.added && <span className="ml-1.5 text-[10px] font-normal text-mcz-cyan/80">added by the Planner</span>}
              </p>
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
            {rows.length > 1 && (
              <select aria-label="Superset with" data-nomemo="true" value=""
                      onChange={(e) => e.target.value !== "" && pairUp(i, Number(e.target.value))}
                      className="max-w-[9rem] rounded-lg border border-white/[0.08] bg-black/40 px-1.5 py-1 text-[11px] text-white outline-none">
                <option value="">{r.group ? "Re-pair with…" : "Superset with…"}</option>
                {rows.map((o, k) => (k === i || k === partnerOf(rows, i) ? null : (
                  <option key={k} value={k}>{exercises.find((x) => x.id === o.exercise_id)?.name || `#${o.exercise_id}`}{o.group ? " (breaks its pair)" : ""}</option>
                )))}
              </select>
            )}
            {r.group ? (
              <button className="rounded p-1.5 text-fuchsia-300/70 hover:bg-white/10 hover:text-fuchsia-300"
                      title="Take this superset apart" aria-label="Unlink superset" onClick={() => apart(i)}>
                <Unlink size={13} />
              </button>
            ) : (
              <button className="rounded p-1.5 text-white/30 hover:bg-white/10 hover:text-fuchsia-300 disabled:opacity-20"
                      title="Superset with the lift below" aria-label="Link with the next lift"
                      disabled={i === rows.length - 1 || !!rows[i + 1]?.group} onClick={() => link(i)}>
                <Link2 size={13} />
              </button>
            )}
            <button className="rounded px-1.5 text-[11px] text-mcz-cyan hover:bg-white/10"
                    onClick={() => { setSwapErr(""); setSwapIdx(swapIdx === i ? null : i); }}>
              {swapIdx === i ? "Done" : "Change"}
            </button>
            <button className="rounded p-1.5 text-white/30 hover:bg-white/10 hover:text-mcz-ember"
                    onClick={() => removeExercise(r.exercise_id)}><Trash2 size={13} /></button>
            {swapIdx === i && (
              <div className="w-full space-y-2">
                <ExerciseSwap current={r.exercise_id} all={exercises} choices={pickable || exercises}
                              note="Swap this lift for another — sets, reps, weight and superset pairing stay."
                              onPick={(id) => swapExercise(i, id)} />
                {swapErr && <p className="text-[11px] text-mcz-ember">{swapErr}</p>}
              </div>
            )}
          </div>
        );
      })}

      {rows.length > 0 && (
        <PairWithCoach rows={rows} equipment={equipment}
                       nameOf={(id) => exercises.find((x) => x.id === id)?.name || `#${id}`}
                       onApply={(next) => { setRows(next); setDirty(true); }} />
      )}

      <button className="neon-btn-primary !w-auto px-4 py-2 text-xs disabled:opacity-40" disabled={!dirty || saving || !title.trim()}
              onClick={save}>
        {saving ? <Loader2 className="animate-spin" size={13} /> : "Save routine"}
      </button>

      <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="re-label">Add from the library</p>
        {demoCredit && <p className="text-[11px] text-white/35">{demoCredit}</p>}
        <select aria-label="Muscle group" className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          <option value="">All muscle groups</option>
          {Object.entries(MUSCLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input aria-label="Search exercises" className="neon-input !py-2 w-full text-sm" placeholder="Type to search…"
               value={q} onChange={(e) => setQ(e.target.value)} />
        <EquipmentPicker selected={equipment}
                         onToggle={(k) => setEquipment((cur) => toggleEquipment(cur, k))} />
        {creating ? (
          <CustomExerciseForm initialName={q.trim()} initialMuscle={muscle}
                              onCreated={(ex) => { addExercise(ex.id); setCreating(false); setQ(""); }}
                              onUseExisting={(id) => { addExercise(id); setCreating(false); }}
                              onCancel={() => setCreating(false)} />
        ) : (
          <button type="button" className="inline-flex items-center gap-1 text-xs text-mcz-cyan hover:underline" onClick={() => setCreating(true)}>
            <Plus size={13} /> {q.trim().length >= 2 && filtered.length === 0 ? `Create “${q.trim()}” as a custom exercise` : "Create a custom exercise"}
          </button>
        )}
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

// RoutineZ: every routine in one list — the Coach's, the member's own, the
// trial's and ones made from a logged workout — each opening the same
// designer, so where a routine came from never decides whether it can be
// changed. The Coach builders sit at the top because a built routine lands
// right below them, already open to edit. Logged workouts sit at the bottom:
// each can be corrected, or turned into a new routine — a workout you did is
// the most honest routine there is.
//
// The source label is the server's (`source`), and the Scheduler keeps the
// buckets; this tab is about WHAT a routine is, that one about WHEN.
const SOURCE_LABEL = { member: "Yours", coach: "Coach-built", session: "From a workout", trial: "From the trial" };
const SOURCE_TONE = {
  member: "bg-white/10 text-white/70 ring-white/15",
  coach: "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-400/30",
  session: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
  trial: "bg-mcz-cyan/15 text-mcz-cyan ring-mcz-cyan/30",
};

function RoutineZView({ routines, exercises, pickable, demoCredit, coach, bodymap, dayTagLabels,
                        prefillMuscle, onPrefillConsumed, onLogPast, onBuildRoutine, onBuildSplit, onCreate,
                        onSaveExercises, onCopy, onDelete, onStart, sessionOpen,
                        onOpenSessionZ, onSaveNew, planCaveat, onImported }) {
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [fitting, setFitting] = useState(null);
  const [title, setTitle] = useState("");
  const goals = coach?.goals;
  const nameOf = (id) => exercises.find((e) => e.id === id)?.name || `Exercise #${id}`;
  const sourceOf = (r) => r.source || "member";
  const counts = routines.reduce((acc, r) => ({ ...acc, [sourceOf(r)]: (acc[sourceOf(r)] || 0) + 1 }), {});
  const shown = filter ? routines.filter((r) => sourceOf(r) === filter) : routines;

  return (
    <div className="space-y-5">
      <ImportWorkouts exercises={exercises} onImported={onImported} muscles={MUSCLE_LABEL} equipment={EQUIPMENT_LABEL} />
      <section className="space-y-2">
        <p className="re-label">Have the Planner build one</p>
        <p className="text-[11px] text-white/45">
          Pick the criteria — muscles (or the whole body), equipment, goal, how many exercises per muscle, how long you
          have — and it builds from the library and your own BodyMap. Free: no 🏷️, no AI, just your data. What it
          saves is yours to edit like any other routine.
        </p>
        {coach && bodymap && pickable.length > 0 ? (
          <>
            <MuscleDayBuilder exercises={pickable} goals={goals} dayTagLabels={dayTagLabels || []}
                              initialMuscle={prefillMuscle} onInitialMuscleConsumed={onPrefillConsumed}
                              onBuildRoutine={onBuildRoutine} />
            <BuildRoutine bodymap={bodymap} exercises={pickable} goals={goals} onBuildRoutine={onBuildRoutine} />
            <SplitBuilder bodymap={bodymap} exercises={pickable} goals={goals} splits={coach.splits}
                          onBuildSplit={onBuildSplit} />
          </>
        ) : (
          <p className="text-xs text-white/40">The Planner needs the exercise library to load first.</p>
        )}
      </section>

      <section className="space-y-2">
        <p className="re-label">All routines</p>
        <div className="re-card flex flex-wrap gap-2">
          <input aria-label="New routine name" className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="Make your own — name it"
                 maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" disabled={!title.trim()}
                  onClick={() => { onCreate(title.trim()); setTitle(""); }}>
            <Plus size={13} /> Create
          </button>
        </div>
        {routines.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[["", "All", routines.length], ...Object.keys(SOURCE_LABEL).filter((k) => counts[k]).map((k) => [k, SOURCE_LABEL[k], counts[k]])]
              .map(([k, label, n]) => (
                <button key={k || "all"} onClick={() => setFilter(k)}
                        className={`rounded-full px-2.5 py-1 text-[11px] transition-all ${
                          filter === k ? "bg-mcz-cyan/20 text-mcz-cyan ring-1 ring-mcz-cyan/40" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                  {label} <span className="text-white/35">{n}</span>
                </button>
              ))}
          </div>
        )}
        {shown.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
            No routines yet — have the Planner build one above, make your own, or turn a logged workout below into one.
          </p>
        )}
        {shown.map((r) => {
          const items = asList(r.exercises);
          return (
            <div key={r.id} className="re-card space-y-1.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-white">{r.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${SOURCE_TONE[sourceOf(r)]}`}>
                      {SOURCE_LABEL[sourceOf(r)]}
                    </span>
                  </div>
                  <p className="text-xs text-white/45">
                    {items.length} exercise{items.length === 1 ? "" : "s"}
                    {items.length > 0 && <>: {items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).slice(0, 4).map((e) => nameOf(e.exercise_id)).join(", ")}{items.length > 4 ? "…" : ""}</>}
                  </p>
                  {r.description && <p className="text-[11px] text-white/40">{r.description}</p>}
                  <p className="text-[11px]" title={bodymap?.rating_caveat}>
                    {r.coach_rating != null
                      ? <span className="font-semibold text-emerald-200">Thorough {r.coach_rating}/10</span>
                      : <span className="text-white/35">Thorough: not rated yet</span>}
                    {r.coach_why && <span className="text-white/40"> — {r.coach_why}</span>}
                  </p>
                  {asList(r.coach_exercises).length > 0 && (
                    <p className="text-[10px] text-white/40">
                      {asList(r.coach_exercises).map((e) => `${nameOf(e.exercise_id)} ${e.rating ?? "–"}`).join(" · ")}
                    </p>
                  )}
                  <PlanRating key={`${r.id}:${r.updated_at}`} routine={r} caveat={planCaveat}
                              onApply={(list) => onSaveExercises(r.id, list)} />
                  <RoutineTime items={items} restSeconds={goals?.[r.goal]?.rest_seconds} />
                  <AskAI scope="routine" id={r.id} disabled={items.length === 0} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                          onClick={() => setEditing(editing === r.id ? null : r.id)}>
                    <Pencil size={12} /> {editing === r.id ? "Close" : "Edit"}
                  </button>
                  <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                          title="Pick the equipment you have; the Planner swaps in lifts that use only that (free)"
                          onClick={() => setFitting(fitting === r.id ? null : r.id)}>
                    <Dumbbell size={12} /> {fitting === r.id ? "Close fit" : "Fit to equipment"}
                  </button>
                  <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                          title="A new routine to change, keeping this one as it is" onClick={() => onCopy(r.id)}>
                    <Copy size={12} /> Copy
                  </button>
                  <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                          title="Get a code a friend can paste to add their own copy (30 days, free)"
                          onClick={async () => {
                            try {
                              const out = await api(`/api/economy/bodiez/routines/${r.id}/share/`, { method: "POST" });
                              try { await navigator.clipboard.writeText(out.code); } catch { /* blocked */ }
                              window.prompt(`Code for “${out.title}” — good for ${out.expires_in_days} days. Copied if your browser allows:`, out.code);
                            } catch (e) { window.alert(e.message || "Couldn't make a code."); }
                          }}>
                    <Share2 size={12} /> Share
                  </button>
                  <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                          disabled={sessionOpen} title={sessionOpen ? "Finish your open session first" : "Start a session from this routine"}
                          onClick={() => onStart(r.id)}>
                    <Play size={12} /> Start
                  </button>
                  {/* Trained this with pen and paper? Log it after the fact —
                      opens "Log a past workout" on Today, already filled in
                      with this routine's exercises, sets and reps, rather
                      than making the member find it again in a dropdown. */}
                  <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                          title="Logged this on paper? Record it here" onClick={() => onLogPast(r.id)}>
                    <CalendarDays size={12} /> Log past session
                  </button>
                  <button className="rounded p-1.5 text-white/30 hover:bg-white/10 hover:text-mcz-ember"
                          onClick={() => onDelete(r.id)} title="Delete permanently" aria-label="Delete routine">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {/* The designer opens UNDER the routine it edits. It used to open
                  once, above the whole list, so Edit on a routine further down
                  flipped to Close with nothing visible beside it. */}
              {fitting === r.id && (
                <EquipmentFit key={r.id} routine={r} exercises={exercises} pickable={pickable} sessionOpen={sessionOpen}
                              onApply={(list) => onSaveExercises(r.id, list)}
                              onSaveNew={(name, list) => onSaveNew(name, list, r.goal)}
                              onStart={(id) => onStart(id)} onClose={() => setFitting(null)} />
              )}
              {editing === r.id && (
                <RoutineDesigner key={r.id} routine={r} exercises={exercises} pickable={pickable} demoCredit={demoCredit}
                                 onSave={(list, meta) => onSaveExercises(r.id, list, meta)}
                                 onClose={() => setEditing(null)}
                                 restSeconds={goals?.[r.goal]?.rest_seconds} />
              )}
            </div>
          );
        })}
      </section>

      <section className="space-y-2">
        <p className="re-label">Logged workouts</p>
        <p className="text-[11px] text-white/45">
          Every workout you have logged — to fix a set, make it a routine, or delete it — lives in SessionZ.
        </p>
        <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1" onClick={onOpenSessionZ}>
          <Pencil size={12} /> Open SessionZ
        </button>
      </section>
    </div>
  );
}

// SessionZ — every past session, editable. RoutineZ used to keep the newest few of these at the bottom
// of its page; this is where a member goes to find a log from last spring and fix it. The server pages,
// searches and bounds by date (`sessions/log/`) and says which sessions deserve a second look and why —
// nothing is guessed here, and nothing is "corrected" for the member: a session left open for nine hours
// is shown as a question and the sets stay theirs to fix.
function SessionZView({ exercises, pickable, refreshKey, prefillEditSession, onEditConsumed, onSaveSession,
                        onRoutineFromSession, onDeleteSession, onLogPast, routines = [], sessionOpen = false, onStart,
                        onOpenToday, onSaveExercises, onSaveNew, onOpenRoutineZ }) {
  const unit = useUnit();
  const [fitId, setFitId] = useState(null);
  const [allRoutines, setAllRoutines] = useState(false);
  const startable = routines.filter((r) => r.bucket !== "trash");
  const startList = allRoutines ? startable : startable.slice(0, 5);
  const fmt = (kg) => `${Math.round(fromKg(kg, unit)).toLocaleString()} ${unit}`;
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, has_more: false, totals: null });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [check, setCheck] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [writingId, setWritingId] = useState(null);
  const [details, setDetails] = useState({});
  const [made, setMade] = useState("");
  const loaded = useRef(0);
  const lastFilter = useRef("");
  const ticket = useRef(0);

  // Typing is debounced, once, for every filter alike (the VybeZ lesson): one request per pause, not one per key.
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const filters = { q: dq, since, until, check };
  const fKey = filterKey(filters);

  // One effect for "the list changed": a filter moved (back to page one) or the parent reloaded after an
  // edit/delete (re-ask for as many rows as the member had paged to, so they are not thrown back to the top).
  useEffect(() => {
    const mine = ++ticket.current;                       // a slower, older answer must never overwrite a newer one
    const sameFilter = lastFilter.current === fKey;
    lastFilter.current = fKey;
    setLoading(true);
    api(`/api/economy/bodiez/sessions/log/${logQuery({ ...filters, limit: sameFilter ? refreshLimit(loaded.current) : LOG_PAGE })}`)
      .then((d) => {
        if (mine !== ticket.current) return;
        setRows(asList(d.sessions)); loaded.current = asList(d.sessions).length;
        setMeta({ total: d.total, has_more: d.has_more, totals: d.totals });
        setDetails({}); setErr("");
      })
      .catch((e) => { if (mine === ticket.current) setErr(e.message || "Couldn't load your sessions."); })
      .finally(() => { if (mine === ticket.current) setLoading(false); });
  }, [fKey, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    setMore(true);
    try {
      const d = await api(`/api/economy/bodiez/sessions/log/${logQuery({ ...filters, offset: rows.length })}`);
      setRows((cur) => { const next = mergeRows(cur, asList(d.sessions)); loaded.current = next.length; return next; });
      setMeta((m) => ({ ...m, total: d.total, has_more: d.has_more, totals: d.totals }));
    } catch (e) { setErr(e.message || "Couldn't load more."); }
    finally { setMore(false); }
  };

  // "Edit this workout" from a just-finished session's card hands the id over. It is the newest, so it is
  // usually on the page already — but not always, so it is fetched by id and put at the top if it is not.
  useEffect(() => {
    if (prefillEditSession == null) return undefined;
    let on = true;
    api(`/api/economy/bodiez/sessions/log/${logQuery({ id: prefillEditSession, limit: 1 })}`)
      .then((d) => {
        if (!on) return;
        const row = asList(d.sessions)[0];
        if (row) { setRows((cur) => (cur.some((r) => r.id === row.id) ? cur : [row, ...cur])); setEditingId(row.id); }
      })
      .catch((e) => on && setErr(e.message || "Couldn't open that session."))
      .finally(() => on && onEditConsumed?.());
    return () => { on = false; };
  }, [prefillEditSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDetails = async (h) => {
    if (openId === h.id) { setOpenId(null); return; }
    setOpenId(h.id);
    if (details[h.id]) return;
    try { setDetails((d) => ({ ...d, [h.id]: null })); const sm = await api(`/api/economy/bodiez/sessions/${h.id}/summary/`); setDetails((d) => ({ ...d, [h.id]: sm })); }
    catch (e) { setErr(e.message || "Couldn't read that session."); setOpenId(null); }
  };

  const makeRoutine = async (h) => {
    const name = window.prompt("Name the new routine:", `${h.routine_title || "Workout"} — ${new Date(h.started_at).toLocaleDateString()}`);
    if (name == null) return;
    if (await onRoutineFromSession(h.id, name.trim())) setMade(`Saved “${name.trim() || h.routine_title || "Workout"}” to your routines.`);
  };

  const narrowed = filtersActive(filters);
  const clear = () => { setQ(""); setDq(""); setSince(""); setUntil(""); setCheck(false); };
  const nameOf = (id) => exercises.find((e) => e.id === id)?.name || `Exercise #${id}`;

  return (
    <div className="space-y-3">
      <section className="re-card space-y-2" data-testid="start-session">
        <p className="re-label">Start a session</p>
        {sessionOpen ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            <span>You have a session in progress.</span>
            <button className="neon-btn-primary !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1" onClick={onOpenToday}>
              <Play size={12} /> Continue it
            </button>
          </div>
        ) : (
          <>
            <button className="neon-btn-primary !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" onClick={() => onStart(null)}>
              <Play size={13} /> Start a custom session
            </button>
            <p className="text-[11px] text-white/45">
              Log it lift by lift. When you end it, save it to RoutineZ to run again.
            </p>
          </>
        )}
        <p className="re-label pt-1">Or start from a routine</p>
        {startable.length === 0 && (
          <p className="text-xs text-white/45">
            No routines yet.{" "}
            <button className="text-mcz-cyan hover:underline" onClick={onOpenRoutineZ}>Have the Planner build one in RoutineZ</button>
          </p>
        )}
        {startList.map((r) => {
          const items = asList(r.exercises);
          const gear = equipmentOf(items, exercises, EQUIPMENT_LABEL);
          return (
            <div key={r.id} className="space-y-1.5 rounded-lg bg-white/5 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{r.title}</p>
                  <p className="text-[11px] text-white/45">
                    {items.length} lift{items.length === 1 ? "" : "s"}{gear.length > 0 && <> · {gear.join(", ")}</>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button className="neon-btn-primary !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                          disabled={sessionOpen || items.length === 0}
                          title={sessionOpen ? "Finish your open session first" : "Start a session from this routine"}
                          onClick={() => onStart(r.id)}>
                    <Play size={12} /> Start
                  </button>
                  <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                          disabled={items.length === 0} onClick={() => setFitId(fitId === r.id ? null : r.id)}>
                    <Dumbbell size={12} /> {fitId === r.id ? "Close" : "Fit to equipment"}
                  </button>
                </div>
              </div>
              {fitId === r.id && (
                <EquipmentFit key={r.id} routine={r} exercises={exercises} pickable={pickable} sessionOpen={sessionOpen}
                              onApply={(list) => onSaveExercises(r.id, list)}
                              onSaveNew={(name, list) => onSaveNew(name, list, r.goal)}
                              onStart={onStart} onClose={() => setFitId(null)} />
              )}
            </div>
          );
        })}
        {startable.length > 5 && (
          <button className="text-xs text-mcz-cyan hover:underline" onClick={() => setAllRoutines(!allRoutines)}>
            {allRoutines ? "Show fewer" : `Show all ${startable.length} routines`}
          </button>
        )}
      </section>

      <section className="re-card space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="re-label">SessionZ — every workout you've logged</p>
          {meta.totals && <p className="text-[11px] text-white/45">{totalsLine(meta.totals, fmt)}, all time</p>}
        </div>
        <p className="text-[11px] text-white/45">
          Open one to see what it added up to, fix any set, change its date or note, turn it into a routine, or
          delete it. Fixing a log recounts your records, BodyMap and goals.
        </p>
        <Field label="Search" className="w-full" placeholder="a lift or a routine" value={q}
               onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="From" className="min-w-0" type="date" value={since} max={until || undefined} onChange={(e) => setSince(e.target.value)} />
          <Field label="To" className="min-w-0" type="date" value={until} min={since || undefined} onChange={(e) => setUntil(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-1.5 text-white/70">
            <input type="checkbox" checked={check} onChange={(e) => setCheck(e.target.checked)} />
            Only ones that need a look (empty, or left open for hours)
          </label>
          {narrowed && <button className="text-mcz-cyan hover:underline" onClick={clear}>Clear filters</button>}
          <button className="ml-auto text-mcz-cyan hover:underline" onClick={onLogPast}>+ Log a past workout</button>
        </div>
        {made && <p className="text-xs text-emerald-300">{made}</p>}
        {err && <p role="alert" className="text-xs text-mcz-ember">{err}</p>}
      </section>

      {loading && rows.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-white/50"><Loader2 className="animate-spin" size={14} /> Loading your sessions…</p>
      )}
      {!loading && rows.length === 0 && !err && (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
          {narrowed ? "No sessions match that." : "Nothing logged yet. Finish a session on Today, or log a past one."}
        </p>
      )}

      {rows.map((h) => {
        const sets = asList(h.sets);
        const names = [...new Set(sets.map((st) => st.exercise_name || nameOf(st.exercise_id)))];
        const when = new Date(h.started_at);
        const sm = details[h.id];
        return (
          <div key={h.id} className={`re-card space-y-1.5 ${h.check?.length ? "border-amber-400/30" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {h.routine_title || "Workout"}{" "}
                  <span className="text-xs font-normal text-white/45">
                    {when.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  {h.backfilled && <span className="ml-1.5 text-[10px] text-white/35">logged afterwards</span>}
                </p>
                <p className="text-xs text-white/55">
                  {[durationText(h.duration_seconds, clock), `${sets.length} set${sets.length === 1 ? "" : "s"}`,
                    h.reps ? `${h.reps} reps` : "", h.volume_kg ? `${fmt(h.volume_kg)} lifted` : ""].filter(Boolean).join(" · ")}
                </p>
                {names.length > 0 && <p className="text-[11px] text-white/40">{names.slice(0, 5).join(", ")}{names.length > 5 ? ` +${names.length - 5}` : ""}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button className="neon-btn-primary !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                        onClick={() => setEditingId(editingId === h.id ? null : h.id)}>
                  <Pencil size={12} /> {editingId === h.id ? "Close" : "Edit"}
                </button>
                <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" disabled={sets.length === 0} onClick={() => toggleDetails(h)}>
                  {openId === h.id ? "Hide details" : "Details"}
                </button>
                <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                        disabled={sets.length === 0} onClick={() => makeRoutine(h)}>
                  <Plus size={12} /> Routine
                </button>
                <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                        disabled={sets.length === 0} onClick={() => setWritingId(writingId === h.id ? null : h.id)}>
                  <Sparkles size={12} /> {writingId === h.id ? "Close" : "Write about it"}
                </button>
                <button className="rounded p-1.5 text-white/30 hover:bg-white/10 hover:text-mcz-ember"
                        onClick={() => onDeleteSession(h.id)} title="Delete this workout" aria-label="Delete workout">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {asList(h.check).map((note, i) => <p key={i} className="text-[11px] text-amber-200">⚠ {note}</p>)}
            {editingId === h.id && (
              <PastWorkout key={h.id} editing={h} exercises={exercises} pickable={pickable} onSaveEdit={onSaveSession}
                           onCancel={() => setEditingId(null)}
                           onSaved={(summary) => { setEditingId(null); if (summary) { setDetails((d) => ({ ...d, [h.id]: summary })); setOpenId(h.id); } }} />
            )}
            {openId === h.id && (sm
              ? <SessionSummary summary={sm} onClose={() => setOpenId(null)} onEdit={() => setEditingId(h.id)}
                                onSaveRoutine={(name) => onRoutineFromSession(h.id, name)} onOpenRoutineZ={onOpenRoutineZ} />
              : <p className="flex items-center gap-2 text-xs text-white/50"><Loader2 className="animate-spin" size={13} /> Reading it…</p>)}
            {writingId === h.id && <WorkoutWrite key={h.id} sessionId={h.id} onClose={() => setWritingId(null)} />}
            <AskAI scope="session" id={h.id} disabled={sets.length === 0} />
          </div>
        );
      })}

      {meta.has_more && (
        <button className="neon-btn-ghost !w-auto px-4 py-2 text-xs inline-flex items-center gap-1" disabled={more} onClick={loadMore}>
          {more ? <Loader2 className="animate-spin" size={13} /> : null}
          Show {Math.min(LOG_PAGE, meta.total - rows.length)} more <span className="text-white/40">({rows.length} of {meta.total})</span>
        </button>
      )}
      {!meta.has_more && rows.length > 0 && <p className="text-center text-[11px] text-white/30">That's all {meta.total} {narrowed ? "that match" : "of them"}.</p>}
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
    <select aria-label="Day" value={value || ""} onChange={(e) => onChange(e.target.value)}
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
        <input aria-label="New routine name" className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="New routine name"
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
          <input aria-label="New day, e.g. Leg day" className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="New day, e.g. Leg day" maxLength={30}
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
                          onSave={(list, meta) => onSaveExercises(designingRoutine.id, list, meta)}
                          onClose={() => setDesigning(null)}
                          restSeconds={goals?.[designingRoutine.goal]?.rest_seconds} />
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
              <input aria-label="Schedule date" type="date" defaultValue={r.scheduled_for || ""}
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
              <select aria-label="Goal" value={r.goal || ""} onChange={(e) => onSetGoal(r.id, e.target.value)}
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
                          Thorough {m.coach_rating}/10
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-white/35 ring-1 ring-white/10"
                              title={m.coach_why}>
                          Thorough: not rated yet
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
                      Thorough{m.coach_rating != null ? `: ${m.coach_rating}/10` : ": not rated yet"}
                    </p>
                    <p className="text-[11px] text-white/50">{m.coach_why}</p>
                    {asList(m.coach_exercises).map((e) => (
                      <p key={`${e.exercise_id}-${e.one_sided || ""}`} className="text-[11px] text-white/60">
                        <span className="font-semibold text-emerald-200">Thorough {e.rating}/10</span>{" "}
                        {e.exercise_name}: {e.days_trained} day{e.days_trained === 1 ? "" : "s"}, {e.sets_per_week} sets/wk
                        {e.trend && (
                          <>
                            {" · "}
                            <span className={e.trend === "up" ? "text-emerald-300" : e.trend === "down" ? "text-mcz-ember" : "text-white/50"}>
                              {e.trend === "up" ? "▲ up" : e.trend === "down" ? "▼ down" : "● held"}
                            </span>{" "}
                            {e.metric === "reps"
                              ? `${e.earlier_best} → ${e.latest} reps (best set)`
                              : `${fmtWeight(e.earlier_best, unit)} → ${fmtWeight(e.latest, unit)} (est. max)`}
                          </>
                        )}
                      </p>
                    ))}
                    <p className="text-[10px] text-white/30">{bodymap.rating_caveat}</p>
                    {m.coach_rating != null && <AskAI scope="muscle" id={m.muscle_group} />}
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

// How many exercises a Coach builder picks for each muscle. One to six: one is
// a lean day, six is a volume day, and the member knows which they want — a
// fixed number would be the Coach deciding how long their workout is.
const PER_MUSCLE = [1, 2, 3, 4, 5, 6];

// "≈ 45 min" with its assumptions printed under it. Shown while a routine is
// being built, so the length is known before it is saved — not found out an
// hour into the session. Renders nothing when there is nothing to estimate.
function RoutineTime({ items, restSeconds, className = "" }) {
  const label = fmtEstimate(estimateRoutineSeconds(items, restSeconds));
  if (!label) return null;
  return (
    <p className={`text-[11px] text-white/55 ${className}`}>
      <span className="font-semibold text-mcz-cyan">{label}</span>{" "}
      <span className="text-white/35">{routineTimeNote(restSeconds)}</span>
    </p>
  );
}
const goalItems = (picks, goal) => picks.map(() => ({ sets: goal ? goal.sets : 3, reps: goal ? goal.reps_low : 10 }));
function PerMuscleSelect({ value, onChange }) {
  return (
    <select className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
            value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label="Exercises per muscle">
      {PER_MUSCLE.map((n) => <option key={n} value={n}>{n} exercise{n === 1 ? "" : "s"} per muscle</option>)}
    </select>
  );
}
// Said out loud when the library has fewer than asked for, so a short list is
// the library's limit and never a silent surprise (an equipment filter or an
// access setting can leave a muscle with only one or two).
function shortNote(picks, muscles, n) {
  if (n <= 1) return "";
  const short = muscles.filter((m) => picks.filter((ex) => ex.muscle_group === m).length < n)
    .map((m) => `${MUSCLE_LABEL[m] || m} (${picks.filter((ex) => ex.muscle_group === m).length})`);
  return short.length ? `Fewer than ${n} available for: ${short.join(", ")}.` : "";
}

function buildBalancedRoutine(bodymap, exercises, equipment, perMuscle = 1) {
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
    const pool = exercises.filter((ex) => ex.muscle_group === m.muscle_group && matches(ex)).sort((a, b) => a.id - b.id);
    if (pool.length === 0) continue;
    picked.push(...pool.slice(0, perMuscle));
    if (new Set(picked.map((e) => e.muscle_group)).size >= 6) break;
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
function BuildRoutine({ bodymap, exercises, pickable, goals, onBuildRoutine }) {
  const [equipment, setEquipment] = useState([]);
  const [goalKey, setGoalKey] = useRemembered("bodiez.goalKey", "");
  const [open, setOpen] = useState(false);
  const [perMuscle, setPerMuscle] = useRememberedNumber("bodiez.perMuscle", 1);
  const generated = useMemo(() => buildBalancedRoutine(bodymap, exercises, equipment, perMuscle),
    [bodymap, exercises, equipment, perMuscle]);
  const sw = useSwappedPicks(generated, exercises, pickable);
  const picks = sw.picks;
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
            Picks up to six muscle groups and the number of exercises you choose for each, starting with whatever BodyMap
            calls untrained or undertrained — real training-load data, not a guess.
          </p>
          {goals && (
            <select aria-label="Training goal" className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                    value={goalKey} onChange={(e) => setGoalKey(e.target.value)}>
              <option value="">General (3 sets x 10)</option>
              {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
            </select>
          )}
          <PerMuscleSelect value={perMuscle} onChange={setPerMuscle} />
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
          {shortNote(picks, [...new Set(picks.map((e) => e.muscle_group))], perMuscle) && (
            <p className="text-[11px] text-white/45">{shortNote(picks, [...new Set(picks.map((e) => e.muscle_group))], perMuscle)}</p>
          )}
          <RoutineTime items={goalItems(picks, goal)} restSeconds={goal?.rest_seconds} />
          {picks.length === 0 ? (
            <p className="text-xs text-white/40">Not enough BodyMap data yet — log a session first.</p>
          ) : (
            <div className="space-y-1">
              {picks.map((ex, i) => (
                <SwapRow key={generated[i].id} className="text-xs text-white/60" exercises={exercises}
                         label={`${MUSCLE_LABEL[ex.muscle_group]} — ${ex.name}`} extra={<DemoLink url={ex.demo_url} />}
                         current={ex.id} choices={sw.choicesFor(i)} swapped={sw.swapped(i)} onPick={(id) => sw.swapAt(i, id)} />
              ))}
            </div>
          )}
          <button className="neon-btn-primary !w-auto px-4 py-2 text-xs disabled:opacity-40"
                  disabled={picks.length === 0}
                  onClick={() => onBuildRoutine(
                    `Planner routine — ${goal ? goal.label : "General"} — ${new Date().toLocaleDateString()}`,
                    picks.map((ex, i) => ({
                      exercise_id: ex.id, order: i,
                      sets: goal ? goal.sets : 3,
                      reps: goal ? goal.reps_low : 10,
                      weight_kg: null,
                    })),
                    "", goalKey
                  )}>
            <Plus size={13} /> Save to RoutineZ
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
  const [days, setDays] = useRememberedNumber("bodiez.days", "");
  const [equipment, setEquipment] = useState([]);
  const [goalKey, setGoalKey] = useRemembered("bodiez.goalKey", "");
  const [open, setOpen] = useState(false);
  const [perMuscle, setPerMuscle] = useRememberedNumber("bodiez.perMuscle", 1);
  const split = days ? splits?.[days] : null;
  const goal = goalKey ? goals?.[goalKey] : null;

  const generated = useMemo(() => {
    if (!split) return [];
    return split.days.map((day) => ({
      ...day, picks: pickForDay(day.muscles, bodymap, exercises, equipment, perMuscle),
    }));
  }, [split, bodymap, exercises, equipment, perMuscle]);
  // Swaps are per day and per generated pick, so the same lift can be changed on one day only.
  const [swaps, setSwaps] = useState({});
  const preview = useMemo(() => generated.map((day) => ({
    ...day, orig: day.picks,
    picks: day.picks.map((p) => (swaps[`${day.label}:${p.id}`] && exercises.find((x) => x.id === swaps[`${day.label}:${p.id}`])) || p),
  })), [generated, swaps, exercises]);

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
            <select aria-label="Days per week" className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                    value={days} onChange={(e) => setDays(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Days per week…</option>
              {splits && Object.keys(splits).map((k) => (
                <option key={k} value={k}>{splits[k].label}</option>
              ))}
            </select>
            {goals && (
              <select aria-label="Training goal" className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                      value={goalKey} onChange={(e) => setGoalKey(e.target.value)}>
                <option value="">General (3 sets x 10)</option>
                {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
              </select>
            )}
            <PerMuscleSelect value={perMuscle} onChange={setPerMuscle} />
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
                    day.picks.map((ex, i) => (
                      <SwapRow key={day.orig[i].id} className="text-[11px] text-white/55" exercises={exercises}
                               label={`${MUSCLE_LABEL[ex.muscle_group]} — ${ex.name}`} extra={<DemoLink url={ex.demo_url} />}
                               current={ex.id} swapped={ex.id !== day.orig[i].id}
                               choices={exercises.filter((x) => x.id === ex.id || !day.picks.some((p) => p.id === x.id))}
                               onPick={(id) => setSwaps((cur) => ({ ...cur, [`${day.label}:${day.orig[i].id}`]: id }))} />
                    ))
                  )}
                  <RoutineTime items={goalItems(day.picks, goal)} restSeconds={goal?.rest_seconds} className="mt-0.5" />
                  {shortNote(day.picks, day.muscles, perMuscle) && (
                    <p className="text-[11px] text-white/40">{shortNote(day.picks, day.muscles, perMuscle)}</p>
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
            <Plus size={13} /> Save {days || ""} routine{days === 1 ? "" : "s"} to RoutineZ
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
function MuscleDayBuilder({ exercises, pickable, goals, dayTagLabels, initialMuscle, onInitialMuscleConsumed, onBuildRoutine }) {
  const MUSCLES = ["abs", "back", "biceps", "chest", "forearms", "glutes",
                    "shoulders", "triceps", "upper_legs", "lower_legs"];
  const [muscles, setMuscles] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [goalKey, setGoalKey] = useRemembered("bodiez.goalKey", "");
  const [dayTag, setDayTag] = useState("");
  const [perMuscle, setPerMuscle] = useRememberedNumber("bodiez.perMuscle", 2);
  // Minutes the member has, or 0 for "no limit". Applied AFTER the muscles
  // are picked: lifts are dropped from the end until the estimate fits, and
  // the screen says how many went — never a silently shorter routine.
  const [minutes, setMinutes] = useRememberedNumber("bodiez.minutes", 0);
  const [open, setOpen] = useState(false);
  const goal = goalKey ? goals?.[goalKey] : null;
  const allPicked = MUSCLES.every((m) => muscles.includes(m));

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
  // Round-robin across the chosen muscles (each one's 1st lift, then each
  // one's 2nd…) so a time limit trims evenly instead of cutting the last
  // muscle picked out entirely.
  const allPicks = useMemo(() => {
    const pools = muscles.map((m) => exercises.filter((ex) => ex.muscle_group === m && matches(ex))
      .sort((a, b) => a.id - b.id).slice(0, perMuscle));
    const out = [];
    for (let i = 0; i < perMuscle; i++) for (const pool of pools) if (pool[i]) out.push(pool[i]);
    return out;
  }, [muscles, exercises, equipment, perMuscle]);
  const trimmedPicks = useMemo(() => {
    if (!minutes) return allPicks;
    let n = allPicks.length;
    while (n > 1 && estimateRoutineSeconds(goalItems(allPicks.slice(0, n), goal), goal?.rest_seconds) > minutes * 60) n--;
    return allPicks.slice(0, n);
  }, [allPicks, minutes, goal]);
  const sw = useSwappedPicks(trimmedPicks, exercises, pickable);
  const picks = sw.picks;
  const trimmed = allPicks.length - picks.length;

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
            <button onClick={() => setMuscles(allPicked ? [] : MUSCLES)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      allPicked ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40"
                                : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
              Whole body
            </button>
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
              <select aria-label="Training goal" className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                      value={goalKey} onChange={(e) => setGoalKey(e.target.value)}>
                <option value="">General (3 sets x 10)</option>
                {Object.entries(goals).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
              </select>
            )}
            <select aria-label="Exercises per muscle" className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                    value={perMuscle} onChange={(e) => setPerMuscle(Number(e.target.value))}>
              {PER_MUSCLE.map((n) => <option key={n} value={n}>{n} exercise{n === 1 ? "" : "s"} per muscle</option>)}
            </select>
            <select aria-label="Time I have" className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
                    value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              <option value={0}>Any length</option>
              {[20, 30, 45, 60, 75, 90].map((m) => <option key={m} value={m}>Fit in {m} min</option>)}
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
          {shortNote(allPicks, muscles, perMuscle) && (
            <p className="text-[11px] text-white/45">{shortNote(allPicks, muscles, perMuscle)}</p>
          )}
          {trimmed > 0 && (
            <p className="text-[11px] text-white/45">
              {trimmed} exercise{trimmed === 1 ? "" : "s"} left out to fit {minutes} min — pick a longer time to keep {trimmed === 1 ? "it" : "them"}.
            </p>
          )}
          <RoutineTime items={goalItems(picks, goal)} restSeconds={goal?.rest_seconds} />
          {muscles.length === 0 ? (
            <p className="text-xs text-white/40">Pick at least one muscle group above.</p>
          ) : picks.length === 0 ? (
            <p className="text-xs text-mcz-ember">No exercises match that equipment for these muscles.</p>
          ) : (
            <div className="space-y-1">
              {picks.map((ex, i) => (
                <SwapRow key={trimmedPicks[i].id} className="text-xs text-white/60" exercises={exercises}
                         label={`${MUSCLE_LABEL[ex.muscle_group]} — ${ex.name}`} extra={<DemoLink url={ex.demo_url} />}
                         current={ex.id} choices={sw.choicesFor(i)} swapped={sw.swapped(i)} onPick={(id) => sw.swapAt(i, id)} />
              ))}
            </div>
          )}
          <button className="neon-btn-primary !w-auto px-4 py-2 text-xs disabled:opacity-40"
                  disabled={picks.length === 0}
                  onClick={() => onBuildRoutine(
                    `${dayLabel ? `${dayLabel} — ` : ""}${allPicked ? "Whole body" : muscles.map((m) => MUSCLE_LABEL[m]).join("/")}${goal ? ` — ${goal.label}` : ""}`.slice(0, 80),
                    picks.map((ex, i) => ({
                      exercise_id: ex.id, order: i,
                      sets: goal ? goal.sets : 3,
                      reps: goal ? goal.reps_low : 10,
                      weight_kg: null,
                    })),
                    dayTag, goalKey
                  )}>
            <Plus size={13} /> Save to RoutineZ
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
function CoachView({ coach, onOpenRoutineZ }) {
  if (!coach) return null;
  const rows = asList(coach.exercises);
  const labels = asDict(coach.labels);
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/45 inline-flex items-center gap-1">
        <Activity size={12} /> Built from your own logged sets — no AI, no guessing.
        An exercise untouched {coach.stale_after_days}+ days gets flagged to reintroduce or swap.
      </p>

      {/* The routine builders live in RoutineZ, beside the routines they make,
          so a built routine is edited on the screen it lands on. */}
      <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1" onClick={onOpenRoutineZ}>
        <Wand2 size={13} /> Have the Planner build a routine — in RoutineZ
      </button>

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
          Log a couple of sessions and Insights will have something to say.
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
        <select aria-label="Goal type" className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                value={kind} onChange={(e) => setKind(e.target.value)}>
          {kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>
        <input aria-label="Name this goal" className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="Name this goal"
               value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {kind === "strength" && (
          <select aria-label="Exercise" className="max-w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                  value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            <option value="">Exercise…</option>
            {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        )}
        <input aria-label={kind === "strength" ? `Target weight (${unit})` : "Target"} className="neon-input !py-2 w-28 text-sm" type="number" min="0" step="0.5"
               placeholder={kind === "strength" ? unit : kind === "frequency" ? "x/week" : kind === "bodyweight" ? `target ${unit}` : "target"}
               value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
        {kind === "strength" && (
          <input aria-label="reps (opt.)" className="neon-input !py-2 w-24 text-sm" type="number" min="1" placeholder="reps (opt.)"
                 value={targetReps} onChange={(e) => setTargetReps(e.target.value)} />
        )}
        <input aria-label="Target date" className="rounded-lg border border-white/[0.08] bg-black/40 px-2 py-1 text-xs text-white outline-none"
               type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <button className="neon-btn-primary !w-auto px-4 py-2 text-xs inline-flex items-center gap-1" onClick={submit}>
          <Plus size={13} /> Set goal
        </button>
      </div>
    </div>
  );
}

function GoalsView({ goals, exercises, weightLogs, onCreate, onDelete, onLogWeight, onTrain }) {
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
            <input aria-label={`Body weight (${unit})`} className="neon-input !py-2 w-28 text-sm" type="number" min="0" step="0.1"
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
              {/* Only a strength goal names an exercise — a bodyweight goal is
                  trained by weighing in, not by logging a set. Jumps to Today
                  with this exercise ready in "Add an unplanned exercise" the
                  moment a session is running, rather than leaving the member
                  to go find it themselves. */}
              {!g.achieved && g.exercise_id && (
                <button className="neon-btn-ghost !w-auto px-2.5 py-1.5 text-[11px] inline-flex items-center gap-1"
                        onClick={() => onTrain(g.exercise_id)}>
                  <Dumbbell size={12} /> Train this
                </button>
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
        <input aria-label="Notes (optional)" className="neon-input !py-2 w-full text-sm" placeholder="Notes (optional)"
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
          <input aria-label="Enter steps"
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
