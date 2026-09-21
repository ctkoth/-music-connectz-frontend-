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
import { useEffect, useState } from "react";
import {
  Activity, CalendarDays, Loader2, Moon, Plus, Play, Sparkles, Square, Target, Trash2,
} from "lucide-react";
import { api } from "../api.js";
import { asDict, asList } from "../shape.js";
import { IconImg } from "../App.jsx";

const MUSCLE_LABEL = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", arms: "Arms",
  legs: "Legs", core: "Core", cardio: "Cardio", full_body: "Full Body",
};

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
];

export default function BodieZ() {
  const [tab, setTab] = useState("today");
  const [exercises, setExercises] = useState([]);
  const [board, setBoard] = useState(null);
  const [session, setSession] = useState(null);
  const [progress, setProgress] = useState(null);
  const [bodymap, setBodymap] = useState(null);
  const [coach, setCoach] = useState(null);
  const [goals, setGoals] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);
  const [recovery, setRecovery] = useState(null);
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
    ]).then(([ex, b, sess, prog, bm, co, g, wl, rec]) => {
      setExercises(asList(ex.exercises));
      setBoard(b);
      const open = asList(sess.sessions).find((s) => !s.ended_at);
      setSession(open || null);
      setProgress(prog);
      setBodymap(bm);
      setCoach(co);
      setGoals(g);
      setWeightLogs(asList(wl.logs));
      setRecovery(rec);
      setErr("");
    }).catch((e) => setErr(e.message || "Couldn't load BodieZ."))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  const buckets = asDict(board?.buckets);
  const bucketLabels = asList(board?.bucket_labels);
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
    if (!window.confirm("Finish this session?")) return;
    try {
      await api(`/api/economy/bodiez/sessions/${session.id}/`, {
        method: "PATCH", body: { finish: true },
      });
      setSession(null);
      load();
    } catch (e) { setErr(e.message); }
  }

  async function logSet(exerciseId, reps, weightKg) {
    if (!session) return;
    try {
      const s = await api(`/api/economy/bodiez/sessions/${session.id}/sets/`, {
        method: "POST",
        body: { exercise_id: exerciseId, reps, weight_kg: weightKg === "" ? null : weightKg },
      });
      setSession({ ...session, sets: [...session.sets, s] });
    } catch (e) { setErr(e.message); }
  }

  async function createRoutine(title, bucket) {
    try {
      await api("/api/economy/bodiez/routines/", {
        method: "POST", body: { title, exercises: [], bucket },
      });
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
      await api("/api/economy/bodiez/weightlog/", { method: "POST", body: { weight_kg: weightKg } });
      load();
    } catch (e) { setErr(e.message); }
  }

  async function logRecovery(body) {
    try {
      await api("/api/economy/bodiez/recovery/", { method: "POST", body });
      load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="bodiez.png" alt="BodieZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">BodieZ</h2>
          <p className="text-xs text-white/45">Strength training and workout planning.</p>
        </div>
      </header>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`pill ${tab === t.key ? "!bg-white/15 !text-white" : ""}`}>
            {t.label}
          </button>
        ))}
      </div>

      {err && <p className="re-card text-sm text-mcz-pink">{err}</p>}

      {busy && !exercises.length ? (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </p>
      ) : (
        <>
          {tab === "today" && (
            <TodayView
              session={session} routines={routines} exercises={exercises}
              onStart={startSession} onFinish={finishSession} onLogSet={logSet}
            />
          )}
          {tab === "scheduler" && (
            <SchedulerView buckets={buckets} bucketLabels={bucketLabels}
                          onCreate={createRoutine} onDelete={deleteRoutine} onMove={moveRoutine}
                          onSchedule={scheduleRoutine} onStart={startSession} sessionOpen={!!session} />
          )}
          {tab === "bodymap" && <BodyMapView bodymap={bodymap} />}
          {tab === "coach" && <CoachView coach={coach} />}
          {tab === "goals" && (
            <GoalsView goals={goals} exercises={exercises} weightLogs={weightLogs}
                      onCreate={createGoal} onDelete={deleteGoal} onLogWeight={logWeight} />
          )}
          {tab === "recovery" && <RecoveryView recovery={recovery} onLog={logRecovery} />}
          {tab === "progress" && <ProgressView progress={progress} />}
        </>
      )}
    </div>
  );
}

