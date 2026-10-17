import { useState } from "react";
import { api } from "../api.js";
import { openDoor } from "../doors.js";
import { shellHas } from "../standalone.js";
import { PROMPTZ } from "../resources.js";

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

function Cost({ cost }) {
  if (!cost) return null;
  return cost.free_today
    ? <span className="text-emerald-300">free today</span>
    : <span className="text-mcz-ember">−{cost.amount} {PROMPTZ}</span>;
}

export default function CoachingBoard({ appKey, coaching }) {
  const [saved, setSaved] = useState({});
  const c = coaching || {};
  const wins = c.wins || [], alerts = c.alerts || [], problems = c.problems || [], strengths = c.strengths || [];
  if (!wins.length && !alerts.length && !problems.length && !strengths.length) return null;
  const withSaved = (r) => ({ ...r, agreed: r.key in saved ? saved[r.key] : r.agreed });
  const onSaved = (k, v) => setSaved((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[12px]" data-tour={`${appKey}-coaching`}>
      {wins.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-emerald-300/90">🎉 You're improving</p>
          {wins.map((w) => <p key={w.key} className="text-white/80">{w.text}</p>)}
        </div>
      )}

      {strengths.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-mcz-gold/90">💪 What you're strong at</p>
          {strengths.map(withSaved).map((s) => (
            <div key={s.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-white/85"><b>{s.label}</b> <span className="text-white/45">{s.average} / 10 across {s.takes} takes</span></span>
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
                <span className="text-white/90"><b>{p.label}</b> <span className="text-white/45">{p.average} / 10 across {p.takes} takes</span></span>
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
