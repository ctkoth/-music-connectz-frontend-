// Thorough 💯 — the platform group of everyone wearing a Thorough badge,
// grouped by rung, with the group's newest posts on top (Corey's order: the
// room is its work first, then who is in it).
//
// Unlike every other list in GroupZ this one is not the member's own note: it
// is derived from the badge, and the screen says so. A member who hides the
// badge in BadgeZ is not listed. The rating, the rungs, the caveat and "what
// the next rung takes" are all the server's (`/api/economy/thoroughz/`).
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { goToSpot, openMember } from "../goto.js";
import MemberName from "../MemberName.jsx";
import ThoroughMark from "./ThoroughMark.jsx";

export default function ThoroughGroup() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/api/economy/thoroughz/").then(setD).catch((e) => setErr(e.message || "Couldn't load Thorough 💯."));
  }, []);

  if (err) return <section className="neon-frame p-4 text-xs text-white/50">{err}</section>;
  if (!d) return null;
  const mine = d.mine || {};

  return (
    <section data-tour="thorough" className="neon-frame p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          {/* Placeholder until Corey's icon lands. */}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-lg" aria-hidden>
            {d.group?.emoji || "💯"}
          </span>
          {d.group?.name || "Thorough 💯"}
          <span className="text-xs font-normal text-white/40">· {d.members} {d.members === 1 ? "member" : "members"}</span>
        </p>
      </div>
      <p className="mb-3 text-[11px] text-white/45">
        Everyone wearing a Thorough badge, by rung. Not a list you keep — it follows the badge, and a member who hides
        theirs in BadgeZ isn't listed.
      </p>

      <div className="mb-3 rounded-xl bg-black/25 p-3 text-xs text-white/70">
        {mine.rating == null
          ? <>You're not rated yet ({mine.lifts || 0} of {d.min_lifts} lifts in the last 28 days).</>
          : <>Your Thorough rating: <b className="text-white">{mine.rating}/10</b>
              {mine.wearing ? <> · wearing <ThoroughMark mark={mine.wearing} /></> : mine.tier ? " · your badge is hidden" : ""}</>}
        {mine.next && <> Next: <b>{mine.next.label}</b> at {mine.next.rating}.</>}
        {" "}
        <button className="underline hover:text-white" onClick={() => goToSpot("bodiez", "")}>Train in BodieZ</button>
        <p className="mt-1 text-[10px] text-white/40">{d.caveat}</p>
      </div>

      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">Posts</h4>
      {(d.posts || []).length === 0
        ? <p className="mb-3 text-xs text-white/40">No posts from the group yet.</p>
        : (
          <ul className="mb-3 space-y-1">
            {d.posts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs">
                {p.url
                  ? <a href={p.url} className="min-w-0 truncate font-medium text-white/90 hover:underline">{p.title || "Untitled"}</a>
                  : <button className="min-w-0 truncate text-left font-medium text-white/90 hover:underline"
                            onClick={() => openMember(p.author)}>{p.title || "Untitled"}</button>}
                <span className="shrink-0 text-white/50">
                  <MemberName username={p.author} bare /><ThoroughMark mark={p.mark} compact />
                </span>
              </li>
            ))}
          </ul>
        )}

      <div className="space-y-2">
        {(d.tiers || []).map((t) => (
          <div key={t.key} className="rounded-xl bg-black/25 p-3">
            <p className="mb-1 text-sm font-semibold">
              <span aria-hidden>{t.emoji}</span> {t.name}
              <span className="ml-1 text-[11px] font-normal text-white/40">
                {t.rating}/10 · {t.count}
              </span>
            </p>
            {t.members.length === 0
              ? <p className="text-[11px] text-white/35">Nobody on this rung yet.</p>
              : (
                <div className="flex flex-wrap gap-2 text-xs">
                  {t.members.map((m) => <span key={m} className="rounded-lg bg-white/5 px-2 py-1"><MemberName username={m} bare /></span>)}
                </div>
              )}
          </div>
        ))}
      </div>
    </section>
  );
}