function TodayView({ session, routines, exercises, onStart, onFinish, onLogSet }) {
  const [exerciseId, setExerciseId] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");

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
                <button key={r.id} className="pill" onClick={() => onStart(r.id)}>{r.title}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="re-card flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {session.routine_title || "Ad-hoc session"}
          </p>
          <p className="text-xs text-white/45">Started {new Date(session.started_at).toLocaleTimeString()}</p>
        </div>
        <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                onClick={onFinish}>
          <Square size={13} /> Finish
        </button>
      </div>

      <div className="re-card space-y-2">
        <p className="re-label">Log a set</p>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                  value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            <option value="">Exercise…</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name} ({MUSCLE_LABEL[ex.muscle_group] || ex.muscle_group})</option>
            ))}
          </select>
          <input className="neon-input !py-2 w-20 text-sm" placeholder="reps" type="number" min="1"
                 value={reps} onChange={(e) => setReps(e.target.value)} />
          <input className="neon-input !py-2 w-24 text-sm" placeholder="kg (optional)" type="number" min="0" step="0.5"
                 value={weight} onChange={(e) => setWeight(e.target.value)} />
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

      <div className="space-y-1">
        {asList(session.sets).length === 0 && (
          <p className="text-xs text-white/40">No sets logged yet.</p>
        )}
        {asList(session.sets).map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
            <span className="text-white/80">{s.exercise_name} — set {s.set_number}</span>
            <span className="text-white/60">
              {s.reps} reps{s.weight_kg != null ? ` @ ${s.weight_kg}kg` : " (bodyweight)"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Same scheduler shape Lilith gives a task, applied to a routine instead:
// Inbox for an idea, Today for what you're doing now, Upcoming for a dated
// training day, Anytime for a backup you can reach for whenever, Someday for
// a program you're not starting yet, Trash for "gone, but not yet forever".
function SchedulerView({ buckets, bucketLabels, onCreate, onDelete, onMove, onSchedule, onStart, sessionOpen }) {
  const [title, setTitle] = useState("");
  const [bucket, setBucket] = useState("inbox");
  const rows = asList(buckets[bucket]);
  const otherBuckets = bucketLabels.filter((b) => b.key !== bucket);

  return (
    <div className="space-y-3">
      <div className="re-card flex flex-wrap gap-2">
        <input className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="New routine name"
               value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="neon-btn-primary !w-auto px-4 py-2 text-xs"
                onClick={() => { if (title.trim()) { onCreate(title.trim(), bucket); setTitle(""); } }}>
          Create
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {bucketLabels.map((b) => (
          <button key={b.key} onClick={() => setBucket(b.key)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-all ${
              bucket === b.key ? "bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-400/40"
                               : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
            {b.label}
            <span className="text-white/35">{asList(buckets[b.key]).length}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
          Nothing in here.
        </p>
      )}
      {rows.map((r) => (
        <div key={r.id} className="re-card space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{r.title}</p>
              <p className="text-xs text-white/45">
                {asList(r.exercises).length} exercise{asList(r.exercises).length === 1 ? "" : "s"}
                {r.scheduled_for && (
                  <span className="ml-2 inline-flex items-center gap-1 text-mcz-cyan">
                    <CalendarDays size={11} /> {r.scheduled_for}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {bucket !== "trash" && (
                <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs inline-flex items-center gap-1"
                        disabled={sessionOpen}
                        title={sessionOpen ? "Finish your open session first" : "Start a session from this routine"}
                        onClick={() => onStart(r.id)}>
                  <Play size={13} /> Start
                </button>
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
function BodyMapView({ bodymap }) {
  if (!bodymap) return null;
  const muscles = asList(bodymap.muscles);
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/45">
        Trailing {bodymap.window_days} days. "Overworked" counts separate training
        days, not sets — five sets in one session isn't five sessions.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {muscles.map((m) => {
          const s = BODYMAP_STATUS[m.status] || BODYMAP_STATUS.untrained;
          return (
            <div key={m.muscle_group} className="re-card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{m.label}</p>
                <p className="text-xs text-white/45">
                  {m.last_trained
                    ? `Last trained ${new Date(m.last_trained).toLocaleDateString()}`
                    : "Never trained"}
                  {m.sets_last_7d > 0 && ` · ${m.sets_last_7d} set${m.sets_last_7d === 1 ? "" : "s"} this week`}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${s.color}`}>
                {s.said}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// One recommendation per exercise, built from comparing the member's own
// last two logged sessions — arithmetic, not a model, and every row shows
// the numbers behind it rather than asking to be trusted.
function CoachView({ coach }) {
  if (!coach) return null;
  const exercises = asList(coach.exercises);
  const labels = asDict(coach.labels);
  return (
    <div className="space-y-3">
      <p className="text-xs text-white/45 inline-flex items-center gap-1">
        <Activity size={12} /> Built from your own logged sets — no AI, no guessing.
        An exercise untouched {coach.stale_after_days}+ days gets flagged to reintroduce or swap.
      </p>
      {exercises.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
          Log a couple of sessions and Coach will have something to say.
        </p>
      )}
      {exercises.map((row) => (
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
  const [kind, setKind] = useState(kinds[0]?.key || "count");
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [targetReps, setTargetReps] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const submit = () => {
    if (!title.trim() || !targetValue) return;
    if (kind === "strength" && !exerciseId) return;
    onCreate({
      kind, title: title.trim(), target_value: Number(targetValue),
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
        <select className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                value={kind} onChange={(e) => setKind(e.target.value)}>
          {kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </select>
        <input className="neon-input !py-2 min-w-0 flex-1 text-sm" placeholder="Name this goal"
               value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {kind === "strength" && (
          <select className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none"
                  value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            <option value="">Exercise…</option>
            {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        )}
        <input className="neon-input !py-2 w-28 text-sm" type="number" min="0" step="0.5"
               placeholder={kind === "strength" ? "kg" : kind === "frequency" ? "x/week" : kind === "bodyweight" ? "target kg" : "target"}
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
                   placeholder="kg" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
            <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs"
                    onClick={() => { if (weightInput) { onLogWeight(Number(weightInput)); setWeightInput(""); } }}>
              Log
            </button>
            {weightLogs[0] && (
              <span className="text-[11px] text-white/40">
                Last: {weightLogs[0].weight_kg}kg on {new Date(weightLogs[0].logged_at).toLocaleDateString()}
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
                target {g.target_value}{g.kind === "strength" || g.kind === "bodyweight" ? "kg" : ""}
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
              Currently {g.current_value}{g.kind === "strength" || g.kind === "bodyweight" ? "kg" : ""}
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
    <div className="flex items-center justify-between gap-2">
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
        <p className="text-2xl font-extrabold text-white">{progress.total_volume_kg.toLocaleString()}</p>
        <p className="re-label">Total volume (kg)</p>
      </div>
    </div>
  );
}
