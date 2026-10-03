import { useEffect, useRef, useState } from "react";
import { trackListening } from "../listen.js";
import { ExternalLink, Headphones, Loader2, Lock, Search } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import MemberName from "../MemberName.jsx";
import { goToTab } from "../goto.js";
import { ENERGY } from "../resources.js";

// Rate ConnectZ — every rating in the app, each one labelled for what it is,
// and the place you give them.
//
// `/api/economy/ratez/` has classified ratings into five kinds for a long time
// and no mounted screen read it, so "8.4" on a card never said whether that
// was somebody's work, their mixing, their part of a deal or them. The kinds,
// their labels and what each measures all come from the server (RATING_KINDS)
// — nothing about them is typed here.
//
// The queue is the other half. Two rules from the server carried through:
//   * the gain is stated BEFORE you rate, and reads 0 once today's cap is
//     used — a +1 ⚡ the server will not pay is a promise it then breaks;
//   * a track you have not heard opens its own player instead of offering a
//     number beside its title. Scoring something unheard is the substance
//     rule's failure case with a button on it.

const RATEZ = "/api/economy/ratez/";
const QUEUE = "/api/economy/ratez/queue/";

const fmt = (m) => (m == null ? "—" : Number(m).toFixed(1).replace(/\.0$/, ""));

function KindCard({ kind, value, count, children }) {
  return (
    <div className="neon-frame space-y-1 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold">{kind?.name}</p>
        {value != null && <p className="font-display text-2xl font-extrabold text-mcz-cyan">{value}</p>}
      </div>
      <p className="text-[11px] text-white/45">
        Of {kind?.of} · {kind?.how}{count != null ? ` · ${count} rating${count === 1 ? "" : "s"}` : ""}
      </p>
      {kind?.desc && <p className="text-xs text-white/60">{kind.desc}</p>}
      {children}
    </div>
  );
}

function Dashboard({ d }) {
  const kinds = Object.fromEntries((d.kinds || []).map((k) => [k.key, k]));
  const a = d.attractiveness || {};
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <KindCard kind={kinds.post} value={fmt(d.post.median)} count={null}>
        <p className="text-[11px] text-white/45">{d.post.rated} of {d.post.total} posts rated</p>
        <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
          {d.post.posts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <a className="re-link truncate" href={p.url}>{p.title || "Untitled"} <ExternalLink size={10} className="inline" /></a>
              <span className="shrink-0 text-white/60">{fmt(p.rating)} <span className="text-white/35">({p.count})</span></span>
            </li>
          ))}
        </ul>
      </KindCard>

      {/* No headline number: a count of skills in the score slot reads as a
          rating of 1. Each skill carries its own median below. */}
      <KindCard kind={kinds.skill} value={null}>
        {d.skill.skills.length === 0
          ? <p className="text-xs text-white/50">No rated skills yet — {d.skill.note}</p>
          : (
            <ul className="space-y-1 text-xs">
              {d.skill.skills.map((s) => (
                <li key={s.skill} className="flex justify-between gap-2">
                  <span className="truncate">{s.skill}</span>
                  <span className="text-white/60">{fmt(s.rating)} <span className="text-white/35">({s.count})</span></span>
                </li>
              ))}
            </ul>
          )}
      </KindCard>

      {d.contribution && (
        <KindCard kind={kinds.contribution} value={fmt(d.contribution.median)} count={d.contribution.count}>
          <p className="text-[11px] text-white/45">
            across {d.contribution.deals} deal{d.contribution.deals === 1 ? "" : "s"} ·{" "}
            <button className="re-link" onClick={() => goToTab("collabz")}>CollabZ</button>
          </p>
        </KindCard>
      )}

      <KindCard kind={kinds.overall} value={fmt(d.overall.median)} count={d.overall.count} />

      <KindCard kind={kinds.attractiveness} value={a.locked ? <Lock size={18} /> : fmt(a.median)}>
        {a.locked
          ? <p className="text-xs text-mcz-ember">{a.locked}</p>
          : a.note && <p className="text-[11px] text-white/45">{a.note}</p>}
      </KindCard>
    </div>
  );
}

// The track plays IN the card. It used to say "Listen first" and send you to
// the post — away from the queue, one round trip per rating. Learnt from
// exchange apps where the play button sits on the request itself. The seconds
// are still the server's (listen.js reports what it CREDITED), and rating
// unlocks only when it says you've heard enough — same rule, no detour.
function QueuePlayer({ p, onHeard }) {
  const ref = useRef(null);
  useEffect(() => trackListening(ref.current, p.item_key, (r) => onHeard(r)), [p.item_key]);
  const Tag = p.play_kind === "video" ? "video" : "audio";
  return <Tag ref={ref} src={p.play_url} controls preload="none"
              className={p.play_kind === "video" ? "max-h-48 w-full rounded-lg" : "w-full"} />;
}

