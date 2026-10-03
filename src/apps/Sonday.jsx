import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Globe, Loader2, Lock, Plus, Trash2, UserPlus, X } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import CharLimit from "../CharLimit.jsx";
import { useCharLimit } from "../limits.js";
import MemberName from "../MemberName.jsx";
import { goToSpot } from "../goto.js";

// Sonday — boards for the work in flight. Columns, cards, and who may touch them.
//
// The backend (sonday.py) existed with no screen, and with card endpoints any
// member could edit by id; that was fixed server-side first. This screen
// decides nothing about access — it renders `my_role` and hides the controls
// a viewer can't use, and the server refuses them either way.
//
// What it says up front:
//   * how many boards your tier keeps, BEFORE "New board" (Free: 1);
//   * who can see a board — private, shared, or public — on the board itself;
//   * where a card goes: a linked card is a button, never just a label.

const BASE = "/api/economy/sonday/";
const SWATCH = {
  red: "bg-red-500", orange: "bg-orange-500", yellow: "bg-yellow-400", green: "bg-emerald-400",
  cyan: "bg-cyan-400", blue: "bg-blue-500", purple: "bg-purple-500", pink: "bg-pink-500",
};
// Where a card can open. A tab plus its data-tour anchor, so the jump lands on
// the control, not the top of the app.
const DESTS = [
  ["postz", "composer", "PostZ — write a post"],
  ["collabz", "collabz-deals", "CollabZ — your deals"],
  ["battlez", "", "BattleZ"],
  ["distributez", "distributez-releases", "DistributeZ — releases"],
  ["singz", "", "SingZ coach"],
  ["rapz", "", "RapZ coach"],
  ["directz", "", "DirectZ"],
  ["journalz", "", "JournalZ"],
];

function openCard(o) {
  if (!o) return;
  if (o.url) window.location.assign(o.url);
  else goToSpot(o.tab, o.target || undefined);
}

function QuotaLine({ q }) {
  if (!q) return null;
  if (q.left == null) return <span className="text-emerald-300">Unlimited boards on your tier.</span>;
  return (
    <span>
      <span className={q.left ? "text-emerald-300" : "text-mcz-ember"}>{q.used} of {q.per_tier}</span> board
      {q.per_tier === 1 ? "" : "s"} used on Free.{" "}
      <button className="re-link" onClick={() => goToSpot("membershipz", "membershipz-plans")}>Premium keeps as many as you like</button>
    </span>
  );
}

