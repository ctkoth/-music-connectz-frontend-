// PostZ — the feed, wired to the API that exists.
//
// This tab was written against an imagined backend. It fetched `/api/postz/`
// (a root path that only ever served ONE post by id), read `content`, `genre`,
// `view_count`, `avg_rating`, `comment_count` — fields a Post has never had —
// and posted to `/api/postz/{id}/rate/` and `/{id}/comment/`, neither of which
// exists. So the tab loaded, said "No PostZ yet", and every action failed.
//
// The real shapes:
//   GET  /api/economy/postz/?sort=hot          → { posts: [...] }
//   POST /api/economy/postz/                   → { title, description, genre, visibility }
//   GET  /api/economy/social/?item=post:<id>   → reactions, comments, my rating
//   POST /api/economy/social/rate/             → { item, action:"rate", score }
//   POST /api/economy/social/comment/          → { item, body }
//
// The unlock countdowns tick from the SERVER's `age_sec`, and the unlock
// lengths come from the server too — a phone an hour fast used to show a post
// as rateable the moment it landed.
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle, Check as CheckIcon, Flame, Handshake, Loader2, Lock, RefreshCw,
  Send, Share2, ThumbsDown, ThumbsUp,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { useCharLimit } from "../limits.js";
import CharLimit, { TierCharTable } from "../CharLimit.jsx";
import { IconImg } from "../App.jsx";
import { GENRES } from "../genres.js";
import { ENERGY } from "../resources.js";
import { goToSpot } from "../goto.js";

const SORTS = [["hot", "Hot"], ["new", "New"], ["top", "Top rated"]];

// One 1s clock for the whole feed, so every countdown ticks together.
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Server age → a local reference point, so countdowns run off the API's clock.
const mapPost = (s) => ({ ...s, localCreated: Date.now() - (s.age_sec || 0) * 1000 });

