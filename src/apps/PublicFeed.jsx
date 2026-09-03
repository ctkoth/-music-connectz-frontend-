// /browse — Music ConnectZ with no account, by the SCROLL rather than only
// by link. apps/economy/publicz.py's own docstring used to call "by link,
// not by browse" an absolute rule; this is the one deliberate exception,
// and it stays inside the boundary that rule actually protects: every row
// here is the identical public_post_dict a shared /p/:id link already
// serves with no login (public posts in full) or the identical
// public_post_teaser a restricted post's own share link answers with
// (locked — title and author only). Browsing this list can never show a
// stranger more than following any one of these links already would.
//
// Every interactive control a member would expect — react, rate, comment,
// follow, post their own — renders as a GuestCTA instead of doing nothing:
// tied to the SPECIFIC thing being attempted, and it carries the visitor
// straight back here (or to the exact post) once they've joined.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame, Loader2, Lock, MessageCircle, Plus, ThumbsUp, UserPlus,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import EmbedLink from "../EmbedLink.jsx";
import GuestCTA from "../GuestCTA.jsx";

function LockedCard({ post }) {
  return (
    <li className="neon-frame space-y-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <Link to={`/u/${post.author}`} className="flex items-center gap-1.5 text-[13px] font-bold text-white hover:text-mcz-ember">
          <Lock size={12} className="text-mcz-gold" /> @{post.author}
        </Link>
      </div>
      <p className="text-sm font-semibold text-white/85">{post.title}</p>
      <p className="text-[11px] text-white/40">
        Members-only — join free and it opens. @{post.author} gets credit for bringing you in.
      </p>
      <GuestCTA action="unlock this" next={`/p/${post.id}`} icon={Lock} />
    </li>
  );
}

function PublicCard({ post }) {
  return (
    <li className="neon-frame space-y-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <Link to={`/u/${post.author}`} className="text-[13px] font-bold text-white hover:text-mcz-ember">
          @{post.author}
        </Link>
        {post.rating != null && (
          <span className="flex items-center gap-1 text-xs text-mcz-ember">
            <Flame size={13} /> <span className="font-bold">{post.rating}</span><span className="text-white/40">/10</span>
          </span>
        )}
      </div>

      <Link to={`/p/${post.id}`} className="block text-sm font-semibold text-white/90 hover:text-mcz-ember">
        {post.title}
      </Link>

      {post.media_url && (
        post.media_type === "video"
          ? <video src={post.media_url} controls className="w-full rounded-lg" />
          : post.media_type === "audio"
          ? <audio src={post.media_url} controls className="w-full" />
          : <img src={post.media_url} alt={post.title || "post"} className="w-full rounded-lg" />
      )}

      {post.description && (
        <p className="line-clamp-3 text-[13px] leading-relaxed text-white/70">{post.description}</p>
      )}

      {asList(post.links).slice(0, 1).map((l, i) => (
        <EmbedLink key={i} link={typeof l === "string" ? { url: l } : l} owner={post.author} />
      ))}

      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2">
        <GuestCTA action="react" next={`/p/${post.id}`} icon={ThumbsUp} />
        <GuestCTA action="rate this" next={`/p/${post.id}`} icon={Flame} />
        <GuestCTA action="comment" next={`/p/${post.id}`} icon={MessageCircle} />
        <GuestCTA action={`follow @${post.author}`} next={`/u/${post.author}`} icon={UserPlus} />
      </div>
    </li>
  );
}

export default function PublicFeed() {
  const [posts, setPosts] = useState([]);
  const [nextBefore, setNextBefore] = useState(undefined); // undefined = first load
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  function load(before) {
    setLoading(true);
    const qs = before ? `?before=${before}` : "";
    api(`/api/economy/public/feed/${qs}`, { auth: false })
      .then((d) => {
        setPosts((cur) => (before ? [...cur, ...asList(d.posts)] : asList(d.posts)));
        setNextBefore(d.next_before ?? null);
        setErr("");
      })
      .catch((e) => setErr(e.message || "Couldn't load the feed."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/mcz-logo-v5.jpg" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <Link to="/register" className="rounded-xl bg-mcz-ember px-4 py-2 text-sm font-bold text-white hover:brightness-110">
          Join free
        </Link>
      </header>

      <div className="mb-5 rounded-xl border border-mcz-ember/25 bg-mcz-ember/[0.06] p-4">
        <p className="text-sm text-white/80">
          Browsing without an account. Reacting, rating, commenting, following, and posting your own are
          free the moment you join — every button below says exactly what it unlocks.
        </p>
        <GuestCTA action="post your own" icon={Plus} className="mt-2" />
      </div>

      {err && <p className="mb-4 rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-ember">{err}</p>}

      {posts.length === 0 && !loading ? (
        <p className="text-sm text-white/45">Nothing public here yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (p.locked ? <LockedCard key={p.id} post={p} /> : <PublicCard key={p.id} post={p} />))}
        </ul>
      )}

      {loading && (
        <p className="mt-4 flex items-center justify-center gap-2 text-white/50">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </p>
      )}

      {!loading && nextBefore && (
        <button className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm text-white/70 hover:bg-white/[0.06]"
                onClick={() => load(nextBefore)}>
          Load more
        </button>
      )}
    </div>
  );
}
