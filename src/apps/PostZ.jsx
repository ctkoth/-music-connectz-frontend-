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
//   POST /api/economy/postz/                   → { title, description, genre, visibility, media }
//   POST /api/economy/uploads/                 → hosts a recording, returns its URL
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
  Pencil, Send, Share2, ThumbsDown, ThumbsUp, Trash2, X as XIcon,
} from "lucide-react";
import { api } from "../api.js";
import { asList } from "../shape.js";
import { useCharLimit } from "../limits.js";
import CharLimit, { TierCharTable } from "../CharLimit.jsx";
import { IconImg } from "../App.jsx";
import { GENRE_GROUPS, genreLabel } from "../genres.js";
import SkillsUsed from "../SkillsUsed.jsx";
import MediaFields from "../MediaFields.jsx";
import { hasBlobs, mediaItems, primaryMedia, storageNote, uploadWork } from "../uploadWork.js";
import { ENERGY, PROMPTZ } from "../resources.js";
import { playSound } from "../sound.js";
import { useSay } from "../voice.js";
import { P } from "../phrases.js";
import { goToSpot } from "../goto.js";
import { handOff } from "../handoff.js";

const SORTS = [["hot", "Hot"], ["new", "New"], ["top", "Top rated"]];

// What a destination costs, said BEFORE the button that spends it. The server
// decides the number and whether today's free prompts already cover it — this
// only renders what it was told, so the price on the button and the price the
// coach charges cannot drift.
function Price({ cost }) {
  if (!cost || !cost.amount) return <span className="text-emerald-300">Free</span>;
  if (cost.free_today) {
    return (
      <span className="text-emerald-300">
        Free today · {cost.daily_remaining} left
      </span>
    );
  }
  return (
    <span className={cost.affordable ? "text-mcz-ember" : "text-mcz-ember/60"}>
      −{cost.amount} {PROMPTZ}
      {!cost.affordable && <span className="text-white/35"> · not enough</span>}
    </span>
  );
}

/** Where this post can go, and what happens to it there.
 *
 * The list is the SERVER's — one place decides which apps can do something
 * with a post, what each still needs, and what it costs. A door that can't do
 * anything with this post is shown greyed with the reason on it rather than
 * dropped: a member whose post is lyrics-only should read that the coach wants
 * a recording, not conclude SingZ went missing.
 */
