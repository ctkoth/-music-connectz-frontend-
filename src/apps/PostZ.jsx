import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Lock, Flame, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import { RATE_WINDOW_SEC, COMMENT_WINDOW_SEC } from "./socialData.js";

// A live 1-second clock so every card's rating/comment countdown ticks.
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const GENRES = ["Trap", "Drill", "Boom Bap", "Cloud Rap", "R&B", "Pop", "House",
  "Hip Hop", "Soul", "Jazz", "Lo-Fi", "Afrobeat"];

// Map a server post (_ser) to the local card shape. We derive a synthetic
// createdAt from the server's age_sec so the countdowns tick from SERVER time,
// not the device clock — this stays in sync with the API's window checks.
function mapPost(s) {
  return {
    id: s.id,
    author: s.author,
    authorIcon: s.is_mine ? "personaz.png" : "personaz_producer.png",
    content: s.content,
    genre: s.genre,
    skills: s.skills || [],
    createdAt: Date.now() - (s.age_sec || 0) * 1000,
    avg: s.avg_rating || 0,
    ratingCount: s.rating_count || 0,
    commentCount: s.comment_count || 0,
    myStars: s.my_rating || 0,
    isMine: s.is_mine,
    comments: (s.comments || []).map((c) => ({ user: c.user, text: c.text })),
  };
}

