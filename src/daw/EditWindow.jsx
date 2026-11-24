// The Edit window: track headers on the left, the timeline on the right, the ruler on top.
//
// It draws the session and turns pointer drags into the session's own edits (session.js) — it
// decides nothing about where a region may go; grid, slip and shuffle are the model's.
//   * drag a region's body  → move it (to another track too, by dragging over that lane)
//   * drag near either edge → trim that edge
//   * tap the ruler or an empty lane → put the playhead there
import { Fragment, memo, useEffect, useRef, useState } from "react";
import { Circle, Copy, Plus, Trash2 } from "lucide-react";
import { REC_MODES, endOf, lenOf, regionsOf, rulerTicks } from "./session.js";
import { PARAMS, laneOf } from "./automation.js";
import { StatzSample } from "../components/StatzSample.jsx";
import AutoLane from "./AutoLane.jsx";
import { KeyChip } from "../components/KeyBadge.jsx";
import { StatzSample as StatzOffer, useStatzTrial } from "../components/StatzSample.jsx";
import TonePicker, { useTonePresets } from "./TonePresets.jsx";
import FxChainBrowser from "./FxChainBrowser.jsx";
import { ColorPick, EmojiPick } from "./Looks.jsx";
import { MarkerHeader, MarkerStrip } from "./Markers.jsx";
import { ArrangerHeader, ArrangerStrip } from "./ArrangerStrip.jsx";
import { compIndex, compSpans } from "./comp.js";
import { DRAG_MIME, decode, hasFiles, isOurs, mediaFiles } from "./dragPayload.js";
import { trackSize } from "./view.js";
import Popover from "./Popover.jsx";
import { PLUGINS, newInsert } from "./plugins.js";
import { levelAdvice, meterPos } from "./audioIO.js";

const LEVEL_TONE = { clip: "bg-red-500", hot: "bg-amber-400", good: "bg-emerald-400", low: "bg-sky-400", silent: "bg-white/30" };

const HEADER_W = 190;
const EDGE_PX = 10;

/** One region's waveform, drawn from the engine's peaks for the window of the source it plays. */
const Wave = memo(function Wave({ peaks, sourceDur, inSec, outSec, width, color, height }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const w = Math.max(1, Math.min(16000, Math.round(width)));
    const h = height;
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
  }, [peaks, sourceDur, inSec, outSec, width, color, height]);
  return <canvas ref={ref} className="pointer-events-none block w-full" style={{ height }} />;
});