function CardEditor({ card, columns, canEdit, onClose, onSaved }) {
  const cl = useCharLimit();
  const destOf = () => {
    if (card.linked_target?.startsWith("/")) return "url";
    return card.linked_app_key || "";
  };
  const [f, setF] = useState({
    title: card.title, description: card.description || "", color: card.color || "",
    due_date: card.due_date || "", dest: destOf(), url: card.linked_target?.startsWith("/") ? card.linked_target : "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true); setErr("");
    const d = DESTS.find(([k]) => k === f.dest);
    const link = f.dest === "url" ? { linked_app_key: "", linked_target: f.url.trim() }
      : d ? { linked_app_key: d[0], linked_target: d[1] } : { linked_app_key: "", linked_target: "" };
    try {
      await api(`${BASE}cards/${card.id}/`, { method: "PATCH", body: {
        title: f.title, description: f.description, color: f.color, due_date: f.due_date || null, ...link } });
      onSaved();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function drop() {
    setBusy(true); setErr("");
    try { await api(`${BASE}cards/${card.id}/`, { method: "DELETE" }); onSaved(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  const col = columns.find((c) => c.id === card.column);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={onClose}>
      <div className="neon-frame max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto bg-mcz-bg p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/50">{col?.label || "No column"}{card.created_by_display ? ` · added by @${card.created_by_display}` : ""}</p>
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <input className="neon-input w-full font-semibold" value={f.title} disabled={!canEdit} maxLength={500}
          onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="neon-input min-h-24 w-full text-sm" value={f.description} disabled={!canEdit}
          placeholder="Notes, lyrics, what's left to do…"
          maxLength={cl.unlimited ? undefined : cl.limit}
          onChange={(e) => setF({ ...f, description: cl.clamp(e.target.value) })} />
        {canEdit && <CharLimit cl={cl} value={f.description} />}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-[11px] text-white/50">Due
            <input type="date" className="neon-input !py-1.5 text-sm" value={f.due_date} disabled={!canEdit}
              onChange={(e) => setF({ ...f, due_date: e.target.value })} />
          </label>
          <div className="text-[11px] text-white/50">Colour
            <div className="mt-1 flex flex-wrap gap-1">
              <button disabled={!canEdit} onClick={() => setF({ ...f, color: "" })}
                className={`h-6 w-6 rounded-full border ${!f.color ? "border-white" : "border-white/20"}`} aria-label="No colour" />
              {Object.entries(SWATCH).map(([k, cls]) => (
                <button key={k} disabled={!canEdit} onClick={() => setF({ ...f, color: k })} aria-label={k}
                  className={`h-6 w-6 rounded-full ${cls} ${f.color === k ? "ring-2 ring-white" : ""}`} />
              ))}
            </div>
          </div>
        </div>
        <label className="block text-[11px] text-white/50">Opens
          <select className="neon-input !py-1.5 text-sm" value={f.dest} disabled={!canEdit}
            onChange={(e) => setF({ ...f, dest: e.target.value })}>
            <option value="">Nothing — just a note</option>
            <option value="url">A post or page link (/p/…)</option>
            {DESTS.map(([k, , label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        {f.dest === "url" && (
          <input className="neon-input w-full text-sm" placeholder="/p/123" value={f.url} disabled={!canEdit}
            onChange={(e) => setF({ ...f, url: e.target.value })} />
        )}
        {card.open_in && (
          <button className="re-link text-xs" onClick={() => openCard(card.open_in)}>
            Open it <ExternalLink size={10} className="inline" />
          </button>
        )}
        {card.activities?.length > 0 && (
          <ul className="space-y-0.5 border-t border-white/10 pt-2 text-[11px] text-white/45">
            {card.activities.map((a) => (
              <li key={a.id}>
                @{a.user_display || "someone"} {a.action}
                {a.action === "moved" ? ` ${a.from_column || "—"} → ${a.to_column}` : ""}
                {" · "}{new Date(a.created_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
        {err && <p className="text-xs text-mcz-ember">{err}</p>}
        {canEdit && (
          <div className="flex justify-between gap-2">
            <button className="re-btn !w-auto px-3 py-1.5 text-xs text-mcz-ember" disabled={busy} onClick={drop}>
              <Trash2 size={12} className="inline" /> Delete card
            </button>
            <button className="neon-btn-primary !w-auto px-4 py-1.5 text-xs" disabled={busy || !f.title.trim()} onClick={save}>
              {busy ? <Loader2 className="animate-spin" size={12} /> : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Members({ board }) {
  const [perms, setPerms] = useState(null);
  const [who, setWho] = useState("");
  const [role, setRole] = useState("editor");
  const [err, setErr] = useState("");
  const load = () => api(`${BASE}${board.id}/permissions/`).then(setPerms).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [board.id]);

  async function invite(e) {
    e.preventDefault(); setErr("");
    try { await api(`${BASE}${board.id}/invite_user/`, { method: "POST", body: { username: who.trim(), role } }); setWho(""); load(); }
    catch (e2) { setErr(e2.message); }
  }
  async function remove(p) {
    try { await api(`${BASE}${board.id}/members/${p.user}/`, { method: "DELETE" }); load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
      <p className="font-semibold">Who's on this board</p>
      <ul className="space-y-1">
        <li className="flex justify-between"><span>@{board.user_display}</span><span className="text-white/45">owner</span></li>
        {(perms || []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2">
            <MemberName username={p.user_display} bare />
            <span className="flex items-center gap-2 text-white/45">{p.role}
              <button onClick={() => remove(p)} aria-label={`Remove ${p.user_display}`}><X size={12} /></button>
            </span>
          </li>
        ))}
      </ul>
      <form className="flex flex-wrap items-center gap-1" onSubmit={invite}>
        <input className="neon-input !w-36 !py-1 text-xs" placeholder="@member" value={who} onChange={(e) => setWho(e.target.value)} />
        <select className="neon-input !w-auto !py-1 text-xs" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="editor">can edit</option>
          <option value="viewer">can view</option>
        </select>
        <button className="re-btn !w-auto px-2 py-1 text-xs" disabled={!who.trim()} type="submit"><UserPlus size={12} className="inline" /> Add</button>
      </form>
      <p className="text-white/40">They get a notification. Editors move and edit cards; viewers only look.</p>
      {err && <p className="text-mcz-ember">{err}</p>}
    </div>
  );
}

function Board({ id, onBack, onGone }) {
  const [b, setB] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState({});
  const [newCol, setNewCol] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [drag, setDrag] = useState(null);

  const load = () => api(`${BASE}${id}/`).then((d) => { setB(d); setErr(""); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  const run = async (fn) => { setErr(""); try { await fn(); await load(); } catch (e) { setErr(e.message); } };
  if (!b) return err ? <p className="text-sm text-mcz-ember">{err}</p> : <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading board…</p>;

  const canEdit = b.my_role === "owner" || b.my_role === "editor";
  const owner = b.my_role === "owner";
  const cols = [...b.columns].sort((x, y) => x.position - y.position);
  const cardsIn = (cid) => b.cards.filter((c) => c.column === cid).sort((x, y) => x.position - y.position);
  const move = (card, col) => run(() => api(`${BASE}cards/${card.id}/move/`, { method: "POST", body: { column_id: col.id } }));
  const addCard = (col) => {
    const title = (adding[col.id] || "").trim();
    if (!title) return;
    setAdding({ ...adding, [col.id]: "" });
    run(() => api(`${BASE}cards/`, { method: "POST", body: { board_id: b.id, column_id: col.id, title } }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <button className="re-link text-xs" onClick={onBack}>← All boards</button>
          <h3 className="truncate text-xl font-bold">{b.name}</h3>
          <p className="flex items-center gap-1 text-[11px] text-white/50">
            {b.is_public ? <><Globe size={11} /> Public — any member can view it</> : <><Lock size={11} /> Only the people on it</>}
            {" · "}you're {b.my_role === "owner" ? "the owner" : `a ${b.my_role}`} · by @{b.user_display}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {owner && (
            <>
              <button className="re-btn !w-auto px-3 py-1 text-xs" onClick={() => setShowMembers(!showMembers)}><UserPlus size={12} className="inline" /> People</button>
              <button className="re-btn !w-auto px-3 py-1 text-xs"
                onClick={() => run(() => api(`${BASE}${b.id}/`, { method: "PATCH", body: { is_public: !b.is_public } }))}>
                {b.is_public ? "Make private" : "Make public"}
              </button>
              <button className="re-btn !w-auto px-3 py-1 text-xs text-mcz-ember"
                onClick={async () => { if (window.confirm(`Delete “${b.name}” and every card on it?`)) { await api(`${BASE}${b.id}/`, { method: "DELETE" }); onGone(); } }}>
                <Trash2 size={12} className="inline" /> Delete
              </button>
            </>
          )}
          {!owner && b.my_role !== "viewer" && (
            <span className="text-[11px] text-white/40">Shared with you</span>
          )}
        </div>
      </div>
      {showMembers && owner && <Members board={b} />}
      {err && <p className="text-sm text-mcz-ember">{err}</p>}

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2" data-tour="sonday-board">
        {cols.map((col, ci) => (
          <div key={col.id} className="neon-frame w-64 shrink-0 snap-start space-y-2 p-2"
            onDragOver={(e) => canEdit && drag && e.preventDefault()}
            onDrop={() => { if (drag && drag.column !== col.id) move(drag, col); setDrag(null); }}>
            <div className="flex items-center justify-between gap-1">
              <p className="truncate text-sm font-semibold">{col.label} <span className="text-white/35">{cardsIn(col.id).length}</span></p>
              {canEdit && cols.length > 1 && (
                <button className="text-white/30 hover:text-mcz-ember" aria-label={`Delete column ${col.label}`}
                  onClick={() => { if (window.confirm(`Delete the column “${col.label}”? Its cards move to “${cols.find((c) => c.id !== col.id).label}”.`)) run(() => api(`${BASE}${b.id}/columns/${col.id}/`, { method: "DELETE" })); }}>
                  <X size={12} />
                </button>
              )}
            </div>
            {cardsIn(col.id).map((card) => (
              <div key={card.id} draggable={canEdit} onDragStart={() => setDrag(card)}
                className="cursor-pointer rounded-lg border border-white/10 bg-black/40 p-2 text-sm hover:border-mcz-cyan/50"
                onClick={() => setOpen(card)}>
                <div className="flex items-start gap-1.5">
                  {card.color && <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${SWATCH[card.color]}`} />}
                  <p className="min-w-0 flex-1 break-words">{card.title}</p>
                </div>
                <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-white/45">
                  <span>
                    {card.due_date && <span className={new Date(card.due_date) < new Date(new Date().toDateString()) ? "text-mcz-ember" : ""}>due {card.due_date}</span>}
                    {card.open_in && (
                      <button className="re-link ml-1" onClick={(e) => { e.stopPropagation(); openCard(card.open_in); }}>
                        open <ExternalLink size={9} className="inline" />
                      </button>
                    )}
                  </span>
                  {canEdit && (
                    // Arrow buttons, not only drag: a phone has no drag-and-drop.
                    <span className="flex gap-0.5">
                      <button disabled={ci === 0} className="disabled:opacity-20" aria-label="Move left"
                        onClick={(e) => { e.stopPropagation(); move(card, cols[ci - 1]); }}><ChevronLeft size={14} /></button>
                      <button disabled={ci === cols.length - 1} className="disabled:opacity-20" aria-label="Move right"
                        onClick={(e) => { e.stopPropagation(); move(card, cols[ci + 1]); }}><ChevronRight size={14} /></button>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {canEdit && (
              <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); addCard(col); }}>
                <input className="neon-input !py-1 text-xs" placeholder="+ Add a card" value={adding[col.id] || ""}
                  onChange={(e) => setAdding({ ...adding, [col.id]: e.target.value })} />
              </form>
            )}
          </div>
        ))}
        {canEdit && (
          <form className="w-48 shrink-0 space-y-1 p-2" onSubmit={(e) => {
            e.preventDefault(); const label = newCol.trim(); if (!label) return; setNewCol("");
            run(() => api(`${BASE}${b.id}/add_column/`, { method: "POST", body: { label, position: cols.length } }));
          }}>
            <input className="neon-input !py-1 text-xs" placeholder="+ New column" value={newCol} onChange={(e) => setNewCol(e.target.value)} />
          </form>
        )}
      </div>

      {open && (
        <CardEditor card={b.cards.find((c) => c.id === open.id) || open} columns={cols} canEdit={canEdit}
          onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />
      )}
    </div>
  );
}

export default function Sonday() {
  const [boards, setBoards] = useState(null);
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState("");
  const [current, setCurrent] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api(BASE).then(setBoards).catch((e) => setErr(e.message));
    api(`${BASE}meta/`).then(setMeta).catch(() => setMeta(null));
  };
  useEffect(() => { load(); }, []);

  const q = meta?.quota;
  const full = q && q.left != null && q.left <= 0;

  async function create(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const b = await api(BASE, { method: "POST", body: { name: name.trim() || "Untitled Board" } });
      setName(""); load(); setCurrent(b.id);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  const mine = (boards || []).filter((b) => b.my_role === "owner");
  const shared = (boards || []).filter((b) => b.my_role !== "owner");

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="sonday.png" alt="Sonday" className="h-16 w-16 rounded-2xl object-cover shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Sonday</h2>
          <p className="text-sm text-white/60">Your projects on a board — drafts to released, and who's on each one.</p>
        </div>
      </header>

      {current ? (
        <Board id={current} onBack={() => { setCurrent(null); load(); }} onGone={() => { setCurrent(null); load(); }} />
      ) : (
        <>
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/65">
            <p>Every new board starts with {meta?.default_columns?.join(" → ") || "four columns"}. Rename, add or remove columns to fit how you work.</p>
            <p><QuotaLine q={q} /></p>
            <form className="flex flex-wrap gap-2" onSubmit={create}>
              <input className="neon-input !w-56 !py-1.5 text-sm" placeholder="Board name — e.g. the EP" maxLength={255}
                value={name} onChange={(e) => setName(e.target.value)} disabled={full} />
              <button className="neon-btn-primary !w-auto px-4 py-1.5 text-xs" disabled={busy || full} type="submit">
                <Plus size={12} className="inline" /> New board
              </button>
            </form>
          </div>
          {err && <p className="text-sm text-mcz-ember">{err}</p>}
          {!boards && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}

          {boards && (
            <section className="space-y-2">
              <h3 className="font-semibold">Your boards</h3>
              {mine.length === 0 && <p className="text-sm text-white/55">None yet — name one above.</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {mine.map((b) => <BoardTile key={b.id} b={b} onOpen={() => setCurrent(b.id)} />)}
              </div>
            </section>
          )}
          {shared.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-semibold">Shared with you & public</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {shared.map((b) => <BoardTile key={b.id} b={b} onOpen={() => setCurrent(b.id)} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function BoardTile({ b, onOpen }) {
  return (
    <button className="neon-frame block w-full p-3 text-left hover:border-mcz-cyan/50" onClick={onOpen}>
      <p className="truncate font-semibold">{b.name}</p>
      <p className="flex items-center gap-1 text-[11px] text-white/50">
        {b.is_public ? <Globe size={10} /> : <Lock size={10} />}
        {b.my_role === "owner" ? "yours" : `${b.my_role} · @${b.user_display}`}
        {" · "}updated {new Date(b.updated_at).toLocaleDateString()}
      </p>
    </button>
  );
}
