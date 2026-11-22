// TeemZ — who works for a label. A roster and a title: it grants no access to contracts, terms or advances. The
// roles, who may be invited (adults) and every refusal are the server's.
import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { openMember } from "../goto.js";

/** Owner's panel for one label: invite and remove. */
export function TeamOwner({ labelId, roles, onChange }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ username: "", role: "" });
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api(`/api/economy/labelz/${labelId}/team/`).then((r) => setRows(r.team || [])).catch(() => {}), [labelId]);
  useEffect(() => { load(); }, [load]);
  const invite = async () => {
    setMsg("");
    try { await api(`/api/economy/labelz/${labelId}/team/`, { method: "POST", body: form }); setForm({ username: "", role: form.role }); load(); onChange?.(); }
    catch (e) { setMsg(e.message); }
  };
  const remove = async (id) => { try { await api(`/api/economy/labelz/team/${id}/`, { method: "DELETE" }); load(); onChange?.(); } catch (e) { setMsg(e.message); } };
  return (
    <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2 text-xs">
      <p className="font-semibold text-violet-200">🤝 TeemZ</p>
      {rows.map((m) => (
        <p key={m.id} className="flex flex-wrap items-center gap-2 text-white/75">
          <button className="hover:underline" onClick={() => openMember(m.username)}>{m.username}</button> · {m.role_label}
          <span className="pill text-[10px]">{m.status}</span>
          <button className="text-white/50 underline" onClick={() => remove(m.id)}>Remove</button>
        </p>
      ))}
      <div className="flex flex-wrap gap-2">
        <input aria-label="Username to invite" className="neon-input !w-36 !py-1.5" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <select data-nomemo="true" aria-label="Role" className="neon-input !w-32 !py-1.5" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="">Role…</option>{(roles || []).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <button className="neon-btn-primary !w-auto px-3 py-1.5" disabled={!form.username || !form.role} onClick={invite}>Invite</button>
      </div>
      <p className="text-white/50">Free. Adults only. A team role gives no access to contracts or advances.</p>
      {msg && <p className="text-mcz-gold">{msg}</p>}
    </div>
  );
}

/** Invitations to you, and teams you are on. Renders nothing when there are none. */
export function TeamMine({ onChange }) {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => api("/api/economy/labelz/team/mine/").then((r) => setRows(r.mine || [])).catch(() => setRows([])), []);
  useEffect(() => { load(); }, [load]);
  const go = async (id, how) => {
    setMsg("");
    try {
      if (how === "leave") await api(`/api/economy/labelz/team/${id}/`, { method: "DELETE" });
      else await api(`/api/economy/labelz/team/${id}/${how}/`, { method: "POST", body: {} });
      load(); onChange?.();
    } catch (e) { setMsg(e.message); }
  };
  if (!rows.length) return null;
  return (
    <div className="neon-frame space-y-2 p-4">
      <h3 className="font-semibold">🤝 Your teams</h3>
      {rows.map((m) => (
        <p key={m.id} className="flex flex-wrap items-center gap-2 text-sm text-white/80">
          {m.label} · {m.role_label}
          {m.status === "invited" ? (<>
            <button className="neon-btn-primary !w-auto px-3 py-1 text-xs" onClick={() => go(m.id, "accept")}>Accept</button>
            <button className="neon-btn-ghost !w-auto px-3 py-1 text-xs" onClick={() => go(m.id, "decline")}>Decline</button>
          </>) : <button className="text-xs text-white/50 underline" onClick={() => go(m.id, "leave")}>Leave</button>}
        </p>
      ))}
      {msg && <p className="text-xs text-mcz-gold">{msg}</p>}
    </div>
  );
}
