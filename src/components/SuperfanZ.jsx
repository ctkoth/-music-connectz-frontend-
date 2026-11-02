// SuperfanZ 🫶 — an artist's top fans, counted from what they did with the
// artist's posts (plays heard to the end, ratings, comments, shares), paying
// nothing. The rule, the points, the floor, the list and "where you stand" are
// all the server's (/api/economy/superfanz/); this decides nothing.
//
// On somebody else's profile it says how close you are and what each act is
// worth, so the climb is readable before you make it. On your own it lists the
// people who keep coming back to your work, each a door to their profile.
// Whether YOU appear on artists' lists is your VisibilitieZ "superfan" switch.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import MemberName from "../MemberName.jsx";

export default function SuperfanZ({ username = "" }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    const q = username ? `?username=${encodeURIComponent(username)}` : "";
    api(`/api/economy/superfanz/${q}`).then(setD).catch(() => setD(false));
  }, [username]);
  // A failed fetch renders nothing: an empty fan list reads as "nobody cares",
  // which a 500 has not established.
  if (!d) return null;

  const you = d.you;
  return (
    <section data-tour="superfanz" className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
        {d.name} {d.emoji}
      </p>
      {d.top.length === 0 ? (
        <p className="text-xs text-white/45">
          {d.mine ? "No superfans yet — they show up here as people keep coming back to your posts."
                  : `Nobody has reached ${d.min_points} yet.`}
        </p>
      ) : (
        <ol className="space-y-1">
          {d.top.map((r) => (
            <li key={r.username} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-white/40">#{r.rank}</span>
                <MemberName username={r.username} bare />
                <span aria-hidden>{d.emoji}</span>
              </span>
              <span className="shrink-0 text-[11px] text-white/55"
                    title="A count of what they did, never a rating of them">
                {r.points} pts · {r.listen} plays · {r.rate} ratings · {r.comment} comments · {r.share} shares
              </span>
            </li>
          ))}
        </ol>
      )}
      {you && (
        <p className="text-xs text-white/70">
          {you.superfan
            ? <>You're one of @{d.artist}'s SuperfanZ {d.emoji} — your comments pin to the top of their posts.</>
            : <>You have {you.points} pts with @{d.artist}; {you.to_top} more to be one of their SuperfanZ.</>}
          {Array.isArray(d.your_listing) && d.your_listing.includes("private") && (
            <span className="text-white/45"> You're hidden from these lists (VisibilitieZ).</span>
          )}
        </p>
      )}
      <p className="text-[10px] text-white/40">{d.rule}</p>
    </section>
  );
}
