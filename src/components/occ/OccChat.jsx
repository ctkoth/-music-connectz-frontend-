import { useEffect, useRef, useState } from "react";
import { Check, Flag, Loader2, Lock, MessageSquare, Save, Send } from "lucide-react";
import { api } from "../../api.js";
import { goToSpot, spotlight } from "../../goto.js";
import { IN_SHELL } from "../../standalone.js";
import { PROMPTZ, amount } from "../../resources.js";
import {
  NOT_CHARGED_IF_FAILS, chatFailure, chatTimeoutMs, freeAlternative, historyFor,
  lockedNote, sendPrice, titleFromPrompt,
} from "./occPrice.js";
import { parseReply } from "./occText.js";
import RunClock from "../RunClock.jsx";
import SpeakingIn from "../SpeakingIn.jsx";

// OCC's chat — the AI half of "AI that builds with you".
//
// The endpoint (POST /api/economy/ai/occ/), the engine ladder
// (GET/PATCH /api/economy/ai/models/) and the member's stored voice all existed
// on the server for as long as OCC did, and nothing mounted called any of them:
// the screen was a to-do list and a WorkZ form with an AI named in the title.
//
// This panel decides nothing. Which engines exist, what each costs, which the
// member's tier reaches, whether today's free prompts cover one, how long the
// server will wait, how big a message may be — all of it is the models payload,
// read. What lives here is WHICH sentence goes with which situation, and that
// part is in occPrice.js where it can be tested.
//
// The rules it is built to keep:
//   * The price is beside Send BEFORE it is pressed, in the house format.
//   * A reply that fails is not charged, and says so beside the same button.
//   * The server's refusals are shown unreworded.
//   * A reply is text. Nothing from the model reaches the page as markup.
//   * Nothing is a dead end: every reply can be kept in WorkZ, and every reply
//     can be reported (Google Play asks for an in-app flag on AI output).

const VOICES = [
  { key: "", label: "My voice" },
  { key: "corey-gpt", label: "Corey" },
  { key: "standard", label: "Standard" },
  { key: "technical", label: "Technical" },
];
const STYLE_LABEL = { corey: "Corey", standard: "Standard", technical: "Technical" };

const REPORT_REASONS = [
  ["harassment", "Harassment or threats"],
  ["hate", "Hate or abuse"],
  ["nsfw", "Adult content"],
  ["other", "Something else — wrong, unsafe or harmful"],
];

function Reply({ text, onChoose }) {
  return (
    <div className="space-y-0.5 text-[13px] leading-relaxed text-white/85">
      {parseReply(text).map((line, i) => {
        const body = line.parts.map((p, j) => (p.href
          ? <a key={j} href={p.href} target="_blank" rel="noopener noreferrer" className="re-link">{p.label}</a>
          : <span key={j}>{p.text}</span>));
        if (line.choice) {
          return (
            <p key={i} className="flex items-start gap-2 whitespace-pre-wrap">
              {/* The voice formats options as "#1 …" so a member can answer with
                  one character; this fills the box with it and does NOT send —
                  sending spends. */}
              <button type="button" className="pill !px-2 !py-0 !text-[11px]"
                      onClick={() => onChoose(line.choice)}
                      title={`Answer with ${line.choice}`}>#{line.choice}</button>
              <span>{body}</span>
            </p>
          );
        }
        return line.raw.trim() === ""
          ? <div key={i} className="h-2" />
          : <p key={i} className="whitespace-pre-wrap">{body}</p>;
      })}
    </div>
  );
}

