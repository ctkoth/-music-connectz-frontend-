// Lilith 💃🏽 — the task manager, and the only screen in this app whose whole
// job is to hand you a reason to be somewhere else.
//
// Two things it must do that an ordinary to-do list does not:
//
// **State what a tick pays, on the row, before it is ticked.** Lilith is the
// one surface where the gain half of the cost/gain rule carries the whole
// weight — nothing here costs a member anything, so a price found out by
// paying it is replaced by a reward found out by accident, and a coincidence
// changes nobody's behaviour. What a task pays depends on WHERE IT CAME FROM
// (`pays` on each row, the server's number), and today's remaining coin sits
// above the board so a member meets the cap by reading rather than by hitting
// it.
//
// **Never be a dead end.** A task that names an app carries `open_in`, and the
// row opens the control that completes it rather than the tab it lives on.
// A task manager that lists "Write 8 bars for RapZ" and gives you nowhere to
// go is a list of accusations.
//
// It decides nothing. Every number, label, bucket, cap and voice line is the
// server's — a client that knew a self-made task pays 1 🍥 would be the second
// place that number lives, which is how "20 free prompts" ended up in nine.
import { useEffect, useState } from "react";
import {
  ArrowRight, Check, ChevronDown, Flame, Loader2, Plus, Trash2,
} from "lucide-react";
import { api } from "../api.js";
import { asDict, asList } from "../shape.js";
import { goToSpot } from "../goto.js";
import { ENERGY, SPINAZ, XP } from "../resources.js";
import { IconImg } from "../App.jsx";

const BUCKET_ICON = {
  today: "lilith_today.png", upcoming: "lilith_upcoming.png",
  anytime: "lilith_anytime.png", logbook: "lilith_logbook.png",
};

/** "+1 🍥 +10 ⭐" — the gain, in the resource emoji, never a bare number.
 *  Renders nothing at all when there is nothing to gain, rather than "+0". */
function Gain({ spinaz = 0, energy = 0, xp = 0, className = "" }) {
  if (!spinaz && !energy && !xp) return null;
  return (
    <span className={`whitespace-nowrap text-[11px] font-semibold text-emerald-300 ${className}`}>
      {spinaz ? `+${spinaz} ${SPINAZ} ` : ""}
      {energy ? `+${energy} ${ENERGY} ` : ""}
      {xp ? `+${xp} ${XP}` : ""}
    </span>
  );
}

