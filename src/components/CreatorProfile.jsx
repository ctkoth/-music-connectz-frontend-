import { useEffect, useState } from "react";
import { BadgeCheck, MapPin } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { goToSpot } from "../goto.js";
import { BadgeWear } from "../BadgeWear.jsx";
import { RatingNumber } from "./Rating.jsx";
import CoachBest from "./CoachBest.jsx";
import { ratingText } from "../rating.js";
import { playTrack, useNowPlaying } from "../nowPlaying.js";

// The member's profile as other people meet it: avatar, name, handle, headline, where, a level bar, and four
// tabs — Portfolio, Stats, Badges, About. Every figure is the server's (member card, own posts, SkillZ hub);
// nothing is worked out or invented here, and a part that did not load is simply not drawn. A failed fetch
// leaves the editing screen below it exactly as it was.
const TABS = [["portfolio", "Portfolio"], ["stats", "Stats"], ["badges", "Badges"], ["about", "About"]];
// A real waveform: the recording is decoded in the browser and each bar is the loudest sample in its slice.
// Nothing is drawn when it cannot be (too big, not audio, blocked) — never a made-up shape.
const WAVES = new Map();
async function waveFor(src, bars = 56) {
  if (WAVES.has(src)) return WAVES.get(src);
  const r = await fetch(src);
  if (!r.ok || (Number(r.headers.get("content-length")) || 0) > 25e6) throw new Error("skip");
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const a = await ctx.decodeAudioData(await r.arrayBuffer());
    const ch = a.getChannelData(0), size = Math.max(1, Math.floor(ch.length / bars)), peaks = [];
    for (let i = 0; i < bars; i++) {
      let m = 0;
      for (let j = i * size; j < Math.min(ch.length, (i + 1) * size); j += 16) m = Math.max(m, Math.abs(ch[j]));
      peaks.push(m);
    }
    const top = Math.max(...peaks) || 1;
    const out = { peaks: peaks.map((v) => v / top), seconds: a.duration };
    WAVES.set(src, out);
    return out;
  } finally { ctx.close?.(); }
}
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const COLORS = ["#a35cff", "#ff3fbf", "#22d3ee"];

function PostPlayer({ post, color }) {
  const [wave, setWave] = useState(null);
  const np = useNowPlaying();
  const src = post.media?.audio || (post.media_type === "audio" ? post.media_url : "");
  const item = `post:${post.id}`;
  useEffect(() => { if (src) waveFor(src).then(setWave).catch(() => {}); }, [src]);
  if (!src) return null;
  const on = np.track?.item === item;
  return (
    <div className="mt-2 flex items-center gap-3">
      <button type="button" aria-label={on ? `Playing ${post.title}` : `Play ${post.title}`}
        onClick={() => playTrack({ item, src, title: post.title, author: post.author, url: `/p/${post.id}` })}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black" style={{ background: color }}>
        {on ? "❚❚" : "▶"}
      </button>
      {wave && (
        <svg viewBox={`0 0 ${wave.peaks.length * 4} 32`} preserveAspectRatio="none" className="h-8 min-w-0 flex-1" aria-hidden="true">
          {wave.peaks.map((v, i) => {
            const h = Math.max(2, v * 30);
            return <rect key={i} x={i * 4} y={16 - h / 2} width="2.2" height={h} rx="1" fill={color} />;
          })}
        </svg>
      )}
      {wave && <span className="shrink-0 text-[13px] text-white/70">{clock(wave.seconds)}</span>}
    </div>
  );
}

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
      const apps = asList(d?.apps);
      const top = apps.filter((a) => a.xp > 0).sort((a, b) => b.xp - a.xp)[0];
      if (top) setLevel({ top });
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

      {level?.top && (
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
          <div className="shrink-0">
            <p className="text-[15px] font-extrabold tracking-wide text-white">LEVEL <span className="text-violet-300">{level.top.level}</span></p>
            <p className="text-[12px] text-white/60">Top coach · {level.top.label}</p>
          </div>
          <div className="min-w-0 flex-1">
            <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${((level.top.xp % 500) / 500) * 100}%` }} />
            </span>
            <p className="mt-1 flex justify-between text-[12px] text-white/60">
              <span>{level.top.xp % 500} / 500 XP</span><span>NEXT: Level {level.top.level + 1}</span>
            </p>
          </div>
        </div>
      )}
      <CoachBest rows={card.coach_best} className="mx-4 my-3" />

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
                    <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                      <button onClick={() => goToSpot("postz", "postz:main")} className="flex w-full items-center gap-3 text-left">
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
                      <PostPlayer post={p} color={COLORS[posts.indexOf(p) % COLORS.length]} />
                    </div>
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
