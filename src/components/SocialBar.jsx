// The five controls on any item anybody makes — Karma (vote + mood), Rate, Comment, Share, Open in…
// — in that order, on every app, on the one social endpoint, so a vote is a vote
// everywhere and nobody has to learn a new bar per app. Each shows what it costs or
// earns BESIDE it, before it is pressed (cost/gain rule): a first rating pays the rater
// (rating_reward_energy), a comment is free until the day's free ones are used
// (comment_cost_energy). Sharing and the doors into other apps are the server's too
// (`share`, `opens`), so the bar never invents an address or a destination. The server
// decides what is allowed; a refusal is shown as it came, and a switched-off control
// says why on itself rather than sitting there dead.
import { useEffect, useState } from "react";
import { Check, ExternalLink, MessageSquare, Share2, Smile, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { ENERGY } from "../resources.js";
import { commentPrice, moodRows, nextMood, rateState, shareUrl, shownMoods, whyOff } from "../socialBar.js";

const CHIP = "inline-flex items-center gap-1 rounded px-2 py-1 disabled:opacity-40";

export default function SocialBar({ item, canRate = true, compact = false }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  // One panel at a time keeps five controls from becoming a wall on a phone.
  const [panel, setPanel] = useState(compact ? null : "comment");
  const [body, setBody] = useState("");
  const [score, setScore] = useState("");
  const [reason, setReason] = useState("");
  const [copied, setCopied] = useState(false);

  const load = () => api(`/api/economy/social/?item=${encodeURIComponent(item)}`).then(setD).catch(() => setD(null));
  useEffect(() => { if (item) load(); }, [item]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!item || !d) return null;

  const act = async (action, payload) => {
    setErr("");
    try { setD(await api(`/api/economy/social/${action}/`, { method: "POST", body: { item, ...payload } })); return true; }
    catch (e) { setErr(e.message || "That didn't go through. Nothing was charged."); return false; }
  };
  const toggle = (name) => setPanel((p) => (p === name ? null : name));
  const on = (name) => panel === name ? "bg-mcz-cyan/20 text-white" : "bg-white/5 text-white/70";

  const moods = d.moods;           // absent on an older server: the picker simply isn't drawn
  const rate = rateState(d);
  const price = commentPrice(d);
  const url = shareUrl(window.location.origin, d.share);
  const off = (c) => whyOff(c, { canRate, share: d.share, opens: d.opens });

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setErr("Couldn't copy — select the link and copy it by hand."); }
  }
  async function nativeShare() {
    try { await navigator.share({ title: "Music ConnectZ", url }); } catch { /* cancelled */ }
  }

  return (
    <div className="space-y-2 text-xs" data-socialbar>
      <div className="flex flex-wrap items-center gap-2">
        {/* 1 · Karma — the up/down vote. Free. */}
        <span className="inline-flex items-center gap-1" aria-label="Karma">
          <span className="text-white/45">Karma</span>
          <button className={`${CHIP} ${d.my === 1 ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-white/70"}`}
                  onClick={() => act("react", { value: d.my === 1 ? 0 : 1 })} aria-label="Like"><ThumbsUp size={12} /> {d.up}</button>
          <button className={`${CHIP} ${d.my === -1 ? "bg-mcz-ember/20 text-mcz-ember" : "bg-white/5 text-white/70"}`}
                  onClick={() => act("react", { value: d.my === -1 ? 0 : -1 })} aria-label="Dislike"><ThumbsDown size={12} /> {d.down}</button>
          {/* Mood: how it made people feel. Only the ones somebody chose are drawn here. */}
          {shownMoods(moods).map((m) => (
            <button key={m.key} className={`${CHIP} ${m.mine ? "bg-mcz-cyan/25 text-white" : "bg-white/5 text-white/70"}`}
                    disabled={!canRate} onClick={() => act("mood", { mood: nextMood(moods, m.key) })}
                    aria-label={`${m.label}: ${m.count}`} title={m.label}>{m.emoji} {m.count}</button>
          ))}
          {moods && moods.list.length > 0 && (
            <button className={`${CHIP} ${on("mood")}`} aria-label="React with a mood" onClick={() => toggle("mood")}>
              <Smile size={12} /> React
            </button>
          )}
        </span>
        {/* 2 · Rate — the gain sits beside it until the first rating is made. */}
        <button className={`${CHIP} ${on("rate")}`} disabled={!!off("rate")} title={off("rate")} aria-label="Rate" onClick={() => toggle("rate")}>
          <Star size={12} /> Rate · {rate.text}
          {rate.gain > 0 && <span className="text-emerald-300">+{rate.gain} {ENERGY}</span>}
        </button>
        {/* 3 · Comment — free or priced, said before it is pressed. */}
        <button className={`${CHIP} ${on("comment")}`} aria-label="Comment" onClick={() => toggle("comment")}>
          <MessageSquare size={12} /> {d.comments.length}
          {price.kind === "cost" ? <span className="text-mcz-ember">−{price.cost} {ENERGY}</span> : <span className="text-white/40">{price.text}</span>}
        </button>
        {/* 4 · Share as a link — free. */}
        <button className={`${CHIP} ${on("share")}`} disabled={!!off("share")} title={off("share")} aria-label="Share" onClick={() => toggle("share")}>
          <Share2 size={12} /> Share <span className="text-emerald-300">Free</span>
        </button>
        {/* 5 · Open in other apps — nothing is a dead end. */}
        <button className={`${CHIP} ${on("open")}`} disabled={!!off("open")} title={off("open")} aria-label="Open in other apps" onClick={() => toggle("open")}>
          <ExternalLink size={12} /> Open in…
        </button>
      </div>

      {panel === "mood" && moods && (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {moodRows(moods).map((m) => (
              <button key={m.key} disabled={!canRate} title={!canRate ? "You can't react to your own work" : m.label}
                      className={`${CHIP} ${m.mine ? "bg-mcz-cyan/25 text-white" : "bg-white/5 text-white/80"}`}
                      onClick={() => act("mood", { mood: nextMood(moods, m.key) })}>
                <span className="text-base leading-none">{m.emoji}</span> {m.label}{m.count > 0 ? ` ${m.count}` : ""}
              </button>
            ))}
            <span className="text-emerald-300">Free</span>
          </div>
          <p className="text-white/40">How it made you feel. One mood each; press yours again to clear it. It pays nothing and never changes a rating.</p>
        </div>
      )}

      {panel === "rate" && canRate && (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Your rating" data-nomemo="true" value={score || d.my_rating || ""}
                  className="rounded border border-white/10 bg-black/40 px-1 py-0.5 text-xs text-white"
                  onChange={(e) => setScore(e.target.value)}>
            <option value="">Rate 1-10</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input className="neon-input !py-1 min-w-0 flex-1 text-xs" maxLength={200} placeholder="Why? (optional, only the maker sees it)"
                 value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="neon-btn-ghost !w-auto px-2 py-1 text-xs" disabled={!score}
                  onClick={async () => { if (await act("rate", { score: Number(score), reason })) { setScore(""); setReason(""); } }}>
            {d.my_rating ? "Change rating" : "Rate"}
          </button>
          {rate.gain > 0 && <span className="text-emerald-300">+{rate.gain} {ENERGY}</span>}
        </div>
      )}

      {panel === "comment" && (
        <>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {d.comments.map((c) => (
              <p key={c.id} className="text-white/70" data-ugc="true"><span className="font-semibold text-white/85">@{c.user}</span> {c.body}</p>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="neon-input !py-1 min-w-0 flex-1 text-xs" placeholder="Add a comment" aria-label="Comment text"
                   value={body} onChange={(e) => setBody(e.target.value)} />
            <button className="neon-btn-ghost !w-auto px-2 py-1 text-xs" disabled={!body.trim()}
                    onClick={async () => { if (await act("comment", { body: body.trim() })) setBody(""); }}>Comment</button>
            <span className={price.kind === "cost" ? "text-mcz-ember" : "text-white/40"}>
              {price.kind === "cost" ? `−${price.cost} ${ENERGY}` : price.text}
            </span>
          </div>
        </>
      )}

      {panel === "share" && url && (
        <div className="space-y-1">
          <p className="text-white/55">{d.share.who}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly className="neon-input !py-1 min-w-0 flex-1 text-xs" value={url} aria-label="Link" onFocus={(e) => e.target.select()} />
            <button className="neon-btn-ghost !w-auto px-2 py-1 text-xs" onClick={copy}>
              {copied ? <><Check size={12} /> Copied</> : "Copy link"}
            </button>
            {typeof navigator !== "undefined" && navigator.share && (
              <button className="neon-btn-ghost !w-auto px-2 py-1 text-xs" onClick={nativeShare}>Share…</button>
            )}
            <span className="text-emerald-300">Free</span>
          </div>
        </div>
      )}

      {panel === "open" && (d.opens || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {d.opens.map((o) => (
            <button key={`${o.tab}:${o.label}`} className="neon-btn-ghost !w-auto px-2 py-1 text-xs"
                    onClick={() => goToSpot(o.tab, o.target)}>{o.label}</button>
          ))}
          <span className="text-emerald-300">Free</span>
        </div>
      )}
      {err && <p className="text-mcz-ember">{err}</p>}
    </div>
  );
}
