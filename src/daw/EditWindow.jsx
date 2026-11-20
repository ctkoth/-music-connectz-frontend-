// The Edit window: track headers on the left, the timeline on the right, the ruler on top.
//
// It draws the session and turns pointer drags into the session's own edits (session.js) — it
// decides nothing about where a region may go; grid, slip and shuffle are the model's.
//   * drag a region's body  → move it (to another track too, by dragging over that lane)
//   * drag near either edge → trim that edge
//   * tap the ruler or an empty lane → put the playhead there
import { memo, useEffect, useRef, useState } from "react";
import { Circle, Copy, Plus, Trash2 } from "lucide-react";
import { beatSeconds, endOf, lenOf, regionsOf } from "./session.js";
import { PARAMS, laneOf } from "./automation.js";
import { StatzSample } from "../components/StatzSample.jsx";
import AutoLane from "./AutoLane.jsx";
import { KeyChip } from "../components/KeyBadge.jsx";

const HEADER_W = 168;
const LANE_H = 76;
const EDGE_PX = 10;

/** One region's waveform, drawn from the engine's peaks for the window of the source it plays. */
const Wave = memo(function Wave({ peaks, sourceDur, inSec, outSec, width, color }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const w = Math.max(1, Math.min(16000, Math.round(width)));
    const h = LANE_H - 22;
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.clearRect(0, 0, w, h);
    if (!peaks || !sourceDur) return;
    const n = peaks.length / 2;
    g.fillStyle = color;
    for (let x = 0; x < w; x++) {
      const t = inSec + ((outSec - inSec) * x) / w;
      const b = Math.min(n - 1, Math.max(0, Math.floor((t / sourceDur) * n)));
      const lo = peaks[b * 2]; const hi = peaks[b * 2 + 1];
      const y1 = h / 2 - hi * (h / 2);
      const y2 = h / 2 - lo * (h / 2);
      g.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  }, [peaks, sourceDur, inSec, outSec, width, color]);
  return <canvas ref={ref} className="pointer-events-none block h-[54px] w-full" />;
});

