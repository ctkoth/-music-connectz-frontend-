import { useEffect, useRef } from "react";

// DAW-style lanes: every row a track, every clip a stretch of time on a shared
// clock. ViewZ's timeline and a post's own results draw with this one component,
// so a visit is the same shape wherever it is shown. It decides nothing — the
// server's lanes and clips come in, a clock goes out.
//
// lanes: [{ key, label, sub?, title?, disabled?, onLane?, clips: [{ start, end, seconds, label?, kind?, title?, onClip? }] }]
// from/to: ms. kinds: { post: "bg-… border-…", … } class strings.

export const LANE_H = 38;

export function dur(s) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export function tickStep(from, to) {
  const span = to - from;
  return span <= 2 * 3600e3 ? 10 * 60e3 : span <= 2 * 86400e3 ? 3 * 3600e3 : span <= 21 * 86400e3 ? 86400e3 : 7 * 86400e3;
}

export function ticks(from, to) {
  const step = tickStep(from, to);
  const out = [];
  for (let t = Math.ceil(from / step) * step; t <= to; t += step) out.push(t);
  return out;
}

export function tickLabel(t, from, to) {
  const d = new Date(t);
  return tickStep(from, to) >= 86400e3
    ? d.toLocaleDateString([], { month: "short", day: "numeric" })
    : d.toLocaleTimeString([], { hour: "numeric", minute: to - from <= 2 * 3600e3 ? "2-digit" : undefined });
}

const DEFAULT_KIND = "bg-mcz-cyan/70 border-mcz-cyan";

export default function DawLanes({ lanes, from, to, kinds = {}, minWidth = 520 }) {
  const scroller = useRef(null);
  // Open at the playhead, like a DAW following "now": recent visits are the
  // right-hand end, which a phone would otherwise have scrolled away.
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth; }, [lanes, from, to]);
  const span = Math.max(1, to - from);
  const pct = (t) => ((t - from) / span) * 100;
  const marks = ticks(from, to);
  return (
    <div className="neon-frame overflow-hidden p-0">
      <div className="flex">
        <div className="w-28 shrink-0 border-r border-white/10 bg-black/30 sm:w-36">
          <div className="h-7 border-b border-white/10" />
          {lanes.map((l) => (
            <button key={l.key} disabled={l.disabled} title={l.title} onClick={l.onLane}
              className="flex w-full flex-col justify-center border-b border-white/5 px-2 text-left hover:bg-white/5 disabled:hover:bg-transparent"
              style={{ height: LANE_H }}>
              <span className="truncate text-xs font-semibold">{l.label}</span>
              {l.sub && <span className="truncate text-[10px] text-white/45">{l.sub}</span>}
            </button>
          ))}
        </div>
        <div ref={scroller} className="relative min-w-0 flex-1 overflow-x-auto">
          <div className="relative" style={{ minWidth }}>
            <div className="relative h-7 border-b border-white/10 bg-black/30">
              {marks.map((t) => (
                <span key={t} className="absolute top-1 -translate-x-1/2 text-[10px] text-white/45" style={{ left: `${pct(t)}%` }}>
                  {tickLabel(t, from, to)}
                </span>
              ))}
            </div>
            {lanes.map((l, i) => (
              <div key={l.key} className={`relative border-b border-white/5 ${i % 2 ? "bg-white/[0.02]" : ""}`} style={{ height: LANE_H }}>
                {marks.map((t) => <span key={t} className="absolute inset-y-0 w-px bg-white/5" style={{ left: `${pct(t)}%` }} />)}
                {l.clips.map((c, j) => {
                  const a = Math.max(from, Date.parse(c.start));
                  const left = pct(a);
                  const width = Math.max(0.6, pct(Date.parse(c.end)) - left);
                  const when = new Date(c.start).toLocaleString();
                  return (
                    <button key={j} onClick={c.onClip} disabled={!c.onClip}
                      title={c.title || `${c.label ? `${c.label} — ` : ""}${dur(c.seconds)} · ${when}`}
                      className={`absolute top-1.5 overflow-hidden truncate rounded border px-1 text-left text-[10px] font-semibold text-black ${kinds[c.kind] || DEFAULT_KIND}`}
                      style={{ left: `${left}%`, width: `${width}%`, height: LANE_H - 12 }}>
                      {width > 6 ? (c.label || dur(c.seconds)) : ""}
                    </button>
                  );
                })}
              </div>
            ))}
            <span className="pointer-events-none absolute inset-y-0 right-0 w-0.5 bg-mcz-ember shadow-[0_0_8px_#ff5500]" title="now" />
          </div>
        </div>
      </div>
    </div>
  );
}
