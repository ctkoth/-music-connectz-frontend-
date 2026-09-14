// The coach's memory, per instrument.
//
// Until `TakeScore` shipped, every score this app produced was handed to the
// browser and dropped, and `instruments._HISTORY_CAVEAT` had to tell members
// that Consistency, Voice Health and Goal Match "come from your history" while
// there was no history. This is where that history is read back.
//
// The one rule this screen must not break: **it never fills an empty slot with
// a number.** Every finding the server sends carries either a value or a `why`
// explaining what is missing, and this renders the `why` verbatim. A fake
// score at the moment somebody is deciding whether any of this is real is the
// substance rule's worst case — and unlike a fake price, nobody can catch it.
//
// It computes nothing else either. The strain level, the thresholds, the
// bridge and the three history scores are all the server's; a client that
// worked out its own "you're straining" would be a second opinion nobody
// asked for, on the one judgement in this app that a subscription cannot
// override.
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "../api.js";
import { asDict, asList } from "../shape.js";
import { goToSpot } from "../goto.js";

/** A finding that may legitimately have no number.
 *  `—` and the server's sentence, never a 0 standing in for "not measured". */
function Finding({ label, score, why, suffix = "/ 10" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-lg font-bold">
        {score == null ? <span className="text-white/30">—</span> : <>{score}<span className="text-[12px] font-normal text-white/40"> {suffix}</span></>}
      </p>
      {why && <p className="mt-0.5 text-[11px] text-white/45">{why}</p>}
    </div>
  );
}

const STRAIN_STYLE = {
  clear: "border-emerald-400/25 bg-emerald-400/5 text-emerald-300",
  watch: "border-amber-400/30 bg-amber-400/5 text-amber-300",
  strain: "border-mcz-ember/35 bg-mcz-ember/10 text-mcz-ember",
  unmeasured: "border-white/10 bg-white/5 text-white/50",
};