// "Report this reply" — Google Play asks for an in-app way to flag AI-generated
// output. Modelled on ReportOutput in SentenceConnectZ.jsx. A report names a
// stored thing (`occ:<WorkZ id>`) so the owner can read the whole prompt and
// reply, which a 280-character note could not carry — so a reply that has not
// been kept yet is kept FIRST, and the control says so before it is pressed.
function ReportReply({ id, saved, ensureSaved }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("other");
  const [note, setNote] = useState("");
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (done) return <p className="text-[11px] text-white/55">{done}</p>;
  if (!open) {
    return (
      <button type="button" className="inline-flex items-center gap-1 text-[11px] text-white/45 hover:text-white"
              onClick={() => setOpen(true)}>
        <Flag size={11} /> Report this reply
      </button>
    );
  }
  const send = async () => {
    setErr(""); setBusy(true);
    try {
      const workId = await ensureSaved();
      await api("/api/economy/report/", {
        method: "POST", body: { item: `occ:${workId}`, reason, note },
      });
      setDone("Reported. The owner will see it.");
    } catch (e) { setErr(e.message || "That didn't send."); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-2 rounded-lg border border-white/10 p-3 text-xs">
      <label className="block text-white/60" htmlFor={`rep-${id}`}>What is wrong with it?</label>
      <select data-nomemo="true" id={`rep-${id}`} className="neon-input" value={reason} onChange={(e) => setReason(e.target.value)}>
        {REPORT_REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <input className="neon-input w-full" maxLength={280} aria-label="Anything we should know (optional)"
             placeholder="Anything we should know (optional)" value={note}
             onChange={(e) => setNote(e.target.value)} />
      {!saved && (
        <p className="text-[11px] text-white/45">
          Sending this also keeps the reply in your WorkZ, so the owner can read the whole of it.
        </p>
      )}
      {err && <p role="alert" className="text-mcz-ember">{err}</p>}
      <div className="flex gap-3">
        <button type="button" className="re-btn !w-auto px-3" onClick={send} disabled={busy}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : null} Send report
        </button>
        <button type="button" className="text-white/50 hover:text-white" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function ReplyCard({ m, onChoose, onKept }) {
  const [workId, setWorkId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  // Keeping a reply is the WorkZ POST with the prompt that was asked and the
  // reply that came back — so WorkZ stops asking the member to type both halves.
  // One request however many times it is asked for (Save, then Report).
  const inflight = useRef(null);
  const ensureSaved = () => {
    if (workId) return Promise.resolve(workId);
    if (inflight.current) return inflight.current;
    inflight.current = api("/api/economy/occ/workz/", {
      method: "POST",
      body: {
        tab: "chat", media_type: "document",
        title: titleFromPrompt(m.prompt), input_text: m.prompt, description: m.text,
      },
    }).then((w) => { setWorkId(w.id); onKept?.(w); return w.id; })
      .finally(() => { inflight.current = null; });
    return inflight.current;
  };
  const save = async () => {
    setSaveErr(""); setSaving(true);
    try { await ensureSaved(); }
    catch (e) { setSaveErr(e.message || "Couldn't keep that."); }
    finally { setSaving(false); }
  };

  return (
    <li className="space-y-2 rounded-lg border border-mcz-cyan/20 bg-mcz-cyan/[0.04] p-3">
      <Reply text={m.text} onChoose={onChoose} />
      <p className="text-[10px] text-white/35">
        {m.meta.engine_emoji} {m.meta.engine_name}
        {" · "}
        {m.meta.free_prompt
          ? <span className="text-emerald-300">Free today</span>
          : <span className="text-mcz-ember">{m.meta.price}</span>}
        {m.meta.trimmed ? ` · OCC forgot the oldest ${m.meta.trimmed} turn${m.meta.trimmed === 1 ? "" : "s"} to stay inside the size limit` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {workId ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <Check size={11} /> Kept in WorkZ{" "}
            <button type="button" className="re-link" onClick={() => spotlight("occ-workz")}>Open</button>
          </span>
        ) : (
          <button type="button" className="inline-flex items-center gap-1 text-[11px] text-mcz-cyan hover:underline"
                  onClick={save} disabled={saving}
                  title="Keep this prompt and reply in WorkZ">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Save to WorkZ <span className="text-emerald-300">Free</span>
          </button>
        )}
        <ReportReply id={m.id} saved={!!workId} ensureSaved={ensureSaved} />
      </div>
      {saveErr && <p role="alert" className="text-[11px] text-mcz-ember">{saveErr}</p>}
    </li>
  );
}

export default function OccChat({ onKept }) {
  const [state, setState] = useState(null);          // GET /ai/models/
  const [stateErr, setStateErr] = useState("");
  const [voiceDefault, setVoiceDefault] = useState("");
  const [voice, setVoice] = useState("");            // "" = the member's own
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);              // chatFailure(...)
  const [pickErr, setPickErr] = useState("");
  const nextId = useRef(1);
  const box = useRef(null);
  const endRef = useRef(null);

  const loadState = () => api("/api/economy/ai/models/")
    .then((d) => { setState(d); setStateErr(""); })
    .catch((e) => setStateErr(e.message || "Couldn't load the engines."));

  useEffect(() => {
    loadState();
    // The member's stored voice, only to NAME it ("My voice — Corey"). Which
    // voice applies is the server's: it reads the same row. A failed read just
    // leaves the label plain.
    api("/api/economy/voicez/")
      .then((d) => setVoiceDefault(STYLE_LABEL[d?.voice?.style] || ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [messages.length, busy]);

  const current = state?.models?.find((r) => r.current) || null;
  const price = sendPrice(current, state || {});
  const limit = Number(state?.limits?.prompt_chars) || 8000;
  const over = draft.length > limit;
  const canSend = !busy && !!draft.trim() && !over && price.canSend;
  const free = freeAlternative(state?.models, current?.key);

  async function pick(row) {
    if (!row.allowed || row.current) return;
    setPickErr("");
    try {
      setState(await api("/api/economy/ai/models/", { method: "PATCH", body: { model: row.key } }));
    } catch (e) { setPickErr(e.message || "Couldn't switch engine."); }
  }

  async function send() {
    if (!canSend) return;
    const prompt = draft.trim();
    const history = historyFor(messages, state?.limits);
    const asked = { id: nextId.current++, role: "user", text: prompt };
    setMessages((ms) => [...ms, asked]);
    setDraft(""); setErr(null); setBusy(true);
    try {
      const r = await api("/api/economy/ai/occ/", {
        method: "POST",
        // The wait is bounded by the server's own stated budget (+ a margin),
        // not by api.js's 30s default, which aborted healthy replies from the
        // slower engines and called them failures.
        timeoutMs: chatTimeoutMs(state?.chat_budget_seconds),
        body: { prompt, history, ...(voice ? { model: voice } : {}) },
      });
      setMessages((ms) => [...ms, {
        id: nextId.current++, role: "occ", text: r.text, prompt,
        meta: {
          engine_name: r.engine_name, engine_emoji: r.engine_emoji,
          free_prompt: !!r.free_prompt,
          // What the server ACTUALLY charged — the receipt for a price that was
          // stated before Send, never a recomputation of it.
          price: Number(r.cost_cents) > 0 ? amount(r.cost_cents, PROMPTZ, "−") : "No charge",
          trimmed: r.history_trimmed || 0,
        },
      }]);
      loadState();                       // the allowance and balance have moved
    } catch (e) {
      // The prompt goes back in the box and the failed turn leaves the list (and
      // so the history): a reply that fails is not charged, and nothing the
      // member typed is lost.
      setMessages((ms) => ms.filter((m) => m.id !== asked.id));
      setDraft(prompt);
      setErr(chatFailure(e));
      loadState();
    } finally { setBusy(false); }
  }

  const onKey = (e) => {
    // Enter is a new line, never a send: sending spends.
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
  };
  const choose = (ch) => { setDraft(ch); box.current?.focus(); };

  return (
    <div className="re-card space-y-3" data-tour="occ-chat">
      <div className="re-label flex items-center gap-1.5">
        <MessageSquare size={14} className="text-mcz-cyan" /> Ask OCC
      </div>

      {stateErr && !state && (
        <p role="alert" className="text-[11px] text-mcz-ember">
          {stateErr}{" "}
          <button type="button" className="re-link" onClick={loadState}>Try again</button>
        </p>
      )}
      {!state && !stateErr && (
        <p className="flex items-center gap-2 text-[11px] text-white/40">
          <Loader2 className="animate-spin" size={12} /> Checking the engines and the price…
        </p>
      )}

      {state && (
        <>
          {/* The engine. Locked rows are SHOWN, with what they need — a locked row
              nobody can see is not an upsell, it is a secret. Inside a shell they
              stop at the fact: there is nothing to buy there. */}
          <div role="radiogroup" aria-label="Engine" className="grid gap-1.5 sm:grid-cols-2">
            {/* Inside a shell a locked engine is hidden, not shown with a tier:
                there is nothing to buy there, so the picker keeps only what the
                member can use. */}
            {state.models.filter((r) => r.allowed || !IN_SHELL).map((r) => (
              <button key={r.key} type="button" role="radio" aria-checked={r.current}
                      disabled={!r.allowed}
                      onClick={() => pick(r)}
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        r.current ? "border-mcz-cyan/60 bg-mcz-cyan/[0.07]"
                          : r.allowed ? "border-white/10 hover:border-white/25"
                            : "border-white/5 opacity-60"}`}>
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white/85">
                  {r.emoji} {r.name}
                  {!r.allowed && <Lock size={10} className="text-mcz-ember" />}
                </span>
                <span className="block text-[10px] leading-relaxed text-white/45">{r.blurb}</span>
                <span className="block text-[10px]">
                  {r.allowed ? (
                    <>
                      <span className="text-mcz-ember">{r.cost_note}</span>
                      {r.free_today && <span className="ml-2 text-emerald-300">free today</span>}
                    </>
                  ) : (
                    <span className="text-mcz-ember">{lockedNote(r, { inShell: IN_SHELL })}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
          {pickErr && <p role="alert" className="text-[11px] text-mcz-ember">{pickErr}</p>}
          {!IN_SHELL && state.models.some((r) => !r.allowed) && (
            <p className="text-[10px] text-white/35">
              A tier buys which engines, never whether you can chat.{" "}
              <button type="button" className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>
                See the tiers
              </button>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
            <label htmlFor="occ-chat-voice">Voice</label>
            <select id="occ-chat-voice" className="neon-input !w-auto !py-1 text-xs" value={voice}
                    onChange={(e) => setVoice(e.target.value)}>
              {VOICES.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.key === "" && voiceDefault ? `My voice — ${voiceDefault}` : v.label}
                </option>
              ))}
            </select>
            <span className="text-white/30">
              {voice ? "For this chat only." : "The one you set in VoiceZ."}
            </span>
          </div>
        </>
      )}

      {messages.length > 0 && (
        <ol className="max-h-[32rem] space-y-2 overflow-y-auto pr-1" aria-live="polite" aria-label="Conversation">
          {messages.map((m) => (m.role === "user" ? (
            <li key={m.id} className="ml-6 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-[13px]">
              <p className="whitespace-pre-wrap text-white/80">{m.text}</p>
            </li>
          ) : (
            <ReplyCard key={m.id} m={m} onChoose={choose} onKept={onKept} />
          )))}
          <li ref={endRef} aria-hidden className="h-0" />
        </ol>
      )}

      {err && (
        <div role="alert" className="space-y-1 rounded-lg border border-mcz-ember/30 bg-mcz-ember/[0.06] p-3 text-[12px] text-white/80">
          <p>{err.text}</p>
          {err.kind === "payment" && (
            <p className="flex flex-wrap items-center gap-3 text-[11px]">
              {free && (
                <button type="button" className="re-link" onClick={() => { pick(free); setErr(null); }}>
                  Switch to {free.name} — free today
                </button>
              )}
              {/* The way to get more 🏷️ is a purchase, so it exists only outside a shell. */}
              {!IN_SHELL && err.buy && (
                <button type="button" className="re-link" onClick={() => goToSpot(err.buy.tab, err.buy.target)}>
                  Top up PromptZ
                </button>
              )}
            </p>
          )}
        </div>
      )}

      {state && (
        <div className="space-y-1.5">
          {!IN_SHELL && <SpeakingIn surface="occ" />}
          <textarea ref={box} className="neon-input !py-2 text-xs" rows={3}
                    aria-label="Message to OCC"
                    placeholder="Ask OCC anything — code, a lyric, a plan. Ctrl+Enter to send."
                    value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button type="button" className="neon-btn-primary !w-auto px-4" onClick={send} disabled={!canSend}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {" "}Send
            </button>
            {/* The price, beside the button, before it is pressed. */}
            {price.kind === "free" && <span className="text-[11px] text-emerald-300">{price.text}</span>}
            {(price.kind === "paid" || price.kind === "short") && (
              <span className="text-[11px] text-mcz-ember">{price.text}</span>
            )}
            {price.kind === "locked" && <span className="text-[11px] text-mcz-ember">{price.note}</span>}
            {/* The server's stated ceiling beside the clock: a wait with a stated
                end is one somebody sits through, and a bare count that only goes
                up cannot tell working from hung. */}
            <RunClock running={busy} budgetSeconds={Number(state?.chat_budget_seconds) || null}
                      what="Waiting for OCC" />
            {draft.length > limit * 0.8 && (
              <span className={`text-[10px] ${over ? "text-mcz-ember" : "text-white/35"}`}>
                {draft.length.toLocaleString()} / {limit.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-[10px] leading-relaxed text-white/40">
            {NOT_CHARGED_IF_FAILS}
            {price.note && price.kind !== "locked" ? ` ${price.note}` : ""}
          </p>
          {price.kind === "short" && (
            <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-white/55">
              {free && (
                <span>
                  <button type="button" className="re-link" onClick={() => pick(free)}>
                    Switch to {free.name}
                  </button>{" "}— it's free today.
                </span>
              )}
              {/* Topping up is a purchase, so the door exists only outside a
                  shell. Inside one the honest sentence is when the free ones
                  come back — there is nothing to buy there, and no price is
                  named that it cannot charge. */}
              {IN_SHELL ? (
                <span>Free prompts renew tomorrow.</span>
              ) : (
                <button type="button" className="re-link" onClick={() => goToSpot("membershipz", "promptz-door")}>
                  Top up PromptZ
                </button>
              )}
            </p>
          )}
          {over && (
            <p role="alert" className="text-[11px] text-mcz-ember">
              That message is {draft.length.toLocaleString()} characters — keep it under {limit.toLocaleString()}.
              Send the long part in pieces.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
