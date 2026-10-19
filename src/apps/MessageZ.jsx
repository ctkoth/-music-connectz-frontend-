import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, Zap } from "lucide-react";
import { api } from "../api.js";
import { ENERGY } from "../resources.js";
import { playSound } from "../sound.js";
import { loadLimits, useCharLimit } from "../limits.js";
import { editWindowLeft } from "../editing.js";
import CharLimit, { TierCharTable } from "../CharLimit.jsx";
import { IconImg } from "../App.jsx";
import { asList } from "../shape.js";
import { onHandoff } from "../handoff.js";
import MentionText from "../MentionParser.jsx";
import KarmaRewards from "../KarmaRewards.jsx";
import MemberName from "../MemberName.jsx";

export default function MessageZ() {
  const [data, setData] = useState(null);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const cl = useCharLimit();
  // Editing my own sent message: { id, draft }. The window is the server's
  // edit_unlock_sec from /api/economy/limits/ (the same edit_window_for the
  // message writer enforces). The messages GET does not carry it, so it is read
  // from there, and nothing is offered while it is unknown.
  const [editing, setEditing] = useState(null);
  const [editMsg, setEditMsg] = useState("");
  const [editWindow, setEditWindow] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    api("/api/economy/messages/").then(setData).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    loadLimits().then((d) => setEditWindow(d?.edit_unlock_sec ?? null)).catch(() => {});
    // Re-read the clock so the Edit control closes on its own, not on the next
    // reload. The server still refuses after the window; that refusal is shown.
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  async function saveEdit() {
    if (!editing) return;
    const text = editing.draft.trim();
    if (!text) return setEditMsg("A message can't be empty. Nothing was saved.");
    setEditMsg("");
    try {
      await api("/api/economy/messages/", { method: "POST", body: { edit_id: editing.id, body: text } });
      setEditing(null);
      setEditMsg("Message edited.");
      load();
    } catch (err) {
      // The server's own sentence, unreworded (edit_window_passed included).
      setEditMsg(err.message || "Couldn't edit that message.");
      if (/edit_window_passed/.test(err.message || "")) { setEditing(null); load(); }
    }
  }

  // A jump that arrives empty-handed is a tab switch wearing a handoff's
  // clothes. JournalZ sends "message the people on this entry" here, so the
  // recipient and the words are already in the form when it lands.
  useEffect(() => onHandoff("messagez", (p) => {
    const first = asList(p.people)[0];
    if (first) setTo(first);
    setBody([p.title, p.description].filter(Boolean).join("\n\n").slice(0, 4000));
  }), []);

  // The price for THIS recipient, asked on blur and before Send is pressed.
  const [quote, setQuote] = useState(null);
  function askPrice() {
    const t = to.trim();
    if (!t) return setQuote(null);
    api(`/api/economy/messages/?cost_for=${encodeURIComponent(t)}`).then(setQuote).catch(() => setQuote(null));
  }

  async function send(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/economy/messages/", { method: "POST", body: { to, body } });
      setMsg(r.cost_energy ? `Sent · −${r.cost_energy} ⚡ Energy` : "Sent · reply = free ⚡");
      playSound(r.cost_energy ? "energy_spend" : "message");
      setBody(""); setQuote(null); load();
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="messagez.png" alt="MessageZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-purple" style={{color:"#a855f7"}}>MessageZ</h2>
          <p className="text-sm text-white/60">
            {data?.dm_cost_energy
              ? <>Cold DMs cost {data.dm_cost_energy} <Zap size={12} className="inline text-mcz-gold" /> Energy — replies are always free.</>
              : <>Direct messages are free — say something worth their time.</>}
          </p>
        </div>
      </header>

      {/* Answering somebody who has never messaged you pays, and sending does
          not — which is exactly backwards from what anybody assumes, so it is
          said here rather than discovered. */}
      <KarmaRewards />

      <form onSubmit={send} className="neon-frame space-y-3 p-4" data-tour="messagez-compose">
        <input className="neon-input" placeholder="To (username)" value={to}
          onChange={(e) => { setTo(e.target.value); setQuote(null); }} onBlur={askPrice} required />
        {/* Enter sends, Shift+Enter breaks the line — what every messaging app
            does, so doing anything else here is the surprise. A textarea's
            default is the opposite, hence the handler.
            `isComposing` matters and is easy to miss: typing Japanese, Chinese
            or Korean, Enter CONFIRMS the character being composed. Sending on
            that would fire mid-word, every word, for those members only. */}
        <textarea className="neon-input" rows={2} placeholder="Say something worth their time…"
          value={body} maxLength={cl.unlimited ? undefined : cl.limit}
          onChange={(e) => setBody(cl.clamp(e.target.value))}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (!busy && to.trim() && body.trim()) send(e);
          }}
          required />
        <CharLimit cl={cl} value={body} />
        <TierCharTable current={cl.tier} />
        {msg && <p className="text-sm text-mcz-gold">{msg}</p>}
        <button className="neon-btn-primary" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Send
          {quote && (quote.cost_energy
            ? <span className="ml-2 text-mcz-ember">−{quote.cost_energy} {ENERGY}</span>
            : <span className="ml-2 text-emerald-300">Free</span>)}
        </button>
        {quote?.cost_energy > 0 && (
          <p className="text-xs text-white/50">
            First message to someone new. You have {quote.energy} {ENERGY}. Not sent means not charged.
          </p>
        )}
      </form>

      {!data ? (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <MsgList title="Inbox" rows={asList(data.inbox)} who="from" />
          <MsgList title="Sent" rows={asList(data.sent)} who="to"
                   editable={{ editing, setEditing, onSave: saveEdit, editMsg, editWindow, now, cl }} />
        </div>
      )}
    </div>
  );
}

function MsgList({ title, rows, who, editable }) {
  const ed = editable;
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">{title}</h3>
      <div className="neon-frame divide-y divide-white/5">
        {rows.length === 0 && <p className="p-4 text-sm text-white/45">Nothing yet.</p>}
        {rows.map((m) => {
          const left = ed && m.mine ? editWindowLeft(m.at, ed.editWindow, ed.now) : null;
          const canEdit = left != null && left > 0;
          const isEditing = ed?.editing?.id === m.id;
          return (
            <div key={m.id} className="px-4 py-3 text-sm">
              <p className="flex items-center gap-1 text-xs text-white/50">
                {who === "from" ? "From" : "To"}
                <MemberName username={who === "from" ? m.from : m.to} bare />
              </p>
              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <textarea className="neon-input" rows={2} aria-label="Edit your message"
                    value={ed.editing.draft}
                    maxLength={ed.cl.unlimited ? undefined : ed.cl.limit}
                    onChange={(e) => ed.setEditing({ ...ed.editing, draft: ed.cl.clamp(e.target.value) })} />
                  <div className="flex items-center gap-2 text-[11px]">
                    <button className="pill text-[11px]" onClick={ed.onSave}>Save changes · Free</button>
                    <button className="pill text-[11px]" onClick={() => ed.setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p><MentionText text={m.body} /></p>
              )}
              {m.edited_at && !isEditing && <p className="text-[10px] text-white/30">· edited</p>}
              {ed && m.mine && !isEditing && canEdit && (
                <button className="mt-1 text-[11px] text-white/40 hover:text-mcz-cyan"
                        onClick={() => ed.setEditing({ id: m.id, draft: m.body })}>
                  Edit · {left}s left
                </button>
              )}
            </div>
          );
        })}
        {ed?.editMsg && <p className="px-4 py-2 text-[11px] text-mcz-gold">{ed.editMsg}</p>}
      </div>
    </div>
  );
}
