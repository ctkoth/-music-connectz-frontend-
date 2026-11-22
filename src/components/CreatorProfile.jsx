import { useEffect, useState } from "react";
import { BadgeCheck, MapPin } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { goToSpot } from "../goto.js";
import { BadgeWear } from "../BadgeWear.jsx";
import { RatingNumber } from "./Rating.jsx";
import { ratingText } from "../rating.js";

// The member's profile as other people meet it: avatar, name, handle, headline, where, a level bar, and four
// tabs — Portfolio, Stats, Badges, About. Every figure is the server's (member card, own posts, SkillZ hub);
// nothing is worked out or invented here, and a part that did not load is simply not drawn. A failed fetch
// leaves the editing screen below it exactly as it was.
const TABS = [["portfolio", "Portfolio"], ["stats", "Stats"], ["badges", "Badges"], ["about", "About"]];
const ago = (sec) => {
  const d = Math.floor((sec || 0) / 86400);
  return d < 1 ? "today" : d === 1 ? "1 day ago" : d < 7 ? `${d} days ago` : d < 14 ? "1 week ago" : `${Math.floor(d / 7)} weeks ago`;
};

export default function CreatorProfile({ username, worn }) {
  const [card, setCard] = useState(null);
  const [posts, setPosts] = useState(null);
  const [level, setLevel] = useState(null);
  const [tab, setTab] = useState("portfolio");

  useEffect(() => {
    if (!username) return;
    api(`/api/economy/members/${encodeURIComponent(username)}/`).then(setCard).catch(() => {});
    api("/api/economy/postz/?mine=1&sort=new").then((d) => setPosts(asList(d?.posts))).catch(() => {});
    api("/api/economy/skillz/").then((d) => {
      const top = asList(d?.apps).filter((a) => a.xp > 0).sort((a, b) => b.xp - a.xp)[0];
      if (top) setLevel(top);
    }).catch(() => {});
  }, [username]);

  if (!card) return null;
  const rated = (posts || []).filter((p) => p.rating != null);
  const avg = rated.length ? rated.reduce((s, p) => s + p.rating, 0) / rated.length : null;

  return (
    <section aria-label="Your profile as others see it" className="space-y-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-4 p-4">
        <span className="shrink-0 rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 p-[3px]">
          {card.avatar
            ? <img src={card.avatar} alt="" className="h-24 w-24 rounded-full bg-black object-cover" />
            : <span className="flex h-24 w-24 items-center justify-center rounded-full bg-black text-4xl font-extrabold text-white/80">{(card.display_name || username)[0].toUpperCase()}</span>}
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 truncate font-display text-3xl font-extrabold text-white">
            {card.display_name || username}
            {card.verified_18plus && <BadgeCheck size={22} className="shrink-0 text-violet-400" aria-label="18+ verified" />}
          </h2>
          <p className="text-[14px] text-white/60">@{username}</p>
          {card.headline && <p className="mt-1 text-[14px] text-white/85">{card.headline}</p>}
          {card.location && <p className="mt-1 flex items-center gap-1 text-[13px] text-white/65"><MapPin size={14} /> {card.location}</p>}
        </div>
      </div>
      {card.bio && <p className="px-4 text-[13px] italic text-white/70">“{card.bio.slice(0, 140)}”</p>}

      {level && (
        <div className="flex items-center gap-3 border-y border-white/10 px-4 py-3">
          <div className="shrink-0">
            <p className="text-[15px] font-extrabold tracking-wide text-white">LEVEL <span className="text-violet-300">{level.level}</span></p>
            <p className="text-[12px] text-white/60">{level.label}</p>
          </div>
          <div className="min-w-0 flex-1">
            <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${((level.xp % 500) / 500) * 100}%` }} />
            </span>
            <p className="mt-1 flex justify-between text-[12px] text-white/60">
              <span>{level.xp % 500} / 500 XP</span><span>NEXT: Level {level.level + 1}</span>
            </p>
          </div>
        </div>
      )}

      <div role="tablist" className="flex justify-around border-b border-white/10 text-[13px] font-bold uppercase tracking-widest">
        {TABS.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`px-2 py-2.5 ${tab === k ? "border-b-2 border-violet-400 text-violet-300" : "text-white/55"}`}>{t}</button>
        ))}
      </div>

      <div className="px-4 pb-4">
        {tab === "portfolio" && (
          posts === null ? null : posts.length === 0
            ? <p className="text-sm text-white/60">Nothing posted yet. <button className="underline" onClick={() => goToSpot("postz", "postz:composer")}>Post your first track</button></p>
            : (
              <div className="space-y-2">
                {posts.slice(0, 3).map((p) => {
                  const img = p.media?.image?.url || p.media?.image || p.image_url;
                  return (
                    <button key={p.id} onClick={() => goToSpot("postz", "postz:main")}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-left">
                      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                        {typeof img === "string" && img
                          ? <img src={img} alt="" className="h-full w-full object-cover" />
                          : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900 to-fuchsia-900 text-xl">🎵</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-bold text-white">{p.title || "Untitled"}</span>
                        <span className="block truncate text-[12px] text-white/60">{[p.genre, ago(p.age_sec)].filter(Boolean).join(" · ")}</span>
                      </span>
                      {p.rating != null && <span className="shrink-0 text-right"><RatingNumber value={p.rating} size="sm" outOf /></span>}
                    </button>
                  );
                })}
                <button onClick={() => goToSpot("postz", "postz:main")} className="text-[13px] font-semibold text-violet-300">View all ›</button>
              </div>
            )
        )}
        {tab === "stats" && (
          <div className="grid grid-cols-2 gap-2 text-center">
            {[["Average rating", avg == null ? "—" : `${ratingText(null, Math.round(avg * 10) / 10)}/10`, rated.length ? `across ${rated.length} rated post${rated.length === 1 ? "" : "s"}` : "no rated posts yet"],
              ["Followers", card.followers ?? 0, `${card.following ?? 0} following`],
              ["Friends", card.friends ?? 0, `${card.fans ?? 0} fans`],
              ["Posts", posts ? posts.length : "—", "on Music ConnectZ"]].map(([l, v, sub]) => (
              <div key={l} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/55">{l}</p>
                <p className="font-display text-2xl font-extrabold text-white">{v}</p>
                <p className="text-[11px] text-white/55">{sub}</p>
              </div>
            ))}
          </div>
        )}
        {tab === "badges" && (
          (worn?.badges || []).length
            ? <BadgeWear badges={worn.badges} title={worn.title} size="h-14 w-14" onOpen={() => goToSpot("profilez", "badgez")} />
            : <p className="text-sm text-white/60">No badges yet — each one is earned from what you actually do. <button className="underline" onClick={() => goToSpot("profilez", "badgez")}>See what is on offer</button></p>
        )}
        {tab === "about" && (
          <div className="space-y-1 text-[14px] text-white/80">
            {card.bio ? <p>{card.bio}</p> : <p className="text-white/60">No bio yet — add one below.</p>}
            {asList(card.genres).length > 0 && <p className="text-white/65">Genres: {asList(card.genres).join(", ")}</p>}
            {asList(card.links).length > 0 && <p className="text-white/65">{asList(card.links).length} portfolio links</p>}
          </div>
        )}
      </div>
    </section>
  );
}
