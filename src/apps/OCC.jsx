// OCC — Ocular Code ConnectZ: AI that builds with you.
//
// From the top: the chat (components/occ/OccChat.jsx — the Claude conversation
// that nothing mounted used to call), TaskZ, the sandbox, WorkZ, the two toggles
// and the tab grid. Everything the registry says — tab names, emoji, tier gates,
// languages, the game taxonomy — comes from /api/economy/occ/spec/, so what the
// menu offers and what the endpoint refuses cannot drift apart.
//
// What is honest here, and was not:
//   * TaskZ is a to-do list. Nothing picks a task up and runs it, so nothing on
//     this screen says one "queued", "ran" or "ran without asking" unless OCC
//     itself recorded doing it (the sandbox, the suggestions below).
//   * Undo is offered only when the server can put the change back.
//   * The sandbox states the run that WILL be made — its ceiling is what the
//     member's ⚡ and today's remaining time allow — and waits for it.
//   * The tab grid opens only screens that exist, on anchors that exist.
//
// Inside a shell (src/standalone.js: IN_SHELL — the IntelligenceZ app) this is
// the chat and WorkZ and nothing else: TaskZ, AutomationZ, SuggestionZ and the
// sandbox act on a Music ConnectZ account (badges, posts, ⚡) that the shell does
// not have, and no door leaves it. Nothing in a shell offers a purchase.
import { useEffect, useState } from "react";
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, Loader2, Lock, Plus,
  Play, RotateCcw, Send, Star, Trash2, Undo2,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { CUSTOM_ICONS, IconImg } from "../App.jsx";
import MediaFields from "../MediaFields.jsx";
import RunClock from "../components/RunClock.jsx";
import OccChat from "../components/occ/OccChat.jsx";
import { doorsFor, gridTabs } from "../components/occ/occRoutes.js";
import { perSecondText, runFailure, runLimit, runTimeoutMs } from "../components/occ/occPrice.js";
import { goToSpot, openMember } from "../goto.js";
import { onHandoff } from "../handoff.js";
import { ENERGY, amount } from "../resources.js";
import { IN_SHELL } from "../standalone.js";
import { hasBlobs, primaryMedia, uploadWork } from "../uploadWork.js";
import { useRemembered } from "../useRemembered.js";
import { remember } from "../remember.js";
import UsualHint from "../components/UsualHint.jsx";

