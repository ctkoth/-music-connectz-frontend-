// One automation lane drawn over a track in the Edit window: the line the param follows, its points,
// and the edits — tap to add a point (and drag it straight away), drag a point to move it, double-tap
// a point to remove it. The line is drawn with automation.js's own `valueAt`, which is the same
// interpolation the engine ramps with, so what is drawn is what is heard.
import { useState } from "react";
import { PARAMS, addPoint, movePoint, removePoint, valueAt } from "./automation.js";

const PAD = 6;
const norm = (param, v) => (v - PARAMS[param].min) / (PARAMS[param].max - PARAMS[param].min);
export const fmtAuto = (param, v) => (param === "volume"
  ? (v <= -60 ? "−∞ dB" : `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`)
  : Math.abs(v) < 0.005 ? "C" : `${v < 0 ? "L" : "R"}${Math.round(Math.abs(v) * 100)}`);

export default function AutoLane({ param, lane, fallback, zoom, width, height, color, onChange, locked, onLocked }) {
  const [draft, setDraft] = useState(null);     // { lane, i } while a point is being dragged
  const shown = draft ? draft.lane : lane;
  const pts = shown.points;
  const yOf = (v) => PAD + (1 - norm(param, v)) * (height - 2 * PAD);
  const vOf = (y) => PARAMS[param].min + (1 - (y - PAD) / (height - 2 * PAD)) * (PARAMS[param].max - PARAMS[param].min);
  const at = (e) => { const b = e.currentTarget.ownerSVGElement?.getBoundingClientRect?.() || e.currentTarget.getBoundingClientRect(); return { t: Math.max(0, (e.clientX - b.left) / zoom), v: vOf(e.clientY - b.top) }; };

  // The line: flat before the first point and after the last; between points, sampled so a volume
  // fade shows the curve a gain ramp really makes.
  let d = "";
  if (!pts.length) d = `M0 ${yOf(fallback)} H${width}`;
  else {
    d = `M0 ${yOf(pts[0].v)} L${pts[0].t * zoom} ${yOf(pts[0].v)}`;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      const steps = param === "volume" ? 12 : 1;
      for (let s = 1; s <= steps; s++) { const t = a.t + ((b.t - a.t) * s) / steps; d += ` L${t * zoom} ${yOf(valueAt(param, pts, t))}`; }
    }
    d += ` L${width} ${yOf(pts[pts.length - 1].v)}`;
  }

  const down = (e) => {
    e.stopPropagation();
    if (locked) { onLocked?.(); return; }
    const { t, v } = at(e);
    const next = addPoint(param, lane, t, v);
    const i = next.points.findIndex((p) => Math.abs(p.t - t) < 1e-9);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDraft({ lane: next, i });
  };
  const grab = (e, i) => {
    e.stopPropagation();
    e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId);
    setDraft({ lane, i });
  };
  const move = (e) => {
    if (!draft) return;
    const { t, v } = at(e);
    setDraft({ ...draft, lane: movePoint(param, draft.lane, draft.i, t, v) });
  };
  const up = () => { if (draft) { onChange(draft.lane); setDraft(null); } };

  const dragged = draft ? draft.lane.points[draft.i] : null;
  return (
    <svg className="absolute inset-0 z-10 cursor-crosshair touch-none" width={width} height={height}
         onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
         role="application" aria-label={`${PARAMS[param].label} automation — tap to add a point, drag to move, double-tap a point to remove it`}>
      <rect x="0" y="0" width={width} height={height} fill="rgba(0,0,0,0.35)" />
      {param === "pan" && <line x1="0" x2={width} y1={yOf(0)} y2={yOf(0)} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 4" />}
      {param === "volume" && <line x1="0" x2={width} y1={yOf(0)} y2={yOf(0)} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 4" />}
      <path d={d} fill="none" stroke={pts.length && lane.on !== false ? color : "rgba(255,255,255,0.45)"} strokeWidth="2"
            strokeDasharray={pts.length ? (lane.on === false ? "6 4" : undefined) : "4 4"} />
      {pts.map((p, i) => (
        <circle key={`${i}-${p.t}`} cx={p.t * zoom} cy={yOf(p.v)} r={draft?.i === i ? 7 : 5} fill="#000" stroke={color} strokeWidth="2"
                className="cursor-grab" onPointerDown={(e) => grab(e, i)}
                onDoubleClick={(e) => { e.stopPropagation(); onChange(removePoint(lane, i)); }}>
          <title>{`${p.t.toFixed(2)} s · ${fmtAuto(param, p.v)}`}</title>
        </circle>
      ))}
      <text x="6" y={height - 6} className="fill-white/60" fontSize="10">
        {dragged ? `${dragged.t.toFixed(2)} s · ${fmtAuto(param, dragged.v)}`
          : pts.length ? `${PARAMS[param].label}${lane.on === false ? " — off: the fader is used" : ""}${param === "pan" ? " · top is right" : ""}`
            : `${PARAMS[param].label}: tap to add a point${param === "pan" ? " · top is right" : ""}`}
      </text>
    </svg>
  );
}
