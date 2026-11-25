import { useEffect, useState } from "react";
import { Loader2, LifeBuoy } from "lucide-react";
import { api } from "../api.js";

// Contact support — a private, free way to ask the owner for help, inside the app.
//
// It decides nothing: the note (who can read it, no passwords or card numbers), the daily limit and
// every refusal are the server's, shown unreworded. A failed send says so and that nothing was sent.
// The owner (the server says `is_owner`) also gets the queue and a reply box here, so there is one
// component for both ends and they cannot disagree about what a ticket is.

const MAX = 2000;
const STATUS = { open: "Waiting for a reply", answered: "Answered", closed: "Closed" };

function Thread({ t, onReply, label = "Reply", ownerView = false }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send(close = false) {
    setBusy(true); setErr("");
    try { await onReply(t.id, text, close); setText(""); }
    catch (e) { setErr(e.message || "That didn't send — nothing was changed."); }
    finally { setBusy(false); }
  }
  return (
    <li className="space-y-2 rounded-lg bg-white/5 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 text-sm font-semibold">{t.subject}{ownerView && t.username ? <span className="text-white/45"> · @{t.username}</span> : null}</p>
        <span className="text-[11px] text-white/45">{STATUS[t.status] || t.status}</span>
      </div>
      <ul className="space-y-1.5">
        {t.messages.map((m) => (
          <li key={m.id} className={`rounded px-2 py-1 text-xs ${m.from_owner ? "bg-emerald-400/10 text-emerald-100" : "bg-black/30 text-white/80"}`}>
            <span className="block text-[10px] uppercase tracking-wide text-white/40">{m.from_owner ? "Support" : ownerView ? "Member" : "You"} · {new Date(m.at).toLocaleString()}</span>
            <span className="whitespace-pre-wrap">{m.body}</span>
          </li>
        ))}
      </ul>
      {(ownerView || t.status !== "closed") && (
        <div className="space-y-1">
          <textarea className="neon-input w-full !py-2 text-xs" rows={2} maxLength={MAX} placeholder={ownerView ? "Reply to the member…" : "Add to this request…"}
                    value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <button className="neon-btn !w-auto px-3 py-1 text-xs disabled:opacity-40" disabled={busy || !text.trim()} onClick={() => send(false)}>
              {busy ? <Loader2 className="animate-spin" size={12} /> : label}
            </button>
            {ownerView && (
              <button className="text-xs text-white/55 underline" disabled={busy} onClick={() => send(true)}>
                {text.trim() ? "Send and close" : "Close without a reply"}
              </button>
            )}
          </div>
          {err && <p className="text-[11px] text-mcz-ember">{err}</p>}
        </div>
      )}
    </li>
  );
}

export default function SupportInbox() {
  const [data, setData] = useState(null);
  const [queue, setQueue] = useState(null);
  const [f, setF] = useState({ subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => api("/api/economy/support/").then((d) => {
    setData(d);
    if (d.is_owner) api("/api/economy/support/queue/").then(setQueue).catch(() => setQueue(null));
  }).catch(() => setData(null));
  useEffect(() => { load(); }, []);
  if (!data) return null;       // a failed load renders nothing: the form is still reachable by trying again later

  async function open(e) {
    e.preventDefault(); setBusy(true); setErr(""); setMsg("");
    try {
      await api("/api/economy/support/", { method: "POST", body: f });
      setF({ subject: "", message: "" }); setMsg("Sent. You'll get a notification when there's a reply."); load();
    } catch (x) { setErr(x.message || "That didn't send — nothing was sent."); }
    finally { setBusy(false); }
  }
  const reply = async (id, message) => { await api(`/api/economy/support/${id}/reply/`, { method: "POST", body: { message } }); load(); };
  const answer = async (id, message, close) => { await api(`/api/economy/support/${id}/answer/`, { method: "POST", body: { message, close } }); load(); };

  return (
    <div className="re-card space-y-3" data-tour="support-inbox">
      <span className="re-label flex items-center gap-2"><LifeBuoy size={14} className="text-mcz-cyan" /> Contact support</span>
      <p className="text-xs text-white/60">{data.note}</p>
      <form onSubmit={open} className="space-y-2">
        <input className="neon-input w-full !py-2 text-sm" placeholder="What's it about?" maxLength={120} value={f.subject}
               onChange={(e) => setF({ ...f, subject: e.target.value })} />
        <textarea className="neon-input w-full !py-2 text-sm" rows={4} maxLength={MAX} placeholder="Tell us what happened, in your own words."
                  value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
        <div className="flex items-center gap-3">
          <button className="neon-btn-primary !w-auto px-4 py-2 text-sm disabled:opacity-40" disabled={busy || !f.subject.trim() || !f.message.trim()}>
            {busy ? <Loader2 className="animate-spin" size={14} /> : "Send"}
          </button>
          <span className="text-[11px] text-white/40">Free · up to {data.per_day} new requests a day · {f.message.length}/{MAX}</span>
        </div>
        {msg && <p className="text-[11px] text-emerald-300">{msg}</p>}
        {err && <p className="text-[11px] text-mcz-ember">{err}</p>}
      </form>
      {data.tickets.length > 0 && (
        <ul className="space-y-2">{data.tickets.map((t) => <Thread key={t.id} t={t} onReply={reply} />)}</ul>
      )}
      {data.is_owner && queue && (
        <div className="space-y-2 border-t border-white/10 pt-3" data-tour="support-queue">
          <span className="re-label">Support queue — owner only ({queue.tickets.length})</span>
          {queue.tickets.length === 0 ? <p className="text-xs text-white/45">Nothing waiting.</p> : (
            <ul className="space-y-2">{queue.tickets.map((t) => <Thread key={t.id} t={t} onReply={answer} label="Reply" ownerView />)}</ul>
          )}
        </div>
      )}
    </div>
  );
}
