import { useCallback, useEffect, useState } from "react";
import { Loader2, Star, Swords, Timer } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

function MoneyPoll() {
  const [poll, setPoll] = useState(null);
  const load = () => api("/api/battlez/moneyvote/").then(setPoll).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!poll) return null;
  return (
    <div className="neon-frame flex flex-wrap items-center justify-between gap-2 p-4">
      <p className="text-sm text-white/70">
        💵 <b>Real-money battles?</b> We build it when YOU want it — {poll.votes} vote{poll.votes === 1 ? "" : "s"} so far.
      </p>
      <button
        className={`neon-btn-${poll.my_vote ? "primary" : "ghost"} !w-auto px-4 py-2 text-xs`}
        onClick={async () => setPoll(await api("/api/battlez/moneyvote/", { method: "POST", body: {} }))}
      >
        {poll.my_vote ? "You voted YES ✓ (tap to undo)" : "Vote YES"}
      </button>
    </div>
  );
}

export default function BattleZ() {
  const { user } = useAuth();
  const [battles, setBattles] = useState(null);
  const [form, setForm] = useState({ opponent: "", kind: "1v1", title: "" });
  const [msg, setMsg] = useState("");
  const [wager, setWager] = useState({});

  const load = useCallback(() => {
    api("/api/battlez/").then(setBattles).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id, action, body = {}) {
    setMsg("");
    try { await api(`/api/battlez/${id}/${action}/`, { method: "POST", body }); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function challenge() {
    setMsg("");
    try { await api("/api/battlez/", { method: "POST", body: form }); setForm({ ...form, opponent: "", title: "" }); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function placeWager(b) {
    const w = wager[b.id] || {};
    if (!w.side || !w.amount) return setMsg("Pick a side and a SpinaZ amount.");
    await act(b.id, "wager", { side: w.side, amount: Number(w.amount) });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="battlez.png" alt="BattleZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#ef4444" }}>BattleZ</h2>
          <p className="text-sm text-white/60">
            Post vs post. The community rates each contestant /10 — 3+ ratings to qualify, highest average wins when the window closes. Spectators wager ✦SpinaZ.
          </p>
          <span className="pill mt-1 inline-block">SpinaZ edition · money battles coming after legal clearance</span>
        </div>
      </header>

      <MoneyPoll />

      <div className="neon-frame space-y-3 p-4">
        <h3 className="font-semibold">Throw down a challenge</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="neon-input" placeholder="Opponent username" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} />
          <select className="neon-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="1v1">1v1 ⚔️</option><option value="freestyle">Freestyle 🎤</option><option value="cypher">Battle Cypher 🔥</option>
          </select>
          <input className="neon-input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        {msg && <p className="text-sm text-mcz-pink">{msg}</p>}
        <button className="neon-btn-primary !w-auto px-5" onClick={challenge}><Swords size={16} /> Challenge</button>
      </div>

      {!battles ? (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      ) : battles.map((b) => {
        const mine = user && (b.challenger === user.username || b.opponent === user.username);
        const iAmOpponent = user && b.opponent === user.username;
        return (
          <div key={b.id} className="neon-frame space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{b.title} <span className="text-xs text-white/40">· {b.kind}</span></p>
                <p className="text-sm">
                  <span className={b.winner === b.challenger ? "text-mcz-gold" : ""}>{b.challenger}</span>
                  <span className="text-white/40"> vs </span>
                  <span className={b.winner === b.opponent ? "text-mcz-gold" : ""}>{b.opponent}</span>
                </p>
              </div>
              <span className="pill uppercase">{b.status}{b.winner ? ` · 👑 ${b.winner}` : ""}</span>
            </div>
            <p className="text-xs text-white/50">
              Ratings — {b.challenger}: {b.ratings.challenger.avg ?? "—"} ({b.ratings.challenger.n}/{b.min_ratings})
              · {b.opponent}: {b.ratings.opponent.avg ?? "—"} ({b.ratings.opponent.n}/{b.min_ratings})
              &nbsp;|&nbsp; ✦Pools — {b.spinaz_pools.challenger} vs {b.spinaz_pools.opponent}
              {b.status === "active" && b.ends_at && (
                <> &nbsp;|&nbsp; <Timer size={11} className="inline" /> closes {new Date(b.ends_at).toLocaleString()}</>
              )}
            </p>

            {b.status === "pending" && iAmOpponent && (
              <div className="flex gap-2">
                <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={() => act(b.id, "accept")}>Accept</button>
                <button className="neon-btn-ghost !w-auto px-4 py-2 text-xs" onClick={() => act(b.id, "decline")}>Decline</button>
              </div>
            )}
            {b.status === "active" && mine && (
              <div className="flex flex-wrap gap-2">
                <input className="neon-input !w-52 !py-2 text-xs" placeholder="Your take (media ref/link)"
                       onKeyDown={(e) => e.key === "Enter" && act(b.id, "submit", { ref: e.target.value })} />
                <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={() => act(b.id, "settle")}>Settle (after window)</button>
              </div>
            )}
            {b.status === "active" && !mine && (
              <div className="flex flex-wrap items-center gap-2">
                {["challenger", "opponent"].map((side) => (
                  <span key={side} className="flex items-center gap-1 text-xs">
                    <span className="text-white/50">{side === "challenger" ? b.challenger : b.opponent}:</span>
                    <select
                      className="neon-input !w-auto !py-1.5 text-xs"
                      value={b.my_ratings?.[side] ?? ""}
                      onChange={(e) => act(b.id, "rate", { side, score: Number(e.target.value) })}
                    >
                      <option value="" disabled>rate /10</option>
                      {[...Array(11).keys()].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </span>
                ))}
                <select className="neon-input !w-auto !py-2 text-xs" value={wager[b.id]?.side || ""}
                        onChange={(e) => setWager({ ...wager, [b.id]: { ...wager[b.id], side: e.target.value } })}>
                  <option value="">Wager side…</option>
                  <option value="challenger">{b.challenger}</option>
                  <option value="opponent">{b.opponent}</option>
                </select>
                <input className="neon-input !w-20 !py-2 text-xs" placeholder="✦" inputMode="numeric"
                       value={wager[b.id]?.amount || ""} onChange={(e) => setWager({ ...wager, [b.id]: { ...wager[b.id], amount: e.target.value } })} />
                <button className="neon-btn-primary !w-auto px-3 py-2 text-xs" onClick={() => placeWager(b)}>
                  <Star size={12} /> Wager
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
