import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { goToSpot } from "../goto.js";
import { openDoor } from "../doors.js";
import { shellHas } from "../standalone.js";
import { PROMPTZ } from "../resources.js";

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

const shown = (t) => (t.exact != null ? Number(t.exact).toFixed(1) : (t.overall ?? "—"));

function Cost({ cost }) {
  if (!cost) return null;
  return cost.free_today
    ? <span className="text-emerald-300">free today</span>
    : <span className="text-mcz-ember">−{cost.amount} {PROMPTZ}</span>;
}

function Row({ t, labels, appKey }) {
  const [open, setOpen] = useState(false);
  const read = t.read || {};
  const doors = (t.exports || []).filter((e) => shellHas(e.tab));
  const go = openDoor;
  return (
    <li className="rounded-lg bg-white/5 text-[12px]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
        {open ? <ChevronDown size={13} className="text-white/40" /> : <ChevronRight size={13} className="text-white/40" />}
        <span className="font-bold">{shown(t)}<span className="text-white/35">/10</span></span>
        <span className="text-white/45">{new Date(t.at).toLocaleDateString()}</span>
        {t.genre && <span className="text-white/35">{t.genre}</span>}
        {t.difficulty && <span className="text-white/35">{t.difficulty}</span>}
        {t.range_class && <span className="text-white/35">{t.range_class}</span>}
      </button>
      {open && (
        <div className="space-y-2 border-t border-white/[0.06] px-3 py-2">
          {read.verdict && <p className="text-white/75">{read.verdict}</p>}
          {t.scores && Object.keys(t.scores).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(t.scores).map(([k, v]) => labels[k]
                ? <span key={k} className="pill">{labels[k]} <b>{v}</b></span> : null)}
            </div>
          )}
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
