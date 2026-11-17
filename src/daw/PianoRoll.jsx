// The piano roll: one part's notes on a grid of pitches (rows) and time (columns). Click an empty
// cell to add a note, click a note to remove it, drag a note's right edge to lengthen it. Free and on
// the device; the edits are pianoroll.js's and the part goes back to the MIDI window to be heard or sent.
import { useMemo, useRef, useState } from "react";
import { GRIDS, barsFor, isBlack, pitchName, quantize, rangeFor, resize, setVelocity, toggleAt, transpose } from "./pianoroll.js";

const ROW = 14, CELL = 18;   // px per pitch row, px per 1/16

export default function PianoRoll({ part, onChange, onClose }) {
  const notes = part.notes;
  const [grid, setGrid] = useState(0.25);
  const [len, setLen] = useState(0.5);
  const [bars, setBars] = useState(() => barsFor(notes));
  const [range, setRange] = useState(() => rangeFor(notes));
  const drag = useRef(null);
  const [lo, hi] = range;
  const pitches = useMemo(() => Array.from({ length: hi - lo + 1 }, (_, i) => hi - i), [lo, hi]);
  const beats = bars * 4, width = beats * 4 * CELL;
  const at = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { pitch: hi - Math.floor((e.clientY - r.top) / ROW), beat: (e.clientX - r.left) / (4 * CELL) };
  };
  const click = (e) => {
    if (drag.current) return;
    const { pitch, beat } = at(e);
    if (pitch < lo || pitch > hi || beat < 0 || beat >= beats) return;
    onChange(toggleAt(notes, pitch, beat, { grid, len, vel: 100 }));
  };
  const startResize = (e, i) => {
    e.stopPropagation(); e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { i, x: e.clientX, len: notes[i][2] };
  };
  const moveResize = (e) => {
    const g = drag.current;
    if (!g) return;
    onChange(resize(notes, g.i, g.len + (e.clientX - g.x) / (4 * CELL), grid));
  };
  const endResize = () => { setTimeout(() => { drag.current = null; }, 0); };

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-2" data-tour="daw-pianoroll">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">{part.name} — piano roll</span>
        <label className="flex items-center gap-1">Grid
          <select className="neon-input !w-auto !py-0.5 text-xs" data-nomemo="true" value={grid} onChange={(e) => setGrid(+e.target.value)}>
            {GRIDS.map(([l, v]) => <option key={l} value={v}>{l}</option>)}</select></label>
        <label className="flex items-center gap-1">New note
          <select className="neon-input !w-auto !py-0.5 text-xs" data-nomemo="true" value={len} onChange={(e) => setLen(+e.target.value)}>
            {GRIDS.map(([l, v]) => <option key={l} value={v}>{l}</option>)}</select></label>
        <button className="re-btn !w-auto px-2" onClick={() => onChange(quantize(notes, grid))}>Quantize</button>
        <button className="re-btn !w-auto px-2" onClick={() => onChange(transpose(notes, -12))}>−8va</button>
        <button className="re-btn !w-auto px-2" onClick={() => onChange(transpose(notes, -1))}>−1</button>
        <button className="re-btn !w-auto px-2" onClick={() => onChange(transpose(notes, 1))}>+1</button>
        <button className="re-btn !w-auto px-2" onClick={() => onChange(transpose(notes, 12))}>+8va</button>
        <label className="flex items-center gap-1">Velocity
          <input type="range" min="10" max="127" defaultValue="100" onChange={(e) => onChange(setVelocity(notes, +e.target.value))} /></label>
        <button className="re-btn !w-auto px-2" onClick={() => setBars((b) => Math.min(64, b + 4))}>+4 bars</button>
        <button className="re-btn !w-auto px-2" onClick={() => setRange(([a, b]) => [Math.max(0, a - 12), b])}>Lower</button>
        <button className="re-btn !w-auto px-2" onClick={() => setRange(([a, b]) => [a, Math.min(127, b + 12)])}>Higher</button>
        <button className="re-btn !w-auto px-2" onClick={() => onChange([])}>Clear</button>
        <button className="re-link ml-auto" onClick={onClose}>Done</button>
      </div>
      <p className="text-[11px] text-white/45">Click to add a note, click a note to remove it, drag its right edge to lengthen it. {notes.length} notes.</p>
      <div className="flex max-h-[420px] overflow-auto">
        <div className="sticky left-0 z-10 shrink-0 bg-black/80">
          {pitches.map((p) => (
            <div key={p} className={`border-b border-black/40 pr-1 text-right text-[9px] leading-[14px] ${isBlack(p) ? "bg-neutral-800 text-white/50" : "bg-neutral-200 text-black/70"}`}
              style={{ height: ROW, width: 34 }}>{p % 12 === 0 ? pitchName(p) : ""}</div>
          ))}
        </div>
        <div className="relative shrink-0 cursor-crosshair" style={{ width, height: pitches.length * ROW }}
          onClick={click} onPointerMove={moveResize} onPointerUp={endResize}>
          {pitches.map((p, i) => (
            <div key={p} className={`absolute left-0 right-0 ${isBlack(p) ? "bg-white/[0.03]" : "bg-white/[0.07]"} border-b border-white/5`} style={{ top: i * ROW, height: ROW }} />
          ))}
          {Array.from({ length: beats * 4 }, (_, i) => (
            <div key={i} className={`absolute top-0 bottom-0 ${i % 16 === 0 ? "bg-white/30" : i % 4 === 0 ? "bg-white/12" : "bg-white/[0.04]"}`} style={{ left: i * CELL, width: 1 }} />
          ))}
          {notes.map(([p, s, l, v], i) => p >= lo && p <= hi && (
            <div key={i} className="absolute rounded-sm border border-black/50"
              style={{ top: (hi - p) * ROW + 1, left: s * 4 * CELL, width: Math.max(4, l * 4 * CELL - 1), height: ROW - 2, background: `rgba(34,211,238,${0.4 + (v / 127) * 0.6})` }}
              title={`${pitchName(p)} · beat ${s + 1} · ${l} beats`}>
              <div onPointerDown={(e) => startResize(e, i)} onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
