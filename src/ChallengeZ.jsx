// ChallengeZ — calling somebody out from a post, and choosing what you will answer.
//
// BattleZ already had the call-out and the accept/decline. This adds the two
// halves it lacked: a Challenge button on a PostZ post (the post's author is the
// opponent, and both of you can put your own track over one shared instrumental),
// and a defender's filters so the challenges that reach you are the ones you
// would take. Everything the server decides is read from it — the cost, the
// refund and what a filter refused — nothing is retyped here.
//
// Cost and gain stay up front (CLAUDE.md): the call-out's price sits on the
// button, a decline's refund sits beside Decline, and accepting says it is free.
import { Loader2, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "./api.js";
import { goToSpot } from "./goto.js";
import RangeGates from "./RangeGates.jsx";
import { ENERGY } from "./resources.js";

const BASE = "/api/economy/battlez";

// One read of the price per page load: every post card shares it.
let costPromise = null;
function useCalloutCost() {
  const [cost, setCost] = useState(null);
  useEffect(() => {
    costPromise = costPromise || api(`${BASE}/challengez/`).then((d) => d?.callout_cost_energy ?? null).catch(() => null);
    let live = true;
    costPromise.then((c) => live && setCost(c));
    return () => { live = false; };
  }, []);
  return cost;
}

const Cost = ({ n }) => (n ? <span className="font-semibold text-mcz-ember">−{n} {ENERGY}</span> : null);

/** The Challenge button on a post card. Not shown on your own posts. */
export function ChallengeButton({ post, onSent }) {
  const cost = useCalloutCost();
  const [open, setOpen] = useState(false);
  const [beat, setBeat] = useState({ url: "", title: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!post || post.mine || post.visibility === "private" || post.visibility === "restricted") return null;

  async function send() {
    setBusy(true);
    setMsg("");
    try {
      const b = await api(`${BASE}/challenge/`, {
        method: "POST",
        body: {
          post_id: post.id,
          genre: post.genre || "",
          instrumental_url: beat.url.trim(),
          instrumental_title: beat.title.trim(),
        },
      });
      setMsg(b.status === "open" ? `@${b.opponent} took it — it's on ⚔️` : `Sent to @${b.opponent}. Their answer starts the clock.`);
      setOpen(false);
      onSent?.(b);
    } catch (e) {
      // The server says whether anything was charged; show it as written.
      setMsg(e.message || "Couldn't send that challenge.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-1 text-[11px]">
      <button type="button" className="inline-flex items-center gap-1 text-mcz-cyan hover:underline"
        onClick={() => setOpen((v) => !v)}>
        <Swords size={12} /> Challenge @{post.author} {cost ? <Cost n={cost} /> : null}
      </button>
      {open && (
        <div className="neon-frame mt-2 space-y-2 p-3">
          <p className="text-white/60">
            Same beat, two tracks: add an instrumental and you both put your own take over it,
            so the two scores sit on the same ground. Leave it blank and each brings their own.
          </p>
          <input className="neon-input !py-2 text-xs" placeholder="Instrumental title (optional)"
            value={beat.title} onChange={(e) => setBeat({ ...beat, title: e.target.value })} />
          <input className="neon-input !py-2 text-xs" placeholder="Instrumental link (optional)"
            value={beat.url} onChange={(e) => setBeat({ ...beat, url: e.target.value })} />
          <div className="flex items-center gap-3">
            <button type="button" className="neon-btn-primary !w-auto px-4 py-2 text-xs" onClick={send} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Swords size={14} />} Send challenge {cost ? <Cost n={cost} /> : null}
            </button>
            <span className="text-white/45">Refunded if they decline. Free if their filters turn it away.</span>
          </div>
        </div>
      )}
      {msg && <p className="mt-1 text-mcz-gold">{msg}</p>}
    </div>
  );
}

const csv = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

function Filters({ filters, onSaved }) {
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  useEffect(() => {
    if (filters) setF({ ...filters, genresText: (filters.genres || []).join(", "), mutedText: (filters.muted || []).join(", ") });
  }, [filters]);
  if (!f) return null;

  async function save() {
    setBusy(true);
    try {
      const d = await api(`${BASE}/challengez/filters/`, {
        method: "PUT",
        body: { paused: f.paused, auto_accept: f.auto_accept, genres: csv(f.genresText), muted: csv(f.mutedText), gates: f.gates || {} },
      });
      setSaved("Saved.");
      onSaved?.(d);
    } catch (e) { setSaved(e.message || "Couldn't save."); }
    finally { setBusy(false); }
  }

  return (
    <div className="neon-frame space-y-3 p-4">
      <p className="text-[11px] uppercase tracking-widest text-mcz-gold/90">Who can challenge you</p>
      <label className="flex items-center gap-2 text-xs text-white/80">
        <input type="checkbox" checked={!!f.paused} onChange={(e) => setF({ ...f, paused: e.target.checked })} />
        Pause — not taking challenges right now
      </label>
      <input className="neon-input !py-2 text-xs" placeholder="Genres you'll take, comma separated (blank = any)"
        value={f.genresText} onChange={(e) => setF({ ...f, genresText: e.target.value })} />
      <RangeGates title="Challengers must be in these ranges" value={f.gates || {}} onChange={(g) => setF({ ...f, gates: g })} />
      <input className="neon-input !py-2 text-xs" placeholder="Muted usernames, comma separated"
        value={f.mutedText} onChange={(e) => setF({ ...f, mutedText: e.target.value })} />
      <label className="flex items-start gap-2 text-xs text-white/80">
        <input type="checkbox" className="mt-0.5" checked={!!f.auto_accept} onChange={(e) => setF({ ...f, auto_accept: e.target.checked })} />
        <span>Auto-accept anything that clears these filters — it opens straight away, and accepting costs you nothing.</span>
      </label>
      <p className="text-[11px] text-white/45">
        A challenge outside your filters never reaches you, and the challenger is told before they are charged.
      </p>
      <div className="flex items-center gap-3">
        <button className="re-btn !w-auto px-4 py-2 text-xs" onClick={save} disabled={busy}>Save filters</button>
        {saved && <span className="text-[11px] text-mcz-gold">{saved}</span>}
      </div>
    </div>
  );
}

function Row({ c, mode, onAnswer, onOpen }) {
  const [busy, setBusy] = useState(false);
  const refund = c.decline_refunds_challenger?.amount;
  async function answer(accept) {
    setBusy(true);
    try { await onAnswer(c.id, accept); } finally { setBusy(false); }
  }
  return (
    <div className="neon-frame space-y-1 p-3 text-xs">
      <p className="font-semibold text-white">{c.title}</p>
      <p className="text-white/55">
        {mode === "incoming" ? `@${c.host} challenged you` : `You → @${c.opponent}`}
        {c.genre ? ` · ${c.genre}` : ""}{c.status !== "pending" ? ` · ${c.status}` : ""}
      </p>
      {c.same_instrumental && (
        <p className="text-white/60">🎹 Same instrumental{c.instrumental_title ? `: ${c.instrumental_title}` : ""} — your own track over it.</p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {mode === "incoming" && (
          <>
            <button className="neon-btn-primary !w-auto px-3 py-1.5 text-xs" disabled={busy} onClick={() => answer(true)}>
              Accept <span className="font-semibold text-emerald-300">free</span>
            </button>
            <button className="re-btn !w-auto px-3 py-1.5 text-xs" disabled={busy} onClick={() => answer(false)}>
              Decline {refund ? <span className="text-white/50">(refunds them <span className="font-semibold text-emerald-300">+{refund} {ENERGY}</span>)</span> : null}
            </button>
          </>
        )}
        <button className="re-link text-[11px]" onClick={() => onOpen?.(c.id)}>Open battle</button>
        {c.open_in && <button className="re-link text-[11px]" onClick={() => goToSpot(c.open_in.tab, c.open_in.target)}>Open the post</button>}
      </div>
    </div>
  );
}

/** The ChallengeZ section of BattleZ: incoming, sent, and your filters. */
export default function ChallengeZ({ onOpen }) {
  const [d, setD] = useState(null);
  const [tab, setTab] = useState("incoming");
  const [showFilters, setShowFilters] = useState(false);
  const [err, setErr] = useState("");

  const load = () => api(`${BASE}/challengez/`).then(setD).catch((e) => setErr(e.message || "Couldn't load ChallengeZ."));
  useEffect(() => { load(); }, []);

  async function answer(id, accept) {
    try {
      await api(`${BASE}/${id}/respond/`, { method: "POST", body: { accept } });
      await load();
      if (accept) onOpen?.(id);
    } catch (e) { setErr(e.message || "Couldn't answer that."); }
  }

  if (err && !d) return <p className="text-xs text-mcz-gold">{err}</p>;
  if (!d) return null;
  const rows = d[tab] || [];

  return (
    <section className="space-y-3" data-tour="challengez">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-lg font-extrabold">ChallengeZ</h3>
        <button className={`pill ${tab === "incoming" ? "pill-on" : ""}`} onClick={() => setTab("incoming")}>
          Incoming{d.incoming.length ? ` (${d.incoming.length})` : ""}
        </button>
        <button className={`pill ${tab === "sent" ? "pill-on" : ""}`} onClick={() => setTab("sent")}>
          Sent{d.sent.length ? ` (${d.sent.length})` : ""}
        </button>
        <button className="re-link ml-auto text-[11px]" onClick={() => setShowFilters((v) => !v)}>
          {showFilters ? "Hide filters" : "Filters"}
        </button>
      </div>
      {err && <p className="text-xs text-mcz-gold">{err}</p>}
      {showFilters && <Filters filters={d.filters} onSaved={(filters) => setD({ ...d, filters })} />}
      {rows.length === 0
        ? <p className="text-xs text-white/45">{tab === "incoming" ? "Nobody is waiting on you." : "You have no live challenges out."}</p>
        : rows.map((c) => <Row key={c.id} c={c} mode={tab} onAnswer={answer} onOpen={onOpen} />)}
    </section>
  );
}
