import { useEffect, useState } from "react";
import { api } from "../api.js";
import { RatingRow } from "./Rating.jsx";

// The coach's /10 for one finished workout, and the opt-in to the board.
// It decides nothing: rating, caveat, rule and the board are the server's.
// Free either way, and said before the checkbox is touched.
export default function SessionRating({ rating }) {
  const [lb, setLb] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    api("/api/economy/bodiez/leaderboard/").then((d) => live && setLb(d)).catch(() => {});
    return () => { live = false; };
  }, []);

  async function toggle(next) {
    setErr("");
    try { setLb(await api("/api/economy/bodiez/leaderboard/", { method: "POST", body: { opt_in: next } })); }
    catch (e) { setErr(e?.message || "Couldn't change that. Nothing was changed."); }
  }

  if (!rating) return null;
  return (
    <div className="space-y-2 rounded-lg border border-white/10 p-2.5">
      {rating.rating != null
        ? <RatingRow value={rating.rating} outOf label="Coach rating" detail={rating.why} />
        : <p className="text-xs text-white/55">Not rated yet — {rating.why}</p>}
      <p className="text-[10px] text-white/30">{rating.caveat}</p>
      {lb && (
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-xs text-white/80">
            <input type="checkbox" checked={lb.opted_in} onChange={(e) => toggle(e.target.checked)} />
            <span>Put me on the leaderboard (free) — shows my username and average rating.</span>
          </label>
          <p className="text-[10px] text-white/40">{lb.rule}</p>
          {lb.leaders.length > 0 && (
            <ol className="text-[11px] text-white/70">
              {lb.leaders.slice(0, 10).map((r) => (
                <li key={r.username}>{r.rank}. {r.username} — {r.average}/10 over {r.rated_sessions} sessions</li>
              ))}
            </ol>
          )}
        </div>
      )}
      {err && <p className="text-xs text-red-300">{err}</p>}
    </div>
  );
}
