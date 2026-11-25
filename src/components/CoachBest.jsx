import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { RatingNumber } from "./Rating.jsx";
import CoachReadCard from "./CoachReadCard.jsx";
import { PostPlayer, COLORS } from "./PostPlayer.jsx";
import { api } from "../api.js";
import { goToSpot, spotlight } from "../goto.js";

// CoachZ best score: the highest overall each AI coach has given this member, on every profile. The list is
// the server's (`coach_best`, already filtered by the member's own visibility setting); a coach with no scored
// take is absent, and nothing renders at all when there is nothing to show — never a "0" and never an
// invented score. `best` is the number the member was SHOWN, drawn the house way (RatingNumber).
//
// A number that leads nowhere is a dead end, so each row OPENS: the work that scored highest (when the
// viewer may open it) and the coach's whole read of it, from /api/economy/coachbest/<user>/<app>/. The
// server picks the take, decides what work this viewer can open and builds the read; this renders it.

function Work({ work, note, username }) {
  if (!work) return <p className="text-[12px] leading-relaxed text-white/60">{note}</p>;
  if (work.kind === "post") {
    const video = work.media_type === "video" && work.media_url;
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-[10px] uppercase tracking-widest text-white/55">The work it scored</p>
        <Link to={work.url} className="mt-0.5 inline-flex items-center gap-1 text-[14px] font-semibold text-mcz-cyan hover:underline">
          {work.title || "Open the post"} <ExternalLink size={12} />
        </Link>
        {video
          ? <video src={work.media_url} controls playsInline preload="metadata" className="mt-2 max-h-64 w-full rounded-lg bg-black" />
          : <PostPlayer post={{ id: work.id, title: work.title, author: username, media_type: work.media_type, media_url: work.media_url }}
                        color={COLORS[0]} />}
      </div>
    );
  }
  if (work.kind === "link") {
    return (
      <a href={work.url} target="_blank" rel="noopener noreferrer"
         className="inline-flex items-center gap-1 text-[13px] font-semibold text-mcz-cyan hover:underline">
        {work.title} <ExternalLink size={12} /> <span className="font-normal text-white/50">opens in a new tab</span>
      </a>
    );
  }
  // kind "file": the member's own kept take, only ever sent to the member.
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-widest text-white/55">Your kept take · only you see this</p>
      {work.media_type === "video"
        ? <video src={work.url} controls playsInline preload="metadata" className="mt-2 max-h-64 w-full rounded-lg bg-black" />
        : <audio src={work.url} controls preload="metadata" className="mt-2 w-full" />}
    </div>
  );
}

function BestTake({ username, app }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let on = true;
    setD(null); setErr("");
    api(`/api/economy/coachbest/${encodeURIComponent(username)}/${encodeURIComponent(app)}/`)
      .then((r) => on && setD(r))
      .catch((e) => on && setErr(e?.message || "Couldn't open that take."));
    return () => { on = false; };
  }, [username, app]);
  if (err) return <p role="alert" className="pb-2 text-[12px] text-mcz-ember">{err}</p>;
  if (!d) {
    return <p className="flex items-center gap-2 pb-2 text-[12px] text-white/55"><Loader2 size={12} className="animate-spin" /> Opening the best take…</p>;
  }
  return (
    <div className="space-y-2 pb-2" data-testid="coach-best-take">
      <Work work={d.work} note={d.work_note} username={username} />
      <CoachReadCard coach={d.coach} signedIn author={username}
                     onOpen={(tab, target) => goToSpot(tab, target)} />
      {d.share_url && (
        <Link to={d.share_url} className="inline-block text-[11px] text-mcz-cyan hover:underline">Shared score card →</Link>
      )}
    </div>
  );
}

export default function CoachBest({ rows, className = "", audience = "", username = "" }) {
  const [open, setOpen] = useState("");
  const list = (rows || []).filter((r) => r && r.best != null);
  if (!list.length) return null;
  return (
    <section aria-label="CoachZ best score" className={`rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 ${className}`}>
      <p className="text-[12px] font-bold uppercase tracking-widest text-white/70">CoachZ best score</p>
      <ul className="mt-1.5 divide-y divide-white/10">
        {list.map((r) => {
          const shown = open === r.app;
          const body = (
            <>
              <span className="min-w-0 truncate text-[14px] text-white/85">{r.emoji} {r.label}
                <span className="ml-2 text-[11px] text-white/50">{r.takes} take{r.takes === 1 ? "" : "s"} scored</span></span>
              <span className="flex shrink-0 items-center gap-1.5">
                <RatingNumber value={r.best} size="md" outOf />
                {username && (shown ? <ChevronUp size={14} className="text-white/50" /> : <ChevronDown size={14} className="text-white/50" />)}
              </span>
            </>
          );
          return (
            <li key={r.app}>
              {username ? (
                <button type="button" aria-expanded={shown} onClick={() => setOpen(shown ? "" : r.app)}
                        title="Open the take that scored this, with the coach's feedback"
                        className="flex w-full items-center justify-between gap-3 py-1.5 text-left hover:bg-white/[0.03]">
                  {body}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 py-1.5">{body}</div>
              )}
              {shown && <BestTake username={username} app={r.app} />}
            </li>
          );
        })}
      </ul>
      {username && <p className="mt-1 text-[11px] text-white/50">Tap a score to open the take behind it and the coach's feedback · free</p>}
      {/* Owner only: who sees this is the member's own setting, and the control that sets it is one tap away. */}
      {audience && (
        <p className="mt-1.5 text-[12px] text-white/60">
          Your best scores and the coach's feedback on them are visible to <b className="text-white/85">{audience}</b> ·{" "}
          <button type="button" className="underline" onClick={() => spotlight("visibility")}>Change who sees this</button>
        </p>
      )}
    </section>
  );
}
