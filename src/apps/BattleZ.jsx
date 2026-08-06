// BattleZ — a challenge, its entries, and a leaderboard.
//
// BattleZ has been in the tab bar since the app was written with no backend
// whatsoever behind it. It now has one, and it follows the same three rules as
// everything else here:
//
//   * the challenge and every entry carry the work in the PostZ format;
//   * who may enter is decided by the same five exclusive ranges search,
//     CollabZ and VenueZ use — one spec, so what the listing advertises and
//     what the door enforces cannot diverge;
//   * judging rides the shared RateZ item space, not a second rating system.
import { useEffect, useState } from "react";
import {
  ArrowLeft, Loader2, Lock, Plus, Star, Swords, Trophy, Users,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { IconImg } from "../App.jsx";
import { SPINAZ } from "../resources.js";
import RangeGates from "../RangeGates.jsx";
import MediaFields from "../MediaFields.jsx";
import { GENRES } from "../genres.js";

function Work({ item }) {
  if (!item.media_url && !item.image_url && !item.lyrics) return null;
  return (
    <div className="space-y-2">
      {item.media_url && (
        item.media_type === "video"
          ? <video src={item.media_url} controls className="w-full rounded-lg" />
          : <audio src={item.media_url} controls className="w-full" />
      )}
      {item.image_url && <img src={item.image_url} alt="" className="w-full rounded-lg" />}
      {item.lyrics && (
        <details>
          <summary className="cursor-pointer text-[11px] text-white/45">Lyrics / script</summary>
          <p className="mt-1 whitespace-pre-wrap text-[12px] text-white/70">{item.lyrics}</p>
        </details>
      )}
    </div>
  );
}

function Detail({ id, onBack, onFlash }) {
  const [b, setB] = useState(null);
  const [work, setWork] = useState({});
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api(`/api/economy/battlez/${id}/`).then(setB).catch(() => setB(null));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!b) return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>;

  const entries = asList(b.entries);

  async function enter() {
    setBusy(true);
    try {
      await api(`/api/economy/battlez/${id}/enter/`, {
        method: "POST",
        body: { title: title.trim(), lyrics: work.lyrics || "",
                media_type: work.media_blob ? "" : (work.media_type || ""),
                media_url: work.media_blob ? "" : (work.media_url || ""),
                image_url: work.image_blob ? "" : (work.image_url || "") },
      });
      setTitle(""); setWork({});
      onFlash("You're in.");
      load();
    } catch (e) { onFlash(e.message || "Couldn't enter."); }
    finally { setBusy(false); }
  }

  async function rate(entry) {
    const raw = window.prompt(`Rate @${entry.user}'s entry 1–10`);
    const score = Number(raw);
    if (!raw || !Number.isFinite(score) || score < 1 || score > 10) return;
    try {
      await api("/api/economy/social/rate/", {
        method: "POST", body: { item: entry.item_key, action: "rate", score: Math.round(score) },
      });
      load();
    } catch (e) { onFlash(e.message || "Couldn't rate that."); }
  }

  async function close() {
    await api(`/api/economy/battlez/${id}/`, { method: "PATCH", body: { status: "closed" } })
      .then(setB).catch((e) => onFlash(e.message));
  }

  return (
    <div className="space-y-4">
      <button className="re-btn !w-auto px-3 text-xs" onClick={onBack}>
        <ArrowLeft size={13} /> All battles
      </button>

      <div className="neon-frame space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold">{b.title}</h3>
            <p className="text-[11px] text-white/45">
              hosted by @{b.host}
              {b.genre && <> · {b.genre}</>}
              {" · "}{b.entry_count} entr{b.entry_count === 1 ? "y" : "ies"}
              {b.status === "closed" && <span className="text-mcz-ember"> · closed</span>}
            </p>
          </div>
          {b.mine && b.status === "open" && (
            <button className="re-btn !w-auto px-3 text-xs" onClick={close}>Close it</button>
          )}
        </div>
        {b.description && <p className="text-[13px] text-white/75">{b.description}</p>}
        <Work item={b} />
        {Object.keys(b.gates || {}).length > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-white/45">
            <Lock size={11} /> This battle has entry ranges — they're exclusive, so anyone with no
            value for a gated metric is out.
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/45">
          <Trophy size={12} /> Leaderboard
        </p>
        {entries.length === 0 ? (
          <p className="text-[12px] text-white/40">No entries yet.</p>
        ) : (
          <ol className="space-y-2">
            {entries.map((e, i) => (
              <li key={e.id} className="neon-frame space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="text-[11px] tabular-nums text-white/30">#{i + 1}</span>{" "}
                    <span className="text-[13px] font-semibold text-white/85">
                      {e.title || `@${e.user}`}
                    </span>
                    <span className="block text-[10px] text-white/35">@{e.user}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[12px] font-bold text-mcz-ember">
                      {e.rating != null ? e.rating : "—"}<span className="text-white/30">/10</span>
                    </span>
                    {!e.mine && (
                      <button className="text-white/30 hover:text-mcz-gold" title="Rate this entry"
                              onClick={() => rate(e)}>
                        <Star size={13} />
                      </button>
                    )}
                  </span>
                </div>
                <Work item={e} />
              </li>
            ))}
          </ol>
        )}
      </div>

      {b.status === "open" && !b.mine && !b.entered && (
        <div className="neon-frame space-y-3 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">Enter</p>
          <input className="neon-input !py-2 text-xs" placeholder="Name your entry"
                 value={title} onChange={(e) => setTitle(e.target.value)} />
          <MediaFields value={work} onChange={setWork} label="Your entry" />
          <button className="neon-btn-primary !w-auto px-5" onClick={enter} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Swords size={14} />} Enter
            {b.entry_spinaz > 0 && (
              <span className="ml-1 text-mcz-ember">−{b.entry_spinaz} {SPINAZ}</span>
            )}
          </button>
          {/* The fee is stated on the button, and what happens to it here. */}
          <p className="text-[10px] text-white/35">
            {b.entry_spinaz > 0
              ? `The entry fee goes to @${b.host} for their time. It isn't returned if you withdraw.`
              : "Free to enter."}
          </p>
        </div>
      )}
      {b.entered && <p className="text-[12px] text-emerald-300">You're in this one.</p>}
    </div>
  );
}

export default function BattleZ() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", genre: "Trap", entry_spinaz: "" });
  const [work, setWork] = useState({});
  const [gates, setGates] = useState({});

  const load = () => api("/api/economy/battlez/")
    .then((d) => setList(asList(d?.battles)))
    .catch((e) => { setMsg(e.message || "Couldn't load BattleZ."); setList([]); });
  useEffect(() => { load(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3200); };

  async function create() {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      const b = await api("/api/economy/battlez/", {
        method: "POST",
        body: {
          ...form,
          entry_spinaz: Number(form.entry_spinaz || 0),
          gates,
          lyrics: work.lyrics || "",
          media_type: work.media_blob ? "" : (work.media_type || ""),
          media_url: work.media_blob ? "" : (work.media_url || ""),
          image_url: work.image_blob ? "" : (work.image_url || ""),
        },
      });
      setForm({ ...form, title: "", description: "", entry_spinaz: "" });
      setWork({}); setGates({});
      await load();
      setOpen(b.id);
    } catch (e) { flash(e.message || "Couldn't host that."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="battlez.png" alt="BattleZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">BattleZ</h2>
          <p className="text-xs text-white/45">Set a challenge. Best entry wins on the community's rating.</p>
        </div>
      </header>

      {msg && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">{msg}</p>}

      {open ? (
        <Detail id={open} onBack={() => { setOpen(null); load(); }} onFlash={flash} />
      ) : (
        <>
          {list === null ? (
            <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-white/45">No battles yet — set the first one below.</p>
          ) : (
            <ul className="space-y-1.5">
              {list.map((b) => (
                <li key={b.id}>
                  <button className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:border-mcz-ember/40"
                          onClick={() => setOpen(b.id)}>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-white/85">{b.title}</span>
                      <span className="block text-[10px] text-white/35">
                        @{b.host} · {b.entry_count} entr{b.entry_count === 1 ? "y" : "ies"}
                        {b.genre && <> · {b.genre}</>}
                        {b.entry_spinaz > 0 && <> · {b.entry_spinaz} {SPINAZ} to enter</>}
                        {Object.keys(b.gates || {}).length > 0 && <> · gated</>}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[11px]">
                      {b.status === "closed"
                        ? <span className="pill !px-2 !py-0.5 !text-[10px]">closed</span>
                        : <Users size={12} className="text-white/25" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="neon-frame space-y-3 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">Host a battle</p>
            <input className="neon-input !py-2 text-xs" placeholder="The challenge"
                   value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="neon-input !py-2 text-xs" rows={2} placeholder="Rules, brief, what you want back"
                      value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="neon-input !py-2 text-xs" value={form.genre}
                      onChange={(e) => setForm({ ...form, genre: e.target.value })}>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input className="neon-input !py-2 text-xs" inputMode="numeric"
                     placeholder="Entry fee in SpinaZ (0 = free)"
                     value={form.entry_spinaz}
                     onChange={(e) => setForm({ ...form, entry_spinaz: e.target.value })} />
            </div>

            <MediaFields value={work} onChange={setWork} label="The beat / brief" />
            <RangeGates value={gates} onChange={setGates} title="Who can enter" />

            <button className="neon-btn-primary !w-auto px-5" onClick={create}
                    disabled={busy || !form.title.trim()}>
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Host it
            </button>
            {Number(form.entry_spinaz || 0) > 0 && (
              <p className="text-[10px] text-emerald-300">
                +{Number(form.entry_spinaz)} {SPINAZ} to you per entry.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