// Two rows: bars and beats on top, the clock (m:ss) under it. Sticky, so it stays in view while the tracks scroll.
export const LOOP_H = 16;
export const COMP_ROW = 40;
export const RULER_H = 44 + LOOP_H;
const BEATS_KEY = "mcz_daw_beats_row";
function useBeatsRow() {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(BEATS_KEY) !== "0"; } catch { return true; } });
  const set = (v) => { setOn(v); try { localStorage.setItem(BEATS_KEY, v ? "1" : "0"); } catch { /* not remembered */ } };
  return [on, set];
}
// The loop lane: drag on empty space to draw the region, drag its edges or body to adjust, double-click to clear.
function LoopLane({ session, zoom, width, onLoop, onToggleLoop, punchArmed }) {
  const [drag, setDrag] = useState(null);           // { mode: "new"|"start"|"end"|"move", a, b, from, orig }
  const lp = session.loop;
  const at = (e) => Math.max(0, (e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom);
  const view = drag && drag.b != null ? { start: Math.min(drag.a, drag.b), end: Math.max(drag.a, drag.b), on: lp?.on !== false } : lp;
  const down = (mode) => (e) => {
    if (!onLoop) return;
    e.stopPropagation();
    const lane = e.currentTarget.closest("[data-looplane]");
    const t = (e.clientX - lane.getBoundingClientRect().left) / zoom;
    lane.setPointerCapture?.(e.pointerId);
    if (mode === "new") setDrag({ mode, a: t, b: null });
    else if (mode === "start") setDrag({ mode, a: lp.end, b: lp.start });
    else if (mode === "end") setDrag({ mode, a: lp.start, b: lp.end });
    else setDrag({ mode, a: lp.start, b: lp.end, from: t, orig: lp });
  };
  const move = (e) => {
    if (!drag) return;
    const t = at(e);
    if (drag.mode === "move") { const d = Math.max(-drag.orig.start, t - drag.from); setDrag({ ...drag, a: drag.orig.start + d, b: drag.orig.end + d }); }
    else setDrag({ ...drag, b: t });
  };
  const up = () => {
    if (!drag) return;
    if (drag.b != null && Math.abs(drag.b - drag.a) * zoom >= 4) onLoop(Math.min(drag.a, drag.b), Math.max(drag.a, drag.b));
    setDrag(null);
  };
  return (
    <div data-looplane className="relative border-b border-white/10 bg-white/[0.03]" style={{ width, height: LOOP_H }} onPointerDown={down("new")} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}
         onDoubleClick={() => onLoop && onLoop(null)} title="Drag to set a loop region. Drag its edges to adjust, double-click to clear.">
      {view && (
        <div className={`absolute inset-y-0 ${punchArmed ? "bg-red-500/40 border-red-400" : view.on ? "bg-emerald-400/35 border-emerald-300" : "bg-white/10 border-white/30"} border-x`} style={{ left: view.start * zoom, width: Math.max(2, (view.end - view.start) * zoom) }}>
          <span className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize" onPointerDown={down("start")} />
          <span className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize" onPointerDown={down("end")} />
          <span className="absolute inset-y-0 left-1.5 right-1.5 cursor-grab text-[9px] leading-[14px] text-white/80" onPointerDown={down("move")}
                onClick={(e) => { e.stopPropagation(); }}>{punchArmed ? "🔴 punch" : view.on ? "🔁 loop" : "loop off"}</span>
        </div>
      )}
    </div>
  );
}