export default function Lilith() {
  const [board, setBoard] = useState(null);
  const [bucket, setBucket] = useState("today");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  // What the LAST tick actually paid, as the server reported it — never what
  // the row predicted. The daily cap is the server's, and a client printing
  // its own optimistic figure would be the second place the cap lives.
  const [paid, setPaid] = useState(null);
  const [draft, setDraft] = useState({ title: "", kind: "standard", app_key: "", target: "" });
  const [routineTitle, setRoutineTitle] = useState("");

  const load = () => {
    setBusy(true);
    api("/api/economy/lilith/")
      .then((d) => { setBoard(d); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load your board."))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  const buckets = asDict(board?.buckets);
  const labels = asList(board?.bucket_labels);
  const kinds = asList(board?.kinds);
  const routines = asList(board?.routines);
  const rewards = asList(board?.rewards);
  const today = asDict(board?.today);
  const limits = asDict(board?.limits);
  const rows = asList(buckets[bucket]);

  async function call(path, opts) {
    try { const out = await api(path, opts); setErr(""); return out; }
    catch (e) { setErr(e.message || "That didn't go through."); return null; }
  }

  async function addTask(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const made = await call("/api/economy/lilith/tasks/", {
      method: "POST",
      body: { ...draft, title: draft.title.trim(), bucket },
    });
    if (made) { setDraft({ title: "", kind: "standard", app_key: "", target: "" }); load(); }
  }

  async function tick(task) {
    const out = await call(`/api/economy/lilith/tasks/${task.id}/complete/`, { method: "POST" });
    if (out) { setPaid(out); load(); }
  }

  async function remove(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const gone = await call(`/api/economy/lilith/tasks/${task.id}/`, { method: "DELETE" });
    if (gone !== null) load();
  }

  async function move(task, to) {
    const out = await call(`/api/economy/lilith/tasks/${task.id}/`,
                           { method: "PATCH", body: { bucket: to } });
    if (out) load();
  }

  async function addRoutine(e) {
    e.preventDefault();
    if (!routineTitle.trim()) return;
    const made = await call("/api/economy/lilith/routines/",
                            { method: "POST", body: { title: routineTitle.trim() } });
    if (made) { setRoutineTitle(""); load(); }
  }

  async function keep(r) {
    const out = await call(`/api/economy/lilith/routines/${r.id}/`, { method: "POST" });
    if (out) { if (out.milestone) setPaid(out.milestone); load(); }
  }

  if (!board && !err) {
    return <p className="flex items-center gap-2 text-white/50">
      <Loader2 className="animate-spin" size={16} /> Loading…</p>;
  }

  return (
    <div className="space-y-5" data-tour="lilith">
      <header className="flex items-center gap-4">
        <IconImg icon="toolz_lilith.png" alt="Lilith" className="h-14 w-14 rounded-2xl shadow-neon" />
        <div className="flex-1">
          <h2 className="font-display text-2xl font-extrabold text-fuchsia-300">Lilith</h2>
          {/* Her line, from the server. She is warm and never a nag — a task
              manager that scolds is one people close. */}
          <p className="text-sm text-white/60">{board?.said}</p>
        </div>
      </header>

      {err && <p className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[12px] text-mcz-ember">{err}</p>}

      {/* Today's remaining coin, ABOVE the board. A cap met by hitting it is a
          bug; a cap met by reading it is a rule. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px]">
        <span className="text-white/60">
          Coin today: <b className="text-emerald-300">{today.self_paid ?? 0}</b>
          <span className="text-white/40"> / {today.self_cap ?? 0} {SPINAZ}</span>
        </span>
        <span className="text-white/60">
          Done today: <b>{today.done ?? 0}</b>
          {today.combo_at && (today.done ?? 0) < today.combo_at && (
            <span className="text-white/40">
              {" "}· {today.combo_at - (today.done ?? 0)} more for the combo
            </span>
          )}
        </span>
        <button onClick={() => setShowRewards((s) => !s)}
                className="ml-auto flex items-center gap-1 text-mcz-cyan hover:underline">
          What everything pays
          <ChevronDown size={13} className={showRewards ? "rotate-180" : ""} />
        </button>
      </div>

      {/* The whole table, every cap stated, before anything is pressed. It is
          collapsed because a board buried under a price list is a board nobody
          reads — but it is one tap away and it is the SERVER'S list. */}
      {showRewards && (
        <ul className="space-y-1.5 rounded-xl border border-white/10 bg-black/20 p-3">
          {rewards.map((r) => (
            <li key={r.key} className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
              <Gain spinaz={r.spinaz} energy={r.energy} xp={r.xp} />
              <span className="text-white/75">{r.what}</span>
              {r.cap && <span className="text-white/40">({r.cap})</span>}
              {r.why && <p className="w-full pl-1 text-[11px] text-white/35">{r.why}</p>}
            </li>
          ))}
        </ul>
      )}

      {/* What the last tick ACTUALLY paid. The server's numbers and the
          server's sentence — including the one that says the coin is capped
          but the XP still counted. */}
      {paid && (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-3 py-2 text-[12px]">
          <div className="flex items-center gap-2">
            <Gain spinaz={paid.spinaz} energy={paid.energy} xp={paid.xp} />
            <span className="text-white/70">{paid.said}</span>
            <button onClick={() => setPaid(null)} className="ml-auto text-white/30 hover:text-white/60">×</button>
          </div>
          {paid.note && <p className="mt-1 text-white/50">{paid.note}</p>}
          {paid.combo && <p className="mt-1 text-emerald-300">{paid.combo.said} <Gain xp={paid.combo.xp} /></p>}
          {paid.sweep && <p className="mt-1 text-emerald-300">{paid.sweep.said} <Gain xp={paid.sweep.xp} /></p>}
          {paid.routine?.milestone && (
            <p className="mt-1 text-emerald-300">
              {paid.routine.milestone.said}{" "}
              <Gain spinaz={paid.routine.milestone.spinaz} energy={paid.routine.milestone.energy} />
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {labels.map((b) => (
          <button key={b.key} onClick={() => setBucket(b.key)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-all ${
              bucket === b.key ? "bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-400/40"
                               : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
            {BUCKET_ICON[b.key] && (
              <IconImg icon={BUCKET_ICON[b.key]} alt="" className="h-4 w-4 rounded" />
            )}
            {b.label}
            <span className="text-white/35">{asList(buckets[b.key]).length}</span>
          </button>
        ))}
      </div>

      <form onSubmit={addTask} className="flex flex-wrap gap-2" data-tour="lilith-add">
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
               placeholder="Something to do" maxLength={140}
               className="min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
        <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm">
          {kinds.filter((k) => k.key !== "auto").map((k) => (
            <option key={k.key} value={k.key}>{k.label} · +{k.xp} {XP}</option>
          ))}
        </select>
        <button type="submit" disabled={busy || board?.at_task_limit}
                className="re-btn !w-auto flex items-center gap-1 px-4 disabled:opacity-40">
          <Plus size={14} /> Add
        </button>
      </form>

      {/* A ladder that says HOW MANY, and what the next rung buys. Never
          whether — the board still works, it is just full. */}
      {board?.at_task_limit && (
        <p className="text-[12px] text-mcz-ember">
          {limits.active_tasks} open tasks is this tier's ceiling. Finish or delete one,
          or a tier up raises it.
        </p>
      )}

      <ul className="space-y-1.5">
        {rows.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[12px] text-white/40">
            Nothing in here.
          </li>
        )}
        {rows.map((t) => (
          <li key={t.id}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            {!t.done_at && (
              <button onClick={() => tick(t)} title="Done"
                      className="shrink-0 rounded-md border border-emerald-400/40 p-1 text-emerald-300 hover:bg-emerald-400/10">
                <Check size={14} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm ${t.done_at ? "text-white/35 line-through" : ""}`}>
                {t.title}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-white/40">
                <span>{kinds.find((k) => k.key === t.kind)?.label || t.kind}</span>
                {/* What ticking THIS one pays — on the row, before it is
                    ticked, because six sources pay six different things and
                    one average price would be a price nobody can check. */}
                {!t.done_at && <Gain {...asDict(t.pays)} />}
                {t.source === "platform" && <span className="text-white/30">pays where you do it</span>}
              </div>
            </div>
            {/* Nothing is a dead end: a task that names an app opens the
                control that completes it, not the tab it lives on. */}
            {t.open_in?.tab && (
              <button onClick={() => goToSpot(t.open_in.tab, t.open_in.target)}
                      className="flex shrink-0 items-center gap-1 rounded-md bg-mcz-cyan/10 px-2 py-1 text-[11px] text-mcz-cyan hover:bg-mcz-cyan/20">
                Do it <ArrowRight size={12} />
              </button>
            )}
            {!t.done_at && bucket !== "today" && (
              <button onClick={() => move(t, "today")}
                      className="shrink-0 text-[11px] text-white/40 hover:text-white/70">Today</button>
            )}
            <button onClick={() => remove(t)} title="Delete"
                    className="shrink-0 text-white/25 hover:text-mcz-ember"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>

      <section className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold">
          <Flame size={15} className="text-mcz-ember" /> Routines
        </h3>
        <p className="text-[11px] text-white/40">
          Keeping one is the only thing here nobody can fake by typing, which is why
          it pays the most — at milestones, once for life.
        </p>
        {routines.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm">{r.title}</span>
            <span className="text-[12px] text-mcz-ember">{r.streak}d</span>
            {r.next_milestone && (
              <span className="text-[11px] text-white/45">
                {r.next_milestone.away} more →{" "}
                <Gain spinaz={r.next_milestone.spinaz} energy={r.next_milestone.energy} />
              </span>
            )}
            <button onClick={() => keep(r)} disabled={r.done_today}
                    className="rounded-md border border-emerald-400/40 px-2 py-1 text-[11px] text-emerald-300 disabled:border-white/10 disabled:text-white/30">
              {r.done_today ? "Kept today" : "Keep it"}
            </button>
          </div>
        ))}
        {!board?.at_routine_limit ? (
          <form onSubmit={addRoutine} className="flex gap-2">
            <input value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)}
                   placeholder="A habit to keep" maxLength={140}
                   className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <button type="submit" className="re-btn !w-auto px-4">Add</button>
          </form>
        ) : (
          <p className="text-[12px] text-mcz-ember">
            {limits.routines} routines is this tier's ceiling. A tier up raises it.
          </p>
        )}
      </section>

      {/* What the tiers buy here is AUTOMATION, never access — said plainly,
          because a free member has a working task manager and should be told
          that is not the thing being sold. */}
      <p className="text-[11px] text-white/35">
        Your tier: {board?.tier}. Auto-schedule plans{" "}
        {limits.auto_schedule_days} day{limits.auto_schedule_days === 1 ? "" : "s"}{" "}
        ahead, {limits.automation_rules} automation rule
        {limits.automation_rules === 1 ? "" : "s"} and {limits.recurring_quests}{" "}
        quest chain{limits.recurring_quests === 1 ? "" : "s"} — a tier up raises
        each. Everything here works at every tier.
      </p>
    </div>
  );
}