export default function PostZ() {
  const now = useNow();
  const [posts, setPosts] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState("Trap");
  const [toast, setToast] = useState("");
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const commentDraft = useRef({});

  async function load({ quiet } = {}) {
    if (!quiet) setRefreshing(true);
    try {
      const data = await api("/api/postz/");
      setPosts(Array.isArray(data) ? data.map(mapPost) : []);
      setLoadErr("");
    } catch (e) {
      // Only surface a hard error on the initial load; keep the feed on a
      // failed background refresh.
      if (posts === null) setLoadErr(e.message || "Couldn't load PostZ.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    // Light background refresh so ratings/comments from other users show up.
    const t = setInterval(() => load({ quiet: true }), 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  // Replace one post in state from a server _ser response.
  function applyServerPost(s) {
    const mapped = mapPost(s);
    setPosts((cur) => (cur || []).map((p) => (p.id === mapped.id ? mapped : p)));
  }

  async function createPost() {
    const text = content.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const s = await api("/api/postz/", { method: "POST", body: { content: text, genre } });
      setPosts((cur) => [mapPost(s), ...(cur || [])]);
      setContent("");
      flash("Post is live — rating opens in 30s, comments in 60s.");
    } catch (e) {
      flash(e.message || "Couldn't post.");
    } finally {
      setPosting(false);
    }
  }

  async function ratePost(id, stars) {
    try {
      const s = await api(`/api/postz/${id}/rate/`, { method: "POST", body: { stars } });
      applyServerPost(s);
      flash(`Rated ${stars}/10 · +1 Energy earned`);
    } catch (e) {
      // 409 (too early) / 403 (own post) / 400 (range) → show the server reason
      // and re-sync this post's timers from the server.
      flash(e.message || "Couldn't rate.");
      load({ quiet: true });
    }
  }

  async function addComment(id) {
    const text = (commentDraft.current[id] || "").trim();
    if (!text) return;
    try {
      const s = await api(`/api/postz/${id}/comment/`, { method: "POST", body: { text } });
      applyServerPost(s);
      commentDraft.current[id] = "";
      flash("Comment posted.");
    } catch (e) {
      flash(e.message || "Couldn't comment.");
      load({ quiet: true });
    }
  }

  if (posts === null && !loadErr) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading PostZ…</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="postz.png" alt="PostZ" className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-extrabold">PostZ</h2>
          <p className="text-xs text-white/45">Community rating &amp; comments open on a timer.</p>
        </div>
        <button
          className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
          onClick={() => load()} title="Refresh feed"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </header>

      {/* Composer */}
      <div className="re-card space-y-3">
        <div className="re-label">Create a PostZ</div>
        <textarea
          className="w-full resize-none rounded-lg border border-white/[0.08] bg-black/40 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
          rows={3}
          placeholder="Drop your track, bars, cover art or collab call…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-mcz-ember/60"
            value={genre} onChange={(e) => setGenre(e.target.value)}
          >
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button className="re-btn !w-auto px-6" onClick={createPost} disabled={posting}>
            {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Post
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-white/40">
          Transparency: rating unlocks <span className="text-white/70">{RATE_WINDOW_SEC}s</span> after posting
          (other users only) · comments unlock <span className="text-white/70">{COMMENT_WINDOW_SEC}s</span> after posting.
          Every rating you give earns you <span className="text-mcz-ember">+1 Energy</span>.
        </p>
      </div>

      {toast && (
        <div className="rounded-lg border border-mcz-ember/40 bg-mcz-ember/10 px-4 py-2 text-sm text-mcz-ember">
          {toast}
        </div>
      )}

      {loadErr && (
        <div className="re-card flex items-start gap-2 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-mcz-ember" />
          <div>
            <p className="text-white/80">{loadErr}</p>
            <button className="re-link mt-1 text-xs" onClick={() => load()}>Try again</button>
          </div>
        </div>
      )}

      {posts?.length === 0 && !loadErr && (
        <p className="text-sm text-white/45">No PostZ yet — be the first to post.</p>
      )}

      <div className="space-y-3">
        {(posts || []).map((p) => (
          <PostCard
            key={p.id} post={p} now={now}
            onRate={ratePost} onComment={addComment} commentDraft={commentDraft}
          />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post, now, onRate, onComment, commentDraft }) {
  const [skipped, setSkipped] = useState(false);
  const ageSec = Math.max(0, Math.floor((now - post.createdAt) / 1000));
  const isMine = post.isMine;
  const rateLeft = Math.max(0, RATE_WINDOW_SEC - ageSec);
  const commentLeft = Math.max(0, COMMENT_WINDOW_SEC - ageSec);
  const canRate = rateLeft === 0 && !isMine;
  const canComment = commentLeft === 0;

  const avg = post.avg;
  const myStars = post.myStars;
  const relTime = ageSec < 60 ? `${ageSec}s ago` : `${Math.floor(ageSec / 60)}m ago`;

  return (
    <div className="re-card">
      <div className="mb-3 flex items-center gap-3">
        <IconImg icon={post.authorIcon} alt="" className="h-10 w-10 rounded-lg object-cover" />
        <div className="flex-1">
          <div className="text-sm font-bold text-white">
            {post.author}{isMine && <span className="ml-2 text-[10px] font-normal text-white/40">you</span>}
          </div>
          <div className="text-[11px] text-white/40">{relTime} · {post.genre}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm font-bold text-mcz-ember">
            <Flame size={14} /> {avg ? avg.toFixed(1) : "—"}<span className="text-white/35">/10</span>
          </div>
          <div className="text-[10px] text-white/35">{post.ratingCount} rating{post.ratingCount !== 1 ? "s" : ""}</div>
        </div>
      </div>

      <p className="mb-3 whitespace-pre-wrap text-sm text-white/85">{post.content}</p>
      {post.skills?.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {post.skills.map((s) => <span key={s} className="pill">{s}</span>)}
        </div>
      )}

      {/* Rating — RepostExchange 1–10 scale, anonymous. */}
      <div className="border-t border-white/[0.06] pt-3">
        {canRate && !skipped ? (
          <div className="space-y-2">
            <div className="re-label">Rate this track</div>
            <p className="text-[11px] text-white/40">Ratings are anonymous and help curate the ChartZ. +1 Energy per rating.</p>
            <div className="flex items-center gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => onRate(post.id, n)}
                  className={`re-scale ${n <= myStars ? "re-scale-on" : ""}`}
                  title={`Rate ${n}/10`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-lg">
              <span>👎</span>
              <button className="re-link text-xs" onClick={() => setSkipped(true)}>Skip</button>
              <span>🔥</span>
            </div>
          </div>
        ) : (
          <div className="re-label flex items-center gap-1.5 !text-white/40">
            <Lock size={12} />
            {skipped ? "Rating skipped"
              : isMine ? "You can't rate your own track"
              : (<span>Rating opens in <span className="text-mcz-ember">{rateLeft}s</span></span>)}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
        <div className="re-label">Comments · {post.commentCount}</div>
        {post.comments.map((c, i) => (
          <div key={i} className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
            <span className="font-semibold text-mcz-ember">{c.user}</span>{" "}
            <span className="text-white/80">{c.text}</span>
          </div>
        ))}
        {canComment ? (
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
              placeholder="What did you like about the track?"
              maxLength={1000}
              defaultValue={commentDraft.current[post.id] || ""}
              onChange={(e) => (commentDraft.current[post.id] = e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onComment(post.id)}
            />
            <button className="re-btn !w-auto px-3" onClick={() => onComment(post.id)}>
              <Send size={14} />
            </button>
          </div>
        ) : (
          <div className="re-label flex items-center gap-1.5 !text-white/40">
            <Lock size={12} /> <span>Comments open in <span className="text-mcz-ember">{commentLeft}s</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
