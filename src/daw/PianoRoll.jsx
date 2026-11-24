// The piano roll: one part's notes on a grid of pitches (rows) and time (columns). Click an empty
// cell to add a note, click a note to remove it, drag a note's right edge to lengthen it. Free and on
// the device; the edits are pianoroll.js's and the part goes back to the MIDI window to be heard or sent.
import { useMemo, useRef, useState } from "react";
import { GAIN_PCT_MAX, gainLabel, panLabel } from "./partMix.js";
import { GRIDS, barsFor, deleteSelected, isBlack, moveSelected, pitchName, quantize, rangeFor, resize, selectAll, setVelocity, setVelocitySelected, sortKeep, toggleAt, transpose } from "./pianoroll.js";

const ROW = 14, CELL = 18;   // px per pitch row, px per 1/16

export default function PianoRoll({ part, onChange, onClose, mix = null, onMix = null, onAudition = null }) {
  const notes = part.notes;
  const [grid, setGrid] = useState(0.25);
  const [len, setLen] = useState(0.5);
  const [bars, setBars] = useState(() => barsFor(notes));
  const [range, setRange] = useState(() => rangeFor(notes));
  const [hearEdits, setHearEditsRaw] = useState(() => { try { return localStorage.getItem("mcz_roll_hear") !== "0"; } catch { return true; } });
  const setHearEdits = (v) => { setHearEditsRaw(v); try { localStorage.setItem("mcz_roll_hear", v ? "1" : "0"); } catch { /* not remembered */ } };
  const hear = (pitch) => { if (onAudition && hearEdits) onAudition(pitch); };
  const [sel, setSel] = useState(() => new Set());          // indexes of the selected notes
  const [strength, setStrength] = useState(100);
  const [swing, setSwing] = useState(0);
  const [snapLen, setSnapLen] = useState(true);
  const past = useRef([]); const future = useRef([]);
  const [, bump] = useState(0);
  // Every edit is undoable: the roll keeps the notes as they were before it, and a drag or a slider is one step, not one per pixel.
  const mark = () => { past.current.push(notes); if (past.current.length > 100) past.current.shift(); future.current = []; bump((n) => n + 1); };
  const edit = (next) => { mark(); onChange(next); };
  const undo = () => { const prev = past.current.pop(); if (!prev) return; future.current.push(notes); setSel(new Set()); onChange(prev); bump((n) => n + 1); };
  const redo = () => { const nxt = future.current.pop(); if (!nxt) return; past.current.push(notes); setSel(new Set()); onChange(nxt); bump((n) => n + 1); };
  const drag = useRef(null);
  const rootRef = useRef(null);
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
    if (sel.size) { setSel(new Set()); return; }                // the first click on empty space lets go of the selection; the next adds a note
    const next = toggleAt(notes, pitch, beat, { grid, len, vel: 100 });
    if (next.length < notes.length) return;                      // a click lands on a note only through its own handler now; never delete here
    edit(next); hear(pitch);
  };
  const startResize = (e, i) => {
    e.stopPropagation(); e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    mark();
    drag.current = { i, x: e.clientX, len: notes[i][2] };
  };
  const startMove = (e, i) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    rootRef.current?.focus();
    let group = sel;
    if (e.shiftKey) { group = new Set(sel); if (group.has(i)) group.delete(i); else group.add(i); setSel(group); drag.current = null; return; }
    if (!sel.has(i)) { group = new Set([i]); setSel(group); }
    drag.current = { move: true, x: e.clientX, y: e.clientY, orig: notes, sel: group, moved: false, pitch: notes[i][0], lead: i, dp: 0 };
    hear(notes[i][0]);
  };
  const moveResize = (e) => {
    const g = drag.current;
    if (!g) return;
    if (g.move) {
      const dBeat = Math.round(((e.clientX - g.x) / (4 * CELL)) / grid) * grid;
      const dPitch = -Math.round((e.clientY - g.y) / ROW);
      if (!g.moved && (dBeat || dPitch)) { g.moved = true; mark(); }
      if (g.moved) onChange(moveSelected(g.orig, g.sel, dBeat, dPitch));
      if (dPitch !== g.dp) { g.dp = dPitch; hear(Math.max(0, Math.min(127, g.pitch + dPitch))); }          // each new pitch it passes over is heard once
      return;
    }
    onChange(resize(notes, g.i, g.len + (e.clientX - g.x) / (4 * CELL), grid));
  };
  const endResize = () => {
    const g = drag.current;
    if (g?.move && g.moved) { const r = sortKeep(notes, g.sel); onChange(r.notes); setSel(r.sel); }      // time order again, selection carried along
    setTimeout(() => { drag.current = null; }, 0);
  };
  // Keys, while the roll has focus: Delete removes the selection, arrows nudge it (a grid step in time, a semitone in pitch), Ctrl+A selects all.
  const onKey = (e) => {
    if (e.target.closest?.("input, select, textarea")) return;
    if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setSel(selectAll(notes)); return; }
    if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (!sel.size) return;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); edit(deleteSelected(notes, sel)); setSel(new Set()); return; }
    const d = { ArrowLeft: [-grid, 0], ArrowRight: [grid, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (d) { e.preventDefault(); const moved = moveSelected(notes, sel, d[0], d[1]); const r = sortKeep(moved, sel); mark(); onChange(r.notes); setSel(r.sel); if (d[1]) { const first = [...sel][0]; hear(moved[first][0]); } }
    if (e.key === "Escape") setSel(new Set());
  };

  return (
    <div ref={rootRef} tabIndex={0} onKeyDown={onKey} className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-2 outline-none focus:border-white/25" data-tour="daw-pianoroll">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">{part.name} — piano roll</span>
        <label className="flex items-center gap-1">Grid
          <select className="neon-input !w-auto !py-0.5 text-xs" data-nomemo="true" value={grid} onChange={(e) => setGrid(+e.target.value)}>
            {GRIDS.map(([l, v]) => <option key={l} value={v}>{l}</option>)}</select></label>
        <label className="flex items-center gap-1">New note
          <select className="neon-input !w-auto !py-0.5 text-xs" data-nomemo="true" value={len} onChange={(e) => setLen(+e.target.value)}>
            {GRIDS.map(([l, v]) => <option key={l} value={v}>{l}</option>)}</select></label>
        <button className="re-btn !w-auto px-2" onClick={undo} disabled={!past.current.length} aria-label="Undo">↶ Undo</button>
        <button className="re-btn !w-auto px-2" onClick={redo} disabled={!future.current.length} aria-label="Redo">↷ Redo</button>
        <span className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-2 py-0.5" title="Quantize moves each note's start toward the grid. Strength 100% snaps; 50% tightens a take and keeps its feel. Swing delays the off-beats.">
          <button className="re-btn !w-auto px-2" onClick={() => edit(quantize(notes, grid, { strength: strength / 100, swing: swing / 100, lengths: snapLen }))}>Quantize to {GRIDS.find(([, v]) => v === grid)?.[0] || "grid"}</button>
          <label className="flex items-center gap-1">Strength <input type="range" min="0" max="100" value={strength} onChange={(e) => setStrength(+e.target.value)} aria-label="Quantize strength" /><span className="w-8 tabular-nums text-white/60">{strength}%</span></label>
          <label className="flex items-center gap-1">Swing <input type="range" min="0" max="100" value={swing} onChange={(e) => setSwing(+e.target.value)} aria-label="Swing" /><span className="w-8 tabular-nums text-white/60">{swing}%</span></label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={snapLen} onChange={(e) => setSnapLen(e.target.checked)} /> Snap lengths</label>
        </span>
        <button className="re-btn !w-auto px-2" onClick={() => edit(transpose(notes, -12))}>−8va</button>
        <button className="re-btn !w-auto px-2" onClick={() => edit(transpose(notes, -1))}>−1</button>
        <button className="re-btn !w-auto px-2" onClick={() => edit(transpose(notes, 1))}>+1</button>
        <button className="re-btn !w-auto px-2" onClick={() => edit(transpose(notes, 12))}>+8va</button>
        <label className="flex items-center gap-1" title={sel.size ? "Velocity of the selected notes" : "Velocity of every note"}>Velocity{sel.size ? ` (${sel.size} selected)` : ""}
          <input type="range" min="10" max="127" defaultValue="100" onPointerDown={mark} onChange={(e) => onChange(sel.size ? setVelocitySelected(notes, sel, +e.target.value) : setVelocity(notes, +e.target.value))} /></label>
        <button className="re-btn !w-auto px-2" onClick={() => setBars((b) => Math.min(64, b + 4))}>+4 bars</button>
        <button className="re-btn !w-auto px-2" onClick={() => setRange(([a, b]) => [Math.max(0, a - 12), b])}>Lower</button>
        <button className="re-btn !w-auto px-2" onClick={() => setRange(([a, b]) => [a, Math.min(127, b + 12)])}>Higher</button>
        <button className="re-btn !w-auto px-2" onClick={() => { edit([]); setSel(new Set()); }}>Clear</button>
        {mix && onMix && (
          <span className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 px-2 py-0.5" data-tour="daw-roll-mix"
                title="This part's level and position. You hear them here, and they become the new track's fader and pan when you send the part.">
            <label className="flex items-center gap-1">Gain
              <input type="range" min="0" max={GAIN_PCT_MAX} step="1" value={mix.gain} onChange={(e) => onMix({ gain: +e.target.value })} aria-label="Part gain" onDoubleClick={() => onMix({ gain: 100 })} />
              <span className="w-28 tabular-nums text-white/60">{gainLabel(mix.gain)}</span></label>
            <label className="flex items-center gap-1">Pan
              <input type="range" min="-100" max="100" step="1" value={mix.pan} onChange={(e) => onMix({ pan: +e.target.value })} aria-label="Part pan" onDoubleClick={() => onMix({ pan: 0 })} />
              <span className="w-14 tabular-nums text-white/60">{panLabel(mix.pan)}</span></label>
            <button type="button" className="re-link" onClick={() => onMix({ gain: 100, pan: 0 })} disabled={mix.gain === 100 && mix.pan === 0}>Reset</button>
          </span>
        )}
        {onAudition && <label className="flex items-center gap-1 text-white/70" title="Plays a note as you add it, pick it up, or move it to a new pitch. The piano keys on the left always play."><input type="checkbox" checked={hearEdits} onChange={(e) => setHearEdits(e.target.checked)} /> Hear notes as I edit</label>}
        <button className="re-link ml-auto" onClick={onClose}>Done</button>
      </div>
      <p className="text-[11px] text-white/60">Click empty space to add a note. Click a note to select it (Shift adds more), drag to move it, drag its right edge to lengthen it, press Delete to remove it, arrows nudge it, Ctrl+A selects all. {notes.length} notes{sel.size ? `, ${sel.size} selected` : ""}.</p>
      <div className="flex max-h-[420px] overflow-auto">
        <div className="sticky left-0 z-10 shrink-0 bg-black/80">
          {pitches.map((p) => (
            <div key={p} onPointerDown={() => onAudition && onAudition(p)} className={`border-b border-black/40 pr-1 text-right text-[9px] leading-[14px] ${onAudition ? "cursor-pointer active:brightness-150" : ""} ${isBlack(p) ? "bg-neutral-800 text-white/50" : "bg-neutral-200 text-black/70"}`}
              style={{ height: ROW, width: 34 }} title={onAudition ? `Hear ${pitchName(p)}` : undefined}>{p % 12 === 0 ? pitchName(p) : ""}</div>
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
            <div key={i} onPointerDown={(e) => startMove(e, i)} onClick={(e) => e.stopPropagation()}
              className={`absolute cursor-grab touch-none rounded-sm border ${sel.has(i) ? "border-white ring-1 ring-white/70" : "border-black/50"}`}
              style={{ top: (hi - p) * ROW + 1, left: s * 4 * CELL, width: Math.max(4, l * 4 * CELL - 1), height: ROW - 2, background: sel.has(i) ? `rgba(250,204,21,${0.5 + (v / 127) * 0.5})` : `rgba(34,211,238,${0.4 + (v / 127) * 0.6})` }}
              title={`${pitchName(p)} · beat ${s + 1} · ${l} beats · velocity ${v}`}>
              <div onPointerDown={(e) => { e.stopPropagation(); startResize(e, i); }} onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/30" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
