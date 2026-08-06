// OCC — Ocular Code ConnectZ.
//
// The tab registry, the two toggles, and TaskZ. Everything on this screen —
// tab names, emoji, tier gates, languages, the game taxonomy — comes from
// /api/economy/occ/spec/, so what the menu offers and what the endpoint
// refuses cannot drift apart. That matters more here than anywhere else in the
// app: OCC has 21 tabs and three different tier gates across them.
//
// Locked tabs are SHOWN, locked. A menu that silently shrinks teaches a member
// nothing about what the tier above them has.
//
// And it says out loud what it can't do. OCC edits, tracks and version-controls
// code; running or compiling it needs a sandbox per member, which is
// infrastructure rather than a toggle. Better said once than discovered by
// pressing a button that does nothing.
import { useEffect, useState } from "react";
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, Loader2, Lock, Plus,
  RotateCcw, Trash2, X,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { IconImg } from "../App.jsx";

const STATUS_STYLE = {
  suggested: "!text-mcz-gold", queued: "", running: "!text-mcz-cyan",
  done: "!text-emerald-300", failed: "!text-mcz-ember",
  undone: "!text-white/40", cancelled: "!text-white/40",
};

function Toggle({ toggle, on, allowed, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white/85">
          {toggle.emoji} {toggle.name}
          {!allowed && <Lock size={11} className="ml-1 inline text-mcz-ember" />}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{toggle.desc}</p>
        {!allowed && (
          <p className="mt-1 text-[10px] text-mcz-ember">
            Needs {toggle.needs} — upgrade in MembershipZ.
          </p>
        )}
      </div>
      <button
        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
          on ? "bg-mcz-ember text-white" : "border border-white/20 text-white/50"
        } ${!allowed && !on ? "opacity-40" : ""}`}
        onClick={() => onChange(!on)}
        // Turning something OFF is never gated — being unable to switch a
        // thing off because of your tier would be absurd.
        disabled={!allowed && !on}
      >
        {on ? "On" : "Off"}
      </button>
    </div>
  );
}

function Task({ task, onAdvance, onUndo, onCancel }) {
  const open = ["suggested", "queued", "running"].includes(task.status);
  return (
    <li className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-white/85">{task.title}</p>
          <p className="text-[10px] text-white/35">
            <span className={`pill !px-1.5 !py-0 !text-[9px] ${STATUS_STYLE[task.status] || ""}`}>
              {task.status}
            </span>{" "}
            {task.kind}
            {task.automated && <> · 🤖 ran without asking</>}
            {task.git?.repo && <> · {task.git.repo}{task.git.branch ? `@${task.git.branch}` : ""}</>}
            {task.eta_seconds > 0 && open && <> · ~{task.eta_seconds}s left</>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {task.undoable && (
            <button onClick={() => onUndo(task)} className="text-white/30 hover:text-mcz-gold"
                    title="Undo — inside your tier's window">
              <RotateCcw size={13} />
            </button>
          )}
          {open && (
            <button onClick={() => onCancel(task)} className="text-white/30 hover:text-red-300"
                    title="Cancel">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {task.status === "running" && (
        <div className="h-1 w-full overflow-hidden rounded bg-white/10">
          <div className="h-full bg-mcz-cyan" style={{ width: `${task.progress}%` }} />
        </div>
      )}

      {/* A suggestion has to say what, why and how. The server refuses one
          missing any of the three, so if it rendered, all three are here. */}
      {task.status === "suggested" && (
        <div className="space-y-1 rounded-lg border border-mcz-gold/25 bg-mcz-gold/5 p-2 text-[11px]">
          <p><span className="text-mcz-gold">What · </span><span className="text-white/70">{task.what}</span></p>
          <p><span className="text-mcz-gold">Why · </span><span className="text-white/70">{task.why}</span></p>
          <p><span className="text-mcz-gold">How · </span><span className="text-white/70">{task.how}</span></p>
          <button className="re-btn !w-auto px-3 text-[11px]" onClick={() => onAdvance(task, "queued")}>
            <Check size={11} /> Do it
          </button>
        </div>
      )}

      {task.status === "done" && !task.undoable && task.undo_deadline && (
        <p className="text-[10px] text-white/30">Undo window has passed.</p>
      )}
    </li>
  );
}

export default function OCC() {
  const [spec, setSpec] = useState(null);
  const [settings, setSettings] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [openGenre, setOpenGenre] = useState("");
  const [showTabs, setShowTabs] = useState(true);

  const loadTasks = () => api("/api/economy/occ/taskz/")
    .then((d) => setTasks(asList(d?.tasks))).catch(() => setTasks([]));

  useEffect(() => {
    api("/api/economy/occ/spec/").then(setSpec).catch((e) => setMsg(e.message));
    api("/api/economy/occ/settings/").then(setSettings).catch(() => {});
    loadTasks();
  }, []);

  if (!spec) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading OCC…</p>;
  }

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3600); };

  async function setToggle(key, value) {
    try {
      setSettings(await api("/api/economy/occ/settings/", { method: "PATCH", body: { [key]: value } }));
    } catch (e) { flash(e.message || "Couldn't change that."); }
  }

  async function addTask() {
    if (!title.trim()) return;
    try {
      await api("/api/economy/occ/taskz/", { method: "POST", body: { title: title.trim() } });
      setTitle("");
      loadTasks();
    } catch (e) { flash(e.message || "Couldn't add that."); }
  }

  const advance = async (t, status) => {
    await api(`/api/economy/occ/taskz/${t.id}/`, { method: "PATCH", body: { status } }).catch(() => {});
    loadTasks();
  };
  const undo = async (t) => {
    try { await api(`/api/economy/occ/taskz/${t.id}/undo/`, { method: "POST", body: {} }); loadTasks(); }
    catch (e) { flash(e.message || "Couldn't undo that."); }
  };
  const cancel = async (t) => {
    await api(`/api/economy/occ/taskz/${t.id}/`, { method: "DELETE" }).catch(() => {});
    loadTasks();
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="occ.png" alt="OCC" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">Ocular Code ConnectZ</h2>
          <p className="text-xs text-white/45">Write it, track it, version it.</p>
        </div>
      </header>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}

      {/* Said once, up front. */}
      <p className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-white/50">
        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-mcz-gold" />
        {spec.execute_note}
      </p>

      {/* TaskZ — the spine. Git actions land here too. */}
      <div className="re-card space-y-3">
        <div className="re-label">📑 TaskZ</div>
        <div className="flex flex-wrap items-center gap-2">
          <input className="neon-input !w-auto flex-1 !py-2 text-xs" placeholder="What should OCC do?"
                 value={title} onChange={(e) => setTitle(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && addTask()} />
          <button className="neon-btn-primary !w-auto px-4" onClick={addTask} disabled={!title.trim()}>
            <Plus size={14} /> Add
          </button>
        </div>
        <p className="text-[10px] text-white/35">
          Undo window on your tier: {Math.round((spec.undo_window_seconds || 0) / 60)} minutes.
          A task that can't describe how to reverse itself won't offer undo.
        </p>
        {tasks === null ? (
          <p className="flex items-center gap-2 text-[11px] text-white/40"><Loader2 className="animate-spin" size={12} /> Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-[12px] text-white/40">Nothing queued.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <Task key={t.id} task={t} onAdvance={advance} onUndo={undo} onCancel={cancel} />
            ))}
          </ul>
        )}
      </div>

      {/* The two toggles the spec puts front and centre. */}
      {settings && (
        <div className="re-card space-y-3">
          <div className="re-label">⚙️ Settings</div>
          {asList(spec.toggles).map((t) => (
            <Toggle key={t.key} toggle={t}
                    on={t.key === "automation" ? settings.automation : settings.suggestionz}
                    allowed={t.key === "automation" ? settings.automation_allowed : settings.suggestionz_allowed}
                    onChange={(v) => setToggle(t.key === "automation" ? "automation" : "suggestionz", v)} />
          ))}
          <p className="text-[10px] text-white/35">
            📌 Pick ConnectZ — {settings.pin_limit === null
              ? "pin as many tabs as you like."
              : `Free pins ${settings.pin_limit}; the rest of the footer is filled in for you.`}
          </p>
        </div>
      )}

      {/* Every tab, locked ones included. */}
      <div className="re-card space-y-2">
        <button className="re-label flex w-full items-center justify-between" onClick={() => setShowTabs(!showTabs)}>
          <span>👁️‍🗨️ Tabs</span>
          {showTabs ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {showTabs && (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {asList(spec.tabs).map((tab) => (
              <li key={tab.key}
                  className={`rounded-lg border px-3 py-2 ${tab.allowed
                    ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.01] opacity-60"}`}>
                <p className="flex items-center gap-1.5 text-[12px] text-white/80">
                  <span>{tab.emoji}</span>{tab.name}
                  {!tab.allowed && <Lock size={10} className="text-mcz-ember" />}
                </p>
                <p className="text-[10px] leading-relaxed text-white/35">{tab.desc}</p>
                {!tab.allowed && (
                  <p className="text-[10px] text-mcz-ember">Needs {tab.needs}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Languages — the C++ / Unreal reservation, stated rather than hidden. */}
      <div className="re-card space-y-2">
        <div className="re-label">🎮 Build a game in</div>
        <div className="flex flex-wrap gap-1.5">
          {asList(spec.languages).map((l) => <span key={l.key} className="pill !text-[10px]">{l.name}</span>)}
          {asList(spec.languages_locked).map((l) => (
            <span key={l.key} className="pill !text-[10px] !text-white/30" title={`Needs ${l.needs}`}>
              <Lock size={9} className="mr-0.5 inline" />{l.name}
            </span>
          ))}
        </div>
        {asList(spec.languages_locked).length > 0 && (
          <p className="text-[10px] text-white/35">
            Unreal is reserved for StatZ, which is what makes C++ a StatZ language.
          </p>
        )}
      </div>

      {/* The taxonomy games are filed under. */}
      <div className="re-card space-y-2">
        <div className="re-label">🎮 GameZ genres</div>
        {asList(spec.game_genres).map((g) => (
          <div key={g.key}>
            <button className="flex w-full items-center gap-1.5 py-1 text-left text-[12px] text-white/70 hover:text-white"
                    onClick={() => setOpenGenre(openGenre === g.key ? "" : g.key)}>
              {openGenre === g.key ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {g.emoji} {g.name}
              <span className="text-[10px] text-white/30">{g.subgenres.length}</span>
            </button>
            {openGenre === g.key && (
              <div className="ml-5 flex flex-wrap gap-1.5 pb-2">
                {g.subgenres.map((s) => <span key={s} className="pill !text-[10px]">{s}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
