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
  ArrowLeft, Check, Coins, Crown, Loader2, Lock, Plus, Star, Swords, Timer,
  Trophy, Users, X,
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

// Real-money wagering is regulated gambling in most places. Counting who wants
// it is honest; shipping it on a show of hands would not be — so this measures
// demand and says so.
function MoneyPoll() {
  const [poll, setPoll] = useState(null);
  useEffect(() => {
    api("/api/economy/battlez/moneyvote/").then(setPoll).catch(() => {});
  }, []);
  if (!poll) return null;
  return (
    <div className="neon-frame flex flex-wrap items-center justify-between gap-2 p-4">
      <p className="text-sm text-white/70">
        💵 <b>Real-money battles?</b> {poll.votes} vote{poll.votes === 1 ? "" : "s"} so far.
        <span className="block text-[10px] text-white/40">{poll.note}</span>
      </p>
      <button
        className={`neon-btn-${poll.my_vote ? "primary" : "ghost"} !w-auto px-4 py-2 text-xs`}
        onClick={async () => setPoll(await api("/api/economy/battlez/moneyvote/", { method: "POST", body: {} }))}
      >
        {poll.my_vote ? "You voted YES ✓ (tap to undo)" : "Vote YES"}
      </button>
    </div>
  );
}

// One contestant's column: their take, their score, and whether the room has
// judged enough of them for it to count.
function Side({ side, board, battle, onRate, onSubmit }) {
  const s = board?.[side];
  if (!s) return null;
  const isWinner = battle.winner && battle.winner === s.username;
  const entry = (battle.entries || []).find((e) => e.user === s.username);
  const mine = battle.my_side === side;
  return (
    <div className={`neon-frame space-y-2 p-3 ${isWinner ? "!border-mcz-gold/60" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-semibold text-white/85">
          {isWinner && <Crown size={12} className="mr-1 inline text-mcz-gold" />}@{s.username}
        </span>
        <span className="shrink-0 text-[12px] font-bold text-mcz-ember">
          {s.median != null ? s.median : "—"}<span className="text-white/30">/10</span>
        </span>
      </div>
      <p className="text-[10px] text-white/35">
        {s.count}/{battle.min_ratings} ratings
        {!s.qualified && <span className="text-mcz-ember"> · not enough to qualify yet</span>}
      </p>
      {entry ? <Work item={entry} /> : (
        <p className="text-[11px] text-white/35">
          {mine ? "You haven't put your take up yet." : "No take yet."}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {battle.status === "open" && mine && !entry && (
          <button className="re-btn !w-auto px-3 text-xs" onClick={onSubmit}>
            <Swords size={12} /> Put your take up
          </button>
        )}
        {battle.status === "open" && entry && !mine && !battle.i_am_contestant && (
          <button className="re-btn !w-auto px-3 text-xs" onClick={() => onRate(entry)}>
            <Star size={12} /> Rate it
          </button>
        )}
      </div>
    </div>
  );
}

function Detail({ id, onBack, onFlash }) {
  const [b, setB] = useState(null);
  const [work, setWork] = useState({});
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEntry, setShowEntry] = useState(false);

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
      setTitle(""); setWork({}); setShowEntry(false);
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

  const is1v1 = b.mode === "1v1";

  async function respond(accept) {
    try {
      setB(await api(`/api/economy/battlez/${id}/respond/`, { method: "POST", body: { accept } }));
      onFlash(accept ? "It's on." : "Declined.");
    } catch (e) { onFlash(e.message || "Couldn't answer that."); }
  }

  async function wager(side) {
    const raw = window.prompt(`How many SpinaZ on @${b.scoreboard?.[side]?.username}?`);
    const amount = Number(raw);
    if (!raw || !Number.isFinite(amount) || amount <= 0) return;
    try {
      setB(await api(`/api/economy/battlez/${id}/wager/`,
                     { method: "POST", body: { side, amount: Math.round(amount) } }));
      onFlash(`−${Math.round(amount)} ${SPINAZ} staked. It's held until the result.`);
    } catch (e) { onFlash(e.message || "Couldn't place that."); }
  }

  async function settle() {
    try {
      setB(await api(`/api/economy/battlez/${id}/settle/`, { method: "POST", body: {} }));
      onFlash("Settled.");
    } catch (e) { onFlash(e.message || "Couldn't settle it."); }
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

      {is1v1 && (
        <>
          {b.status === "pending" && (
            <div className="neon-frame flex flex-wrap items-center gap-2 p-3">
              <p className="flex-1 text-[12px] text-white/70">
                {b.my_side === "opponent"
                  ? `@${b.host} called you out.`
                  : `Waiting on @${b.opponent} to answer.`}
              </p>
              {b.my_side === "opponent" && (
                <>
                  <button className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={() => respond(true)}>
                    <Check size={13} /> Accept
                  </button>
                  <button className="re-btn !w-auto px-4 py-2 text-xs" onClick={() => respond(false)}>
                    <X size={13} /> Decline
                  </button>
                </>
              )}
            </div>
          )}

          {b.status === "open" && b.ends_at && (
            <p className="flex items-center gap-1.5 text-[11px] text-white/45">
              <Timer size={12} /> Closes {new Date(b.ends_at).toLocaleString()} — it settles itself then.
            </p>
          )}
          {b.status === "settled" && (
            <p className="flex items-center gap-1.5 text-[12px] text-mcz-gold">
              <Crown size={13} /> {b.winner ? `@${b.winner} took it.` : "Draw — every wager was refunded."}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Side side="host" board={b.scoreboard} battle={{ ...b, entries }}
                  onRate={rate} onSubmit={() => setShowEntry(true)} />
            <Side side="opponent" board={b.scoreboard} battle={{ ...b, entries }}
                  onRate={rate} onSubmit={() => setShowEntry(true)} />
          </div>

          {/* The pool. Every figure is stated before the button that moves it. */}
          <div className="neon-frame space-y-2 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/45">
              <Coins size={12} /> Wagers — {b.pool_total || 0} {SPINAZ} in the pot
            </p>
            <div className="flex flex-wrap gap-2">
              {["host", "opponent"].map((side) => (
                <span key={side} className="pill">
                  @{b.scoreboard?.[side]?.username} · {b.pools?.[side] || 0} {SPINAZ}
                </span>
              ))}
            </div>
            {b.my_wager ? (
              <p className="text-[11px] text-white/60">
                You staked {b.my_wager.amount} {SPINAZ} on @{b.scoreboard?.[b.my_wager.side]?.username}.
                {b.status === "settled" && (
                  <span className={b.my_wager.paid_out > b.my_wager.amount ? " text-emerald-300" : " text-mcz-ember"}>
                    {" "}Paid out {b.my_wager.paid_out} {SPINAZ}.
                  </span>
                )}
              </p>
            ) : b.status === "open" && !b.i_am_contestant ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {["host", "opponent"].map((side) => (
                    <button key={side} className="re-btn !w-auto px-3 text-xs" onClick={() => wager(side)}>
                      Back @{b.scoreboard?.[side]?.username}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/35">
                  Your stake leaves your wallet now and is held until the result. Winners split the
                  whole pot in proportion to what they staked — no house cut. A draw, or too few
                  judges, refunds everybody.
                </p>
              </>
            ) : b.i_am_contestant ? (
              <p className="text-[10px] text-white/35">You're in this one — you can't wager on it.</p>
            ) : null}
          </div>

          {b.status === "open" && b.i_am_contestant && (
            <button className="re-btn !w-auto px-4 py-2 text-xs" onClick={settle}>
              <Trophy size={13} /> Settle it
            </button>
          )}
        </>
      )}

      <div className={is1v1 ? "hidden" : ""}>
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

      {b.status === "open" && (is1v1 ? showEntry : (!b.mine && !b.entered)) && (
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
  const [duel, setDuel] = useState({ opponent: "", kind: "1v1", title: "" });
  const [duelGates, setDuelGates] = useState({});

  const load = () => api("/api/economy/battlez/")
    .then((d) => setList(asList(d?.battles)))
    .catch((e) => { setMsg(e.message || "Couldn't load BattleZ."); setList([]); });
  useEffect(() => { load(); }, []);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3200); };

  async function challenge() {
    if (!duel.opponent.trim()) return;
    setBusy(true);
    try {
      const b = await api("/api/economy/battlez/challenge/", {
        method: "POST",
        body: { ...duel, opponent: duel.opponent.trim(), gates: duelGates },
      });
      setDuel({ ...duel, opponent: "", title: "" });
      setDuelGates({});
      await load();
      setOpen(b.id);
    } catch (e) { flash(e.message || "Couldn't send that challenge."); }
    finally { setBusy(false); }
  }

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

      {!open && <MoneyPoll />}

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
                        {b.mode === "1v1"
                          ? <>@{b.host} vs @{b.opponent}{b.pool_total > 0 && <> · {b.pool_total} {SPINAZ} pot</>}</>
                          : <>@{b.host} · {b.entry_count} entr{b.entry_count === 1 ? "y" : "ies"}</>}
                        {b.genre && <> · {b.genre}</>}
                        {b.mode !== "1v1" && b.entry_spinaz > 0 && <> · {b.entry_spinaz} {SPINAZ} to enter</>}
                        {Object.keys(b.gates || {}).length > 0 && <> · gated</>}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[11px]">
                      {["closed", "settled", "declined", "pending"].includes(b.status)
                        ? <span className="pill !px-2 !py-0.5 !text-[10px]">
                            {b.status === "settled" && b.winner ? `👑 ${b.winner}` : b.status}
                          </span>
                        : <Users size={12} className="text-white/25" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* 1v1 is what people mean by a battle: name somebody, they answer. */}
          <div className="neon-frame space-y-3 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
              Throw down a challenge
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="neon-input !py-2 text-xs" placeholder="Opponent username"
                     value={duel.opponent} onChange={(e) => setDuel({ ...duel, opponent: e.target.value })} />
              <select className="neon-input !py-2 text-xs" value={duel.kind}
                      onChange={(e) => setDuel({ ...duel, kind: e.target.value })}>
                <option value="1v1">1v1 ⚔️</option>
                <option value="freestyle">Freestyle 🎤</option>
                <option value="cypher">Battle Cypher 🔥</option>
              </select>
              <input className="neon-input !py-2 text-xs" placeholder="Title (optional)"
                     value={duel.title} onChange={(e) => setDuel({ ...duel, title: e.target.value })} />
            </div>
            <RangeGates value={duelGates} onChange={setDuelGates} title="Who you're allowed to call out" />
            <button className="neon-btn-primary !w-auto px-5" onClick={challenge}
                    disabled={busy || !duel.opponent.trim()}>
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Swords size={14} />} Challenge
            </button>
            <p className="text-[10px] text-white/35">
              Nothing goes live until they accept. Spectators stake SpinaZ once it does — you can't
              wager on your own battle.
            </p>
          </div>

          <div className="neon-frame space-y-3 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
              Or host an open challenge
            </p>
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