function OpenIn({ post, busy, onGo }) {
  const dests = asList(post.destinations);
  if (!dests.length) return null;
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-3"
         data-tour="postz-open-in">
      <p className="text-[11px] uppercase tracking-widest text-white/45">
        Open this post in
      </p>
      <p className="text-[11px] leading-relaxed text-white/40">
        The track, the words and the cover travel with it — nothing gets
        attached twice.
      </p>
      {dests.map((d) => (
        <div key={d.app + d.label}
             className={`rounded-lg border p-2.5 ${d.available
               ? "border-white/[0.08] bg-white/[0.03]"
               : "border-white/[0.05] bg-white/[0.01]"}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              onClick={() => onGo(d)}
              disabled={!d.available
                        || !!(d.cost?.amount && !d.cost.affordable && !d.cost.free_today)}
              className={`text-[13px] font-semibold ${d.available
                ? "text-white hover:text-mcz-gold"
                : "cursor-not-allowed text-white/35"}`}>
              {d.label}
            </button>
            <span className="text-[11px]"><Price cost={d.cost} /></span>
            {d.gain?.what && (
              <span className="text-[11px] text-emerald-300/70">→ {d.gain.what}</span>
            )}
            {d.count > 0 && (
              <span className="text-[10px] text-white/35">· {d.count} so far</span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{d.what}</p>
          {/* Why it can't go yet — on the row, not hidden behind the attempt. */}
          {!d.available && (
            <p className="mt-1 text-[11px] text-mcz-ember/80">Needs {d.needs.join("; ")}.</p>
          )}
        </div>
      ))}
      {busy && (
        <p className="flex items-center gap-2 text-[11px] text-white/45">
          <Loader2 className="animate-spin" size={12} /> Handing it over…
        </p>
      )}
    </div>
  );
}

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
  // 🆓 Freestyle rides ALONGSIDE the genre, never instead of it. A freestyle
  // Trap verse is still Trap — putting Freestyle in the genre list would have
  // forced a choice between the two and split the tag across every family.
  const [freestyle, setFreestyle] = useState(false);
  const [skillsUsed, setSkillsUsed] = useState([]);
  const [visibility, setVisibility] = useState("public");
  const [toast, setToast] = useState("");
  const [posting, setPosting] = useState(false);
  const [work, setWork] = useState({});      // MediaFields' shape
  const [storage, setStorage] = useState(null);
  const [cost, setCost] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // The owner can edit and delete any post at any age. The server enforces it;
  // this only decides whether the buttons are worth drawing.
  const [isOwner, setIsOwner] = useState(false);
  const cl = useCharLimit();
  const charLimit = cl.unlimited ? null : cl.limit;

  useEffect(() => {
    api("/api/auth/stats/").then((st) => setIsOwner(!!st?.is_owner)).catch(() => {});
  }, []);

  // One post changed in place, or removed when `next` is null. Beats reloading
  // the feed: a re-sort under somebody's thumb after they edited a caption is
  // its own small betrayal.
  const replacePost = (id, next) => setPosts((cur) => (cur || []).flatMap(
    (x) => (x.id !== id ? [x] : next ? [mapPost(next)] : [])));

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

  // The price of the skills picked, quoted before the button rather than
  // discovered by pressing it. Re-asked whenever the picks change, because a
  // stale quote is the same lie as no quote.
  useEffect(() => {
    const q = skillsUsed.length ? `?skills=${encodeURIComponent(skillsUsed.join(","))}` : "";
    api(`/api/economy/postz/cost/${q}`).then(setCost).catch(() => setCost(null));
  }, [skillsUsed]);

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
      // A recording lives in the tab as a blob: URL, which is dead the moment
      // anybody else opens the post. Host it FIRST, and if that fails, fail the
      // whole post — a post that quietly lost its audio is worse than no post.
      if (hasBlobs(work)) flash("Uploading…");
      const { work: hosted, storage: st } = await uploadWork(work);
      if (st) setStorage(st);

      const s = await api("/api/economy/postz/", {
        method: "POST",
        body: {
          title: t, description: description.trim(), genre, freestyle, visibility,
          skills_used: skillsUsed,
          // One of each: audio, video, image and script all ride together.
          // The primary slot is what the feed plays inline; `items` carries
          // every attachment, one per kind, and the server refuses a second of
          // any kind unless the post is explicitly an album.
          ...primaryMedia(hosted),
          items: mediaItems(hosted, t),
        },
      });

      playSound("post");
      setPosts((cur) => [mapPost(s), ...(cur || [])]);
      setTitle(""); setDescription(""); setSkillsUsed([]); setWork({});
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
            {GENRE_GROUPS.map((grp) => (
              <optgroup key={grp.key} label={`${grp.emoji} ${grp.label}`}>
                {grp.genres.map(([name, emoji]) => (
                  <option key={name} value={name}>{name} {emoji}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {/* Any genre can be freestyled, so this is a toggle next to the
              genre rather than an entry inside it. */}
          <button type="button" data-tour="post-freestyle"
                  aria-pressed={freestyle}
                  title="Off the top, unwritten — works with any genre"
                  onClick={() => setFreestyle((v) => !v)}
                  className={`pill !text-[12px] ${freestyle ? "!text-mcz-gold !border-mcz-gold/60" : ""}`}>
            🆓 Freestyle
          </button>
          <select className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-mcz-ember/60"
                  value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="public">Public</option>
            <option value="restricted">Members only</option>
            <option value="private">Just me</option>
          </select>
          <button data-tour="post-submit" className="re-btn !w-auto px-6" onClick={createPost} disabled={posting || !title.trim()}>
            {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {posting && hasBlobs(work) ? " Uploading…" : " Post"}
            {/* −N ⚡ on the control itself. A price you find out by paying it
                is not a price, it's a bill. */}
            {cost?.cost?.amount > 0
              ? <span className="ml-1 text-mcz-ember">−{cost.cost.amount} {ENERGY}</span>
              : <span className="ml-1 text-emerald-300">Free</span>}
          </button>
        </div>

        {/* Record it or attach it. The same component CollabZ and BattleZ use,
            so the three composers can't drift apart. */}
        <MediaFields value={work} onChange={setWork} label="Audio, video, image or lyrics" />
        {storage && <p className="text-[10px] text-white/35">{storageNote(storage)}</p>}
        {/* 2.2 required this on every example, and it's what makes a post
            matchable to the people who have those skills. */}
        <SkillsUsed value={skillsUsed} onChange={setSkillsUsed} label="Skills used on this" />
        {cost && (
          <p className="text-[10px] leading-relaxed text-white/35">
            {cost.cost.amount > 0 ? (
              <>Posting costs <span className="text-mcz-ember">−{cost.cost.amount} {ENERGY}</span>
                {" — "}
                {cost.lines.filter((l) => l.cents > 0).map((l) => `${l.skill} ${l.cents}`).join(" + ")}.
                {!cost.affordable && (
                  <span className="text-mcz-ember">
                    {" "}You have {cost.energy} — we'll take what's there.
                  </span>
                )}
              </>
            ) : (
              <>Free. Price your skills in ProfileZ and posts that use them cost
                what they're worth.</>
            )}
          </p>
        )}

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
          <button key={k} className={`pill ${sort === k ? "pill-on" : ""}`} onClick={() => setSort(k)}>
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
          <PostCard key={p.id} post={p} now={now} charLimit={charLimit} onFlash={flash}
                    isOwner={isOwner} onChanged={replacePost} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post, now, charLimit, onFlash, isOwner, onChanged }) {
  const talk = useSay();
  // Reactions, comments and my own rating live in the shared item space, keyed
  // `post:<id>` — the same space playlists and works use.
  const [social, setSocial] = useState(null);
  const [shared, setShared] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Which door is being walked through, so two taps can't send the same post
  // to two apps at once.
  const [opening, setOpening] = useState("");
  const [showOpen, setShowOpen] = useState(false);
  const [eTitle, setETitle] = useState(post.title);
  const [eDesc, setEDesc] = useState(post.description || "");
  const [eWork, setEWork] = useState({});
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

  // Editing is the author's inside the tier's window, and the owner's at any
  // age on any post. Media is the reason it matters: a post whose track never
  // uploaded used to need posting again, which threw away every rating on it.
  const canEdit = post.mine || isOwner;

  async function saveEdit() {
    const t = eTitle.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      // Media only rides along when it was actually touched. Sending empty
      // slots on a text edit would wipe the attachments the post already has.
      const touched = Object.keys(eWork).length > 0;
      let media = {};
      if (touched) {
        if (hasBlobs(eWork)) onFlash("Uploading…");
        const { work: hosted } = await uploadWork(eWork);
        media = { ...primaryMedia(hosted), items: mediaItems(hosted, t) };
      }
      const next = await api("/api/economy/postz/", {
        method: "POST",
        body: { edit_id: post.id, title: t, description: eDesc.trim(), ...media },
      });
      onChanged(post.id, next);
      setEditing(false); setEWork({});
      onFlash(post.mine ? "Saved." : `Saved — @${post.author} was told you edited it.`);
    } catch (e) {
      // api() throws a plain Error whose message is the server's `detail`, so
      // the window refusal arrives as that string rather than a field.
      onFlash(/edit_window_passed/.test(e.message || "")
        ? "That post is past its edit window."
        : e.message || "Couldn't save that.");
    } finally { setBusy(false); }
  }

  async function remove() {
    const who = post.mine ? "your post" : `@${post.author}'s post`;
    if (!window.confirm(`Delete ${who} "${post.title}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/economy/postz/${post.id}/delete/`, { method: "DELETE" });
      onChanged(post.id, null);
      onFlash(post.mine ? "Deleted." : `Deleted — @${post.author} was told.`);
    } catch (e) {
      onFlash(e.message || "Couldn't delete that.");
      setBusy(false);
    }
  }

  async function rate(score) {
    try {
      setSocial(await api("/api/economy/social/rate/",
                          { method: "POST", body: { item, action: "rate", score } }));
      onFlash(talk(P.postz_rated(score)));
      playSound("energy_gain");
    } catch (e) {
      // The server owns the window — if it says no, believe it and re-read.
      onFlash(e.message || "Couldn't rate.");
      playSound("error");
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
  // A post already carries the four assets a distributor asks for — the song,
  // the music video, the cover and the lyrics — so this fills a release from
  // them rather than making anyone retype it. The GET answers first so the
  // button can say what's still missing before creating anything.
  async function distribute(target) {
    try {
      const r = await api(`/api/economy/postz/${post.id}/distribute/`, { method: "POST", body: {} });
      // Deliberately does NOT navigate on its own. There is no DistributeZ tab
      // to land on, and switching tabs would take this message with it — the
      // result of pressing a button has to survive pressing it. When the
      // destination row names an anchor in DirectZ, that jump is the caller's.
      if (target) goToSpot("directz", target);
      onFlash(r.ready
        ? `Release ready — "${r.title}" by ${r.artist_name}, with the song, video, cover and lyrics filled in.`
        : `Release started. It still needs ${r.missing.join(", ")}.`);
    } catch (e) { onFlash(e.message || "Couldn't start that release."); }
  }

  async function takeToCollabZ(target) {
    try {
      await api("/api/economy/collab/", {
        method: "POST", body: { from_post: post.id, currency: "money" },
      });
      onFlash(`Draft deal started on "${post.title}" — open CollabZ to set the worth.`);
      goToSpot("collabz", target || "");
    } catch (e) { onFlash(e.message || "Couldn't start that collab."); }
  }

  // The one place a post leaves PostZ. Which apps are offered, what each one
  // needs and what it costs are all the server's answer (`post.destinations`);
  // this decides only HOW the post travels — an API call for the doors that
  // create something server-side, and a handoff for the ones that fill a form
  // in the destination.
  async function openIn(d) {
    if (!d.available || opening) return;
    setOpening(d.app);
    try {
      if (d.action === "deal") return await takeToCollabZ(d.target);
      if (d.action === "distribute") return await distribute(d.target);
      // "coach" and "seed" both carry the post over and land on the control.
      // The destination states the price again ON the button that spends it —
      // the row here is the quote, the button there is the commitment.
      await handOff(d.app, d.target, {
        kind: "post", action: d.action, coach_kind: d.coach_kind || "",
        // The coach's ceiling travels with the post, so the destination can
        // hold the same line the row just held rather than letting the button
        // find it out.
        take_bytes: d.take_bytes || 0, max_bytes: d.max_bytes || 0,
        ...(d.carry || {}),
      });
      onFlash(talk(P.postz_handed_over(post.title, d.app.toUpperCase())));
    } catch (e) {
      onFlash(e.message || `Couldn't open that in ${d.app}.`);
    } finally { setOpening(""); }
  }

  async function comment() {
    const body = draft.current.trim();
    if (!body) return;
    try {
      setSocial(await api("/api/economy/social/comment/", { method: "POST", body: { item, body } }));
      draft.current = "";
      onFlash(talk(P.postz_commented));
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
            {post.genre && <span>· {genreLabel(post.genre)}</span>}
            {post.freestyle && <span className="text-mcz-gold">· 🆓 Freestyle</span>}
            {post.visibility !== "public" && (
              <span className="pill !px-1.5 !py-0 !text-[9px]">{post.visibility}</span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          {canEdit && (
            <button onClick={() => setEditing((v) => !v)} disabled={busy}
                    title={post.mine ? "Edit this post" : "Edit as platform owner"}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-mcz-cyan">
              {editing ? <XIcon size={15} /> : <Pencil size={15} />}
            </button>
          )}
          {canEdit && (
            <button onClick={remove} disabled={busy}
                    title={post.mine ? "Delete this post" : "Delete as platform owner"}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-white/[0.06] hover:text-mcz-pink">
              <Trash2 size={15} />
            </button>
          )}
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

      {editing ? (
        <div className="mt-1 space-y-2 rounded-lg border border-mcz-cyan/25 bg-mcz-cyan/[0.04] p-3">
          <p className="text-[11px] uppercase tracking-widest text-mcz-cyan/80">
            {post.mine ? "Editing your post" : `Editing @${post.author}'s post as owner`}
          </p>
          {!post.mine && (
            <p className="text-[11px] text-white/45">
              This gets recorded on the post and @{post.author} is notified. Their
              name is on it, so the edit says yours is too.
            </p>
          )}
          <input value={eTitle} onChange={(e) => setETitle(e.target.value)} maxLength={160}
                 className="w-full rounded-lg border border-white/[0.08] bg-black/40 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
                 placeholder="Title" />
          <textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} rows={4}
                    maxLength={charLimit ?? undefined}
                    className="w-full resize-none rounded-lg border border-white/[0.08] bg-black/40 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-mcz-ember/60"
                    placeholder="Say more about it…" />
          {/* `cl` lives in the composer's scope, not this card's — the card
              is handed the resolved limit, so it counts against that. */}
          <div className="text-right text-[10px] text-white/35">
            {eDesc.length.toLocaleString()} / {charLimit ? charLimit.toLocaleString() : "∞"}
          </div>
          {/* The whole point of editing an old post: attach the take that
              never uploaded. Untouched, the media already on the post stays. */}
          <MediaFields value={eWork} onChange={setEWork}
                       label="Add or replace audio, video, image or lyrics" />
          <div className="flex items-center gap-2">
            <button className="re-btn !w-auto px-4" onClick={saveEdit} disabled={busy || !eTitle.trim()}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckIcon size={14} />}
              {busy ? " Saving…" : " Save"}
            </button>
            <button className="pill !text-[11px]" onClick={() => { setEditing(false); setEWork({}); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold text-white">{post.title}</p>
          {post.description && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">{post.description}</p>
          )}
        </>
      )}
      {/* An edit by anyone other than the author is said on the post itself.
          A post carries its author's name; an unmarked edit by somebody else
          is the platform putting words in their mouth. */}
      {post.edited_by && (
        <p className="mt-1 text-[11px] text-white/35">
          ✏️ Edited by @{post.edited_by}
        </p>
      )}
      {/* One of each: the server resolves the primary slot and the album
          entries into `media`, so every attachment renders instead of only the
          one that happened to be primary. Falls back to the old single-slot
          fields for a post made before the slots existed. */}
      {(() => {
        const m = post.media || (post.media_url
          ? { [post.media_type || "audio"]: post.media_url } : {});
        // The recording this post carried is not in storage any more, and the
        // SERVER established that — something went and looked, it was not
        // guessed from a player that failed. So the player is replaced rather
        // than left to sit at 0:00 explaining nothing, and it is replaced HERE,
        // on the post, where the member may still have the file. They used to
        // find out one app away, from the coach, framed as a refusal.
        const gone = post.take_missing ? (post.take_kind || "audio") : "";
        return (
          <>
            {gone && (
              <div className="mt-3 rounded-lg border border-mcz-ember/30 bg-mcz-ember/10 p-3">
                <p className="text-[11px] leading-relaxed text-mcz-ember">
                  The {gone} on this post isn't on our server any more, so it won't
                  play and no app can open it. That's on us, not on you — nothing
                  you did removed it, and it isn't counting against your storage.
                </p>
                {canEdit && (
                  <button className="re-link mt-2 text-[11px]"
                          onClick={() => setEditing(true)}>
                    Attach the {gone} again — every door on this post opens with it
                  </button>
                )}
              </div>
            )}
            {m.audio && gone !== "audio" && <audio src={m.audio} controls className="mt-3 w-full" />}
            {m.video && gone !== "video" && <video src={m.video} controls className="mt-3 w-full rounded-lg" />}
            {m.image && <img src={m.image} alt="" className="mt-3 w-full rounded-lg" />}
            {m.text && (
              <p className="mt-3 whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-black/20 p-3 text-[13px] leading-relaxed text-white/70">
                {m.text}
              </p>
            )}
          </>
        );
      })()}

      <div className="mt-3 flex items-center gap-3 border-t border-white/[0.06] pt-3 text-xs">
        <button onClick={() => react(social?.my === 1 ? 0 : 1)}
                className={`flex items-center gap-1 ${social?.my === 1 ? "text-emerald-300" : "text-white/40 hover:text-white"}`}>
          <ThumbsUp size={13} /> {social?.up ?? 0}
        </button>
        <button onClick={() => react(social?.my === -1 ? 0 : -1)}
                className={`flex items-center gap-1 ${social?.my === -1 ? "text-mcz-ember" : "text-white/40 hover:text-white"}`}>
          <ThumbsDown size={13} /> {social?.down ?? 0}
        </button>

        {/* One door out of a post used to be hardcoded here — CollabZ, and
            nothing else. Every app that can do something with this post now
            lives in the panel below, from the server's own list. */}
        <button onClick={() => setShowOpen((v) => !v)}
                className={`ml-auto flex items-center gap-1 ${showOpen ? "text-mcz-gold" : "text-white/40 hover:text-mcz-gold"}`}
                title="Coach it, collab on it, put it in a playlist, enter it in a battle">
          <Handshake size={13} /> {showOpen ? "Close" : "Open it in…"}
        </button>
        {post.collab_count > 0 && (
          <button onClick={() => goToSpot("collabz", "collabz-deals")}
                  className="text-white/35 hover:text-mcz-gold"
                  title="Deals that grew out of this post">
            {post.collab_count} collab{post.collab_count === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {showOpen && (
        <OpenIn post={post} busy={!!opening} onGo={openIn} />
      )}

      {/* What the coach said, kept on the post that was coached. A score that
          lived for one screenful and then vanished sent people back through
          the same prompt to read it again. */}
      {post.score?.verdict && (
        <div className="mt-3 rounded-lg border border-mcz-cyan/20 bg-mcz-cyan/[0.04] p-3">
          <p className="text-[11px] uppercase tracking-widest text-mcz-cyan/80">
            👑 Coached in {(post.score.app_key || "singz").toUpperCase()} ·{" "}
            <span className="text-white">{post.score.score}/10</span>
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/70">{post.score.verdict}</p>
          {post.score.next_drill && (
            <p className="mt-1 text-[11px] text-white/45">
              Next drill · {post.score.next_drill}
            </p>
          )}
        </div>
      )}

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
