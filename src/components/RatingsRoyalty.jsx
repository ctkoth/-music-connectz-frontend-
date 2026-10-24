import { useEffect, useState } from "react";
import { api } from "../api.js";

// Why a track earns what it earns, said BEFORE it earns it — and the one choice that lets the
// AI coach's scores count toward a skill rating. Both are the server's: the rule, the floor, the
// factor per post and the opt-in note are read from /royalty/ratings/ and /skillz-coach/, never
// typed here, so the screen can't state a rule the payout doesn't use.
//
// A failed fetch renders nothing: this is an explanation, and an error about an explanation
// is an interruption about an interruption.
export default function RatingsRoyalty() {
  const [r, setR] = useState(null);
  const [coach, setCoach] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/economy/royalty/ratings/").then(setR).catch(() => setR(null));
    api("/api/economy/skillz-coach/").then(setCoach).catch(() => setCoach(null));
  }, []);

  async function toggle() {
    if (!coach || busy) return;
    setBusy(true); setMsg("");
    try {
      setCoach(await api("/api/economy/skillz-coach/", { method: "POST", body: { enabled: !coach.enabled } }));
    } catch (e) { setMsg(e.message || "That didn't save."); }
    finally { setBusy(false); }
  }

  if (!r && !coach) return null;
  const rated = (r?.posts || []).filter((p) => p.applied);
  return (
    <div className="re-card space-y-3">
      {r && (
        <div className="space-y-1.5">
          <p className="re-label">Ratings and what a track earns</p>
          <p className="text-[12px] text-white/60">{r.rule}</p>
          {rated.length > 0 ? (
            <ul className="space-y-1 text-[12px]">
              {rated.map((p) => (
                <li key={p.post_id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="truncate text-white/80">{p.title || `Post #${p.post_id}`}</span>
                  <span className={p.factor < 1 ? "text-mcz-ember" : "text-emerald-300"}>
                    {p.factor < 1 ? "−" : p.factor > 1 ? "+" : ""}{p.factor === 1 ? "base rate" : `${Math.abs(p.pct - 100)}%`} <span className="text-white/40">· earns {p.pct}% of the base rate · {p.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-white/40">None of your tracks has {r.min_raters} outside ratings yet, so all earn the base rate.</p>
          )}
        </div>
      )}
      {coach && (
        <div className="space-y-1.5 border-t border-white/[0.06] pt-2">
          <p className="re-label">Let the AI coach count toward my skill ratings</p>
          <p className="text-[12px] text-white/60">{coach.note}</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/45">
            {coach.coaches.filter((c) => c.takes > 0).map((c) => (
              <li key={c.app_key}>{c.label}: {c.enough ? `median ${Number(c.median).toFixed(1)} from ${c.takes} takes` : `${c.takes} of ${coach.min_takes} takes needed`}</li>
            ))}
          </ul>
          <button className="re-btn !w-auto px-4" onClick={toggle} disabled={busy} aria-pressed={coach.enabled}>
            {coach.enabled ? "Counting — turn off" : "Turn on"}
          </button>
          {msg && <p className="text-[11px] text-mcz-ember">{msg}</p>}
        </div>
      )}
    </div>
  );
}
