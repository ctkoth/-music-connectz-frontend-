// What a member's profile shows of their work: posts, the median for each skill,
// comments on their posts and — only if they opted in — attractiveness.
// Everything is /api/economy/ratez/?username=, which already applies who may see
// which post and the member's own attractiveness switch. This renders it; it
// decides nothing. A failed fetch renders nothing.
import { useEffect, useState } from "react";
import { api } from "../api.js";
import { RatingRow } from "./Rating.jsx";

const H = "mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40";

export default function ProfileShowcase({ username }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let on = true;
    setD(null);
    api(`/api/economy/ratez/?username=${encodeURIComponent(username)}`)
      .then((r) => on && setD(r)).catch(() => {});
    return () => { on = false; };
  }, [username]);
  if (!d) return null;

  const posts = d.post?.posts || [];
  const skills = d.skill?.skills || [];
  const att = d.attractiveness || {};
  return (
    <div className="space-y-4">
      {skills.length > 0 && (
        <div>
          <p className={H}>SkillZ — median rating per skill</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {skills.map((s) => (
              <RatingRow key={s.skill} value={s.rating} label={s.skill}
                         detail={`median of ${s.count} rating${s.count === 1 ? "" : "s"}${s.coach ? " · includes AI coach (opted in)" : ""}`} />
            ))}
          </div>
          <p className="mt-1 text-[10px] text-white/35">{d.skill?.note}</p>
        </div>
      )}

      {att.median != null && (
        <div>
          <p className={H}>Attractiveness</p>
          <RatingRow value={att.median} label="Community median" detail="Shown because this member chose to show it. Not a judgement of their work." />
        </div>
      )}
      {att.hidden && <p className="text-[11px] text-white/35">This member keeps their attractiveness rating private.</p>}

      {posts.length > 0 && (
        <div>
          <p className={H}>PostZ</p>
          <ul className="space-y-1">
            {posts.slice(0, 12).map((p) => (
              <li key={p.id}>
                <a href={p.url} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm hover:border-mcz-cyan/40">
                  <span className="truncate text-white/85">{p.title || "Untitled"}</span>
                  <span className="shrink-0 text-xs text-white/50">
                    {p.rating != null ? `${p.rating} · ${p.count} rating${p.count === 1 ? "" : "s"}` : "not rated yet"}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.comments?.length > 0 && (
        <div>
          <p className={H}>Comments on their posts</p>
          <ul className="space-y-1.5">
            {d.comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80">
                <span className="text-white/45">@{c.by} on </span>
                <a href={`/p/${c.post_id}`} className="text-mcz-cyan hover:underline">{c.post_title || "a post"}</a>
                <p className="mt-0.5">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