export default function ProgressPanel({ appKey }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api(`/api/${appKey}/progress/`)
    .then((d) => { setData(d); setErr(""); })
    .catch((e) => setErr(e.message || "Couldn't load your progress."));
  useEffect(() => { load(); }, [appKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function declare(patch) {
    setSaving(true);
    try { setData(await api(`/api/${appKey}/goal/`, { method: "POST", body: patch })); setErr(""); }
    catch (e) { setErr(e.message || "That didn't save."); }
    finally { setSaving(false); }
  }

  if (!data && !err) {
    return <p className="flex items-center gap-2 text-white/40">
      <Loader2 className="animate-spin" size={14} /> Loading your history…</p>;
  }
  // A failed fetch renders the reason rather than an empty progress screen —
  // an empty one reads as "you have done nothing", which is a different and
  // much worse claim than "this didn't load".
  if (err) return <p className="text-[12px] text-mcz-ember">{err}</p>;

  const declared = asDict(data.declared);
  const ranges = asList(data.ranges);
  const strain = asDict(data.strain);
  const weakest = asDict(data.weakest);
  const bridge = asDict(data.bridge);
  const detected = asDict(data.detected);
  const hist = asDict(data.history_scores);
  const trend = asDict(data.trend);
  const takes = asList(data.takes);

  return (
    <section className="space-y-4" data-tour={`${appKey}-progress`}>
      <header className="flex items-baseline gap-2">
        <h3 className="font-display text-lg font-bold">Your history</h3>
        <span className="text-[12px] text-white/40">
          {data.total_takes} coached take{data.total_takes === 1 ? "" : "s"}
        </span>
      </header>

      {/* Recovery first. It is a safety rule rather than a feature — no tier
          lifts it — so it sits above everything a member came here to read. */}
      {strain.level && strain.level !== "clear" && (
        <p className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[12px] ${STRAIN_STYLE[strain.level] || STRAIN_STYLE.unmeasured}`}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{strain.why}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Finding label="Consistency" {...asDict(hist.consistency)} />
        <Finding label="Voice health" {...asDict(hist.voice_health)} />
        <Finding label="Goal match" {...asDict(hist.goal_match)} />
      </div>
      {/* The only one of the three with a door: no goal set is fixable from
          here, and a score that says "—" without saying how to fill it is the
          read-only surface the cross-pollination rule calls unfinished. */}
      {hist.goal_match?.open_in?.tab && (
        <button onClick={() => goToSpot(hist.goal_match.open_in.tab, hist.goal_match.open_in.target)}
                className="text-[12px] text-mcz-cyan hover:underline">
          Set a goal range →
        </button>
      )}

      {/* What the coach HEARD against what you SAID. Kept side by side rather
          than merged: collapsing them is how a goal quietly becomes a finding
          about you. */}
      {ranges.length > 0 && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3" data-tour={`${appKey}:goal`}>
          <p className="text-[11px] uppercase tracking-wide text-white/40">Range</p>
          <p className="text-[12px] text-white/70">
            {detected.range
              ? <>Your takes read as <b>{bridge.from_label || detected.range}</b>
                  {detected.low && detected.high && <span className="text-white/45"> ({detected.low}–{detected.high})</span>}</>
              : <span className="text-white/45">{detected.why}</span>}
          </p>
          {bridge.why && <p className="text-[12px] text-white/50">{bridge.why}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] text-white/45">
              What you are now
              <select value={declared.confirmed_range || ""} disabled={saving}
                      onChange={(e) => declare({ confirmed_range: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white">
                <option value="">Haven't said</option>
                {ranges.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-white/45">
              What you're working towards
              <select value={declared.goal_range || ""} disabled={saving}
                      onChange={(e) => declare({ goal_range: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white">
                <option value="">Haven't said</option>
                {ranges.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-white/35">
            Set a goal and every take is scored against it without picking one each time.
          </p>
        </div>
      )}

      {/* Fatigue sensitivity moves the strain threshold and NOTHING else. Said
          out loud, because a control next to a score usually moves the score,
          and how quickly somebody tires is not how good they are. */}
      {strain.level !== "unmeasured" && (
        <label className="block text-[11px] text-white/45">
          How quickly you feel it — this only changes when the app eases you off the hard
          settings. It never moves a score.
          <select value={declared.fatigue_sensitivity || ""} disabled={saving}
                  onChange={(e) => declare({ fatigue_sensitivity: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white sm:w-72">
            {asList(data.sensitivities).map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>
      )}

      {/* The weak spot, and the way to work on it. Two weeks of takes, not one
          — one take's worst score is a bad day. */}
      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-white/40">Weakest lately</p>
        {weakest.key ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm">
              <b>{weakest.label}</b>
              <span className="text-white/45"> · {weakest.average} / 10 across {weakest.takes} takes</span>
            </p>
            <button onClick={() => goToSpot(appKey, `${appKey}-drills`)}
                    className="flex items-center gap-1 rounded-md bg-mcz-cyan/10 px-2 py-1 text-[11px] text-mcz-cyan hover:bg-mcz-cyan/20">
              Drill it <ArrowRight size={12} />
            </button>
          </div>
        ) : <p className="text-[12px] text-white/45">{weakest.why}</p>}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/40">Movement</p>
        {trend.rows?.length ? (
          <ul className="space-y-1">
            {asList(trend.rows).map((r) => (
              <li key={r.key} className="flex items-center gap-2 text-[12px]">
                <span className="w-28 shrink-0 truncate text-white/70">{r.label}</span>
                <span className={r.change > 0 ? "text-emerald-300" : r.change < 0 ? "text-mcz-ember" : "text-white/40"}>
                  {r.change > 0 ? <TrendingUp size={12} className="inline" /> :
                   r.change < 0 ? <TrendingDown size={12} className="inline" /> : null}
                  {" "}{r.was} → {r.now}
                </span>
                {/* Both counts travel with it: a dimension that moved from one
                    take to one take has not moved. */}
                <span className="text-white/30">({r.was_n} then, {r.now_n} since)</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-[12px] text-white/45">{trend.why}</p>}
      </div>

      {takes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/40">Recent takes</p>
          <ul className="space-y-1">
            {takes.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[12px]">
                <span className="font-bold">{t.overall ?? "—"}<span className="text-white/35">/10</span></span>
                <span className="text-white/45">{new Date(t.at).toLocaleDateString()}</span>
                {t.difficulty && <span className="text-white/35">{t.difficulty}</span>}
                {t.range_class && <span className="text-white/35">{t.range_class}</span>}
                {/* A score is never a dead end either — it opens the thing it
                    scored. */}
                {t.open_in?.tab && (
                  <button onClick={() => goToSpot(t.open_in.tab, t.open_in.target)}
                          className="ml-auto text-mcz-cyan hover:underline">open</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
