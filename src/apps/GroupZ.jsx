// GroupZ 👥 — FriendZ, FanZ, Partners, Custom and Blocked.
//
// The blueprint: "editable groups LOCAL TO THE USER making the groups". Local
// is the whole design — a group is a note you made about somebody, not a
// relationship you are both in. Nobody is told they were added and nobody can
// see which of your lists they are on, so there is no invite and nothing to
// accept anywhere on this screen.
//
// Three of the five are NOT stored by GroupZ and the screen says so, because a
// list you cannot edit needs to explain itself or it reads as broken:
//
//   * FriendZ and FanZ come from who follows whom.
//   * Blocked IS the platform block — the same one MessageZ, BattleZ and
//     PlaylietZ enforce. That is the one that had to be real: a tab saying
//     "blocked" while the blocked person keeps messaging you is worse than no
//     tab at all.
//
// So `derived` groups get their explanation printed and no Delete. FanZ gets
// no add box at all: being a fan is somebody else's act, and a member who can
// type their own fan list has a follower count that means nothing.
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Eye, Trash2, UserMinus, UserPlus } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { asList } from "../shape.js";

// The art that is actually in the repo. Pointing FriendZ and FanZ at Corey's
// uncommitted friendz.jpg / fanz.jpg REGRESSED them — both had real art under
// the groupz_* names and started rendering the MCZ logo instead, silently,
// which is the soundcloudengagementz.png trap exactly. `partnerz.jpg` used to
// have no art at all and sat on a neon placeholder; it has real art now too,
// committed under the same key so nothing else here had to change.
const KIND = {
  friends: { label: "FriendZ", icon: "groupz_friendz.png" },
  fans: { label: "FanZ", icon: "groupz_fanz.png" },
  partners: { label: "PartnerZ", icon: "partnerz.jpg" },
  custom: { label: "Custom", icon: "groupz_custom.png" },
  blocked: { label: "Blocked", icon: "groupz_blocked.png" },
};
const ORDER = ["friends", "fans", "partners", "custom", "blocked"];

