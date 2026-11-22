import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { goToSpot, openMember } from "../goto.js";
import { RatingNumber } from "../components/Rating.jsx";
import { PostPlayer, COLORS, ago } from "../components/PostPlayer.jsx";
import SocialBar from "../components/SocialBar.jsx";

// Explore — what members are making, newest or best first. It decides nothing: the feed, its order and who may see
// each post are PostZ's (`/api/economy/postz/?sort=`), the controls under a track are the one SocialBar on the same
// `post:<id>` item PostZ rates, and posting is PostZ's composer. A post with no audio simply has no player.
const SORTS = [["hot", "Hot"], ["new", "New"], ["top", "Top rated"]];

export default function Discover() {
  const [sort, setSort] = useState("hot");
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    setPosts(null); setErr("");
    api(`/api/economy/postz/?sort=${sort}`).then((d) => setPosts(asList(d?.posts ?? d)))
      .catch((e) => { setPosts([]); setErr(e.message || "Couldn't load the feed."); });
  }, [sort]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-3xl font-extrabold text-white">Explore</h2>
        <p className="text-[14px] text-white/60">Tracks members just put up — play one, rate it, say something.</p>
      </header>
      <div role="tablist" aria-label="Order" className="flex gap-1.5">
        {SORTS.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={sort === k} onClick={() => setSort(k)}
            className={`rounded-full border px-4 py-1.5 text-[14px] ${sort === k ? "border-violet-400 bg-violet-500/20 text-violet-200" : "border-transparent text-white/65"}`}>{t}</button>
        ))}
      </div>
      {err && <p className="text-sm text-mcz-pink">{err}</p>}
      {posts === null ? <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
        : posts.length === 0 && !err ? (
          <p className="text-sm text-white/60">Nothing here yet. <button className="underline" onClick={() => goToSpot("postz", "postz:composer")}>Post the first track</button></p>
        ) : (
          <div className="space-y-3">
            {posts.map((p, i) => {
              const img = p.media?.image || p.image_url;
              return (
                <article key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-3">
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                      {typeof img === "string" && img
                        ? <img src={img} alt="" className="h-full w-full object-cover" />
                        : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900 to-fuchsia-900 text-xl">🎵</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-bold text-white">{p.title || "Untitled"}</span>
                      <button className="block truncate text-[13px] text-violet-300 hover:underline" onClick={() => openMember(p.author)}>@{p.author}</button>
                      <span className="block truncate text-[12px] text-white/60">{[p.genre, ago(p.age_sec)].filter(Boolean).join(" · ")}</span>
                    </span>
                    {p.rating != null && <RatingNumber value={p.rating} size="sm" outOf />}
                  </div>
                  <PostPlayer post={p} color={COLORS[i % COLORS.length]} />
                  <div className="mt-2"><SocialBar item={`post:${p.id}`} compact /></div>
                </article>
              );
            })}
          </div>
        )}
    </div>
  );
}