const STATUS_STYLE = {
  suggested: "!text-mcz-gold", queued: "", running: "!text-mcz-cyan",
  done: "!text-emerald-300", failed: "!text-mcz-ember",
  undone: "!text-white/40", cancelled: "!text-white/40",
};
// The stored word for "on the list" is `queued`, which reads as a claim that
// something is lined up to run. Nothing is: it is a to-do.
const STATUS_LABEL = {
  queued: "to do", suggested: "suggested", running: "running", done: "done",
  failed: "failed", undone: "undone", cancelled: "cancelled",
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
            Needs {toggle.needs} —{" "}
            <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>
              upgrade in MembershipZ
            </button>
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

function Task({ task, match, onDone, onDoIt, onUndo, onCancel, onSendToLilith }) {
  const open = ["suggested", "queued", "running"].includes(task.status);
  const [sent, setSent] = useState(false);
  // When the server offers `choices`, the member picks which ones the suggestion acts on.
  // Everything starts ticked, so pressing Do it unchanged does exactly what the title says.
  const choices = asList(match?.choices);
  const [unticked, setUnticked] = useState(() => new Set());
  const ticked = choices.filter((c) => !unticked.has(c.id));
  const flip = (id) => setUnticked((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <li className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-white/85">{task.title}</p>
          <p className="text-[10px] text-white/35">
            <span className={`pill !px-1.5 !py-0 !text-[9px] ${STATUS_STYLE[task.status] || ""}`}>
              {STATUS_LABEL[task.status] || task.status}
            </span>{" "}
            {task.kind}
            {/* The server says `automated` only when OCC recorded doing it. */}
            {task.automated && <> · 🤖 done without asking</>}
            {task.git?.repo && <> · {task.git.repo}{task.git.branch ? `@${task.git.branch}` : ""}</>}
            {task.eta_seconds > 0 && task.status === "running" && <> · ~{task.eta_seconds}s left</>}
          </p>
          {task.detail && task.status !== "queued" && (
            <p className="mt-0.5 text-[10px] text-white/45">{task.detail}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* Cross-pollination with Lilith — this still shows up ONLY where
              the work actually gets done, Lilith just carries the reminder. */}
          {open && !sent && (
            <button onClick={() => { onSendToLilith(task); setSent(true); }}
                    className="text-white/30 hover:text-mcz-cyan" title="Send to Lilith's Inbox">
              <IconImg icon="taskz.png" alt="" className="h-3.5 w-3.5 rounded" />
            </button>
          )}
          {sent && <span className="text-[9px] text-mcz-cyan/70">sent</span>}
          {task.status === "queued" && (
            <button onClick={() => onDone(task)} className="text-white/30 hover:text-emerald-300"
                    title="Tick it off">
              <Check size={14} />
            </button>
          )}
          {task.undoable && (
            <button onClick={() => onUndo(task)} className="text-white/30 hover:text-mcz-gold"
                    title="Undo — puts back what OCC changed, inside your tier's window">
              <RotateCcw size={13} />
            </button>
          )}
          {open && (
            <button onClick={() => onCancel(task)} className="text-white/30 hover:text-red-300"
                    title={task.status === "suggested" ? "Dismiss" : "Remove from the list"}>
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
          {match?.auto_safe && choices.length > 0 && (
            <div className="space-y-0.5 pt-1">
              <p className="text-[10px] text-white/45">Untick any you want to keep:</p>
              {choices.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-[11px] text-white/70">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-cyan-400" checked={!unticked.has(c.id)} onChange={() => flip(c.id)} />
                  <span className="truncate">{c.title}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* "Do it" does it. It used to move the row to "queued" and nothing
                ever ran it. Only the suggestions the server calls safe can be
                done for you; the rest are a door to where you do them. */}
            {match?.auto_safe && (
              <button className="re-btn !w-auto px-3 text-[11px] disabled:opacity-40"
                      disabled={choices.length > 0 && ticked.length === 0}
                      onClick={() => onDoIt(task, match, choices.length > 0 ? ticked.map((c) => c.id) : undefined)}>
                <Check size={11} /> Do it{choices.length > 0 ? ` (${ticked.length} of ${choices.length})` : ""}
              </button>
            )}
            {match && !match.auto_safe && match.tab && (
              <button className="pill !text-[10px] hover:!text-white"
                      onClick={() => goToSpot(match.tab, match.target || "")}>
                Take me there
              </button>
            )}
            {!match && (
              <span className="text-[10px] text-white/40">
                Your account has moved on — this one isn't needed any more.
              </span>
            )}
          </div>
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
    ? <span className="text-mcz-ember">{amount(cents, ENERGY, "−")}</span>
    : <span className="text-emerald-300">Free</span>;
}

function Work({ work, onShare, onUnshare, onDelete, onDoor, busy }) {
  const [open, setOpen] = useState(false);
  const doors = doorsFor(work.send_to, { inShell: IN_SHELL });
  return (
    <li className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-2">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)}>
          <p className="truncate text-[13px] text-white/85">{work.title}</p>
          <p className="text-[10px] text-white/35">
            {/* "Posted / not posted" is PostZ's vocabulary; a shell has no PostZ. */}
            {!IN_SHELL && (work.shared ? (
              <span className="text-emerald-300">Posted</span>
            ) : (
              <span>Not posted yet</span>
            ))}
            {!IN_SHELL && work.media_type && <> · {work.media_type}</>}
            {work.tab && <>{IN_SHELL ? "" : " · "}{work.tab === "chat" ? "from chat" : work.tab}</>}
            {!IN_SHELL && work.shared && work.rating != null && <> · {work.rating}/10 ⭐</>}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {!IN_SHELL && (!work.shared ? (
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
          ))}
          <button className="text-white/30 hover:text-red-300" onClick={() => onDelete(work)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-2 text-[11px]">
          {work.input_text && (
            <p className="whitespace-pre-wrap rounded border border-white/10 bg-black/20 p-2 text-white/50">
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
              whether it can go there yet — but only to tabs that are mounted
              (occRoutes.doorsFor), and to none at all inside a shell. */}
          {doors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {doors.map((t) => {
                const blocked = t.needs_share && !work.shared;
                return (
                  <button key={t.key} title={t.note} disabled={blocked}
                          className={`pill !text-[10px] ${blocked ? "!text-white/25" : "hover:!text-white"}`}
                          onClick={() => onDoor(t, work)}>
                    {blocked && <Lock size={9} className="mr-0.5 inline" />}{t.label}
                  </button>
                );
              })}
            </div>
          )}
          {!IN_SHELL && !work.shared && (
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
  const [lang, setLang] = useRemembered("occ.lang", "python");
  const [source, setSource] = useState("");
  const [ran, setRan] = useState(null);
  const [running, setRunning] = useState(false);   // the sandbox, not any other busy
  const [sugg, setSugg] = useState(null);
  // Which post the WorkZ draft was seeded from, so the panel can say where the
  // words in it came from rather than looking like something you typed.
  const [fromPost, setFromPost] = useState(null);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3600); };

  const loadTasks = () => api("/api/economy/occ/taskz/")
    .then((d) => setTasks(asList(d?.tasks))).catch(() => setTasks([]));
  const loadSugg = () => api("/api/economy/occ/suggest/")
    .then(setSugg).catch(() => setSugg(null));
  const loadWorks = () => api("/api/economy/occ/workz/")
    .then((d) => setWorks(asList(d?.works))).catch(() => setWorks([]));
  const loadSpec = () => api("/api/economy/occ/spec/").then(setSpec).catch((e) => flash(e.message));

  useEffect(() => {
    loadWorks();
    // A shell is chat + WorkZ. TaskZ, the sandbox, the toggles and the
    // suggestions are Music ConnectZ account features, so nothing asks for them.
    if (IN_SHELL) return;
    loadSpec();
    api("/api/economy/occ/settings/").then(setSettings).catch(() => {});
    loadTasks();
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
  useEffect(() => (IN_SHELL ? undefined : onHandoff("occ", (h) => {
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
  })), []);

  async function setToggle(key, value) {
    try {
      setSettings(await api("/api/economy/occ/settings/", { method: "PATCH", body: { [key]: value } }));
    } catch (e) { flash(e.message || "Couldn't change that."); }
  }

  // TaskZ is a to-do list: adding a row adds a row, and the screen says no more
  // than that. (It used to read "What should OCC do?" and the server announced
  // "OCC ran '…' automatically" — nothing ran it.)
  async function addTask() {
    if (!title.trim()) return;
    try {
      await api("/api/economy/occ/taskz/", { method: "POST", body: { title: title.trim() } });
      setTitle("");
      loadTasks();
    } catch (e) { flash(e.message || "Couldn't add that."); }
  }

  const markDone = async (t) => {
    try {
      await api(`/api/economy/occ/taskz/${t.id}/`, { method: "PATCH", body: { status: "done" } });
    } catch (e) { flash(e.message || "Couldn't tick that off."); }
    loadTasks();
  };
  // The tap that confirms a suggestion — and then OCC does it. The server
  // performs the safe ones and says what it did; anything it can't do for you is
  // a door, never a button that pretends.
  const doSuggestion = async (t, match, ids) => {
    try {
      const r = await api("/api/economy/occ/suggest/", {
        method: "POST", body: { key: match.key, confirm: true, ...(ids ? { ids } : {}) },
      });
      flash(r.detail || "Done.");
    } catch (e) { flash(e.message || "Couldn't do that."); }
    loadTasks(); loadSugg();
  };
  const undo = async (t) => {
    try {
      const r = await api(`/api/economy/occ/taskz/${t.id}/undo/`, { method: "POST", body: {} });
      flash(r.detail || "Undone.");
      loadTasks();
    } catch (e) { flash(e.message || "Couldn't undo that."); }
  };
  const cancel = async (t) => {
    try { await api(`/api/economy/occ/taskz/${t.id}/`, { method: "DELETE" }); }
    catch (e) { flash(e.message || "Couldn't cancel that."); }
    loadTasks();
  };
  // Cross-pollination: OCC's own queue is a place work SITS, not a place a
  // member checks off a day's plan against everything else they're doing.
  // Sending it to Lilith is a real to-do row there — `app_key: "occ"` makes
  // the server mark it `source: "platform"`, so Lilith's XP-and-streak
  // rewards apply but nothing mints twice for one piece of work (the OCC
  // task itself still pays whatever completing it pays). Lilith renders the
  // "Do it" jump back here on its own — this only has to create the row.
  const sendToLilith = async (t) => {
    try {
      await api("/api/economy/lilith/tasks/", {
        method: "POST",
        body: { title: t.title, bucket: "inbox", app_key: "occ", target: "occ-taskz" },
      });
      flash("Sent to Lilith's Inbox.");
    } catch (e) { flash(e.message || "Couldn't send that to Lilith."); }
  };
  const suggFor = (t) => asList(sugg?.suggestions).find((x) => x.title === t.title) || null;

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

  // The run states the longest it can be BEFORE it is pressed (runLimit: the
  // tier's ceiling, today's remaining time and the member's own ⚡, whichever
  // bites first) and sends exactly that, so the price on the button is the price
  // of the run that gets made. The wait is the run plus the container starting —
  // the 30s default aborted a healthy 120-second run and said "Nothing was
  // charged" while the server went on to charge up to 120 ⚡.
  const lim = runLimit(spec?.execute);
  async function runCode() {
    if (!source.trim() || lim.blocked) return;
    setBusy(true); setRunning(true); setRan(null);
    try {
      const r = await api("/api/economy/occ/run/", {
        method: "POST", body: { language: lang, source, seconds: lim.seconds },
        timeoutMs: runTimeoutMs(lim.seconds),
      });
      setRan(r);
      loadTasks();
      loadWorks();
    } catch (e) { flash(runFailure(e)); }
    finally {
      setBusy(false); setRunning(false);
      // The ceiling, ⚡ and what's left today move with every run — and after a
      // run we lost contact with, too — so re-read them rather than letting the
      // button quote a number that has since changed.
      loadSpec();
    }
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
        ? `Posted — charged ${amount(r.energy_charged, ENERGY)}. It can be rated and commented on now.`
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
    if (!window.confirm(`Remove “${w.title || "this work"}” from your WorkZ? It can't be undone.`)) return;
    try { await api(`/api/economy/occ/workz/${w.id}/`, { method: "DELETE" }); }
    catch (e) { flash(e.message || "Couldn't remove that."); }
    loadWorks();
  }

  // One door out of a piece of WorkZ. "Take it into CollabZ" does what PostZ's
  // button of the same name does — it starts the draft deal on the post — rather
  // than landing on CollabZ with nothing made.
  async function openDoor(t, w) {
    if (t.key === "collabz" && t.from_post) {
      try {
        await api("/api/economy/collab/", {
          method: "POST", body: { from_post: t.from_post, currency: "money" },
        });
        flash(`Draft deal started on "${w.title}" — open CollabZ to set the worth.`);
      } catch (e) { flash(e.message || "Couldn't start that collab."); return; }
      goToSpot("collabz", "collabz-deals");
      return;
    }
    goToSpot(t.tab, t.target || "");
  }

  const tabs = gridTabs(spec?.tabs, { inShell: IN_SHELL });

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="occ.png" alt="OCC" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">Ocular Code ConnectZ</h2>
          <p className="text-xs text-white/45">
            {IN_SHELL ? "Ask OCC, and keep what it makes." : "AI that builds with you — ask it, keep what it makes, run what you write."}
          </p>
        </div>
      </header>

      {msg && <p role="status" className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}

      {/* The chat is the point of OCC, so it is first. */}
      <OccChat onKept={loadWorks} />

      {/* Said once, up front. Not in a shell: the sandbox is a Music ConnectZ
          StatZ feature and a shell has neither the tier nor the Energy. */}
      {!IN_SHELL && spec && (
        <p className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-white/50">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-mcz-gold" />
          {spec.execute_note}
        </p>
      )}

      {/* TaskZ — a to-do list. Runs and suggestions add their own rows as OCC
          really does them; nothing here is picked up and run on its own. */}
      {!IN_SHELL && (
        <div className="re-card space-y-3" data-tour="occ-taskz">
          <div className="re-label flex items-center gap-1.5">
            <IconImg icon="taskz.png" alt="" className="h-5 w-5 rounded" /> TaskZ
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="neon-input !w-auto flex-1 !py-2 text-xs" placeholder="Add a task"
                   aria-label="Add a task"
                   value={title} onChange={(e) => setTitle(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <button className="neon-btn-primary !w-auto px-4" onClick={addTask} disabled={!title.trim()}>
              <Plus size={14} /> Add <span className="text-emerald-300">Free</span>
            </button>
          </div>
          <p className="text-[10px] leading-relaxed text-white/35">
            Your own to-do list. OCC doesn't pick these up — the code you run and the
            suggestions you accept add their own rows here as they happen.
            {spec && <> Undo window on your tier: {Math.round((spec.undo_window_seconds || 0) / 60)} minutes,
            for changes OCC can put back.</>}
          </p>
          {tasks === null ? (
            <p className="flex items-center gap-2 text-[11px] text-white/40"><Loader2 className="animate-spin" size={12} /> Loading…</p>
          ) : tasks.length === 0 ? (
            <p className="text-[12px] text-white/40">Nothing on your list.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <Task key={t.id} task={t} match={suggFor(t)} onDone={markDone} onDoIt={doSuggestion}
                      onUndo={undo} onCancel={cancel} onSendToLilith={sendToLilith} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* The sandbox. Shown to everyone, and honest about why it's off when it
          is — a locked surface teaches more than a missing one, and a Run
          button that does nothing teaches the wrong thing entirely. */}
      {!IN_SHELL && spec?.execute && (
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
                <span className="text-mcz-ember">{perSecondText(spec.execute)}</span>, charged for
                the seconds it actually ran — a run that never starts costs nothing.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select data-memo="own" className="neon-input !w-auto !py-1.5 text-xs" value={lang}
                        aria-label="Language"
                        onChange={(e) => setLang(e.target.value)}>
                  {asList(spec.execute.languages).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
<UsualHint field="occ.lang" value={lang} onUse={setLang} />
                <span className="text-[10px] text-white/35">
                  {lim.blocked ? "Can't start a run right now" : `This run: up to ${lim.seconds}s`}
                  {" · "}{spec.execute.seconds_left_today}s of sandbox time left today
                  {" · "}you have {amount(spec.execute.energy ?? 0, ENERGY)}
                </span>
              </div>
              {!lim.blocked && lim.seconds < spec.execute.per_run_seconds && (
                <p className="text-[10px] text-white/40">
                  Your tier allows {spec.execute.per_run_seconds}s a run; today's time and your
                  Energy cap this one at {lim.seconds}s.
                </p>
              )}
              {lim.blocked && <p role="status" className="text-[11px] text-mcz-ember">{lim.why}</p>}
              <textarea className="neon-input !py-2 font-mono text-xs" rows={6}
                        aria-label="Code to run"
                        placeholder="Paste the code you want run"
                        value={source} onChange={(e) => setSource(e.target.value)} />
              <div className="flex flex-wrap items-center gap-3">
                <button className="neon-btn-primary !w-auto px-4" onClick={runCode}
                        disabled={!source.trim() || busy || lim.blocked}>
                  {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {" "}Run{" "}
                  <span className="text-mcz-ember">
                    up to {amount(lim.price, ENERGY, "−")}
                  </span>
                </button>
                {/* The ceiling beside the clock: a number that only goes up cannot
                    tell working from hung. */}
                <RunClock running={running} budgetSeconds={lim.seconds} what="Running" />
              </div>
              {ran && (
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-white/10 bg-black/40 p-2 font-mono text-[11px] text-white/70">
                  {ran.stdout || ran.stderr || "(no output)"}
                </pre>
              )}
              {ran && (
                <p className="text-[10px] text-white/35">
                  exit {ran.exit_code} · {ran.seconds}s ·{" "}
                  <span className="text-mcz-ember">{amount(ran.charged, ENERGY, "−")}</span> · kept in
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
          {IN_SHELL
            ? "What you asked OCC and what it gave back, kept here. Save a chat reply and it lands in this list."
            : "Text and attachments in, work out. Save a chat reply here, post it and it's rated, liked, disliked and commented on like anything else — or take it straight into another app."}
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
                  🎧 Filled from <b className="text-white">{fromPost.title}</b> by{" "}
                  <button className="hover:underline" onClick={() => openMember(fromPost.author)}>@{fromPost.author}</button>.
                  Rewrite it here and keep the result — the post itself isn't touched.{" "}
                  <button className="re-link" onClick={() => goToSpot("postz", "feed")}>
                    Back to the post
                  </button>
                </>
              )}
            </p>
          )}
          <input className="neon-input !py-2 text-xs" placeholder="Call it something"
                 aria-label="Title"
                 value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className="neon-input !py-2 text-xs" rows={2}
                    aria-label="What you asked OCC for"
                    placeholder="What you asked OCC for"
                    value={draft.input_text}
                    onChange={(e) => setDraft({ ...draft, input_text: e.target.value })} />
          <textarea className="neon-input !py-2 text-xs" rows={3}
                    aria-label="What came back"
                    placeholder="What came back"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          {/* Text-only inside a shell: the Record / audio / video / image
              attachment uses the mic, camera and photos, which the shell's store
              listing and privacy policy say it never touches. */}
          {!IN_SHELL && <MediaFields value={work} onChange={setWork} label="Attachment" />}
          <button className="neon-btn-primary !w-auto px-4" onClick={keepWork}
                  disabled={!canKeep || busy}>
            <Plus size={14} /> Keep it <span className="text-emerald-300">Free</span>
          </button>
          {!IN_SHELL && (
            <p className="text-[10px] text-white/35">
              Keeping is free. Posting later costs the combined price of the skills
              you put on it — the row says how much before you press it.
            </p>
          )}
        </div>

        {works === null ? (
          <p className="flex items-center gap-2 text-[11px] text-white/40"><Loader2 className="animate-spin" size={12} /> Loading…</p>
        ) : works.length === 0 ? (
          <p className="text-[12px] text-white/40">Nothing kept yet.</p>
        ) : (
          <ul className="space-y-2">
            {works.map((w) => (
              <Work key={w.id} work={w} onShare={share} onUnshare={unshare}
                    onDelete={removeWork} onDoor={openDoor} busy={busy} />
            ))}
          </ul>
        )}
      </div>

      {/* SuggestionZ / AutomationZ, doing something at last. Both were stored
          booleans that nothing read — a switch that changes no behaviour is the
          same lie as a rate nothing pays. */}
      {!IN_SHELL && sugg && (
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
                          {sugg.automation ? "🤖 done for you" : "safe to do for you"}
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
                    <div className="mt-2 flex flex-wrap gap-2">
                      {x.auto_safe && (
                        <button className="re-btn !w-auto px-3 text-[11px]" disabled={busy}
                                onClick={() => doSuggestion(null, x)}>
                          <Check size={11} /> Do it
                        </button>
                      )}
                      {x.tab && (
                        <button className="pill !text-[10px] hover:!text-white"
                                onClick={() => goToSpot(x.tab, x.target || "")}>
                          Take me there
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <button className="neon-btn-primary !w-auto px-4" onClick={runSuggestions}
                      disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {sugg.automation ? " Do the safe ones" : " Add these to my to-do list"}
              </button>
            </>
          )}
          {/* Said plainly, because "StatZ automates everything" is what a member
              would otherwise assume and be wrong about. */}
          <p className="text-[10px] leading-relaxed text-white/35">{sugg.note}</p>
        </div>
      )}

      {/* The two toggles the spec puts front and centre. */}
      {!IN_SHELL && settings && spec && (
        <div className="re-card space-y-3" data-tour="occ-settings">
          <div className="re-label">⚙️ Settings</div>
          {asList(spec.toggles).map((t) => (
            <Toggle key={t.key} toggle={t}
                    on={t.key === "automation" ? settings.automation : settings.suggestionz}
                    allowed={t.key === "automation" ? settings.automation_allowed : settings.suggestionz_allowed}
                    onChange={(v) => setToggle(t.key === "automation" ? "automation" : "suggestionz", v)} />
          ))}
        </div>
      )}

      {/* Where OCC's neighbours are. Only tabs a screen stands behind, each on a
          screen the app mounts and an anchor it has — the seven the registry
          lists without a screen (editor, console, FileZ, Welcome…) used to draw
          as "Not built yet" cards with no button, and every "Open →" went to an
          anchor (`occ:<key>`) that exists nowhere. None at all in a shell. */}
      {tabs.length > 0 && (
        <div className="re-card space-y-2">
          <button className="re-label flex w-full items-center justify-between" onClick={() => setShowTabs(!showTabs)}>
            <span>👁️‍🗨️ Around OCC</span>
            {showTabs ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          {showTabs && (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {tabs.map((tab) => (
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
                  {tab.allowed && (
                    <button className="mt-1 text-[10px] text-mcz-cyan hover:underline"
                            onClick={() => goToSpot(tab.open_in, tab.target || "")}>
                      Open →
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Languages — the C++ / Unreal reservation, stated rather than hidden. */}
      {!IN_SHELL && spec && (
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
      )}

      {/* The taxonomy games are filed under. */}
      {!IN_SHELL && spec && (
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
      )}
    </div>
  );
}