export default function PostZ() {
  const now = useNow();
  const [posts, setPosts] = useState(null);
  const [sort, setSort] = useState("hot");
  const [loadErr, setLoadErr] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("Trap");
  const [visibility, setVisibility] = useState("public");
  const [toast, setToast] = useState("");
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const cl = useCharLimit();
  const charLimit = cl.unlimited ? null : cl.limit;

  async function load({ quiet } = {}) {
    if (!quiet) setRefreshing(true);
    try {
      const data = await api(`/api/economy/postz/?sort=${sort}`);
      setPosts(asList(data?.posts).map(mapPost));
      setLoadErr("");
    } catch (e) {
      if (posts === null) setLoadErr(e.message || "Couldn't load PostZ.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => load({ quiet: true }), 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  async function createPost() {
    const t = title.trim();
    if (!t || posting) return;
    setPosting(true);
    try {
      const s = await api("/api/economy/postz/", {
        method: "POST",
        body: { title: t, description: description.trim(), genre, visibility },
      });
      setPosts((cur) => [mapPost(s), ...(cur || [])]);
      setTitle(""); setDescription("");
      flash("Posted. Rating opens in 30s, comments in 60s.");
    } catch (e) {
      flash(e.message || "Couldn't post.");
    } finally {
      setPosting(false);
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
        <button className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
                onClick={() => load()} title="Refresh feed">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="re-card space-y-3">
        <div className="re-label">Create a PostZ</div>
        <input
          data-tour="composer"
          className="w-full rounded-lg border border-white/[0.08] bg-black/40 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
          placeholder="Title — the track, the bars, the call"
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full resize-none rounded-lg border border-white/[0.08] bg-black/40 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
          rows={3}
          maxLength={charLimit ?? undefined}
          placeholder="Say more about it…"
          value={description}
          onChange={(e) => setDescription(cl.clamp(e.target.value))}
        />
        <div className="text-right text-[10px] text-white/35">
          {description.length.toLocaleString()} / {charLimit ? charLimit.toLocaleString() : "∞"}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-mcz-ember/60"
                  value={genre} onChange={(e) => setGenre(e.target.value)}>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-mcz-ember/60"
                  value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="public">Public</option>
            <option value="restricted">Members only</option>
            <option value="private">Just me</option>
          </select>
          <button className="re-btn !w-auto px-6" onClick={createPost} disabled={posting || !title.trim()}>
            {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Post
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-white/40">
          Rating unlocks <span className="text-white/70">30s</span> after posting (other members only) ·
          comments unlock <span className="text-white/70">60s</span> after. Every rating you give earns
          you <span className="text-mcz-ember">+1 {ENERGY}</span>.
        </p>
        <CharLimit cl={cl} value={description} />
        <TierCharTable current={cl.tier} />
      </div>

      <div className="flex gap-2">
        {SORTS.map(([k, label]) => (
          <button key={k} className={`pill ${sort === k ? "!text-mcz-ember" : ""}`} onClick={() => setSort(k)}>
            {label}
          </button>
        ))}
      </div>

      {toast && (
        <div className="rounded-lg border border-mcz-ember/40 bg-mcz-ember/10 px-4 py-2 text-sm text-mcz-ember">{toast}</div>
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

      <div data-tour="feed" className="space-y-3">
        {(posts || []).map((p) => (
          <PostCard key={p.id} post={p} now={now} charLimit={charLimit} onFlash={flash} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post, now, charLimit, onFlash }) {
  // Reactions, comments and my own rating live in the shared item space, keyed
  // `post:<id>` — the same space playlists and works use.
  const [social, setSocial] = useState(null);
  const [shared, setShared] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const draft = useRef("");
  const item = `post:${post.id}`;

  const loadSocial = () => api(`/api/economy/social/?item=${encodeURIComponent(item)}`)
    .then(setSocial).catch(() => setSocial(null));
  useEffect(() => { loadSocial(); /* eslint-disable-next-line */ }, [post.id]);

  const ageSec = Math.max(0, Math.floor((now - post.localCreated) / 1000));
  const rateLeft = Math.max(0, (post.rate_unlock_sec ?? 30) - ageSec);
  const commentLeft = Math.max(0, (post.comment_unlock_sec ?? 60) - ageSec);
  const canRate = rateLeft === 0 && !post.mine;
  const canComment = commentLeft === 0;
  const relTime = ageSec < 60 ? `${ageSec}s ago` : `${Math.floor(ageSec / 60)}m ago`;

  function share() {
    navigator.clipboard?.writeText(`${window.location.origin}/p/${post.id}`)
      .then(() => { setShared(true); setTimeout(() => setShared(false), 1800); })
      .catch(() => {});
  }

  async function rate(score) {
    try {
      setSocial(await api("/api/economy/social/rate/",
                          { method: "POST", body: { item, action: "rate", score } }));
      onFlash(`Rated ${score}/10 · +1 ${ENERGY}`);
    } catch (e) {
      // The server owns the window — if it says no, believe it and re-read.
      onFlash(e.message || "Couldn't rate.");
      loadSocial();
    }
  }

  async function react(value) {
    try {
      setSocial(await api("/api/economy/social/react/",
                          { method: "POST", body: { item, value } }));
    } catch (e) { onFlash(e.message || "Couldn't react."); }
  }

  // PostZ is for show; CollabZ is for collaboration. This is the seam: the
  // post seeds the deal's title and puts its author in the room, so nobody has
  // to retype the thing they were just looking at.
  async function takeToCollabZ() {
    try {
      await api("/api/economy/collab/", {
        method: "POST", body: { from_post: post.id, currency: "money" },
      });
      onFlash(`Draft deal started on "${post.title}" — open CollabZ to set the worth.`);
      goToSpot("collabz", "");
    } catch (e) { onFlash(e.message || "Couldn't start that collab."); }
  }

  async function comment() {
    const body = draft.current.trim();
    if (!body) return;
    try {
      setSocial(await api("/api/economy/social/comment/", { method: "POST", body: { item, body } }));
      draft.current = "";
      onFlash("Comment posted.");
    } catch (e) {
      onFlash(e.message || "Couldn't comment.");
      loadSocial();
    }
  }

  const comments = asList(social?.comments);
  const myRating = social?.my_rating || 0;
  const rating = social?.rating ?? post.rating;

  return (
    <div className="re-card">
      <div className="mb-3 flex items-center gap-3">
        <IconImg icon={post.mine ? "personaz.png" : "personaz_producer.png"} alt=""
                 className="h-10 w-10 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">
            {post.author}{post.mine && <span className="ml-2 text-[10px] font-normal text-white/40">you</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40">
            <span>{relTime}</span>
            {post.genre && <span>· {post.genre}</span>}
            {post.visibility !== "public" && (
              <span className="pill !px-1.5 !py-0 !text-[9px]">{post.visibility}</span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <button onClick={share} title="Copy public link"
                  className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-mcz-ember">
            {shared ? <CheckIcon size={15} /> : <Share2 size={15} />}
          </button>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm font-bold text-mcz-ember">
              <Flame size={14} /> {rating != null ? rating : "—"}<span className="text-white/35">/10</span>
            </div>
            <div className="text-[10px] text-white/35">
              {social?.rating_count ?? 0} rating{(social?.rating_count ?? 0) !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm font-semibold text-white">{post.title}</p>
      {post.description && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">{post.description}</p>
      )}
      {post.media_url && (
        post.media_type === "video" ? <video src={post.media_url} controls className="mt-3 w-full rounded-lg" />
          : post.media_type === "audio" ? <audio src={post.media_url} controls className="mt-3 w-full" />
          : <img src={post.media_url} alt="" className="mt-3 w-full rounded-lg" />
      )}

      <div className="mt-3 flex items-center gap-3 border-t border-white/[0.06] pt-3 text-xs">
        <button onClick={() => react(social?.my === 1 ? 0 : 1)}
                className={`flex items-center gap-1 ${social?.my === 1 ? "text-emerald-300" : "text-white/40 hover:text-white"}`}>
          <ThumbsUp size={13} /> {social?.up ?? 0}
        </button>
        <button onClick={() => react(social?.my === -1 ? 0 : -1)}
                className={`flex items-center gap-1 ${social?.my === -1 ? "text-mcz-ember" : "text-white/40 hover:text-white"}`}>
          <ThumbsDown size={13} /> {social?.down ?? 0}
        </button>

        {/* Drafting is free and moves nothing — say so, since every other
            button in the app that touches money states its price. */}
        <button onClick={takeToCollabZ}
                className="ml-auto flex items-center gap-1 text-white/40 hover:text-mcz-gold"
                title="Start a CollabZ deal from this post — drafting costs nothing">
          <Handshake size={13} /> Take it to CollabZ
        </button>
        {post.collab_count > 0 && (
          <button onClick={() => goToSpot("collabz", "")}
                  className="text-white/35 hover:text-mcz-gold"
                  title="Deals that grew out of this post">
            {post.collab_count} collab{post.collab_count === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-3">
        {canRate && !skipped ? (
          <div className="space-y-2">
            <div className="re-label">Rate this track</div>
            <p className="text-[11px] text-white/40">
              Anonymous, and it curates the ChartZ. +1 {ENERGY} per rating.
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => rate(n)}
                        className={`re-scale ${n <= myRating ? "re-scale-on" : ""}`} title={`Rate ${n}/10`}>
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
              : post.mine ? "You can't rate your own post"
              : <span>Rating opens in <span className="text-mcz-ember">{rateLeft}s</span></span>}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
        <div className="re-label">Comments · {comments.length}</div>
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
            <span className="font-semibold text-mcz-ember">{c.user}</span>{" "}
            <span className="text-white/80">{c.body}</span>
          </div>
        ))}
        {canComment ? (
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
              placeholder="What did you like about it?"
              maxLength={charLimit ?? undefined}
              defaultValue=""
              onChange={(e) => (draft.current = e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && comment()}
            />
            <button className="re-btn !w-auto px-3" onClick={comment}><Send size={14} /></button>
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
