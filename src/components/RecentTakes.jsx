import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { goToSpot } from "../goto.js";
import { openDoor } from "../doors.js";
import { api } from "../api.js";
import { shareLink, shareText } from "../shareText.js";
import { shellHas } from "../standalone.js";
import { PROMPTZ } from "../resources.js";
import { RatingGrid, RatingNumber } from "./Rating.jsx";

// The coach's recent submissions, and where each one can go next.
//
// A score with a date was a dead end: the take had been judged, the read was
// good, and the only thing the screen offered was a number. Every row opens to
// the read and to the doors the SERVER lists for it (`exports`) — a post draft,
// a message, a journal entry, the drills, the punchline writer, a battle — each
// with what it does and what it costs said BEFORE the member presses it.
//
// It decides nothing about which doors exist or what is in them: the server owns
// the list and the words (apps/economy/takescorez.exports_for), so a destination
// added there shows up here without a release, and the sentence a member reads
// is the one the server stands behind.
//
// What travels is the score and the coach's read, never audio — a take recorded
// in the coach was scored and not kept. The panel says so rather than letting
// "export" imply the recording goes too.

function Cost({ cost }) {
  if (!cost) return null;
  return cost.free_today
    ? <span className="text-emerald-300">free today</span>
    : <span className="text-mcz-ember">−{cost.amount} {PROMPTZ}</span>;
}

function Row({ t, labels, appKey }) {
  const [open, setOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [shareUrl, setShareUrl] = useState(t.share_url || "");
  const read = t.read || {};
  const doors = (t.exports || []).filter((e) => shellHas(e.tab));
  // "Share this score" is not a handoff to another screen: it asks the server for
  // the public link of THIS take (minted once, from what the coach said), then
  // opens the device's share sheet — or copies — with the link in it.
  async function shareIt() {
    setShareMsg("");
    try {
      const r = await api(`/api/${appKey}/take/${t.id}/share/`, { method: "POST" });
      setShareUrl(r.share_url);
      const how = await shareLink({ text: shareText({ score: t.overall, exact: t.exact }), url: r.share_url });
      setShareMsg(how === "shared" ? "Shared." : how === "copied" ? "Link copied — paste it anywhere." : "");
    } catch (e) { setShareMsg(e.message || "Couldn't make the link."); }
  }
  const go = (e) => (e.kind === "share" ? shareIt() : openDoor(e));
  return (
    <li className="rounded-lg bg-white/5 text-[12px]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
        {open ? <ChevronDown size={13} className="text-white/40" /> : <ChevronRight size={13} className="text-white/40" />}
        <RatingNumber size="md" outOf value={t.overall} exact={t.exact} />
        <span className="text-white/45">{new Date(t.at).toLocaleDateString()}</span>
        {t.genre && <span className="text-white/35">{t.genre}</span>}
        {t.difficulty && <span className="text-white/35">{t.difficulty}</span>}
        {t.range_class && <span className="text-white/35">{t.range_class}</span>}
      </button>
      {open && (
        <div className="space-y-2 border-t border-white/[0.06] px-3 py-2">
          {read.verdict && <p className="text-white/75">{read.verdict}</p>}
          <RatingGrid rows={Object.entries(t.scores || {}).filter(([k]) => labels[k]).map(([k, v]) => ({
            key: k, label: labels[k], value: v }))} />
          {read.strengths?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-300/80">What worked</p>
              {read.strengths.map((s, i) => <p key={i} className="text-white/65">· {s}</p>)}
            </div>
          )}
          {read.fixes?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-mcz-ember/80">Fix this</p>
              {read.fixes.map((s, i) => <p key={i} className="text-white/65">· {s}</p>)}
            </div>
          )}
          {read.practice?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-mcz-cyan/80">Practise this</p>
              {read.practice.map((p, i) => (
                <p key={i} className="text-white/65">
                  <b className="text-mcz-cyan">{p.what}</b>{p.why ? ` — ${p.why}` : ""}{p.how ? ` ${p.how}` : ""}
                </p>
              ))}
            </div>
          )}
          {!read.verdict && !read.fixes?.length && (
            <p className="text-white/40">This take was scored before the read was kept, so there is only the score to carry.</p>
          )}

          {t.open_in?.tab && shellHas(t.open_in.tab) && (
            <button onClick={() => goToSpot(t.open_in.tab, t.open_in.target)}
                    className="text-mcz-cyan hover:underline">Open where it came from</button>
          )}

          {doors.length > 0 && (
            <div className="space-y-1.5 border-t border-white/[0.06] pt-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40">Take it further</p>
              {doors.map((e) => (
                <div key={e.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <button onClick={() => go(e)} data-door={e.key}
                          className="rounded-md bg-mcz-cyan/10 px-2 py-1 text-[11px] text-mcz-cyan hover:bg-mcz-cyan/20">
                    {e.label}
                  </button>
                  <Cost cost={e.cost} />
                  <span className="text-[11px] text-white/45">{e.note}</span>
                  {e.kind === "share" && shareUrl && (
                    <span className="flex flex-wrap gap-2 text-[11px]">
                      <a href={shareUrl} target="_blank" rel="noreferrer" className="text-white/55 underline">See the card</a>
                      <a href={`/api/economy/scores/${shareUrl.replace(/^\/s\//, "")}/card.png?format=story`} download="coach-score-story.png"
                         target="_blank" rel="noreferrer" className="text-white/55 underline">Story card (TikTok / Reels)</a>
                    </span>
                  )}
                  {e.kind === "share" && shareMsg && <span className="text-[11px] text-emerald-300">{shareMsg}</span>}
                </div>
              ))}
              <p className="text-[11px] text-white/35">
                The score and the coach's read travel; the recording doesn't — it was scored, not kept.
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function RecentTakes({ takes, dimensions, appKey }) {
  if (!takes?.length) return null;
  const labels = Object.fromEntries((dimensions || []).map((d) => [d.key, d.label]));
  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/40">Recent takes</p>
      <ul className="space-y-1">
        {takes.map((t) => <Row key={t.id} t={t} labels={labels} appKey={appKey} />)}
      </ul>
    </div>
  );
}