function Ruler({ session, zoom, width, onSeek, showBeats = true, onLoop, onToggleLoop, punchArmed }) {
  const { bars, beats, clock } = rulerTicks(session, zoom, width);
  return (
    <div className="sticky top-0 z-30 cursor-pointer border-b border-white/10 bg-[#0b0b14] text-[10px] text-white/55" data-tour="daw-ruler"
         style={{ width, height: RULER_H }} title="Bars and beats on top, minutes and seconds below — tap to move the playhead"
         onPointerDown={(e) => onSeek((e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom)}>
      <LoopLane session={session} zoom={zoom} width={width} onLoop={onLoop} onToggleLoop={onToggleLoop} punchArmed={punchArmed} />
      <div className="relative h-[22px] border-b border-white/10">
        {showBeats && beats.map((m) => (
          <span key={`b${m.t}`} className="absolute bottom-0 h-2 border-l border-white/15 pl-0.5 text-[8px] leading-none text-white/35" style={{ left: m.t * zoom }}>
            {m.label && <span className="relative -top-2.5">{m.label}</span>}
          </span>
        ))}
        {bars.map((m) => (
          <span key={`B${m.t}`} className="absolute top-0 h-full border-l border-white/40 pl-1 font-semibold text-white/75" style={{ left: m.t * zoom }}>{m.label}</span>
        ))}
      </div>
      <div className="relative h-[21px]">
        {clock.map((m) => (
          <span key={`c${m.t}`} className="absolute top-0 h-full border-l border-white/25 pl-1 font-mono tabular-nums text-mcz-cyan/80" style={{ left: m.t * zoom }}>{m.label}</span>
        ))}
      </div>
    </div>
  );
}

export function Playhead({ position, zoom, height }) {
  return <div className="pointer-events-none absolute top-0 z-20 w-px bg-mcz-ember" style={{ left: position * zoom, height }} />;
}

export default function EditWindow({
  session, daw, zoom, onZoom, trackSizeKey = "normal", punchArmed = false, onComp = null, onStartComp = null, onClearComp = null, arranger = null, onDropItem = null, onDropFiles = null, savedToneIds = [], onLoop, onToggleLoop, selected, onSelect, onSeek, playhead, onCommit, onDraft,
  onTrack, onArm, onPlaylist, onAddTrack, onRemoveTrack, recording, devices = [], onInput, keyRange = 12, onTranspose,
  onAuto, autoAllowed = false, trackLabel = "", picked = [], onPick, onMeasure,
  onAddMarker, onMarker, onRemoveMarker, onInserts, onOpenMix, onJump, monitorTrack, monitorLat, onMonitor, levels, onAudioSettings, atTrackCap = false, onUpgrade,
}) {
  const tones = useTonePresets();
  const { s: trial } = useStatzTrial();
  const statzOk = !!(trial?.is_statz || trial?.active);
  const [looks, setLooks] = useState(null);      // the track whose name / emoji / colour panel is open
  const [fx, setFx] = useState(null);            // the track whose FX panel is open
  const [fxMsg, setFxMsg] = useState("");
  // Which lane each track shows: its clips, or its volume / pan automation drawn over them.
  const [views, setViews] = useState({});
  const [beatsRow, setBeatsRow] = useBeatsRow();
  const size = trackSize(trackSizeKey);
  const dense = !size.full;
  const LANE_H = size.h;
  // Drag and drop (Studio Dragon): the browser's effects, tones and loops, and audio files from the desktop. A drop is only
  // taken if it decodes to something the browser really offers; the DAW does the rest (onDropItem / onDropFiles).
  const [dropTrack, setDropTrack] = useState(null);
  // Comping: a track with several takes can open them as rows under it; swiping across a take's row takes that stretch into the comp.
  const [compOpen, setCompOpen] = useState(() => new Set());
  const [swipe, setSwipe] = useState(null);                 // { trackId, lane, x0, x1 } while a swipe is being dragged
  const toggleComp = (id) => setCompOpen((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const compLanes = (t) => {                                // the comp first, then every take, each with its index on the track
    const rows = t.playlists.map((p, i) => ({ p, i }));
    return [...rows.filter((r) => r.p.comp), ...rows.filter((r) => !r.p.comp)];
  };
  const openRows = (t) => (compOpen.has(t.id) && onComp ? compLanes(t).length : 0);
  const extraH = session.tracks.reduce((n, t) => n + openRows(t) * COMP_ROW, 0);
  const droppable = (e) => !!(onDropItem || onDropFiles) && (isOurs(e.dataTransfer) || (onDropFiles && hasFiles(e.dataTransfer)));
  const dropOn = (t, laneEl) => ({
    onDragOver: (e) => { if (!droppable(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (dropTrack !== t.id) setDropTrack(t.id); },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropTrack((x) => (x === t.id ? null : x)); },
    onDrop: (e) => {
      if (!droppable(e)) return;
      e.preventDefault(); setDropTrack(null);
      const at = laneEl ? Math.max(0, (e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom) : null;
      if (isOurs(e.dataTransfer) && onDropItem) { const item = decode(e.dataTransfer.getData(DRAG_MIME), { savedToneIds }); if (item) onDropItem(t.id, item, at); return; }
      if (onDropFiles && hasFiles(e.dataTransfer)) { const { ok, skipped } = mediaFiles(e.dataTransfer.files); onDropFiles(ok, t.id, at, skipped); }
    },
  });
  const scroller = useRef(null);
  const pending = useRef(null);                    // { t, x }: the time under the pointer, and where on screen it sat
  // Ctrl + wheel (and a trackpad pinch, which arrives as ctrl + wheel) zooms; the moment under the pointer stays put.
  const live = useRef({});
  live.current = { onZoom, zoom };
  useEffect(() => {                                // native + non-passive: React's onWheel is passive and cannot stop the page zooming
    const el = scroller.current; if (!el) return undefined;
    const h = (e) => {
      const { onZoom: z, zoom: cur } = live.current;
      if (!z || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const x = e.clientX - el.getBoundingClientRect().left;
      pending.current = { t: (el.scrollLeft + x) / cur, x };
      z(Math.exp(-e.deltaY * 0.0025));
    };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);
  useEffect(() => {
    const el = scroller.current; const p = pending.current;
    if (el && p) { el.scrollLeft = Math.max(0, p.t * zoom - p.x); pending.current = null; }
  }, [zoom]);
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
        {arranger && <ArrangerHeader count={(session.sections || []).length} onAdd={arranger.add} onFromLoop={arranger.fromLoop} canLoop={!!session.loop} />}
        {onAddMarker && <MarkerHeader count={(session.markers || []).length} onAdd={() => onAddMarker(playhead)} />}
        <div className="flex flex-col justify-center gap-1.5 border-b border-white/10 px-2 text-[10px] uppercase tracking-wider text-white/55" style={{ height: RULER_H }}>
          <div className="flex items-center justify-between">
            <span className="whitespace-nowrap">Tracks{trackLabel && <span className="ml-1 normal-case tracking-normal text-white/50">{trackLabel}</span>}</span>
            <span className="flex items-center gap-1">
              {atTrackCap && onUpgrade ? (
                <button type="button" className="whitespace-nowrap rounded px-1 normal-case tracking-normal text-mcz-gold hover:text-white" onClick={onUpgrade}
                        title="You are at your plan's track limit. See what the next plan holds." aria-label="Track limit reached: see plans">🔒 Upgrade</button>
              ) : null}
              <button type="button" className="rounded px-1 text-white/70 hover:text-white" onClick={onAddTrack} title={atTrackCap ? "At your plan's track limit" : "Add a track"} aria-label="Add a track"><Plus size={14} /></button>
            </span>
          </div>
          <div className="flex items-center gap-1.5 normal-case tracking-normal">
            <button type="button" className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${beatsRow ? "border-mcz-cyan/60 bg-mcz-cyan/15 text-mcz-cyan" : "border-white/15 text-white/50"} hover:text-white`} aria-pressed={beatsRow}
                    onClick={() => setBeatsRow(!beatsRow)} title={beatsRow ? "Hide the beat ticks (keeps bar numbers and the clock)" : "Show the beat ticks"}>♩ Beats</button>
            {onToggleLoop && (
              <button type="button" disabled={!session.loop} className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${session.loop?.on ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-300" : "border-white/15 text-white/50"} hover:text-white disabled:opacity-50`}
                      aria-pressed={!!session.loop?.on} onClick={onToggleLoop} title={session.loop ? "Loop on/off" : "Drag in the loop lane above the ruler to set a loop region first"}>🔁 Loop</button>
            )}
          </div>
        </div>
        {session.tracks.map((t) => (
          <Fragment key={t.id}>
          <div {...dropOn(t, false)} className={`relative flex flex-col justify-between gap-1 border-b border-white/10 px-2 py-1.5 ${dropTrack === t.id ? "bg-mcz-cyan/15 ring-1 ring-inset ring-mcz-cyan" : recording && t.armed ? "bg-red-600/20 ring-2 ring-inset ring-red-500" : ""}`} style={{ height: LANE_H }}>
            <div className="flex items-center gap-1">
              {onPick && <input type="checkbox" className="shrink-0" aria-label={`Select ${t.name}`} checked={picked.includes(t.id)}
                                onChange={(e) => onPick(e.target.checked ? [...picked, t.id] : picked.filter((x) => x !== t.id))} />}
              <button type="button" className="relative flex h-5 shrink-0 items-center gap-0.5 rounded px-0.5 hover:bg-white/10" data-popover-anchor onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setLooks(looks?.id === t.id ? null : { id: t.id, rect: r }); }}
                      aria-label={`Change ${t.name}'s emoji and colour`} aria-expanded={looks?.id === t.id} title="Change this track's emoji and colour">
                <span className="h-3 w-1.5 rounded" style={{ background: t.color }} />{t.emoji && <span className="text-xs">{t.emoji}</span>}
              </button>
              {recording && t.armed && <span className="shrink-0 animate-pulse rounded bg-red-600 px-1 text-[9px] font-extrabold text-white" role="status">● REC</span>}
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
              {t.armed && (
                <select className="min-w-0 flex-1 rounded bg-red-900/40 px-1 py-0.5 text-[10px] font-normal text-white" data-nomemo="true" value={t.recMode || "takes"}
                        aria-label={`${t.name} record mode`} title={REC_MODES[t.recMode || "takes"].what} disabled={recording}
                        onChange={(e) => onTrack(t.id, { recMode: e.target.value })}>
                  {Object.entries(REC_MODES).map(([k, m]) => <option key={k} value={k} title={m.what}>{m.label}</option>)}
                </select>
              )}
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
            {!dense && <div className="flex items-center gap-1">
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
              {onComp && t.playlists.length > 1 && (
                <button type="button" className={`rounded px-1 text-[10px] ${compOpen.has(t.id) ? "bg-emerald-400/20 text-emerald-200" : "text-white/55 hover:text-white"}`} aria-pressed={compOpen.has(t.id)} aria-label={`Comp ${t.name}`}
                        title="Comping: open the takes as rows and swipe across the best parts to build one finished take" onClick={() => toggleComp(t.id)}>✂ Comp</button>
              )}
            </div>}
            {onInserts && (
              <div className="relative flex items-start gap-1 text-[10px]">
                {t.armed && onMonitor && (
                  <button type="button" aria-pressed={monitorTrack === t.id} onClick={() => onMonitor(t.id)}
                          title={monitorTrack === t.id ? `Hearing ${t.name}'s input${monitorLat ? ` (about ${monitorLat} ms of delay)` : ""}. Click to stop.` : "Hear this track's input while you record (use headphones)"}
                          aria-label={`Monitor ${t.name}`}
                          className={`rounded px-1.5 py-0.5 font-bold ${monitorTrack === t.id ? "bg-emerald-500 text-black" : "bg-red-600 text-white ring-1 ring-white/40"}`}>🎧</button>
                )}
                <button type="button" data-popover-anchor aria-expanded={fx?.id === t.id} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setFx(fx?.id === t.id ? null : { id: t.id, rect: r }); }} title="Add effects or pick a preset chain"
                        className={`rounded px-1.5 py-0.5 font-bold ${(t.inserts || []).length ? "bg-mcz-cyan/25 text-white" : "bg-white/10 text-white/60"}`}>
                  FX{(t.inserts || []).length ? ` ${(t.inserts || []).length}` : ""}
                </button>
                {!dense && <div className="min-w-0 flex-1"><TonePicker compact tones={tones} inserts={t.inserts || []} onApply={(list) => onInserts(t.id, list)} trackName={t.name} statzOk={statzOk} /></div>}
                {fx?.id === t.id && (
                  <Popover rect={fx.rect} onClose={() => setFx(null)} label={`${t.name} effects`}>
                    <p className="font-semibold text-white/80">{t.emoji} {t.name} effects</p>
                    {(t.inserts || []).length === 0 && <p className="text-white/60">No effects yet. Pick a preset chain below, or add one effect at a time.</p>}
                    <ul className="space-y-1">
                      {(t.inserts || []).map((i, n) => (
                        <li key={i.id || n} className="flex items-center gap-1 text-white/80">
                          <input type="checkbox" checked={!!i.on} aria-label={`${PLUGINS[i.type]?.label} on`} onChange={() => onInserts(t.id, t.inserts.map((x, k) => (k === n ? { ...x, on: !x.on } : x)))} />
                          <span className="min-w-0 flex-1 truncate">{PLUGINS[i.type]?.emoji} {PLUGINS[i.type]?.label || i.type}</span>
                          {PLUGINS[i.type]?.params?.mix && (
                            <label className="flex items-center gap-1 text-[10px] text-white/70" title="How much of this effect you hear against the dry sound">
                              {Math.round(i.params?.mix ?? PLUGINS[i.type].params.mix.default)}%
                              <input type="range" min={0} max={100} step={5} className="w-16" aria-label={`${PLUGINS[i.type]?.label} amount`}
                                     value={i.params?.mix ?? PLUGINS[i.type].params.mix.default}
                                     onChange={(e) => onInserts(t.id, t.inserts.map((x, k) => (k === n ? { ...x, params: { ...x.params, mix: Number(e.target.value) } } : x)))} />
                            </label>
                          )}
                          <button type="button" className="rounded border border-white/20 px-1.5 text-[10px] text-white/70 hover:border-mcz-ember hover:text-mcz-ember" aria-label={`Remove ${PLUGINS[i.type]?.label}`} onClick={() => onInserts(t.id, t.inserts.filter((_, k) => k !== n))}>Remove</button>
                        </li>
                      ))}
                    </ul>
                    {(t.inserts || []).length > 1 && (
                      <button type="button" className="re-btn !w-auto px-2 py-0.5 text-[10px]" onClick={() => onInserts(t.id, [])}>Remove all effects (Undo brings them back)</button>
                    )}
                    <label className="block text-white/60">Add an effect
                      <select className="mt-0.5 w-full rounded bg-white/10 px-1 py-0.5 text-white/80 [color-scheme:dark]" data-nomemo="true" value="" aria-label="Add an effect"
                              onChange={(e) => {
                                const type = e.target.value; if (!type) return;
                                if (type === "__autotune") {
                                  if (!statzOk) { setFxMsg("Auto-Tune"); return; }
                                  setFxMsg(""); setFx(null); window.dispatchEvent(new CustomEvent("mcz-autotune", { detail: { trackId: t.id } })); return;
                                }
                                if (PLUGINS[type]?.statz && !statzOk) { setFxMsg(PLUGINS[type].label); return; }
                                setFxMsg(""); onInserts(t.id, [...(t.inserts || []), newInsert(type)]);
                              }}>
                        <option value="">Choose an effect…</option>
                        <optgroup label="Free">{Object.entries(PLUGINS).filter(([, p]) => !p.statz).map(([k, p]) => <option key={k} value={k}>{p.emoji} {p.label}</option>)}</optgroup>
                        <optgroup label="StatZ"><option value="__autotune">🎤 Auto-Tune (pitch correction){statzOk ? "" : " 🔒"}</option>{Object.entries(PLUGINS).filter(([, p]) => p.statz).map(([k, p]) => <option key={k} value={k}>{p.emoji} {p.label}{statzOk ? "" : " 🔒"}</option>)}</optgroup>
                      </select>
                    </label>
                    {fxMsg && (
                      <div className="space-y-1">
                        <p className="text-mcz-gold">🔒 {fxMsg} is a StatZ effect. Free effects: EQ, compressor, delay, reverb, filter, gain.</p>
                        <StatzOffer what={`${fxMsg} (a StatZ effect)`} />
                      </div>
                    )}
                    <p className="text-white/60">FX chains — a whole set of effects in one pick (voice, guitar, bass, keys, drums, mix, plus your own). It replaces this track's effects; Undo brings them back.</p>
                    <FxChainBrowser track={t} onInserts={onInserts} statzOk={statzOk} />
                    <p className="text-white/60">Your saved presets</p>
                    <TonePicker tones={tones} inserts={t.inserts || []} onApply={(list) => onInserts(t.id, list)} trackName={t.name} statzOk={statzOk}
                                placeholder="🎛️ Your saved presets…" ariaLabel={`Put a saved preset on ${t.name}`} />
                    {onOpenMix && <button type="button" className="re-btn !w-auto px-2 py-0.5" onClick={() => { setFx(null); onOpenMix(); }}>Open the mixer to adjust settings</button>}
                  </Popover>
                )}
              </div>
            )}
            {t.armed && (() => {
              const lv = levels?.[t.id];
              const dev = devices.find((d) => d.deviceId === (t.input?.device || ""));
              const name = t.input?.device ? (dev?.label || "Chosen input") : "System default mic";
              const a = lv && !lv.err ? levelAdvice(lv.held, lv.clipped) : null;
              return (
                <button type="button" onClick={onAudioSettings} aria-label={`${t.name} input level. Change input and output`}
                        title={lv?.err || (a ? `${a.say} (click to change the input or output)` : "Opening the microphone…")}
                        className="flex items-center gap-1 text-left text-[10px] leading-none">
                  <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded bg-white/15">
                    {a && <span className={`absolute inset-y-0 left-0 ${LEVEL_TONE[a.state]}`} style={{ width: `${meterPos(lv.peakDb) * 100}%` }} />}
                    {a && <span className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${meterPos(lv.held) * 100}%` }} />}
                  </span>
                  <span className={`max-w-[6.5rem] truncate ${lv?.err ? "text-mcz-ember" : a?.state === "silent" ? "text-mcz-gold" : "text-white/60"}`}>
                    {lv?.err ? "Mic problem — tap" : !lv ? "Opening mic…" : a.state === "silent" ? "No sound — tap" : `🎙️ ${name}`}
                  </span>
                </button>
              );
            })()}
            {looks?.id === t.id && (
              <Popover rect={looks.rect} onClose={() => setLooks(null)} label={`${t.name} look`}>
                <EmojiPick value={t.emoji || ""} onChange={(emoji) => onTrack(t.id, { emoji })} label="Track emoji" />
                <ColorPick value={t.color} onChange={(color) => onTrack(t.id, { color })} label="Track colour" />
                <button type="button" className="re-btn !w-auto px-2 py-0.5" onClick={() => setLooks(null)}>Done</button>
              </Popover>
            )}
          </div>
          {openRows(t) > 0 && compLanes(t).map(({ p, i }) => (
            <div key={p.id} className={`flex items-center gap-1 border-b border-white/10 px-2 text-[10px] ${p.comp ? "bg-emerald-400/10 text-emerald-200" : "bg-white/[0.03] text-white/70"}`} style={{ height: COMP_ROW }} data-comp-head={p.id}>
              <span className="min-w-0 flex-1 truncate">{p.comp ? "✂ Comp — plays" : p.name}</span>
              {p.comp
                ? <button type="button" className="rounded px-1 text-white/60 hover:text-mcz-ember" onClick={() => onClearComp && onClearComp(t.id)} title="Take the comp away (the takes stay)">Clear</button>
                : <button type="button" className="rounded px-1 text-white/60 hover:text-white" onClick={() => onStartComp && onStartComp(t.id, i)} title="Start the comp as a copy of this whole take, then swipe in the better bits">Use all</button>}
            </div>
          ))}
          </Fragment>
        ))}
      </div>

      {/* Timeline */}
      <div className="min-w-0 flex-1 overflow-x-auto" data-timeline ref={scroller}>
        <div className="relative" style={{ width }}>
          {arranger && <ArrangerStrip session={session} zoom={zoom} width={width} arranger={arranger} onSeek={onJump || onSeek} />}
          {onAddMarker && <MarkerStrip session={session} zoom={zoom} width={width} onSeek={onJump || onSeek} onAdd={onAddMarker} onChange={onMarker} onRemove={onRemoveMarker} />}
          <Ruler session={session} zoom={zoom} width={width} onSeek={onSeek} showBeats={beatsRow} onLoop={onLoop} onToggleLoop={onToggleLoop} punchArmed={punchArmed} />
          <div className="relative" onPointerMove={moving} onPointerUp={end} onPointerCancel={end}>
            {session.tracks.map((t) => (
              <Fragment key={t.id}>
              <div data-lane={t.id} {...dropOn(t, true)}
                   className={`relative border-b border-white/10 ${dropTrack === t.id ? "bg-mcz-cyan/10" : drag?.overTrack === t.id && drag.track !== t.id ? "bg-white/5" : ""}`}
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
                      <Wave peaks={daw.peaks(r.src)} sourceDur={src?.duration} inSec={r.in} outSec={r.out} width={lenOf(r) * zoom} color={t.color} height={LANE_H - 22} />
                      {r.fadeIn > 0 && <div className="pointer-events-none absolute bottom-0 left-0 top-4 bg-gradient-to-r from-black/70 to-transparent" style={{ width: r.fadeIn * zoom }} />}
                      {r.fadeOut > 0 && <div className="pointer-events-none absolute bottom-0 right-0 top-4 bg-gradient-to-l from-black/70 to-transparent" style={{ width: r.fadeOut * zoom }} />}
                    </div>
                  );
                })}
              </div>
              {openRows(t) > 0 && (() => { const spans = compSpans(t); return compLanes(t).map(({ p, i }) => {
                const at = (e) => Math.max(0, (e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom);
                return (
                  <div key={p.id} data-comp-lane={p.id} className={`relative touch-none border-b border-white/10 ${p.comp ? "bg-emerald-400/[0.06]" : "bg-white/[0.02] cursor-col-resize"}`} style={{ height: COMP_ROW }}
                       title={p.comp ? "What plays now" : "Drag across the part you want to use"}
                       onPointerDown={(e) => { if (p.comp) return; e.currentTarget.setPointerCapture?.(e.pointerId); const x = at(e); setSwipe({ trackId: t.id, lane: i, x0: x, x1: x }); }}
                       onPointerMove={(e) => { if (swipe && swipe.trackId === t.id && swipe.lane === i) setSwipe({ ...swipe, x1: at(e) }); }}
                       onPointerUp={() => { const w = swipe; setSwipe(null); if (w && Math.abs(w.x1 - w.x0) >= 0.05) onComp(w.trackId, w.lane, Math.min(w.x0, w.x1), Math.max(w.x0, w.x1)); }}
                       onPointerCancel={() => setSwipe(null)}>
                    {p.regions.map((r) => (
                      <div key={r.id} className="pointer-events-none absolute top-1 overflow-hidden rounded-sm border border-white/15 px-1 text-[9px] leading-3 text-white/70"
                           style={{ left: r.at * zoom, width: Math.max(2, lenOf(r) * zoom), height: COMP_ROW - 8, background: `${t.color}${p.comp ? "40" : "22"}` }}>{r.name}</div>
                    ))}
                    {!p.comp && spans.filter((x) => x.lane === p.id).map((x) => (
                      <div key={`${x.a}`} className="pointer-events-none absolute inset-y-0 border-x-2 border-emerald-300 bg-emerald-300/25" style={{ left: x.a * zoom, width: Math.max(2, (x.b - x.a) * zoom) }} title="Used in the comp" />
                    ))}
                    {swipe && swipe.trackId === t.id && swipe.lane === i && (
                      <div className="pointer-events-none absolute inset-y-0 bg-white/30" style={{ left: Math.min(swipe.x0, swipe.x1) * zoom, width: Math.abs(swipe.x1 - swipe.x0) * zoom }} />
                    )}
                  </div>
                );
              }); })()}
              </Fragment>
            ))}
            {session.loop && <div className={`pointer-events-none absolute top-0 z-10 ${punchArmed ? "bg-red-500/10" : session.loop.on ? "bg-emerald-400/10" : "bg-white/[0.03]"}`}
                                  style={{ left: session.loop.start * zoom, width: (session.loop.end - session.loop.start) * zoom, height: session.tracks.length * LANE_H + extraH }} />}
            <Playhead position={playhead} zoom={zoom} height={session.tracks.length * LANE_H + extraH} />
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
