import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Star, MessageCircle, Lock, Zap } from "lucide-react";
import { api } from "../api.js";
import { IconImg } from "../App.jsx";
import {
  loadSocial, saveSocial, RATE_WINDOW_SEC, COMMENT_WINDOW_SEC,
} from "./socialData.js";

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

// Seeded posts from OTHER creators so rating/commenting is demoable — the
// blueprint requires a rater/commenter to be someone other than the poster.
function seed() {
  const t = Date.now();
  return [
    { id: t - 90000, author: "NovaBeatz", authorIcon: "personaz_producer.png",
      content: "Fresh 140bpm drill loop — 8 bars, dark strings. Rate the bounce 🥁",
      genre: "Drill", skills: ["FL Studio", "Beat Making"], createdAt: t - 90000,
      ratings: [{ user: "kxng", stars: 5 }, { user: "mia", stars: 4 }], comments: [] },
    { id: t - 45000, author: "SopranoSol", authorIcon: "personaz_indieartist.png",
      content: "Layered a 4-part harmony over a lo-fi bed. Soprano stacks on the hook 🎶",
      genre: "R&B", skills: ["Soprano", "Arrangement"], createdAt: t - 45000,
      ratings: [{ user: "dre", stars: 5 }], comments: [] },
  ];
}

export default function PostZ() {
  const now = useNow();
  const [me, setMe] = useState(null);
  const [posts, setPosts] = useState(() => loadSocial().posts || null);
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState("Trap");
  const [toast, setToast] = useState("");
  const commentDraft = useRef({});

  useEffect(() => {
    api("/api/auth/me/").then(setMe).catch(() => setMe({ username: "you", tier: "free", energy: 0 }));
  }, []);

  // First run: seed the feed once.
  useEffect(() => {
    if (posts === null) {
      const s = seed();
      setPosts(s);
      saveSocial({ ...loadSocial(), posts: s });
    }
  }, [posts]);

  // Keep in sync if another tab mutates the shared store.
  useEffect(() => {
    const h = () => setPosts(loadSocial().posts || []);
    window.addEventListener("mcz-social", h);
    return () => window.removeEventListener("mcz-social", h);
  }, []);

  function persist(next) {
    setPosts(next);
    saveSocial({ ...loadSocial(), posts: next });
  }

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function createPost() {
    const text = content.trim();
    if (!text) return;
    const p = {
      id: Date.now(), author: me?.username || "you", authorIcon: "personaz.png",
      content: text, genre, skills: [], createdAt: Date.now(), ratings: [], comments: [],
    };
    persist([p, ...(posts || [])]);
    setContent("");
    flash("🎵 PostZ live — rating opens in 30s, comments in 60s.");
  }

  const myName = me?.username || "you";

  function ratePost(id, stars) {
    const next = (posts || []).map((p) => {
      if (p.id !== id) return p;
      const others = p.ratings.filter((r) => r.user !== myName);
      return { ...p, ratings: [...others, { user: myName, stars }] };
    });
    persist(next);
    flash(`⭐ Rated ${stars}/5 · +1 Energy earned`);
  }

  function addComment(id) {
    const text = (commentDraft.current[id] || "").trim();
    if (!text) return;
    const next = (posts || []).map((p) =>
      p.id === id
        ? { ...p, comments: [...p.comments, { user: myName, text, at: Date.now() }] }
        : p
    );
    persist(next);
    commentDraft.current[id] = "";
    flash("💬 Comment posted.");
  }

  if (!posts || !me) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading PostZ…</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="postz.png" alt="PostZ" className="h-14 w-14 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-2xl font-extrabold text-mcz-gold">PostZ 🎵</h2>
          <p className="text-sm text-white/55">
            Every post opens for community rating &amp; comments on a timer.
          </p>
        </div>
      </header>

      {/* Composer */}
      <div className="neon-frame space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Create a PostZ</p>
        <textarea
          className="neon-input !h-24 resize-none"
          placeholder="Drop your track, bars, cover art or collab call…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select className="neon-input !w-auto py-2" value={genre} onChange={(e) => setGenre(e.target.value)}>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button className="neon-btn-primary !w-auto px-5" onClick={createPost}>
            <Send size={15} /> Post
          </button>
        </div>
        <p className="text-[11px] text-white/40">
          🔒 Rating unlocks {RATE_WINDOW_SEC}s after posting (other users only) ·
          💬 Comments unlock {COMMENT_WINDOW_SEC}s after posting.
        </p>
      </div>

      {toast && (
        <div className="rounded-xl border border-mcz-cyan/30 bg-mcz-cyan/10 px-4 py-2 text-sm text-mcz-cyan">
          {toast}
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {posts.map((p) => (
          <PostCard
            key={p.id} post={p} now={now} myName={myName}
            onRate={ratePost} onComment={addComment} commentDraft={commentDraft}
          />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post, now, myName, onRate, onComment, commentDraft }) {
  const ageSec = Math.floor((now - post.createdAt) / 1000);
  const isMine = post.author === myName;
  const rateLeft = Math.max(0, RATE_WINDOW_SEC - ageSec);
  const commentLeft = Math.max(0, COMMENT_WINDOW_SEC - ageSec);
  const canRate = rateLeft === 0 && !isMine;
  const canComment = commentLeft === 0;

  const avg = useMemo(() => {
    if (!post.ratings.length) return 0;
    return post.ratings.reduce((s, r) => s + r.stars, 0) / post.ratings.length;
  }, [post.ratings]);
  const myStars = post.ratings.find((r) => r.user === myName)?.stars || 0;

  const relTime =
    ageSec < 60 ? `${ageSec}s ago` : `${Math.floor(ageSec / 60)}m ago`;

  return (
    <div className="neon-frame p-4">
      <div className="mb-3 flex items-center gap-3">
        <IconImg icon={post.authorIcon} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div className="flex-1">
          <div className="text-sm font-bold text-white">{post.author}{isMine && <span className="ml-2 text-[10px] text-white/40">you</span>}</div>
          <div className="text-[11px] text-white/45">{relTime} · {post.genre}</div>
        </div>
        <div className="flex items-center gap-1 text-sm text-mcz-gold">
          <Star size={14} className="fill-mcz-gold" />
          {avg ? avg.toFixed(1) : "—"}
          <span className="text-[11px] text-white/35">({post.ratings.length})</span>
        </div>
      </div>

      <p className="mb-3 whitespace-pre-wrap text-sm text-white/85">{post.content}</p>
      {post.skills?.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {post.skills.map((s) => <span key={s} className="pill">{s}</span>)}
        </div>
      )}

      {/* Rating row */}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        {canRate ? (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => onRate(post.id, n)} title={`Rate ${n}`}>
                <Star
                  size={20}
                  className={n <= myStars ? "fill-mcz-gold text-mcz-gold" : "text-white/25 hover:text-mcz-gold"}
                />
              </button>
            ))}
            <span className="ml-2 text-[11px] text-mcz-gold"><Zap size={11} className="inline" /> +1 Energy per rating</span>
          </div>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-white/45">
            <Lock size={12} />
            {isMine
              ? "You can't rate your own PostZ"
              : `Rating opens in ${rateLeft}s`}
          </span>
        )}
      </div>

      {/* Comments */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
          <MessageCircle size={12} /> Comments ({post.comments.length})
        </div>
        {post.comments.map((c, i) => (
          <div key={i} className="rounded-lg bg-black/30 px-3 py-2 text-sm">
            <span className="font-semibold text-mcz-cyan">{c.user}</span>{" "}
            <span className="text-white/80">{c.text}</span>
          </div>
        ))}
        {canComment ? (
          <div className="flex items-center gap-2">
            <input
              className="neon-input py-2 text-sm"
              placeholder="Add a comment…"
              defaultValue={commentDraft.current[post.id] || ""}
              onChange={(e) => (commentDraft.current[post.id] = e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onComment(post.id)}
            />
            <button className="neon-btn-ghost !w-auto px-3 py-2" onClick={() => onComment(post.id)}>
              <Send size={14} />
            </button>
          </div>
        ) : (
          <span className="flex items-center gap-1 text-[11px] text-white/45">
            <Lock size={12} /> Comments open in {commentLeft}s
          </span>
        )}
      </div>
    </div>
  );
}
