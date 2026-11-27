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
// **Days are picked from a calendar.** A task outside Today can carry the day
// it is due (components/DueCalendar.jsx). "Overdue" and "tomorrow" are worked
// out on this device (lilithDates.js): the server's clock is UTC, so a date check
// made there would call a task due today overdue for a member in the evening.
//
// It decides nothing. Every number, label, bucket, cap and voice line is the
// server's — a client that knew a self-made task pays 1 🍥 would be the second
// place that number lives, which is how "20 free prompts" ended up in nine.
import { useEffect, useState } from "react";
import {
  ArrowRight, CalendarDays, Check, ChevronDown, Flame, Loader2, Plus, Search, Trash2,
} from "lucide-react";
import { api } from "../api.js";
import { asDict, asList } from "../shape.js";
import { goToSpot } from "../goto.js";
import { ENERGY, SPINAZ, XP } from "../resources.js";
import { IconImg } from "../App.jsx";
import TabInfoModal from "../components/TabInfoModal.jsx";
import DueCalendar from "../components/DueCalendar.jsx";
import { LILITH_TAB_INFO } from "../lilithTabs.js";
import {
  BuildCTA, CADENCE, MoveMenu, RoutineList, Starters, Suggested, TrashedRoutines,
} from "../components/LilithCTA.jsx";
import LilithAuto from "../components/LilithAuto.jsx";
import { dueLabel, isOverdue, localISODate, matchesQuery } from "../lilithDates.js";

// All six buckets `models.BUCKETS` serves. inbox and someday used to be absent
// here, so those two tabs drew nothing while their neighbours had art.
const BUCKET_ICON = {
  inbox: "lilith_inbox.png", today: "lilith_today.png",
  upcoming: "lilith_upcoming.png", anytime: "lilith_anytime.png",
  someday: "lilith_someday.png", logbook: "lilith_logbook.png", trash: "lilith_trash.png",
};