function Ruler({ session, zoom, width, onSeek }) {
  const beat = beatSeconds(session);
  const bar = beat * session.meter;
  const step = bar * zoom < 40 ? bar * Math.ceil(40 / (bar * zoom)) : bar;
  const marks = [];
  for (let t = 0, i = 0; t * zoom < width && i < 2000; t += step, i++) marks.push(t);
  return (
    <div className="relative h-7 cursor-pointer border-b border-white/10 bg-black/40 text-[10px] text-white/50"
         style={{ width }} onPointerDown={(e) => onSeek((e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom)}>
      {marks.map((t) => (
        <span key={t} className="absolute top-0 h-full border-l border-white/20 pl-1" style={{ left: t * zoom }}>
          {Math.round(t / bar) + 1}
        </span>
      ))}
    </div>
  );
}

export function Playhead({ position, zoom, height }) {
  return <div className="pointer-events-none absolute top-0 z-20 w-px bg-mcz-ember" style={{ left: position * zoom, height }} />;
}

export default function EditWindow({
  session, daw, zoom, selected, onSelect, onSeek, playhead, onCommit, onDraft,
  onTrack, onArm, onPlaylist, onAddTrack, onRemoveTrack, recording, devices = [], onInput, keyRange = 12, onTranspose,
  onAuto, autoAllowed = false, trackLabel = "", picked = [], onPick, onMeasure,
}) {
  // Which lane each track shows: its clips, or its volume / pan automation drawn over them.
  const [views, setViews] = useState({});
  const [drag, setDrag] = useState(null);          // { id, mode, startX, startAt, region, track, dx, overTrack }
  const total = Math.max(60, endOfSession(session) + 30);
  const width = total * zoom;

  const begin = (e, track, r) => {
    e.stopPropagation();
    onSelect(r.id);
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const mode = x < EDGE_PX ? "start" : box.width - x < EDGE_PX ? "end" : "move";
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: r.id, mode, startX: e.clientX, region: r, track: track.id, dx: 0, overTrack: track.id });
  };
  const moving = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    let overTrack = drag.overTrack;
    if (drag.mode === "move") {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("[data-lane]");
      if (el) overTrack = el.dataset.lane;
    }
    setDrag({ ...drag, dx, overTrack });
    onDraft?.(true);
  };
  const end = () => {
    if (!drag) return;
    const dt = drag.dx / zoom;
    const r = drag.region;
    if (Math.abs(drag.dx) >= 2 || drag.overTrack !== drag.track) {
      if (drag.mode === "move") onCommit({ type: "move", id: r.id, at: r.at + dt, track: drag.overTrack });
      else if (drag.mode === "start") onCommit({ type: "trim", id: r.id, edge: "start", t: r.at + dt });
      else onCommit({ type: "trim", id: r.id, edge: "end", t: endOf(r) + dt });
    }
    setDrag(null);
    onDraft?.(false);
  };

  // What a region looks like WHILE it is being dragged; the model decides where it lands on release.
  const shown = (r) => {
    if (!drag || drag.id !== r.id) return r;
    const dt = drag.dx / zoom;
    if (drag.mode === "move") return { ...r, at: Math.max(0, r.at + dt) };
    if (drag.mode === "start") {
      const shift = Math.min(Math.max(dt, -r.in), lenOf(r) - 0.02);
      return { ...r, at: r.at + shift, in: r.in + shift };
    }
    return { ...r, out: Math.max(r.in + 0.02, r.out + dt) };
  };

  const showingLane = onAuto && session.tracks.some((t) => views[t.id]);
  return (
    <>
    {showingLane && !autoAllowed && (
      <div className="mb-2 rounded-xl border border-white/10 bg-black/40 p-2 text-xs">
        <StatzSample what="Drawing automation" />
        <p className="mt-1 text-white/50">Lines already drawn keep playing and bouncing; drawing and writing new ones is StatZ's.</p>
      </div>
    )}
    <div className="flex overflow-hidden rounded-xl border border-white/10 bg-black/30">
      {/* Track headers */}
      <div className="shrink-0 border-r border-white/10" style={{ width: HEADER_W }}>
        <div className="flex h-7 items-center justify-between border-b border-white/10 px-2 text-[10px] uppercase tracking-wider text-white/55">
          <span>Tracks{trackLabel && <span className="ml-1 normal-case tracking-normal text-white/50">{trackLabel}</span>}</span>
          <button type="button" className="rounded px-1 text-white/70 hover:text-white" onClick={onAddTrack} title="Add a track" aria-label="Add a track"><Plus size={14} /></button>
        </div>
        {session.tracks.map((t) => (
          <div key={t.id} className="flex flex-col justify-between gap-1 border-b border-white/10 px-2 py-1.5" style={{ height: LANE_H }}>
            <div className="flex items-center gap-1">
              {onPick && <input type="checkbox" className="shrink-0" aria-label={`Select ${t.name}`} checked={picked.includes(t.id)}
                                onChange={(e) => onPick(e.target.checked ? [...picked, t.id] : picked.filter((x) => x !== t.id))} />}
              <span className="h-3 w-1.5 shrink-0 rounded" style={{ background: t.color }} />
              <input className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-white outline-none" value={t.name}
                     aria-label="Track name" onChange={(e) => onTrack(t.id, { name: e.target.value })} />
              {onMeasure && regionsOf(t).length > 0 && (
                <KeyChip measure={() => onMeasure(t)} version={regionsOf(t).map((r) => `${r.src}:${r.in}:${r.out}`).join("|")} />
              )}
              <button type="button" className="text-white/30 hover:text-mcz-ember" title="Remove track" aria-label={`Remove ${t.name}`}
                      onClick={() => onRemoveTrack(t.id)} disabled={session.tracks.length <= 1 || recording}><Trash2 size={12} /></button>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <button type="button" aria-pressed={t.armed} title="Record-arm" disabled={recording}
                      className={`rounded px-1.5 py-0.5 ${t.armed ? "bg-red-600 text-white" : "bg-white/10 text-white/60"}`} onClick={() => onArm(t.id)}>
                <Circle size={9} className="inline" fill={t.armed ? "currentColor" : "none"} /> R
              </button>
              <button type="button" aria-pressed={t.solo} className={`rounded px-1.5 py-0.5 ${t.solo ? "bg-yellow-400 text-black" : "bg-white/10 text-white/60"}`}
                      onClick={() => onTrack(t.id, { solo: !t.solo })}>S</button>
              <button type="button" aria-pressed={t.mute} className={`rounded px-1.5 py-0.5 ${t.mute ? "bg-sky-500 text-black" : "bg-white/10 text-white/60"}`}
                      onClick={() => onTrack(t.id, { mute: !t.mute })}>M</button>
              {onAuto && !t.armed && (
                // Clips, or a lane of automation drawn over them. A lane with points is marked ●.
                <select className="min-w-0 flex-1 rounded bg-white/10 px-1 py-0.5 text-[10px] font-normal text-white/80" data-nomemo="true"
                        aria-label={`${t.name} lane view`} title="Show the clips, or draw volume or pan automation"
                        value={views[t.id] || ""} onChange={(e) => setViews((v) => ({ ...v, [t.id]: e.target.value }))}>
                  <option value="">Clips</option>
                  {Object.entries(PARAMS).map(([k, p]) => <option key={k} value={k}>{p.label}{t.auto?.[k]?.points?.length ? " ●" : ""}</option>)}
                </select>
              )}
              {onAuto && views[t.id] && laneOf(t, views[t.id]).points.length > 0 && (
                <>
                  <button type="button" aria-pressed={laneOf(t, views[t.id]).on !== false} title="Read: the track follows this lane. Off: the fader is used."
                          className={`rounded px-1 py-0.5 ${laneOf(t, views[t.id]).on !== false ? "bg-emerald-500 text-black" : "bg-white/10 text-white/60"}`}
                          onClick={() => { const l = laneOf(t, views[t.id]); onAuto(t.id, views[t.id], { ...l, on: l.on === false }); }}>Read</button>
                  <button type="button" className="text-white/55 hover:text-mcz-ember" title="Clear this lane" aria-label={`Clear ${t.name} ${views[t.id]} automation`}
                          onClick={() => { if (window.confirm(`Clear the ${PARAMS[views[t.id]].label.toLowerCase()} automation on ${t.name}?`)) onAuto(t.id, views[t.id], { on: true, points: [] }); }}>
                    <Trash2 size={11} />
                  </button>
                </>
              )}
              {t.armed && onInput && (
                // Which input this armed track records: a device, and both channels or one of them —
                // so a stereo interface's two inputs can be two tracks recorded at once.
                <select className="min-w-0 flex-1 rounded bg-red-900/40 px-1 py-0.5 text-[10px] font-normal text-white/90" data-nomemo="true"
                        aria-label={`${t.name} input`} disabled={recording} title="Record from"
                        value={`${t.input?.device || ""}|${t.input?.channel || "both"}`}
                        onChange={(e) => { const [device, channel] = e.target.value.split("|"); onInput(t.id, { device, channel }); }}>
                  {[{ id: "", label: "Default mic" }, ...devices].flatMap((d) => [
                    <option key={`${d.id}|both`} value={`${d.id}|both`}>{d.label}</option>,
                    <option key={`${d.id}|left`} value={`${d.id}|left`}>{d.label} · left</option>,
                    <option key={`${d.id}|right`} value={`${d.id}|right`}>{d.label} · right</option>,
                  ])}
                </select>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onTranspose && (
                // Stem transposition: the track's key, its tempo kept. The range is the tier's.
                <select className="w-12 shrink-0 rounded bg-white/10 px-0.5 py-0.5 text-[10px] text-white/80" data-nomemo="true"
                        aria-label={`${t.name} key`} title={`Transpose ${t.name} — up to ±${keyRange} semitones on your tier`} disabled={recording}
                        value={t.semis || 0} onChange={(e) => onTranspose(t.id, Number(e.target.value))}>
                  {Array.from({ length: 25 }, (_, i) => i - 12).map((n) => (
                    <option key={n} value={n} disabled={Math.abs(n) > keyRange}>{n > 0 ? `+${n}` : n === 0 ? "♮ 0" : n}</option>
                  ))}
                </select>
              )}
              <select className="min-w-0 flex-1 rounded bg-white/10 px-1 py-0.5 text-[10px] text-white/80" data-nomemo="true"
                      aria-label={`${t.name} playlist`} value={t.active} disabled={recording}
                      onChange={(e) => onPlaylist(t.id, { type: "switch", index: Number(e.target.value) })}>
                {t.playlists.map((p, i) => <option key={p.id} value={i}>{p.name} ({p.regions.length})</option>)}
              </select>
              <button type="button" className="text-white/50 hover:text-white" title="New empty take (playlist)" aria-label="New playlist" disabled={recording}
                      onClick={() => onPlaylist(t.id, { type: "new" })}><Plus size={12} /></button>
              <button type="button" className="text-white/50 hover:text-white" title="Copy this take to a new playlist" aria-label="Duplicate playlist" disabled={recording}
                      onClick={() => onPlaylist(t.id, { type: "copy" })}><Copy size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="relative" style={{ width }}>
          <Ruler session={session} zoom={zoom} width={width} onSeek={onSeek} />
          <div className="relative" onPointerMove={moving} onPointerUp={end} onPointerCancel={end}>
            {session.tracks.map((t) => (
              <div key={t.id} data-lane={t.id}
                   className={`relative border-b border-white/10 ${drag?.overTrack === t.id && drag.track !== t.id ? "bg-white/5" : ""}`}
                   style={{ height: LANE_H }}
                   onPointerDown={(e) => { if (e.target === e.currentTarget) { onSelect(null); onSeek((e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom); } }}>
                {onAuto && views[t.id] && (
                  <AutoLane param={views[t.id]} lane={laneOf(t, views[t.id])} fallback={views[t.id] === "volume" ? t.gain : t.pan}
                            zoom={zoom} width={width} height={LANE_H - 1} color={t.color}
                            locked={!autoAllowed}
                            onChange={(lane) => onAuto(t.id, views[t.id], lane)} />
                )}
                {regionsOf(t).map((r0) => {
                  const r = shown(r0);
                  const src = session.sources[r.src];
                  const sel = selected === r.id;
                  return (
                    <div key={r.id} role="button" tabIndex={0} aria-label={`Region ${r.name}`} aria-pressed={sel}
                         onPointerDown={(e) => begin(e, t, r0)}
                         className={`absolute top-1 cursor-grab touch-none select-none overflow-hidden rounded-md border ${sel ? "border-white" : "border-white/20"}`}
                         style={{ left: r.at * zoom, width: Math.max(4, lenOf(r) * zoom), height: LANE_H - 8, background: `${t.color}26`,
                                  opacity: drag?.id === r.id ? 0.85 : 1 }}>
                      <div className="truncate px-1 text-[10px] leading-4 text-white/80" style={{ background: `${t.color}55` }}>{r.name}</div>
                      <Wave peaks={daw.peaks(r.src)} sourceDur={src?.duration} inSec={r.in} outSec={r.out} width={lenOf(r) * zoom} color={t.color} />
                      {r.fadeIn > 0 && <div className="pointer-events-none absolute bottom-0 left-0 top-4 bg-gradient-to-r from-black/70 to-transparent" style={{ width: r.fadeIn * zoom }} />}
                      {r.fadeOut > 0 && <div className="pointer-events-none absolute bottom-0 right-0 top-4 bg-gradient-to-l from-black/70 to-transparent" style={{ width: r.fadeOut * zoom }} />}
                    </div>
                  );
                })}
              </div>
            ))}
            <Playhead position={playhead} zoom={zoom} height={session.tracks.length * LANE_H} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function endOfSession(session) {
  return session.tracks.reduce((m, t) => regionsOf(t).reduce((mm, r) => Math.max(mm, endOf(r)), m), 0);
}
