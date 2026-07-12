import { useCallback, useEffect, useState } from "react";
import { Bug, Loader2, Star } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

const STATUS_STYLE = {
  open: "!text-mcz-cyan", in_progress: "!text-mcz-gold", squashed: "!text-emerald-300",
};

export default function BugZ() {
  const [bugs, setBugs] = useState(null);
  const [form, setForm] = useState({ title: "", body: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api("/api/bugz/").then(setBugs).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      await api("/api/bugz/", { method: "POST", body: form });
      setForm({ title: "", body: "" });
      setMsg("Reported! If the team squashes it, you earn ✦200 SpinaZ.");
      load();
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="bugz.png" alt="BugZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#22e6ff" }}>BugZ</h2>
          <p className="text-sm text-white/60">
            Find a bug, report it. <Star size={12} className="inline text-mcz-pink" /> Squashed = 200 SpinaZ to the reporter.
          </p>
        </div>
      </header>

      <form onSubmit={submit} className="neon-frame space-y-3 p-4">
        <input className="neon-input" placeholder="What broke? (title)" value={form.title}
               onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="neon-input" rows={3} placeholder="Steps to reproduce, what you expected, what happened…"
                  value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        {msg && <p className="text-sm text-mcz-gold">{msg}</p>}
        <button className="neon-btn-primary" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Bug size={16} />} Report bug
        </button>
      </form>

      {!bugs ? (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      ) : (
        <div className="neon-frame divide-y divide-white/5">
          {bugs.length === 0 && <p className="p-4 text-sm text-white/45">No reports yet — the app is either perfect or unexplored. 😄</p>}
          {bugs.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{b.title}</p>
                {b.body && <p className="text-xs text-white/50">{b.body}</p>}
                <p className="mt-1 text-[11px] text-white/35">by {b.reporter}</p>
              </div>
              <span className={`pill whitespace-nowrap ${STATUS_STYLE[b.status] || ""}`}>{b.status.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