// Lists where a day can be given: a task still to do, outside Today (Today is today), the Trash and the Logbook.
const DATED_BUCKETS = ["inbox", "upcoming", "anytime", "someday"];

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
  const [info, setInfo] = useState(null);   // the tab whose icon was pressed: its description opens in a modal
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  // What the LAST tick actually paid, as the server reported it — never what
  // the row predicted. The daily cap is the server's, and a client printing
  // its own optimistic figure would be the second place the cap lives.
  const [paid, setPaid] = useState(null);
  const [draft, setDraft] = useState({ title: "", kind: "standard", app_key: "", target: "", due: "" });
  const [showAddCal, setShowAddCal] = useState(false);
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineCadence, setRoutineCadence] = useState("daily");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [addingKey, setAddingKey] = useState("");
  // Task/routine detail and tagging
  const [expandedTask, setExpandedTask] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState({ to_app_key: "", to_target: "", visibility: "private" });

  const load = () => {
    setBusy(true);
    api("/api/economy/lilith/")
      .then((d) => { setBoard(d); setErr(""); })
      .catch((e) => setErr(e.message || "Couldn't load your board."))
      .finally(() => setBusy(false));
  };
  useEffect(load, []);

  // The member's own calendar day (see lilithDates.js): the one overdue and "due today" are read against.
  const todayISO = localISODate();
  const buckets = asDict(board?.buckets);
  const labels = asList(board?.bucket_labels);
  const kinds = asList(board?.kinds);
  const routines = asList(board?.routines);
  const rewards = asList(board?.rewards);
  const counters = asDict(board?.today);
  const limits = asDict(board?.limits);
  const searching = query.trim() !== "";
  const rows = searching
    ? Object.values(buckets).flatMap((list) => asList(list)).filter((t) => matchesQuery(t, query))
    : asList(buckets[bucket]);
  const datable = DATED_BUCKETS.includes(bucket);
  // The first milestone of the cadence picked, stated before the routine is added.
  const firstRung = rewards.find((r) => String(r.key || "").startsWith(`routine_${routineCadence}_`));
  const bucketName = (key) => labels.find((b) => b.key === key)?.label || key;
  // A date belongs to a task still to do in one of the lists that take one.
  const showsDate = (t) => !t.done_at && DATED_BUCKETS.includes(t.bucket);

  async function call(path, opts) {
    try { const out = await api(path, opts); setErr(""); return out; }
    catch (e) { setErr(e.message || "That didn't go through."); return null; }
  }

  async function addTask(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const made = await call("/api/economy/lilith/tasks/", {
      method: "POST",
      body: { ...draft, title: draft.title.trim(), bucket, due: datable ? draft.due : "" },
    });
    if (made) {
      setDraft({ title: "", kind: "standard", app_key: "", target: "", due: "" });
      setShowAddCal(false);
      load();
    }
  }

  async function tick(task) {
    const out = await call(`/api/economy/lilith/tasks/${task.id}/complete/`, { method: "POST" });
    if (out) { setPaid(out); load(); }
  }

  async function remove(task) {
    if (task.bucket !== "trash") {            // first press: to the Trash, restorable
      const out = await call("/api/economy/lilith/move/", { method: "POST", body: { kind: "task", id: task.id, to: "trash" } });
      if (out) load();
      return;
    }
    if (!window.confirm(`Delete "${task.title}" for good?`)) return;
    const gone = await call(`/api/economy/lilith/tasks/${task.id}/`, { method: "DELETE" });
    if (gone !== null) load();
  }

  // BudgetZ's go-ahead: the server reads the budget and moves the task to Today only on a yes.
  // A no says why and moves nothing; asking spends and reserves nothing.
  async function askBudget(task) {
    try {
      await api(`/api/economy/lilith/tasks/${task.id}/goahead/`, { method: "POST", body: {} });
      setNote("BudgetZ says go ahead — it's in Today. Nothing was spent.");
      load();
    } catch (e) { setNote(e.message || "BudgetZ said no."); }
  }

  // Every edit to one task goes through the server's PATCH, and the answer replaces what the panel shows.
  async function saveFields(task, body) {
    const out = await call(`/api/economy/lilith/tasks/${task.id}/`, { method: "PATCH", body });
    if (out) { setExpandedTask(out); load(); }
  }

  function openTask(task) {
    setExpandedTask(task);
    loadTags(task);
  }

  async function addRoutine(e) {
    e.preventDefault();
    if (!routineTitle.trim()) return;
    const made = await call("/api/economy/lilith/routines/",
                            { method: "POST", body: { title: routineTitle.trim(), cadence: routineCadence } });
    if (made) { setRoutineTitle(""); load(); }
  }

  async function keep(r) {
    const out = await call(`/api/economy/lilith/routines/${r.id}/`, { method: "POST" });
    if (out) { if (out.milestone) setPaid(out.milestone); load(); }
  }

  // Starters and suggestions: the server copies its own content onto the board, so what is sent is
  // only WHICH one (and, for an instrument-aware one, which coach, and for a routine how often: daily, weekly,
  // monthly or yearly) — never a title or an action.
  async function addStarter(kind, key, app_key, cadence) {
    setAddingKey(key);
    const made = await call("/api/economy/lilith/starters/", {
      method: "POST", body: { kind, key, ...(app_key ? { app_key } : {}), ...(cadence ? { cadence } : {}) },
    });
    setAddingKey("");
    if (made) load();
  }
  // Move any entry anywhere: a bucket, a routine (a cadence), a task, or the Trash. The server owns
  // the rules (no moving finished tasks, ceilings, a changed cadence restarting the run) and says so.
  async function moveEntry(body) {
    if (body.kind === "routine" && body.to === "task" &&
        !window.confirm("Turn this routine into a task? Its streak is lost.")) return;
    if (body.kind === "routine" && Object.keys(CADENCE).includes(body.to) &&
        !window.confirm("Change how often this is kept? Its run restarts.")) return;
    const out = await call("/api/economy/lilith/move/", { method: "POST", body });
    if (out) load();
  }
  async function emptyTrash() {
    if (!window.confirm("Empty the Trash for good? This can't be undone.")) return;
    const out = await call("/api/economy/lilith/trash/", { method: "DELETE" });
    if (out) load();
  }
  async function makeCTA(f) {
    const made = await call("/api/economy/lilith/routines/", {
      method: "POST", body: { title: f.title, action: f.action, cadence: f.cadence, goal: f.goal },
    });
    if (made) load();
  }

  async function loadTags(task) {
    const loaded = await call(`/api/economy/lilith/tags/?task_id=${task.id}`);
    if (loaded) setTags(loaded);
  }

  async function addTag(e) {
    e.preventDefault();
    if (!tagDraft.to_app_key || !tagDraft.to_target) return;
    if (!expandedTask) return;
    const created = await call("/api/economy/lilith/tag/", {
      method: "POST",
      body: { task_id: expandedTask.id, ...tagDraft },
    });
    if (created) {
      setTagDraft({ to_app_key: "", to_target: "", visibility: "private" });
      loadTags(expandedTask);
    }
  }

  async function removeTag(tagId) {
    if (!window.confirm("Remove this tag?")) return;
    const gone = await call(`/api/economy/lilith/tag/${tagId}/`, { method: "DELETE" });
    if (gone !== null && expandedTask) loadTags(expandedTask);
  }

  if (!board && !err) {
    return <p className="flex items-center gap-2 text-white/50">
      <Loader2 className="animate-spin" size={16} /> Loading…</p>;
  }

  return (
    <div className="space-y-5" data-tour="lilith">
      <header className="flex items-center gap-4">
        <IconImg icon="lilithz.png" alt="Lilith" className="h-14 w-14 rounded-2xl shadow-neon" />
        <div className="flex-1">
          <h2 className="font-display text-2xl font-extrabold text-fuchsia-300">Lilith</h2>
          {/* Her line, from the server. She is warm and never a nag — a task
              manager that scolds is one people close. */}
          <p className="text-sm text-white/60">{board?.said}</p>
        </div>
      </header>

      {err && <p role="alert" className="rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 px-3 py-2 text-[12px] text-mcz-ember">{err}</p>}
      {note && <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white/70">{note}</p>}

      {/* Today's remaining coin, ABOVE the board. A cap met by hitting it is a
          bug; a cap met by reading it is a rule. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px]">
        <span className="text-white/60">
          Coin today: <b className="text-emerald-300">{counters.self_paid ?? 0}</b>
          <span className="text-white/55"> / {counters.self_cap ?? 0} {SPINAZ}</span>
        </span>
        <span className="text-white/60">
          Done today: <b>{counters.done ?? 0}</b>
          {counters.combo_at && (counters.done ?? 0) < counters.combo_at && (
            <span className="text-white/55">
              {" "}· {counters.combo_at - (counters.done ?? 0)} more for the combo
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
              {r.cap && <span className="text-white/55">({r.cap})</span>}
              {r.why && <p className="w-full pl-1 text-[11px] text-white/50">{r.why}</p>}
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
          <span key={b.key}
            className={`flex items-center overflow-hidden rounded-lg text-[12px] transition-all ${
              bucket === b.key ? "bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-400/40"
                               : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
            {/* The icon opens what this tab is; the name selects it. Two controls, so neither is a nested button. */}
            <button type="button" aria-label={`What is ${b.label}?`} onClick={() => setInfo(b)} className="py-1.5 pl-2.5 pr-1">
              {BUCKET_ICON[b.key] ? <IconImg icon={BUCKET_ICON[b.key]} alt="" className="h-5 w-5 rounded" /> : <span aria-hidden="true">ℹ️</span>}
            </button>
            <button type="button" onClick={() => setBucket(b.key)} className="flex items-center gap-1.5 py-1.5 pl-1 pr-2.5">
              {b.label}
              <span className="text-white/50">{asList(buckets[b.key]).length}</span>
            </button>
          </span>
        ))}
      </div>
      <TabInfoModal open={!!info} onClose={() => setInfo(null)} icon={info && BUCKET_ICON[info.key]}
                    title={info?.label || ""} about={info ? (LILITH_TAB_INFO[info.key] || "") : ""} />

      {/* Search every list at once: typing here shows matches in all the lists, each with its list's name. */}
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
        <Search size={14} className="shrink-0 text-white/45" aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search every list"
               aria-label="Search every list"
               className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35" />
        {searching && (
          <button type="button" onClick={() => setQuery("")} className="text-[11px] text-white/55 hover:text-white/80">Clear</button>
        )}
      </div>
      {searching && (
        <p className="text-[11px] text-white/55">{rows.length} {rows.length === 1 ? "match" : "matches"} in every list.</p>
      )}

      <form onSubmit={addTask} className="space-y-2" data-tour="lilith-add">
        <div className="flex flex-wrap gap-2">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                 placeholder="Something to do" maxLength={140}
                 className="min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
          <select aria-label="Kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm">
            {kinds.filter((k) => k.key !== "auto").map((k) => (
              <option key={k.key} value={k.key}>{k.label} · +{k.xp} {XP}</option>
            ))}
          </select>
          {datable && (
            <button type="button" onClick={() => setShowAddCal((s) => !s)} aria-expanded={showAddCal}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 hover:bg-white/10">
              <CalendarDays size={14} /> {draft.due ? dueLabel(draft.due, todayISO) : "Add a date"}
            </button>
          )}
          <button type="submit" disabled={busy || board?.at_task_limit}
                  className="re-btn !w-auto flex items-center gap-1 px-4 disabled:opacity-40">
            <Plus size={14} /> Add
          </button>
        </div>
        {datable && showAddCal && (
          <DueCalendar value={draft.due} today={todayISO}
                       onPick={(iso) => { setDraft((d) => ({ ...d, due: iso })); setShowAddCal(false); }} />
        )}
      </form>

      {/* A ladder that says HOW MANY, and what the next rung buys. Never
          whether — the board still works, it is just full. */}
      {board?.at_task_limit && (
        <p className="text-[12px] text-mcz-ember">
          {limits.active_tasks} open tasks is this tier's ceiling. Finish or delete one,
          or <button type="button" onClick={() => goToSpot("membershipz")}
                      className="font-semibold underline">a tier up raises it</button>.
        </p>
      )}

      {bucket === "trash" && rows.length > 0 && (
        <p className="flex items-center gap-2 text-[11px] text-white/60">
          🗑️ Emptied for good after {board?.trash_days || 30} days.
          <button onClick={emptyTrash} className="ml-auto text-mcz-ember hover:underline">Empty the Trash now</button>
        </p>
      )}
      <ul className="space-y-1.5">
        {rows.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[12px] text-white/55">
            {searching ? "Nothing matches that." : "Nothing in here."}
          </li>
        )}
        {rows.map((t) => (
          <li key={t.id}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => openTask(t)}>
            {!t.done_at && t.verified && (
              <span className={`shrink-0 text-[11px] ${t.progress?.met ? "text-emerald-300" : "text-white/50"}`}
                    title="Lilith ticks this one herself when your real activity shows it">
                ✨ {t.progress ? `${t.progress.done}/${t.progress.goal}` : ""}
              </span>
            )}
            {!t.done_at && !t.verified && (
              <button onClick={(e) => { e.stopPropagation(); tick(t); }} title="Done"
                      className="shrink-0 rounded-md border border-emerald-400/40 p-1 text-emerald-300 hover:bg-emerald-400/10">
                <Check size={14} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm ${t.done_at ? "text-white/50 line-through" : ""}`}>
                {t.title}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-white/55">
                {searching && <span className="text-mcz-cyan/80">{bucketName(t.bucket)}</span>}
                <span>{kinds.find((k) => k.key === t.kind)?.label || t.kind}</span>
                {/* What ticking THIS one pays — on the row, before it is
                    ticked, because six sources pay six different things and
                    one average price would be a price nobody can check. */}
                {!t.done_at && <Gain {...asDict(t.pays)} />}
                {t.source === "platform" && <span className="text-white/30">pays where you do it</span>}
                {t.source === "auto" && <span className="text-emerald-300/70" title={t.note}>🤖 Lilith added this</span>}
                {!t.done_at && t.cost_cents > 0 && <span className="text-mcz-ember">−${(t.cost_cents / 100).toFixed(2)}</span>}
              </div>
            </div>
            {/* The day it is due, in the member's own calendar: overdue reads in ember. Or the door to pick one. */}
            {showsDate(t) && (t.due ? (
              <button type="button" onClick={(e) => { e.stopPropagation(); openTask(t); }}
                      className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] ${
                        isOverdue(t.due, todayISO) ? "bg-mcz-ember/15 text-mcz-ember" : "bg-white/5 text-white/80 hover:bg-white/10"}`}>
                <CalendarDays size={12} /> {dueLabel(t.due, todayISO)}
              </button>
            ) : (
              <button type="button" onClick={(e) => { e.stopPropagation(); openTask(t); }}
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/55 hover:bg-white/10">
                <CalendarDays size={12} /> Add date
              </button>
            ))}
            {!t.done_at && t.cost_cents > 0 && t.bucket !== "today" && t.bucket !== "trash" && (
              <button onClick={(e) => { e.stopPropagation(); askBudget(t); }}
                      title="BudgetZ checks this month's money and your category limit. Free; nothing is spent."
                      className="shrink-0 rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-400/20">
                💰 Can I?
              </button>
            )}
            {/* Nothing is a dead end: a task that names an app opens the
                control that completes it, not the tab it lives on. */}
            {t.open_in?.tab && (
              <button onClick={(e) => { e.stopPropagation(); goToSpot(t.open_in.tab, t.open_in.target); }}
                      className="flex shrink-0 items-center gap-1 rounded-md bg-mcz-cyan/10 px-2 py-1 text-[11px] text-mcz-cyan hover:bg-mcz-cyan/20">
                Do it <ArrowRight size={12} />
              </button>
            )}
            {!t.done_at && <MoveMenu entry={t} kind="task" buckets={labels} move={moveEntry} />}
            <button onClick={(e) => { e.stopPropagation(); remove(t); }} title="Delete"
                    className="shrink-0 text-white/25 hover:text-mcz-ember"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>

      {/* Task detail: its title, its day, its note, its budget and its tags. Opens when a row is clicked. */}
      {expandedTask && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setExpandedTask(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-black/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-2xl space-y-4">
              {/* Header with close button */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{expandedTask.title}</h3>
                <button onClick={() => setExpandedTask(null)} className="text-white/55 hover:text-white/70">
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Title: an open task can be renamed here. */}
              {!expandedTask.done_at && (
                <form key={`title-${expandedTask.id}-${expandedTask.title}`} className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const t = String(new FormData(e.target).get("title") || "").trim();
                        if (t && t !== expandedTask.title) saveFields(expandedTask, { title: t });
                      }}>
                  <input name="title" defaultValue={expandedTask.title} maxLength={140} aria-label="Title"
                         className="neon-input min-w-0 flex-1" />
                  <button className="pill !text-[11px]">Save title</button>
                </form>
              )}

              {/* Task details */}
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-[12px]">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-white/60">
                    Kind: <span className="text-white">{kinds.find((k) => k.key === expandedTask.kind)?.label || expandedTask.kind}</span>
                  </span>
                  {expandedTask.done_at && (
                    <span className="text-emerald-300">✓ Completed</span>
                  )}
                </div>
                {!expandedTask.done_at && <Gain {...asDict(expandedTask.pays)} />}
                {!expandedTask.done_at && (
                  <form className="flex flex-wrap items-center gap-2 pt-1"
                        onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); saveFields(expandedTask, { cost: f.get("cost"), budget_category: f.get("cat") }); }}>
                    <span className="text-white/60">Costs $</span>
                    <input name="cost" inputMode="decimal" defaultValue={expandedTask.cost_cents ? (expandedTask.cost_cents / 100).toFixed(2) : ""}
                           placeholder="0" className="neon-input !w-24" />
                    <input name="cat" defaultValue={expandedTask.budget_category || "Gear"} maxLength={40} className="neon-input !w-28" />
                    <button className="pill !text-[11px]">Save</button>
                    <span className="text-[11px] text-white/55">BudgetZ can say yes and bring it to Today when it fits.</span>
                  </form>
                )}
              </div>

              {/* When: a calendar. Not offered in Today, which is today by definition. */}
              {showsDate(expandedTask) && (
                <section className="space-y-2">
                  <h4 className="text-[13px] font-semibold text-white">When</h4>
                  <DueCalendar value={expandedTask.due || ""} today={todayISO}
                               onPick={(iso) => saveFields(expandedTask, { due: iso || null })} />
                </section>
              )}

              {/* Note: an open task's note is written here; a finished one shows what it said. */}
              {!expandedTask.done_at ? (
                <form key={`note-${expandedTask.id}-${expandedTask.note || ""}`} className="space-y-2"
                      onSubmit={(e) => { e.preventDefault(); saveFields(expandedTask, { note: String(new FormData(e.target).get("note") || "") }); }}>
                  <h4 className="text-[13px] font-semibold text-white">Note</h4>
                  <textarea name="note" rows={3} maxLength={2000} defaultValue={expandedTask.note || ""} aria-label="Note"
                            placeholder="A note for this task"
                            className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white placeholder:text-white/30" />
                  <button className="pill !text-[11px]">Save note</button>
                </form>
              ) : expandedTask.note ? (
                <p className="text-[12px] text-white/60">{expandedTask.note}</p>
              ) : null}

              {/* Tagged with section */}
              <div className="space-y-2">
                <h4 className="text-[13px] font-semibold text-white">Tagged with</h4>
                {tags.length === 0 ? (
                  <p className="text-[11px] text-white/55">No tags yet. Add one below.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {tags.map((tag) => (
                      <li key={tag.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px]">
                        <button onClick={() => goToSpot(tag.to_app_key, tag.to_target)}
                                className="flex-1 text-left text-mcz-cyan hover:underline truncate">
                          {tag.to_app_key}: {tag.to_target}
                        </button>
                        <span className="ml-2 text-white/55 text-[10px]">{tag.visibility}</span>
                        <button onClick={() => removeTag(tag.id)} className="ml-2 text-white/30 hover:text-mcz-ember">
                          <Trash2 size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Add tag form */}
              <form onSubmit={addTag} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <h4 className="text-[13px] font-semibold text-white">Add a tag</h4>
                <input
                  type="text" placeholder="App key (e.g., 'postz', 'battlez')" value={tagDraft.to_app_key}
                  onChange={(e) => setTagDraft({ ...tagDraft, to_app_key: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white placeholder:text-white/30" />
                <input
                  type="text" placeholder="Target (e.g., 'post:123' or 'user:abc')" value={tagDraft.to_target}
                  onChange={(e) => setTagDraft({ ...tagDraft, to_target: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white placeholder:text-white/30" />
                <select aria-label="Who can see this tag" value={tagDraft.visibility}
                        onChange={(e) => setTagDraft({ ...tagDraft, visibility: e.target.value })}
                        className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]">
                  <option value="private">Private (just me)</option>
                  <option value="shared">Shared (collaborators)</option>
                  <option value="public">Public (everyone)</option>
                </select>
                <button type="submit" className="w-full rounded-md bg-mcz-cyan/20 py-1.5 text-[12px] font-semibold text-mcz-cyan hover:bg-mcz-cyan/30">
                  Add tag
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* What Lilith closed for you since you last looked — from the platform's records, not a tick. */}
      {asList(board?.swept).length > 0 && (
        <div className="space-y-1 rounded-xl border border-emerald-400/25 bg-emerald-400/5 px-3 py-2 text-[12px]">
          {asList(board.swept).map((w, i) => (
            <p key={i} className="text-white/75">
              ✨ <b>{w.title}</b> — {w.said}
              {w.milestone && <span className="text-emerald-300"> {w.milestone.said} <Gain spinaz={w.milestone.spinaz} energy={w.milestone.energy} /></span>}
              {w.xp ? <> <Gain xp={w.xp} /></> : null}
            </p>
          ))}
        </div>
      )}

      <LilithAuto auto={board?.auto} onChanged={load} />
      <Suggested items={asList(board?.suggested)} add={addStarter} busyKey={addingKey} />

      {/* RoutineZ: the habits, kept by the day, the week, the month or the year. */}
      <section className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold">
          <Flame size={15} className="text-mcz-ember" /> RoutineZ
        </h3>
        <p className="text-[11px] text-white/55">
          What you keep doing, by the day, the week, the month or the year. Keeping one is the only thing here nobody
          can fake by typing, which is why it pays the most — at milestones, once for life.
        </p>
        <RoutineList routines={routines} keep={keep} buckets={labels} move={moveEntry} />
        <TrashedRoutines items={asList(board?.trash_routines)} days={board?.trash_days || 30}
                         restore={(r) => moveEntry({ kind: "routine", id: r.id, to: r.cadence || "daily" })} />
        {!board?.at_routine_limit ? (
          <form onSubmit={addRoutine} className="space-y-1.5">
            <div className="flex flex-wrap gap-2">
              <input value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)}
                     placeholder="A habit to keep" maxLength={140} aria-label="A habit to keep"
                     className="min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
              <select aria-label="How often" value={routineCadence} onChange={(e) => setRoutineCadence(e.target.value)}
                      className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm">
                {Object.keys(CADENCE).map((c) => (
                  <option key={c} value={c}>{CADENCE[c].emoji} {CADENCE[c].label}</option>
                ))}
              </select>
              <button type="submit" className="re-btn !w-auto px-4">Add</button>
            </div>
            {/* The gain for this rhythm, stated before the routine is added. */}
            {firstRung && (
              <p className="text-[11px] text-white/55">
                First milestone: {firstRung.what} <Gain spinaz={firstRung.spinaz} energy={firstRung.energy} />
              </p>
            )}
          </form>
        ) : (
          <p className="text-[12px] text-mcz-ember">
            {limits.routines} routines is this tier's ceiling.{" "}
            <button type="button" onClick={() => goToSpot("membershipz")}
                    className="font-semibold underline">A tier up raises it.</button>
          </p>
        )}
      </section>

      <Starters starters={board?.starters} add={addStarter} busyKey={addingKey} />
      <BuildCTA actions={asList(board?.actions)} onMake={makeCTA} />

      {/* What the tiers buy here is HOW MANY, never access — said plainly,
          because a free member has a working task manager and should be told
          that is not the thing being sold. */}
      <p className="text-[11px] text-white/50">
        Your tier: {board?.tier}. {limits.routines != null ? `${limits.routines} routines, ` : ""}{limits.active_tasks} open tasks —{" "}
        <button type="button" onClick={() => goToSpot("membershipz")} className="underline">
          a tier up raises each
        </button>. Everything here works at every tier.
      </p>
    </div>
  );
}
