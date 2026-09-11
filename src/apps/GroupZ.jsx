import { useCallback, useEffect, useState } from "react";
import { Loader2, UserMinus, UserPlus, Mail, Eye } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { asList } from "../shape.js";
import { goToTab } from "../goto.js";

const KINDS = [
  ["friends", "FriendZ", "groupz_friendz.png"],
  ["fans", "FanZ", "groupz_fanz.png"],
  ["partners", "Partners", "groupz.png"],
  ["custom", "Custom", "groupz_custom.png"],
  ["blocked", "Blocked", "groupz_blocked.png"],
];

export default function GroupZ({ onViewProfile, onMessage }) {
  const [groups, setGroups] = useState(null);
  const [tierLimit, setTierLimit] = useState(null);
  const [msg, setMsg] = useState("");
  const [names, setNames] = useState({});
  const [customTitle, setCustomTitle] = useState("");
  const [customIcon, setCustomIcon] = useState("");
  const [failed, setFailed] = useState(false);

  // A failed load has to STOP the spinner. Leaving `groups` at null on a
  // rejection left this tab spinning forever with the reason printed above it
  // — which reads as the app hanging rather than as a request that failed, and
  // is the state every member saw for as long as there was no backend here.
  const load = useCallback(() => {
    api("/api/groupz/")
      .then((d) => {
        setGroups(asList(d.groups || d));
        setTierLimit(d.tier_limit);
        setFailed(false);
      })
      .catch((e) => { setMsg(e.message); setGroups([]); setFailed(true); });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function ensure(kind, title = "", icon = "") {
    setMsg("");
    try {
      await api("/api/groupz/", { method: "POST", body: { kind, title, icon } });
      load();
    }
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
  asList(groups).forEach((g) => { (byKind[g.kind] ||= []).push(g); });

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
                  {rows.length === 0 && kind !== "custom" && !failed && (
                    <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs" onClick={() => ensure(kind)}>
                      Create
                    </button>
                  )}
                </div>
                {kind === "custom" && (
                  <div className="mb-3 space-y-2">
                    {tierLimit && (
                      <p className="text-xs text-white/60">
                        {tierLimit.current}/{tierLimit.limit} custom groups
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input className="neon-input !py-2" placeholder="New custom group name"
                             value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                      <input className="neon-input !py-2 w-20" placeholder="Icon (emoji)"
                             value={customIcon} onChange={(e) => setCustomIcon(e.target.value.slice(0, 10))}
                             maxLength="10" />
                      <button className="neon-btn-primary !w-auto px-4 py-2 text-xs"
                              onClick={() => {
                                if (customTitle.trim() && tierLimit && tierLimit.current < tierLimit.limit) {
                                  ensure("custom", customTitle.trim(), customIcon);
                                  setCustomTitle("");
                                  setCustomIcon("");
                                } else if (tierLimit && tierLimit.current >= tierLimit.limit) {
                                  setMsg(`You've reached your ${tierLimit.limit} custom group limit.`);
                                }
                              }}
                              disabled={tierLimit && tierLimit.current >= tierLimit.limit}>
                        Create
                      </button>
                    </div>
                  </div>
                )}
                {rows.map((g) => (
                  <div key={g.id} className="mb-2 rounded-xl bg-black/25 p-3">
                    {g.title && (
                      <p className="mb-1 text-sm font-medium flex items-center gap-2">
                        {g.icon && <span className="text-lg">{g.icon}</span>}
                        {g.title}
                      </p>
                    )}
                    <div className="mb-2 space-y-1">
                      {g.members.length === 0 && <span className="text-xs text-white/40">No members yet.</span>}
                      {g.members.map((m) => (
                        <div key={m} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
                          <span className="text-white/80">@{m}</span>
                          <div className="flex gap-1">
                            {onViewProfile && <button onClick={() => onViewProfile(m)} title="View profile" className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white transition"><Eye size={12} /></button>}
                            {onMessage && <button onClick={() => onMessage(m)} title="Message" className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white transition"><Mail size={12} /></button>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* FriendZ and FanZ are the follow graph, not a list you
                        edit — you don't add a fan, somebody decides to follow
                        you. An add box that always fails reads as the feature
                        being broken, so the row says what DOES change it and
                        offers the jump instead. The server decides which is
                        which; this never assumes by kind. */}
                    {g.can_add === false ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {g.note && <p className="text-xs text-white/45">{g.note}</p>}
                        {g.tab && g.tab !== "groupz" && (
                          <button className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs"
                                  onClick={() => goToTab(g.tab)}>
                            Open {g.tab} →
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {g.note && <p className="mb-2 text-xs text-white/45">{g.note}</p>}
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
                      </>
                    )}
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
