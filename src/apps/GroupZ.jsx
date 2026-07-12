import { useCallback, useEffect, useState } from "react";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";

const KINDS = [
  ["friends", "FriendZ", "groupz_friendz.png"],
  ["fans", "FanZ", "groupz_fanz.png"],
  ["partners", "Partners", "groupz.png"],
  ["custom", "Custom", "groupz_custom.png"],
  ["blocked", "Blocked", "groupz_blocked.png"],
];

export default function GroupZ() {
  const [groups, setGroups] = useState(null);
  const [msg, setMsg] = useState("");
  const [names, setNames] = useState({});
  const [customTitle, setCustomTitle] = useState("");

  const load = useCallback(() => {
    api("/api/groupz/").then(setGroups).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function ensure(kind, title = "") {
    setMsg("");
    try { await api("/api/groupz/", { method: "POST", body: { kind, title } }); load(); }
    catch (e) { setMsg(e.message); }
  }
  async function member(id, action) {
    setMsg("");
    const username = (names[id] || "").trim();
    if (!username) return setMsg("Type a username first.");
    try {
      await api(`/api/groupz/${id}/${action}/`, { method: "POST", body: { username } });
      setNames({ ...names, [id]: "" }); load();
    } catch (e) { setMsg(e.message); }
  }

  const byKind = {};
  (groups || []).forEach((g) => { (byKind[g.kind] ||= []).push(g); });

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="groupz.png" alt="GroupZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#4ade80" }}>GroupZ</h2>
          <p className="text-sm text-white/60">
            FriendZ · FanZ · Partners · Custom · Blocked. Blocked members can never DM you.
          </p>
        </div>
      </header>
      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-pink">{msg}</p>}
      {!groups ? (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      ) : (
        <div className="space-y-4">
          {KINDS.map(([kind, label, icon]) => {
            const rows = byKind[kind] || [];
            return (
              <div key={kind} className="neon-frame p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-2 font-semibold">
                    <IconImg icon={icon} alt="" className="h-7 w-7 rounded-lg" /> {label}
                  </p>
                  {rows.length === 0 && kind !== "custom" && (
                    <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" onClick={() => ensure(kind)}>
                      Create
                    </button>
                  )}
                </div>
                {kind === "custom" && (
                  <div className="mb-3 flex gap-2">
                    <input className="neon-input !py-2" placeholder="New custom group name"
                           value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                    <button className="neon-btn-primary !w-auto px-4 py-2 text-xs"
                            onClick={() => { if (customTitle.trim()) { ensure("custom", customTitle.trim()); setCustomTitle(""); } }}>
                      Create
                    </button>
                  </div>
                )}
                {rows.map((g) => (
                  <div key={g.id} className="mb-2 rounded-xl bg-black/25 p-3">
                    {g.title && <p className="mb-1 text-sm font-medium">{g.title}</p>}
                    <div className="mb-2 flex flex-wrap gap-2">
                      {g.members.length === 0 && <span className="text-xs text-white/40">No members yet.</span>}
                      {g.members.map((m) => (
                        <span key={m} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">{m}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input className="neon-input !py-2 text-sm" placeholder="username"
                             value={names[g.id] || ""} onChange={(e) => setNames({ ...names, [g.id]: e.target.value })} />
                      <button className="neon-btn-primary !w-auto px-3 py-2 text-xs" onClick={() => member(g.id, "add")}>
                        <UserPlus size={14} />
                      </button>
                      <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs" onClick={() => member(g.id, "remove")}>
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
