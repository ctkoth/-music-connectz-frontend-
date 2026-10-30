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
import TryLink from "../components/TryLink.jsx";
import { postCoachApp } from "../trialSkill.js";
import { useViewTracker } from "../viewz.js";
import ViewCount from "../components/ViewCount.jsx";
import { usePageTitle } from "../pageTitle.js";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import JoinLink from "../components/JoinLink.jsx";
import { AlertCircle, Flame, Loader2 } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import CoachReadCard from "../components/CoachReadCard.jsx";
import MentionText from "../MentionParser.jsx";
import PostEmbeds from "../PostEmbeds.jsx";
import { ratingTone } from "../rating.js";

export default function PublicPost() {
  const { id } = useParams();
  useViewTracker(`post:${id}`);
  const [post, setPost] = useState(null);
  usePageTitle(post?.title && `${post.title} — ${post.author}`,
               post?.description || (post?.author ? `A track by ${post.author}.` : ""));
  const [err, setErr] = useState("");
  const { user, loading } = useAuth();
  // `?stranger=1` is "open as a stranger sees it": the page is fetched with no
  // credentials, so the server answers exactly what it answers a visitor from
  // Reddit — the preview an author needs before pasting the link.
  const asStranger = new URLSearchParams(window.location.search).has("stranger");
  const signedIn = !!user && !asStranger;

  useEffect(() => {
    if (loading) return;
    // A signed-in member sends their token, so the coach's read the author kept
    // for members is shown to them and locked for everyone else. The server
    // decides which; this only says who is asking. A restricted or private post
    // answers 404 here on purpose, so this page can't confirm one exists.
    // A shared link is often the first request a cold server gets in a while,
    // and that one can take longer than the default 30s to answer. So this
    // waits longer and tries once more before telling the visitor it failed.
    // Nothing is charged for a read, so a retry costs nothing but time.
    const load = (tries) => api(`/api/postz/${id}/`, { auth: signedIn, timeoutMs: 90_000 })
      .then(setPost)
      .catch((e) => {
        if (e?.timedOut && tries > 0) return load(tries - 1);
        setErr(e.message || "That post isn't available.");
      });
    load(1);
  }, [id, loading, signedIn]);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png?v=2" alt="Music ConnectZ" className="h-9 w-9 rounded-xl shadow-neon" />
          <span className="font-display text-lg font-extrabold tracking-tight">Music ConnectZ</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-white/70 hover:text-white">Sign in</Link>
          <JoinLink owner={post?.author} className="rounded-xl bg-mcz-ember px-4 py-2 text-sm font-bold text-white hover:brightness-110">Join free</JoinLink>
        </div>
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

      {post && (
        <article className="neon-frame p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            {/* The author is a link, not a dead name — that is the whole point
                of the public profile sitting behind it. */}
            <Link to={`/u/${post.author}`} className="text-sm font-bold text-white hover:text-mcz-ember">
              @{post.author}
            </Link>
            {post.rating != null && (
              <span className="flex items-center gap-1 text-xs text-mcz-ember">
                <Flame size={13} /> <span className={`font-bold ${ratingTone(post.rating)}`}>{post.rating}</span>
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
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90"><MentionText text={post.description} /></p>
          )}

          {post.links?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.links.map((l, i) => (
                <a key={i} href={typeof l === "string" ? l : l.url} target="_blank" rel="noreferrer noopener"
                   className="pill hover:text-mcz-ember">
                  {typeof l === "string" ? l : l.label || l.url}
                </a>
              ))}
            </div>
          )}

          <PostEmbeds post={post} canEdit={false} />

          {/* The coach's read, on the same page as the song — in full when a
              stranger may see it, a locked card with the way in when it is kept
              for members, and nothing at all when it is the author's alone. */}
          {asStranger && (
            <p className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/55">
              You're seeing this page the way a stranger does — no account.
            </p>
          )}
          <CoachReadCard coach={post.coach} signedIn={signedIn} author={post.author} />

          <div className="mt-5 rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center text-sm">
            <p className="mb-2 text-white/80">Rate this, comment, and post your own — free.</p>
            <JoinLink owner={post?.author} invite className="inline-block rounded-xl bg-mcz-ember px-5 py-2 font-bold text-white hover:brightness-110">Create your account</JoinLink>
            <p className="mt-2 text-[11px] text-white/45">
              Or <TryLink owner={post?.author} app={postCoachApp(post)} className="text-mcz-cyan hover:underline">get a take scored first</TryLink> — no account needed.
            </p>
          </div>
        </article>
      )}
      <div className="mt-6 text-center"><ViewCount target={`post:${id}`} /></div>
    </div>
  );
}
