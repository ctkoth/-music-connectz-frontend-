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
  Play, RotateCcw, Send, Star, Trash2, Undo2, X,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { CUSTOM_ICONS, IconImg } from "../App.jsx";
import MediaFields from "../MediaFields.jsx";
import { goToSpot } from "../goto.js";
import { onHandoff } from "../handoff.js";
import { hasBlobs, primaryMedia, uploadWork } from "../uploadWork.js";

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

// The price, before the button. `−N ⚡` on the control itself, never in the
// response — a price discovered by paying it is a bill.
function Price({ cents }) {
  return cents > 0
    ? <span className="text-mcz-ember">−{cents} ⚡</span>
    : <span className="text-emerald-300">Free</span>;
}

function Work({ work, onShare, onUnshare, onDelete, busy }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-2">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)}>
          <p className="truncate text-[13px] text-white/85">{work.title}</p>
          <p className="text-[10px] text-white/35">
            {work.shared ? (
              <span className="text-emerald-300">Posted</span>
            ) : (
              <span>Not posted yet</span>
            )}
            {work.media_type && <> · {work.media_type}</>}
            {work.tab && <> · {work.tab}</>}
            {work.shared && work.rating != null && <> · {work.rating}/10 ⭐</>}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {!work.shared ? (
            <button className="neon-btn-primary !w-auto px-3 !py-1 text-[11px]"
                    onClick={() => onShare(work)} disabled={busy}
                    title="Post it — that's what makes it rateable">
              <Send size={11} /> Post it <Price cents={work.share_cost?.amount || 0} />
            </button>
          ) : (
            <button className="text-white/30 hover:text-mcz-gold" onClick={() => onUnshare(work)}
                    title="Unlink the post (the post stays up)">
              <Undo2 size={13} />
            </button>
          )}
          <button className="text-white/30 hover:text-red-300" onClick={() => onDelete(work)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-2 text-[11px]">
          {work.input_text && (
            <p className="rounded border border-white/10 bg-black/20 p-2 text-white/50">
              <span className="text-mcz-cyan">You asked · </span>{work.input_text}
            </p>
          )}
          {work.description && (
            <p className="whitespace-pre-wrap rounded border border-white/10 bg-black/20 p-2 text-white/70">
              {work.description}
            </p>
          )}
          {work.media_url && <audio controls src={work.media_url} className="w-full" />}
          {work.image_url && <img src={work.image_url} alt="" className="max-h-40 rounded" />}

          {/* Nothing is a dead end. Every place this can go, and honestly
              whether it can go there yet. */}
          <div className="flex flex-wrap gap-1.5">
            {asList(work.send_to).map((t) => {
              const blocked = t.needs_share && !work.shared;
              return (
                <button key={t.key} title={t.note} disabled={blocked}
                        className={`pill !text-[10px] ${blocked ? "!text-white/25" : "hover:!text-white"}`}
                        onClick={() => goToSpot(t.tab, t.target)}>
                  {blocked && <Lock size={9} className="mr-0.5 inline" />}{t.label}
                </button>
              );
            })}
          </div>
          {!work.shared && (
            <p className="text-[10px] text-white/35">
              <Star size={9} className="mr-0.5 inline" />
              Posting is what makes it rateable — likes, dislikes, comments and a
              rating all land on the post.
            </p>
          )}
        </div>
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
  const [works, setWorks] = useState(null);
  const [draft, setDraft] = useState({ title: "", input_text: "", description: "" });
  const [work, setWork] = useState({});      // the attachment, MediaFields' shape
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("python");
  const [source, setSource] = useState("");
  const [ran, setRan] = useState(null);
  const [sugg, setSugg] = useState(null);
  // Which post the WorkZ draft was seeded from, so the panel can say where the
  // words in it came from rather than looking like something you typed.
  const [fromPost, setFromPost] = useState(null);

  const loadTasks = () => api("/api/economy/occ/taskz/")
    .then((d) => setTasks(asList(d?.tasks))).catch(() => setTasks([]));
  const loadSugg = () => api("/api/economy/occ/suggest/")
    .then(setSugg).catch(() => setSugg(null));
  const loadWorks = () => api("/api/economy/occ/workz/")
    .then((d) => setWorks(asList(d?.works))).catch(() => setWorks([]));

  useEffect(() => {
    api("/api/economy/occ/spec/").then(setSpec).catch((e) => setMsg(e.message));
    api("/api/economy/occ/settings/").then(setSettings).catch(() => {});
    loadTasks();
    loadWorks();
    loadSugg();
  }, []);

  // A post carried in from PostZ opens as a WorkZ draft with its own words and
  // attachment already in it — the point being to rewrite the hook, not to
  // retype the verse before you can start.
  // A post, or a page of somebody's diary. Both arrive in the same shape —
  // `crosspost.carry` and `journalz.carry` speak the same keys on purpose — so
  // the only difference here is which of them sent it, and that is only used
  // to write the right sentence on the card. Refusing the journal handoff
  // would have landed a member in WorkZ with an empty form, which is the
  // dead end this whole handoff mechanism exists to stop.
  useEffect(() => onHandoff("occ", (h) => {
    const post = h?.kind === "post" && h.post_id;
    const journal = h?.kind === "journal" && h.journal_id;
    if (!post && !journal) return;
    setFromPost(h);
    setDraft({
      title: h.title || "",
      input_text: h.lyrics || h.description || "",
      description: "",
    });
    setWork({
      audio_url: h.audio_url || "", video_url: h.video_url || "",
      image_url: h.image_url || "", lyrics: h.lyrics || "",
    });
  }), []);

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

  const canKeep = draft.title.trim() || draft.input_text.trim()
    || draft.description.trim() || work.media_url || work.image_url;

  async function keepWork() {
    if (!canKeep) return;
    setBusy(true);
    try {
      if (hasBlobs(work)) flash("Uploading…");
      const { work: hosted } = await uploadWork(work);
      await api("/api/economy/occ/workz/", {
        method: "POST",
        body: {
          title: draft.title.trim(),
          input_text: draft.input_text.trim(),
          description: draft.description.trim(),
          ...primaryMedia(hosted),
          image_url: hosted.image_url || "",
          lyrics: hosted.lyrics || "",
        },
      });
      setDraft({ title: "", input_text: "", description: "" });
      setWork({});
      setFromPost(null);
      loadWorks();
    } catch (e) { flash(e.message || "Couldn't keep that."); }
    finally { setBusy(false); }
  }

  async function runCode() {
    if (!source.trim()) return;
    setBusy(true); setRan(null);
    try {
      const r = await api("/api/economy/occ/run/", {
        method: "POST", body: { language: lang, source },
      });
      setRan(r);
      loadTasks();
      loadWorks();
      // The ceiling and what's left today move with every run, so re-read them
      // rather than letting the button quote a number that has since changed.
      api("/api/economy/occ/spec/").then(setSpec).catch(() => {});
    } catch (e) { flash(e.message || "That run didn't happen — you weren't charged."); }
    finally { setBusy(false); }
  }

  async function runSuggestions() {
    setBusy(true);
    try {
      const r = await api("/api/economy/occ/suggest/", { method: "POST", body: {} });
      flash(r.detail);
      loadTasks(); loadSugg(); loadWorks();
    } catch (e) { flash(e.message || "Couldn't do that."); }
    finally { setBusy(false); }
  }

  async function share(w) {
    setBusy(true);
    try {
      const r = await api(`/api/economy/occ/workz/${w.id}/share/`, { method: "POST", body: {} });
      flash(r.energy_charged
        ? `Posted — charged ${r.energy_charged} ⚡. It can be rated and commented on now.`
        : "Posted — it can be rated and commented on now.");
      loadWorks();
    } catch (e) { flash(e.message || "Couldn't post that."); }
    finally { setBusy(false); }
  }

  async function unshare(w) {
    try {
      await api(`/api/economy/occ/workz/${w.id}/unshare/`, { method: "POST", body: {} });
      flash("Unlinked. The post is still up — delete it in PostZ if you want it gone.");
      loadWorks();
    } catch (e) { flash(e.message || "Couldn't unlink that."); }
  }

  async function removeWork(w) {
    await api(`/api/economy/occ/workz/${w.id}/`, { method: "DELETE" }).catch(() => {});
    loadWorks();
  }

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

      {/* The sandbox. Shown to everyone, and honest about why it's off when it
          is — a locked surface teaches more than a missing one, and a Run
          button that does nothing teaches the wrong thing entirely. */}
      {spec.execute && (
        <div className="re-card space-y-3" data-tour="occ-run">
          <div className="re-label">▶️ Run it</div>
          {!spec.can_execute ? (
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
              <Lock size={12} className="mt-0.5 shrink-0 text-mcz-ember" />
              {spec.execute_note}
            </p>
          ) : (
            <>
              <p className="text-[11px] leading-relaxed text-white/45">
                A fresh container per run, no network out.{" "}
                <span className="text-mcz-ember">−1 ⚡ per second</span>, charged for
                the seconds it actually ran — a run that never starts costs nothing.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select className="neon-input !w-auto !py-1.5 text-xs" value={lang}
                        onChange={(e) => setLang(e.target.value)}>
                  {asList(spec.execute.languages).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <span className="text-[10px] text-white/35">
                  Up to {spec.execute.per_run_seconds}s a run ·{" "}
                  {spec.execute.seconds_left_today}s left today
                </span>
              </div>
              <textarea className="neon-input !py-2 font-mono text-xs" rows={6}
                        placeholder="Paste the code you want run"
                        value={source} onChange={(e) => setSource(e.target.value)} />
              <button className="neon-btn-primary !w-auto px-4" onClick={runCode}
                      disabled={!source.trim() || busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {" "}Run{" "}
                <span className="text-mcz-ember">
                  up to −{spec.execute.max_cost_per_run} ⚡
                </span>
              </button>
              {ran && (
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-white/10 bg-black/40 p-2 font-mono text-[11px] text-white/70">
                  {ran.stdout || ran.stderr || "(no output)"}
                </pre>
              )}
              {ran && (
                <p className="text-[10px] text-white/35">
                  exit {ran.exit_code} · {ran.seconds}s ·{" "}
                  <span className="text-mcz-ember">−{ran.charged} ⚡</span> · kept in
                  WorkZ below, ready to post.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* WorkZ — what you gave OCC and what it gave back, in the PostZ format.
          An answer you can't show anyone, rate, or carry anywhere is a dead end
          with a scrollbar, and nothing here is allowed to be one. */}
      <div className="re-card space-y-3" data-tour="occ-workz">
        <div className="re-label flex items-center gap-2">
          <IconImg icon="workz.png" alt="" className="h-5 w-5 rounded" /> WorkZ
        </div>
        <p className="text-[11px] leading-relaxed text-white/45">
          Text and attachments in, work out. Post it and it's rated, liked,
          disliked and commented on like anything else — or take it straight
          into another app.
        </p>

        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          {fromPost && (
            <p className="rounded-lg border border-mcz-gold/30 bg-mcz-gold/[0.05] px-3 py-2 text-[11px] text-white/70">
              {fromPost.kind === "journal" ? (
                <>
                  📔 Filled from your journal entry for <b className="text-white">{fromPost.day}</b>.
                  Rewrite it here and keep the result — the entry itself isn't touched, and
                  nothing here is published.{" "}
                  <button className="re-link" onClick={() => goToSpot("journalz", "journalz-entries")}>
                    Back to the entry
                  </button>
                </>
              ) : (
                <>
                  🎧 Filled from <b className="text-white">{fromPost.title}</b> by @{fromPost.author}.
                  Rewrite it here and keep the result — the post itself isn't touched.{" "}
                  <button className="re-link" onClick={() => goToSpot("postz", "feed")}>
                    Back to the post
                  </button>
                </>
              )}
            </p>
          )}
          <input className="neon-input !py-2 text-xs" placeholder="Call it something"
                 value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className="neon-input !py-2 text-xs" rows={2}
                    placeholder="What you asked OCC for"
                    value={draft.input_text}
                    onChange={(e) => setDraft({ ...draft, input_text: e.target.value })} />
          <textarea className="neon-input !py-2 text-xs" rows={3}
                    placeholder="What came back"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <MediaFields value={work} onChange={setWork} label="Attachment" />
          <button className="neon-btn-primary !w-auto px-4" onClick={keepWork}
                  disabled={!canKeep || busy}>
            <Plus size={14} /> Keep it <span className="text-emerald-300">Free</span>
          </button>
          <p className="text-[10px] text-white/35">
            Keeping is free. Posting later costs the combined price of the skills
            you put on it — the row says how much before you press it.
          </p>
        </div>

        {works === null ? (
          <p className="flex items-center gap-2 text-[11px] text-white/40"><Loader2 className="animate-spin" size={12} /> Loading…</p>
        ) : works.length === 0 ? (
          <p className="text-[12px] text-white/40">Nothing kept yet.</p>
        ) : (
          <ul className="space-y-2">
            {works.map((w) => (
              <Work key={w.id} work={w} onShare={share} onUnshare={unshare}
                    onDelete={removeWork} busy={busy} />
            ))}
          </ul>
        )}
      </div>

      {/* SuggestionZ / AutomationZ, doing something at last. Both were stored
          booleans that nothing read — a switch that changes no behaviour is the
          same lie as a rate nothing pays. */}
      {sugg && (
        <div className="re-card space-y-3" data-tour="occ-suggest">
          <div className="re-label">💭 What's worth doing</div>
          {!sugg.suggestionz_allowed ? (
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
              <Lock size={12} className="mt-0.5 shrink-0 text-mcz-ember" />
              SuggestionZ is Premium — it reads your account and tells you what's
              worth doing next, with what, why and how.
            </p>
          ) : !sugg.suggestionz ? (
            <p className="text-[11px] text-white/45">
              SuggestionZ is switched off in Settings below.
            </p>
          ) : sugg.suggestions.length === 0 ? (
            <p className="text-[12px] text-white/40">
              Nothing to suggest — you're straight.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {sugg.suggestions.map((x) => (
                  <li key={x.key} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[13px] text-white/85">
                      {x.title}
                      {x.auto_safe ? (
                        <span className="ml-2 text-[10px] text-emerald-300">
                          {sugg.automation ? "🤖 done for you" : "safe to automate"}
                        </span>
                      ) : (
                        <span className="ml-2 text-[10px] text-mcz-gold">asks you first</span>
                      )}
                    </p>
                    <div className="mt-1 space-y-0.5 text-[11px] leading-relaxed">
                      <p><span className="text-mcz-gold">What · </span><span className="text-white/60">{x.what}</span></p>
                      <p><span className="text-mcz-gold">Why · </span><span className="text-white/60">{x.why}</span></p>
                      <p><span className="text-mcz-gold">How · </span><span className="text-white/60">{x.how}</span></p>
                    </div>
                    {x.tab && (
                      <button className="pill mt-2 !text-[10px] hover:!text-white"
                              onClick={() => goToSpot(x.tab, x.target || "")}>
                        Take me there
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <button className="neon-btn-primary !w-auto px-4" onClick={runSuggestions}
                      disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {sugg.automation ? " Do the safe ones" : " Add these to TaskZ"}
              </button>
            </>
          )}
          {/* Said plainly, because "StatZ automates everything" is what a member
              would otherwise assume and be wrong about. */}
          <p className="text-[10px] leading-relaxed text-white/35">{sugg.note}</p>
        </div>
      )}

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
                  {/* The server names the artwork; we use it only if our own
                      registry actually has that file. The frontend deploys
                      itself and the backend doesn't, so the two WILL be out of
                      step — and when they are, the emoji still means the right
                      thing where a fallback logo would mean nothing. */}
                  {CUSTOM_ICONS[tab.icon] ? (
                    <IconImg icon={tab.icon} alt="" className="h-5 w-5 shrink-0 rounded"
                             fallback={<span>{tab.emoji}</span>} />
                  ) : (
                    <span>{tab.emoji}</span>
                  )}
                  {tab.name}
                  {!tab.allowed && <Lock size={10} className="text-mcz-ember" />}
                </p>
                <p className="text-[10px] leading-relaxed text-white/35">{tab.desc}</p>
                {!tab.allowed && (
                  <p className="text-[10px] text-mcz-ember">Needs {tab.needs}</p>
                )}
                {/* The server has always said which tabs have something behind
                    them (`builds`) and now says where each one opens
                    (`open_in`). This screen read neither, so twenty-two tabs
                    rendered as a list you could read and not enter. */}
                {tab.allowed && tab.open_in && (
                  <button className="mt-1 text-[10px] text-mcz-cyan hover:underline"
                          onClick={() => goToSpot(tab.open_in, `occ:${tab.key}`)}>
                    Open →
                  </button>
                )}
                {tab.allowed && !tab.open_in && (
                  <p className="text-[10px] text-white/25">Not built yet</p>
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
          {asList(spec.languages).map((l) => (
            <span key={l.key} className={`pill !text-[10px] ${l.runs ? "" : "!text-white/45"}`}
                  title={l.runs ? "OCC can write this and run it" : "OCC can write this — no sandbox runner yet"}>
              {l.name}{l.runs ? " ▶" : ""}
            </span>
          ))}
          {asList(spec.languages_locked).map((l) => (
            <span key={l.key} className="pill !text-[10px] !text-white/30" title={`Needs ${l.needs}`}>
              <Lock size={9} className="mr-0.5 inline" />{l.name}
            </span>
          ))}
        </div>
        {/* Seventeen advertised, twelve runnable. That is not a lie — OCC writes
            Unity C# perfectly well without executing it — but the pills sit right
            above a Run panel that offers twelve, so the line gets drawn here. */}
        <p className="text-[10px] text-white/35">
          ▶ means OCC can run it in the sandbox too. The rest it writes; you run them
          in your own engine.
          {asList(spec.languages_locked).length > 0
            && " Unreal is reserved for StatZ, which is what makes C++ a StatZ language."}
        </p>
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
