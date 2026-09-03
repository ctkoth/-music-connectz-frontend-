// Public, no-account-required post page — where every share link lands.
//
// This page was written against an API that didn't exist: it asked for
// `content`, `genre`, `view_count`, `avg_rating` and a comment list, none of
// which a Post has ever had, and it called an endpoint that returned 404. It
// now renders the payload the server actually serves.
//
// Two things it deliberately does NOT show. Views: nothing counts them, and a
// number anybody can inflate by reloading is worth less than no number.
// Comments: they're member-authored text, and publishing that to strangers
// needs a moderation path this page doesn't have.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Flame, Loader2, Lock } from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import EmbedLink from "../EmbedLink.jsx";
import GuestCTA from "../GuestCTA.jsx";

const scoreColor = (n) =>
  n == null ? "text-white/30" : n >= 8 ? "text-emerald-300" : n >= 5 ? "text-mcz-gold" : "text-mcz-ember";

export default function PublicPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    // auth:false → works logged-out. A private post answers 404 here on
    // purpose, so this page can't confirm one exists. A restricted post
    // answers 200 with a locked teaser (post.locked) instead — existence is
    // the point of that door, see apps/economy/publicz.py's public_post_teaser.
    api(`/api/postz/${id}/`, { auth: false })
      .then(setPost)
      .catch((e) => setErr(e.message || "That post isn't available."));
  }, [id]);

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

      {err && (
        <div className="neon-frame flex items-start gap-2 p-4 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-mcz-ember" />
          <div><p className="text-white/80">{err}</p><Link to="/" className="text-mcz-ember">Go home</Link></div>
        </div>
      )}

      {!post && !err && (
        <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading…</p>
      )}

      {post && post.locked && (
        // A restricted post — the door RESTRICTED_JOIN_REWARD_SPINAZ rewards
        // the author for a stranger walking back through. Title and author
        // only; the server never sent the content to leak here.
        <article className="neon-frame space-y-3 p-5 text-center">
          <Lock size={28} className="mx-auto text-mcz-gold" />
          <div>
            <Link to={`/u/${post.author}`} className="text-sm font-bold text-white hover:text-mcz-ember">
              @{post.author}
            </Link>
            <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight text-white">{post.title}</h1>
          </div>
          <p className="text-sm text-white/60">
            This one's for members. Join free and it opens — @{post.author} gets credit for bringing you in.
          </p>
          <GuestCTA action="unlock this" icon={Lock} className="!px-4 !py-2 !text-sm" />
        </article>
      )}

      {post && !post.locked && (
        <article className="neon-frame p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            {/* The author is a link, not a dead name — that is the whole point
                of the public profile sitting behind it. */}
            <Link to={`/u/${post.author}`} className="text-sm font-bold text-white hover:text-mcz-ember">
              @{post.author}
            </Link>
            {post.rating != null && (
              <span className="flex items-center gap-1 text-xs text-mcz-ember">
                <Flame size={13} /> <span className={`font-bold ${scoreColor(post.rating)}`}>{post.rating}</span>
                <span className="text-white/40">/10</span>
              </span>
            )}
          </div>

          {post.title && (
            <h1 className="font-display text-xl font-extrabold tracking-tight text-white">{post.title}</h1>
          )}

          {post.media_url && (
            post.media_type === "video" ? (
              <video src={post.media_url} controls className="mt-3 w-full rounded-xl" />
            ) : post.media_type === "audio" ? (
              <audio src={post.media_url} controls className="mt-3 w-full" />
            ) : (
              <img src={post.media_url} alt={post.title || "post"} className="mt-3 w-full rounded-xl" />
            )
          )}

          {post.description && (
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">{post.description}</p>
          )}

          {/* SoundCloud/Spotify/YouTube/Apple Music play inline, right here —
              no account needed to listen, same as the feed. Older posts (or
              a bare string link) fall back gracefully: EmbedLink shows a
              plain link when there's no `service` it recognizes. */}
          {asList(post.links).map((l, i) => (
            <EmbedLink key={i} link={typeof l === "string" ? { url: l } : l} owner={post.author} />
          ))}

          <div className="mt-5 rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center text-sm">
            <p className="mb-2 text-white/80">Rate this, comment, and post your own — free.</p>
            <Link to="/register" className="inline-block rounded-xl bg-mcz-ember px-5 py-2 font-bold text-white hover:brightness-110">
              Create your account
            </Link>
            <p className="mt-2 text-[11px] text-white/45">
              Or <Link to="/try/singz" className="text-mcz-cyan hover:underline">get a take scored first</Link> — no account needed.
            </p>
          </div>
        </article>
      )}
    </div>
  );
}