function QueueRow({ p, reward, onRated, onSkip }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const need = p.listen_required_sec || 0;
  const [heard, setHeard] = useState(p.listened_sec || 0);
  const [unlocked, setUnlocked] = useState(!p.needs_listen);

  async function rate(score) {
    setBusy(true); setErr("");
    try {
      await api("/api/economy/social/rate/", { method: "POST", body: { item: p.item_key, action: "rate", score } });
      onRated(p.id);
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  const onHeard = (r) => {
    const secs = r?.listened_sec ?? 0;
    setHeard(Math.min(secs, need));
    if (r?.finished || secs >= (r?.listen_required_sec ?? need)) setUnlocked(true);
  };

  return (
    <div className="neon-frame space-y-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <a className="re-link block truncate font-semibold" href={p.url}>{p.title || "Untitled"}</a>
          <p className="text-[11px] text-white/50">
            by <MemberName username={p.author} bare />
            {p.genre ? ` · ${p.genre}` : p.media_type ? ` · ${p.media_type}` : ""}
            {p.count ? ` · ${fmt(p.rating)} from ${p.count}` : " · not rated yet"}
          </p>
        </div>
        {/* The gain, on the card, before anything is pressed. */}
        <span className={`shrink-0 text-xs ${reward.amount ? "text-emerald-300" : "text-white/40"}`}>
          +{reward.amount} {ENERGY}
        </span>
      </div>

      {p.play_url && <QueuePlayer p={p} onHeard={onHeard} />}

      {!unlocked ? (
        p.play_url ? (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-mcz-cyan transition-all" style={{ width: `${need ? (heard / need) * 100 : 0}%` }} />
            </div>
            <p className="flex items-center gap-1 text-[11px] text-white/50">
              <Headphones size={11} /> Play {need}s of it to rate — {Math.max(0, need - heard)}s to go.
            </p>
          </div>
        ) : (
          <a className="re-btn !w-auto inline-flex items-center gap-1 px-3 py-1 text-xs" href={p.url}>
            <Headphones size={12} /> Listen first, then rate
          </a>
        )
      ) : (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} disabled={busy} onClick={() => rate(n)}
              className="h-8 w-8 rounded-lg border border-white/15 text-sm hover:border-mcz-cyan hover:text-mcz-cyan disabled:opacity-40">
              {n}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={() => onSkip(p.id)} className="text-[11px] text-white/40 hover:text-white/70">
          Skip for now
        </button>
      </div>
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}

// Skipped rows stay hidden for this session only: a skip is "not now", not a
// verdict, and nothing about it is sent anywhere.
const SKIP_KEY = "mcz_ratez_skipped";
const loadSkipped = () => { try { return new Set(JSON.parse(sessionStorage.getItem(SKIP_KEY) || "[]")); } catch { return new Set(); } };

function Queue() {
  const [q, setQ] = useState(null);
  const [err, setErr] = useState("");
  const load = () => api(QUEUE).then(setQ).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const [skipped, setSkipped] = useState(loadSkipped);
  const skip = (id) => setSkipped((cur) => {
    const next = new Set(cur).add(id);
    try { sessionStorage.setItem(SKIP_KEY, JSON.stringify([...next])); } catch { /* storage blocked */ }
    return next;
  });
  const rated = (id) => {
    // Reload rather than decrement locally: the reward line is the server's
    // count of what it actually paid, and guessing it here is how the two drift.
    setQ((cur) => cur && { ...cur, posts: cur.posts.filter((p) => p.id !== id) });
    load();
  };

  if (err) return <p className="text-sm text-mcz-ember">{err}</p>;
  if (!q) return <p className="flex items-center gap-2 text-xs text-white/50"><Loader2 className="animate-spin" size={12} /> Finding work to rate…</p>;
  const r = q.reward;
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/60">
        {r.amount
          ? <>Each rating: <span className="text-emerald-300">+{r.amount} {ENERGY}</span> — {r.left_today} of {r.cap} paid ratings left today.</>
          : <>You've had today's {r.cap} paid ratings — rating still counts, it just pays nothing until tomorrow.</>}
        {" "}Your rating also rates every skill that went into the post, for whoever brought it.
      </p>
      {q.posts.length === 0 && (
        <p className="text-sm text-white/55">
          Nothing waiting — you've rated everything you can see.{" "}
          <button className="re-link" onClick={() => goToTab("postz")}>Open the feed</button>
        </p>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {q.posts.filter((p) => !skipped.has(p.id)).map((p) => <QueueRow key={p.id} p={p} reward={r} onRated={rated} onSkip={skip} />)}
      </div>
    </div>
  );
}

export default function RateConnectZ() {
  const [who, setWho] = useState("");
  const [asked, setAsked] = useState("");
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setD(null); setErr("");
    api(asked ? `${RATEZ}?username=${encodeURIComponent(asked)}` : RATEZ).then(setD).catch((e) => setErr(e.message));
  }, [asked]);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="ratez.png" alt="Rate ConnectZ" className="h-16 w-16 rounded-2xl object-cover shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Rate ConnectZ</h2>
          <p className="text-sm text-white/60">Every rating, labelled for what it measures — and the work waiting for yours.</p>
        </div>
      </header>

      <section className="space-y-2" data-tour="ratez-queue">
        <h3 className="font-semibold">Rate others</h3>
        <Queue />
      </section>

      <section className="space-y-2" data-tour="ratez-dashboard">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">
            {d && !d.mine ? <>@{d.username}'s ratings</> : "Your ratings"}
          </h3>
          <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); setAsked(who.trim().replace(/^@/, "")); }}>
            <input className="neon-input !py-1 text-sm" placeholder="@member" value={who} onChange={(e) => setWho(e.target.value)} />
            <button className="re-btn !w-auto px-2 py-1 text-xs" type="submit"><Search size={12} /></button>
            {asked && <button type="button" className="re-link text-xs" onClick={() => { setWho(""); setAsked(""); }}>mine</button>}
          </form>
        </div>
        {err && <p className="text-sm text-mcz-ember">{err}</p>}
        {!d && !err && <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>}
        {d && <Dashboard d={d} />}
      </section>
    </div>
  );
}
