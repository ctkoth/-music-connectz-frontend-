import { useState } from "react";
import { api } from "../api.js";
import { openDoor } from "../doors.js";
import { shareLink, shareText } from "../shareText.js";
import { shellHas } from "../standalone.js";
import { PROMPTZ } from "../resources.js";
import { RatingRow } from "./Rating.jsx";

// What to celebrate, what is strong, what to watch and what to work on — read
// from the server's `coaching` block, worded by the server.
//
// The aim is a member who finishes reading it thinking "glad I saw that" about
// the problem and "yes, that's me" about the strength. So it says what is GOOD
// as plainly as what is not, asks whether they agree (their answer is kept — it
// is the cheapest honest check on whether a coach's read is any good), and every
// problem area leaves with a way to work on it: the drill, free, and where a
// writer exists the paid one with its price and its royalty stated first.
//
// It decides nothing: which areas, what the averages are, the sentences and the
// doors are all `/api/<key>/progress/`. An empty board renders nothing at all.

function Agree({ appKey, row, yes, no, onSaved }) {
  const [err, setErr] = useState("");
  async function say(agree) {
    setErr("");
    try { await api(`/api/${appKey}/agree/`, { method: "POST", body: { area: row.key, agree } }); onSaved(row.key, agree); }
    catch (e) { setErr(e.message); }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px]">
      <button type="button" onClick={() => say(true)} aria-pressed={row.agreed === true}
              className={`rounded-md px-2 py-0.5 ${row.agreed === true ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
        {yes}
      </button>
      <button type="button" onClick={() => say(false)} aria-pressed={row.agreed === false}
              className={`rounded-md px-2 py-0.5 ${row.agreed === false ? "bg-mcz-ember/20 text-mcz-ember" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
        {no}
      </button>
      {err && <span className="text-mcz-ember">{err}</span>}
    </span>
  );
}

// A measured climb, as a card. The server builds it from the same trend this board
// shows, so the numbers on it are the numbers above it and nobody can mint a bigger one.
function ShareWin({ appKey, win }) {
  const [msg, setMsg] = useState("");
  async function go() {
    setMsg("");
    try {
      const r = await api(`/api/${appKey}/win/${encodeURIComponent(win.key)}/share/`, { method: "POST" });
      const how = await shareLink({
        text: shareText({ progress: { label: win.label, was: win.was, now: win.now, days: 14 } }), url: r.share_url });
      setMsg(how === "shared" ? "Shared." : how === "copied" ? "Link copied." : "");
    } catch (e) { setMsg(e.message || "Couldn't make the card."); }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={go}
              className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-400/20">
        Share this win
      </button>
      {msg && <span className="text-[11px] text-emerald-300">{msg}</span>}
    </span>
  );
}

function Cost({ cost }) {
  if (!cost) return null;
  return cost.free_today
    ? <span className="text-emerald-300">free today</span>
    : <span className="text-mcz-ember">−{cost.amount} {PROMPTZ}</span>;
}

// A month of takes, as the member would tell it — built by the server from their own
// history, shareable as a story-sized card. Absent below three takes (no month yet).
function Recap({ appKey, recap }) {
  const [msg, setMsg] = useState("");
  if (!recap) return null;
  async function go() {
    setMsg("");
    try {
      const r = await api(`/api/${appKey}/recap/share/`, { method: "POST" });
      const text = `My month with the AI coach: ${recap.takes} takes${recap.climb ? `, ${recap.climb.label} ${recap.climb.was} → ${recap.climb.now}` : ""}. Get yours scored free:`;
      const how = await shareLink({ text, url: r.share_url });
      setMsg(how === "shared" ? "Shared." : how === "copied" ? "Link copied." : "");
    } catch (e) { setMsg(e.message || "Couldn't make the card."); }
  }
  return (
    <div className="space-y-1.5 rounded-lg bg-white/5 p-2.5">
      <p className="text-[11px] uppercase tracking-wide text-white/50">📅 Your last {recap.days} days</p>
      <p className="text-white/85">
        {recap.takes} takes · {recap.days_shown_up} days you showed up
        {recap.best != null ? ` · best ${recap.best_exact ?? recap.best}` : ""}
        {recap.climb ? ` · ${recap.climb.label} ${recap.climb.was} → ${recap.climb.now}` : ""}
        {recap.strongest ? ` · strongest: ${recap.strongest.label}` : ""}
      </p>
      <span className="inline-flex items-center gap-2">
        <button type="button" onClick={go}
                className="rounded-md bg-mcz-cyan/10 px-2 py-0.5 text-[11px] text-mcz-cyan hover:bg-mcz-cyan/20">Share my month</button>
        {msg && <span className="text-[11px] text-emerald-300">{msg}</span>}
      </span>
    </div>
  );
}

export default function CoachingBoard({ appKey, coaching, recap }) {
  const [saved, setSaved] = useState({});
  const c = coaching || {};
  const wins = c.wins || [], alerts = c.alerts || [], problems = c.problems || [], strengths = c.strengths || [];
  if (!wins.length && !alerts.length && !problems.length && !strengths.length && !recap) return null;
  const withSaved = (r) => ({ ...r, agreed: r.key in saved ? saved[r.key] : r.agreed });
  const onSaved = (k, v) => setSaved((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[12px]" data-tour={`${appKey}-coaching`}>
      <Recap appKey={appKey} recap={recap} />

      {wins.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-emerald-300/90">🎉 You're improving</p>
          {wins.map((w) => (
            <p key={w.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/80">
              <span>{w.text}</span>
              <ShareWin appKey={appKey} win={w} />
            </p>
          ))}
        </div>
      )}

      {strengths.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-mcz-gold/90">💪 What you're strong at</p>
          {strengths.map(withSaved).map((s) => (
            <div key={s.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <RatingRow value={s.average} label={s.label} detail={`across ${s.takes} takes`} />
              <Agree appKey={appKey} row={s} yes="Yes, that's me" no="Not really" onSaved={onSaved} />
            </div>
          ))}
          {c.worked_last_take?.length > 0 && (
            <p className="text-white/55">Last take, the coach liked: {c.worked_last_take.join(" · ")}</p>
          )}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-mcz-ember/90">⚠️ Worth a look</p>
          {alerts.map((a) => <p key={a.key} className="text-white/75">{a.text}</p>)}
        </div>
      )}

      {problems.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-mcz-cyan/90">🎯 What to work on</p>
          {problems.map(withSaved).map((p) => (
            <div key={p.key} className="space-y-1 rounded-lg bg-white/5 p-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingRow value={p.average} label={p.label} detail={`across ${p.takes} takes`} />
                <Agree appKey={appKey} row={p} yes="Glad I saw this — I agree" no="Not quite" onSaved={onSaved} />
              </div>
              {p.help.filter((h) => shellHas(h.tab)).map((h) => (
                <div key={h.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <button onClick={() => openDoor(h)} data-door={h.key}
                          className="rounded-md bg-mcz-cyan/10 px-2 py-1 text-[11px] text-mcz-cyan hover:bg-mcz-cyan/20">{h.label}</button>
                  <Cost cost={h.cost} />
                  <span className="text-[11px] text-white/45">{h.note}</span>
                </div>
              ))}
            </div>
          ))}
          {c.from_last_take?.length > 0 && (
            <p className="text-white/55">From your last take: {c.from_last_take.join(" · ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
