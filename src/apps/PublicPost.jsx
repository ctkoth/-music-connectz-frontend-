import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Flame, Eye, MessageCircle, AlertCircle } from "lucide-react";
import { api } from "../api.js";

// Public, no-account-required post page. Loading it records a view (which
// rewards the post's owner Energy by their tier) and shows the live view count.
export default function PublicPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    // auth:false → works logged-out; the backend counts it as a public view.
    api(`/api/postz/${id}/`, { auth: false })
      .then(setPost)
      .catch((e) => setErr(e.message || "Post not found."));
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

      {post && (
        <article className="neon-frame p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-white">{post.author}</div>
            <div className="flex items-center gap-3 text-xs text-white/50">
              <span className="flex items-center gap-1"><Eye size={13} /> {post.view_count?.toLocaleString?.() ?? post.view_count} views</span>
              <span className="flex items-center gap-1 text-mcz-ember"><Flame size={13} /> {post.avg_rating ? post.avg_rating.toFixed(1) : "—"}/10</span>
            </div>
          </div>
          {post.genre && <div className="mb-2 text-[11px] uppercase tracking-widest text-white/40">{post.genre}</div>}
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">{post.content}</p>

          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/45">
            <MessageCircle size={13} /> {post.comment_count} comment{post.comment_count !== 1 ? "s" : ""} ·
            {" "}{post.rating_count} rating{post.rating_count !== 1 ? "s" : ""}
          </div>

          {post.comments?.length > 0 && (
            <div className="mt-3 space-y-2">
              {post.comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                  <span className="font-semibold text-mcz-ember">{c.user}</span>{" "}
                  <span className="text-white/80">{c.text}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-mcz-ember/30 bg-mcz-ember/10 p-4 text-center text-sm">
            <p className="mb-2 text-white/80">Rate this track, comment, and post your own — free.</p>
            <Link to="/register" className="inline-block rounded-xl bg-mcz-ember px-5 py-2 font-bold text-white hover:brightness-110">
              Create your account
            </Link>
          </div>
        </article>
      )}
    </div>
  );
}
