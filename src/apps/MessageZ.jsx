import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, Zap } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

export default function MessageZ() {
  const [data, setData] = useState(null);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api("/api/messagez/inbox/").then(setData).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function send(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const r = await api("/api/messagez/send/", { method: "POST", body: { to, body } });
      setMsg(r.cost_energy ? `Sent · −${r.cost_energy} ⚡ Energy` : "Sent · reply = free ⚡");
      setBody(""); load();
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="messagez.png" alt="MessageZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-purple" style={{color:"#a855f7"}}>MessageZ</h2>
          <p className="text-sm text-white/60">
            Cold DMs cost {data?.dm_cost_energy ?? 1} <Zap size={12} className="inline text-mcz-gold" /> Energy — replies are always free.
          </p>
        </div>
      </header>

      <form onSubmit={send} className="neon-frame space-y-3 p-4">
        <input className="neon-input" placeholder="To (username)" value={to} onChange={(e) => setTo(e.target.value)} required />
        <textarea className="neon-input" rows={2} placeholder="Say something worth their time…" value={body} onChange={(e) => setBody(e.target.value)} required />
        {msg && <p className="text-sm text-mcz-gold">{msg}</p>}
        <button className="neon-btn-primary" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Send
        </button>
      </form>

      {!data ? (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <MsgList title="Inbox" rows={data.inbox} who="from" />
          <MsgList title="Sent" rows={data.sent} who="to" />
        </div>
      )}
    </div>
  );
}

function MsgList({ title, rows, who }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/45">{title}</h3>
      <div className="neon-frame divide-y divide-white/5">
        {rows.length === 0 && <p className="p-4 text-sm text-white/45">Nothing yet.</p>}
        {rows.map((m) => (
          <div key={m.id} className="px-4 py-3 text-sm">
            <p className="text-xs text-white/50">{who === "from" ? `From ${m.from}` : `To ${m.to}`}</p>
            <p>{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
