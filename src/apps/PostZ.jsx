import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Lock, Zap, Flame } from "lucide-react";
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
      ratings: [{ user: "kxng", stars: 9 }, { user: "mia", stars: 8 }], comments: [] },
    { id: t - 45000, author: "SopranoSol", authorIcon: "personaz_indieartist.png",
      content: "Layered a 4-part harmony over a lo-fi bed. Soprano stacks on the hook 🎶",
      genre: "R&B", skills: ["Soprano", "Arrangement"], createdAt: t - 45000,
      ratings: [{ user: "dre", stars: 10 }], comments: [] },
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

  useEffect(() => {
    if (posts === null) {
      const s = seed();
      setPosts(s);
      saveSocial({ ...loadSocial(), posts: s });
    }
  }, [posts]);

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
    flash("Post is live — rating opens in 30s, comments in 60s.");
  }

  const myName = me?.username || "you";

  function ratePost(id, stars) {
    const next = (posts || []).map((p) => {
      if (p.id !== id) return p;
      const others = p.ratings.filter((r) => r.user !== myName);
      return { ...p, ratings: [...others, { user: myName, stars }] };
    });
    persist(next);
    flash(`Rated ${stars}/10 · +1 Energy earned`);
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
    flash("Comment posted.");
  }

  if (!posts || !me) {
    return <p className="flex items-center gap-2 text-white/50"><Loader2 className="animate-spin" size={16} /> Loading PostZ…</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <IconImg icon="postz.png" alt="PostZ" className="h-11 w-11 rounded-xl" />
        <div>
          <h2 className="font-display text-xl font-extrabold">PostZ</h2>
          <p className="text-xs text-white/45">Community rating &amp; comments open on a timer.</p>
        </div>
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
          <button className="re-btn !w-auto px-6" onClick={createPost}>
            <Send size={15} /> Post
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-white/40">
          Transparency: rating unlocks <span className="text-white/70">{RATE_WINDOW_SEC}s</span> after posting
          (other users only) · comments unlock <span className="text-white/70">{COMMENT_WINDOW_SEC}s</span> after posting.
          Every rating you give earns the poster nothing and earns you <span className="text-mcz-ember">+1 Energy</span>.
        </p>
      </div>

      {toast && (
        <div className="rounded-lg border border-mcz-ember/40 bg-mcz-ember/10 px-4 py-2 text-sm text-mcz-ember">
          {toast}
        </div>
      )}

      <div className="space-y-3">
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
  const [skipped, setSkipped] = useState(false);
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
          <div className="text-[10px] text-white/35">{post.ratings.length} rating{post.ratings.length !== 1 ? "s" : ""}</div>
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
        <div className="re-label">Comments · {post.comments.length}</div>
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