export default function GroupZ({ onViewProfile, onMessage }) {
  const [groups, setGroups] = useState(null);
  const [msg, setMsg] = useState("");
  const [names, setNames] = useState({});
  const [customTitle, setCustomTitle] = useState("");

  const load = useCallback(() => {
    api("/api/groupz/").then((d) => setGroups(asList(d))).catch((e) => setMsg(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(kind, title = "") {
    setMsg("");
    try { setGroups(asList(await api("/api/groupz/", { method: "POST", body: { kind, title } }))); }
    catch (e) { setMsg(e.message); }
  }

  async function change(id, action) {
    setMsg("");
    const username = (names[id] || "").trim();
    if (!username) return setMsg("Type a username first.");
    try {
      const out = await api(`/api/groupz/${id}/${action}/`, { method: "POST", body: { username } });
      // The SERVER'S sentence. Following somebody is not the same as being
      // friends with them, and only the server knows which one just happened.
      if (out?.detail) setMsg(out.detail);
      if (out?.groups) setGroups(asList(out.groups));
      else load();
      setNames({ ...names, [id]: "" });
    } catch (e) { setMsg(e.message); }
  }

  async function drop(g) {
    if (!window.confirm(`Delete "${g.title || KIND[g.kind]?.label}"? The members stay members of the platform — this only removes your list.`)) return;
    try { setGroups(asList(await api(`/api/groupz/${g.id}/`, { method: "DELETE" }))); }
    catch (e) { setMsg(e.message); }
  }

  const rows = asList(groups);
  const byKind = {};
  rows.forEach((g) => { (byKind[g.kind] ||= []).push(g); });

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <IconImg icon="groupz.png" alt="GroupZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold" style={{ color: "#4ade80" }}>GroupZ</h2>
          <p className="text-sm text-white/60">
            Your own lists, private to you. Nobody is told they were added.
          </p>
        </div>
      </header>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/80">{msg}</p>}

      {!groups ? (
        <p className="flex items-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </p>
      ) : (
        <div className="space-y-4">
          {ORDER.map((kind) => {
            const list = byKind[kind] || [];
            const meta = KIND[kind] || { label: kind, icon: "groupz.png" };
            return (
              <section key={kind} className="neon-frame p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-semibold">
                    <IconImg icon={meta.icon} alt="" className="h-7 w-7 rounded-lg" /> {meta.label}
                  </p>
                </div>

                {kind === "custom" && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    <input className="neon-input !py-2 min-w-0 flex-1" placeholder="New custom group name"
                           value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                    <button className="neon-btn-primary !w-auto px-4 py-2 text-xs"
                            onClick={() => { if (customTitle.trim()) { create("custom", customTitle.trim()); setCustomTitle(""); } }}>
                      Create
                    </button>
                  </div>
                )}

                {list.length === 0 && kind !== "custom" && (
                  <p className="text-xs text-white/40">Nothing here yet.</p>
                )}

                {list.map((g) => (
                  <div key={g.id} className="mb-2 rounded-xl bg-black/25 p-3">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {g.title && <p className="text-sm font-medium">{g.title}</p>}
                        {/* Why this list is not editable, from the server. A
                            list you cannot change needs to explain itself or
                            it reads as a broken one. */}
                        {g.note && <p className="text-[11px] text-white/40">{g.note}</p>}
                      </div>
                      {!g.derived && (
                        <button onClick={() => drop(g)} title="Delete this list"
                                className="shrink-0 rounded p-1 text-white/30 hover:bg-white/10 hover:text-mcz-ember">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="mb-2 space-y-1">
                      {asList(g.members).length === 0 && (
                        <span className="text-xs text-white/40">No members yet.</span>
                      )}
                      {asList(g.members).map((m) => (
                        <div key={m} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
                          <span className="truncate text-white/80">@{m}</span>
                          <div className="flex shrink-0 gap-1">
                            {onViewProfile && (
                              <button onClick={() => onViewProfile(m)} title="View profile"
                                      className="rounded p-1 text-white/50 transition hover:bg-white/10 hover:text-white">
                                <Eye size={12} />
                              </button>
                            )}
                            {/* No Message button on Blocked. Offering to DM
                                somebody you just blocked is the screen
                                contradicting itself. */}
                            {onMessage && g.kind !== "blocked" && (
                              <button onClick={() => onMessage(m)} title="Message"
                                      className="rounded p-1 text-white/50 transition hover:bg-white/10 hover:text-white">
                                <Mail size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* FanZ and PartnerZ have no box. Neither is a refusal the
                        member discovers by being told off — the control simply
                        isn't there, and the note above says what puts somebody
                        on the list. FanZ is somebody else's act; PartnerZ is
                        three finished collabs, which is two people's. */}
                    {g.kind !== "fans" && g.kind !== "partners" && (
                      <div className="flex flex-wrap gap-2">
                        <input className="neon-input !py-2 min-w-0 flex-1 text-sm"
                               placeholder={g.kind === "blocked" ? "username to block"
                                          : g.kind === "friends" ? "username to follow" : "username"}
                               value={names[g.id] || ""}
                               onChange={(e) => setNames({ ...names, [g.id]: e.target.value })}
                               onKeyDown={(e) => e.key === "Enter" && change(g.id, "add")} />
                        <button className="neon-btn-primary !w-auto px-3 py-2 text-xs"
                                title={g.kind === "blocked" ? "Block" : "Add"}
                                onClick={() => change(g.id, "add")}>
                          <UserPlus size={14} />
                        </button>
                        <button className="neon-btn-ghost !w-auto px-3 py-2 text-xs"
                                title={g.kind === "blocked" ? "Unblock" : "Remove"}
                                onClick={() => change(g.id, "remove")}>
                          <UserMinus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
