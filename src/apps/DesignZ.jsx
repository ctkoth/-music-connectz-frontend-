// DesignZ — where designers put their work to be rated, reacted to and talked about.
//
// It is a SkillZ app (a designer's skill is shown by the work, and the work's rating IS the skill's rating), and it decides
// nothing: the feed is PostZ's (`/api/economy/postz/`), the controls under every design are the one SocialBar — Karma (vote
// + mood), Rate, Comment, Share, Open in… — on the same `post:<id>` item PostZ rates, so a design's number is one number
// wherever it is seen. Posting is PostZ's composer (its price is stated there before the button), reached with one tap.
//
// A "design" here is a post with a picture, or one that names a design skill. Nothing is invented to fill the grid: an empty
// feed says so and offers the two doors that fix it (post one, or make one in ImageZ).
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api } from "../api.js";
import { goToSpot } from "../goto.js";
import { handOff, onHandoff } from "../handoff.js";
import { RatingRing, RatingRow } from "../components/Rating.jsx";
import { IconImg } from "../App.jsx";
import MemberName from "../MemberName.jsx";
import SocialBar from "../components/SocialBar.jsx";
import LooksDoor from "../components/LooksDoor.jsx";
import { PERSONA_SKILLS, labelForSkill } from "../personaSkills.js";
import { designPosts, imageOf, notesFromHandoff } from "../designz.js";

const SORTS = [["hot", "Hot"], ["new", "New"], ["top", "Top rated"]];
const DESIGN_KEYS = new Set(Object.values(PERSONA_SKILLS.designer || {}).flatMap((cat) => Object.keys(cat)));

export default function DesignZ() {
  const [sort, setSort] = useState("hot");
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState("");
  const load = () => {
    setErr("");
    api(`/api/economy/postz/?sort=${sort}`)
      .then((d) => setPosts(Array.isArray(d?.posts) ? d.posts : Array.isArray(d) ? d : []))
      .catch((e) => { setPosts([]); setErr(e.message || "Couldn't load designs."); });
  };
  useEffect(() => { setPosts(null); load(); }, [sort]); // eslint-disable-line react-hooks/exhaustive-deps
  // Coach notes handed over from ImageZ's "Score it": read in full here, beside everybody's designs.
  const [notes, setNotes] = useState(null);
  useEffect(() => onHandoff("designz", (p) => { const n = notesFromHandoff(p); if (n) setNotes(n); }), []);
  const designs = useMemo(() => designPosts(posts || [], DESIGN_KEYS), [posts]);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <IconImg icon="designz.png" alt="" className="h-16 w-16 rounded-xl object-cover" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold text-white">DesignZ</h1>
          <p className="text-sm text-white/65">Put your design work up. Members rate it, react to it and comment — and the rating is the median of what other people gave.</p>
        </div>
      </header>

      {notes && <CoachNotes notes={notes} onClose={() => setNotes(null)} />}

      <div className="flex flex-wrap items-center gap-2" data-tour="designz-post">
        <button type="button" className="neon-btn-primary !w-auto px-5" onClick={() => handOff("postz", "composer", { })}>
          <Plus size={16} /> Post a design
        </button>
        <button type="button" className="re-btn !w-auto px-4" onClick={() => goToSpot("imagez", "")}>Make one in ImageZ</button>
        <span className="text-[11px] text-white/55">The price of posting is shown in the composer before you press Post. Rating a design earns the rater ⚡, stated beside the control.</span>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Order">
        {SORTS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={sort === k} onClick={() => setSort(k)}
                  className={`pill ${sort === k ? "!border-mcz-cyan !text-mcz-cyan" : ""}`}>{label}</button>
        ))}
      </div>

      {posts === null && <p className="flex items-center gap-2 text-sm text-white/60"><Loader2 size={14} className="animate-spin" /> Loading designs…</p>}
      {err && <p className="text-sm text-mcz-ember">{err} <button type="button" className="underline" onClick={load}>Try again</button></p>}
      {posts !== null && !err && designs.length === 0 && (
        <div className="re-card space-y-2 text-sm text-white/75">
          <p className="font-semibold text-white">No designs here yet.</p>
          <p>A design is a post with a picture, or one that lists a design skill. Be the first — post one, and it lands here for everyone to rate.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {designs.map((p) => {
          const img = imageOf(p);
          const skills = (p.skills_used || []).filter((k) => DESIGN_KEYS.has(k));
          return (
            <article key={p.id} className="re-card space-y-2 !p-3 min-w-0">
              {img && (
                <a href={`/p/${p.id}`} target="_blank" rel="noreferrer" aria-label={`Open ${p.title || "design"}`}>
                  <img src={img} alt={p.title || "Design"} loading="lazy" className="w-full rounded-xl object-cover" style={{ maxHeight: 360 }} />
                </a>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{p.title || "Untitled design"}</p>
                <p className="text-[11px] text-white/60">by <MemberName username={p.author} bare /></p>
              </div>
              {skills.length > 0 && (
                <ul className="flex flex-wrap gap-1">
                  {skills.slice(0, 5).map((k) => <li key={k} className="pill !text-[10px]">{labelForSkill(k)}</li>)}
                </ul>
              )}
              <SocialBar item={`post:${p.id}`} compact />
            </article>
          );
        })}
      </div>
    </div>
  );
}

// The ImageZ coach's full notes on one picture: the craft score with every dimension's WHY and HOW, in full. The coach scores
// the picture's CRAFT and never anybody's looks, and the screen says so beside the numbers (the server's own sentence is
// shown in ImageZ where it was run; this one is the same rule). Free to read: it was paid for when it was scored.
function CoachNotes({ notes, onClose }) {
  return (
    <section className="re-card space-y-3" data-tour="designz-notes" aria-label="Coach notes">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-mcz-cyan">Coach notes · from ImageZ</p>
          <p className="text-[11px] text-white/55">Free to read — you paid when it was scored. It scores the picture's craft, never anybody's looks.</p>
        </div>
        <button type="button" className="text-white/50 hover:text-white" aria-label="Close the coach notes" onClick={onClose}>✕</button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {notes.image && <img src={notes.image} alt="The picture that was scored" className="h-32 w-32 rounded-xl object-cover" />}
        <RatingRing value={notes.overall} size={128} label="Overall" />
        {notes.verdict && <p className="min-w-[12rem] flex-1 text-sm leading-relaxed text-white/85">{notes.verdict}</p>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {notes.rows.map((r) => (
          <RatingRow key={r.key} value={r.score} label={r.label} size="sm"
                     detail={<>{r.score == null && !r.why ? "Not visible in this picture — not guessed." : r.why}{r.how && <span className="block text-emerald-300">How: {r.how}</span>}</>} />
        ))}
      </div>
      {notes.next && <p className="text-sm text-white/80"><span className="font-semibold text-white">Next:</span> {notes.next}</p>}
      <LooksDoor />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="re-btn !w-auto px-4" onClick={() => goToSpot("imagez", "")}>Make the changes in ImageZ</button>
        <button type="button" className="re-btn !w-auto px-4" onClick={() => handOff("postz", "composer", {})}>Post it for other members to rate</button>
      </div>
    </section>
  );
}
