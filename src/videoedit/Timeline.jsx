// VideoZ's timeline: track headers on the left, lanes of clips on the right,
// a ruler and a playhead — the Sony Vegas layout. Drag a clip to move it (along
// its track or onto another track of the same kind), drag either edge to trim,
// click empty space or the ruler to move the playhead. Every edit is the
// project's (project.js); this only turns pointer moves into times.
import { useRef } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Film, Headphones, Image as ImageIcon, Music, Trash2, Type, Volume2, VolumeX } from "lucide-react";
import { clipsOn, endOf, lenOf, snap, trackKindFor, trackName } from "./project.js";

const LANE = 54;
const HEAD = 148;
const KIND = {
  video: { Icon: Film, cls: "border-mcz-cyan/70 bg-mcz-cyan/20" },
  image: { Icon: ImageIcon, cls: "border-fuchsia-400/70 bg-fuchsia-400/20" },
  text: { Icon: Type, cls: "border-mcz-gold/70 bg-mcz-gold/20" },
  audio: { Icon: Music, cls: "border-emerald-400/70 bg-emerald-400/20" },
};

function tickStep(zoom) {
  for (const s of [0.5, 1, 2, 5, 10, 15, 30, 60, 120]) if (s * zoom >= 60) return s;
  return 300;
}
const label = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Timeline({ project, t, zoom, selected, snapOn, onSelect, onSeek, onClipDrag, onClipDone, onTrack, length }) {
  const scroller = useRef(null);
  const span = Math.max(length + 10, 30);
  const width = span * zoom;
  const step = tickStep(zoom);

  const timeAt = (clientX) => {
    const box = scroller.current.getBoundingClientRect();
    return Math.max(0, (clientX - box.left - HEAD + scroller.current.scrollLeft) / zoom);
  };
  const trackAt = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY)?.closest?.("[data-lane]");
    return el?.getAttribute("data-lane") || null;
  };

  // One pointer gesture: move the clip, or trim one edge. The project changes
  // live while dragging and becomes ONE undo step when the pointer lifts.
  const startDrag = (e, c, mode) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(c.id);
    const x0 = e.clientX;
    const at0 = c.at, end0 = endOf(c);
    let moved = false;
    const move = (ev) => {
      const dt = (ev.clientX - x0) / zoom;
      if (!moved && Math.abs(ev.clientX - x0) < 3) return;
      moved = true;
      const sn = (v) => (snapOn ? snap(project, v, { except: c.id, playhead: t, tol: 10 / zoom }) : v);
      if (mode === "move") {
        // Snap whichever edge is nearer something to snap to.
        let at = Math.max(0, at0 + dt);
        const s1 = sn(at), s2 = sn(at + lenOf(c)) - lenOf(c);
        at = Math.abs(s1 - at) <= Math.abs(s2 - at) ? s1 : s2;
        const lane = trackAt(ev.clientX, ev.clientY);
        const tk = project.tracks.find((x) => x.id === lane);
        onClipDrag({ type: "move", id: c.id, at: Math.max(0, at), track: tk && tk.kind === trackKindFor(c.kind) ? lane : undefined });
      } else {
        onClipDrag({ type: "trim", id: c.id, edge: mode, time: sn(mode === "start" ? at0 + dt : end0 + dt) });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      onClipDone(moved);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const scrub = (e) => {
    if (e.button !== 0) return;
    onSeek(timeAt(e.clientX));
    const move = (ev) => onSeek(timeAt(ev.clientX));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const videoCount = project.tracks.filter((x) => x.kind === "video").length;

  return (
    <div ref={scroller} data-tour="videoz-timeline" className="relative overflow-x-auto rounded-xl border border-white/10 bg-black/40 select-none"
         style={{ touchAction: "pan-y" }}>
      <div style={{ width: HEAD + width }} className="relative">
        {/* Ruler */}
        <div className="sticky top-0 z-20 flex h-6 border-b border-white/10 bg-black/70">
          <div style={{ width: HEAD }} className="sticky left-0 z-30 shrink-0 bg-black/90 px-2 text-[10px] leading-6 text-white/40">Tracks</div>
          <div className="relative cursor-pointer" style={{ width }} onPointerDown={scrub}>
            {Array.from({ length: Math.ceil(span / step) + 1 }, (_, i) => i * step).map((s) => (
              <span key={s} className="absolute top-0 h-full border-l border-white/15 pl-1 text-[10px] text-white/45" style={{ left: s * zoom }}>{label(s)}</span>
            ))}
          </div>
        </div>
        {project.tracks.map((tk) => {
          const isVideo = tk.kind === "video";
          const same = project.tracks.filter((x) => x.kind === tk.kind);
          const idx = same.indexOf(tk);
          const clips = clipsOn(project, tk.id);
          return (
            <div key={tk.id} className={`flex border-b border-white/5 ${isVideo ? "" : "bg-emerald-950/10"}`} style={{ height: LANE }}>
              <div style={{ width: HEAD }} className="sticky left-0 z-10 flex shrink-0 flex-col justify-center gap-1 border-r border-white/10 bg-[#0c0a16] px-2">
                <div className="flex items-center gap-1 text-[11px] font-semibold">
                  {isVideo ? <Film size={11} className="text-mcz-cyan" /> : <Headphones size={11} className="text-emerald-300" />}
                  {trackName(project, tk.id)}
                </div>
                <div className="flex items-center gap-1">
                  <button title={tk.mute ? "Unmute" : "Mute"} aria-pressed={tk.mute} onClick={() => onTrack("set", tk.id, { mute: !tk.mute })}
                    className={`rounded px-1 text-[10px] ${tk.mute ? "bg-mcz-ember/40" : "bg-white/10"}`}>
                    {isVideo ? (tk.mute ? <EyeOff size={10} /> : <Eye size={10} />) : (tk.mute ? <VolumeX size={10} /> : <Volume2 size={10} />)}
                  </button>
                  <button title="Solo — only soloed tracks of this kind play" aria-pressed={tk.solo} onClick={() => onTrack("set", tk.id, { solo: !tk.solo })}
                    className={`rounded px-1 text-[10px] font-bold ${tk.solo ? "bg-mcz-gold/50 text-black" : "bg-white/10"}`}>S</button>
                  <input type="range" min={0} max={isVideo ? 100 : 200} value={tk.level} aria-label={isVideo ? "Track opacity" : "Track volume"}
                    title={`${isVideo ? "Opacity" : "Volume"} ${tk.level}%`} className="w-12 accent-mcz-cyan"
                    onChange={(e) => onTrack("set", tk.id, { level: Number(e.target.value) })} />
                  <button title="Move up" disabled={idx === 0} onClick={() => onTrack("move", tk.id, -1)} className="text-white/50 disabled:opacity-20"><ArrowUp size={10} /></button>
                  <button title="Move down" disabled={idx === same.length - 1} onClick={() => onTrack("move", tk.id, 1)} className="text-white/50 disabled:opacity-20"><ArrowDown size={10} /></button>
                  <button title="Remove track" disabled={isVideo && videoCount <= 1} onClick={() => onTrack("remove", tk.id)} className="text-white/40 hover:text-mcz-ember disabled:opacity-20"><Trash2 size={10} /></button>
                </div>
              </div>
              <div data-lane={tk.id} className="relative" style={{ width }} onPointerDown={scrub}>
                {clips.map((c) => {
                  const K = KIND[c.kind];
                  const left = c.at * zoom, w = Math.max(6, lenOf(c) * zoom);
                  const sel = selected === c.id;
                  return (
                    <div key={c.id} data-lane={tk.id}
                      className={`absolute top-1 bottom-1 overflow-hidden rounded-md border text-[10px] ${K.cls} ${sel ? "ring-2 ring-white" : ""}`}
                      style={{ left, width: w, cursor: "grab" }}
                      onPointerDown={(e) => startDrag(e, c, "move")}
                      title={`${c.name || c.text || c.kind} · ${lenOf(c).toFixed(1)}s`}>
                      <div className="flex items-center gap-1 truncate px-2 pt-1 font-semibold">
                        <K.Icon size={10} className="shrink-0" />
                        <span className="truncate">{c.kind === "text" ? c.text || "Title" : c.name || c.kind}</span>
                        {c.lip?.on && <span title="Lip-synced">👄</span>}
                        {c.speed !== 1 && <span className="text-white/60">{c.speed}×</span>}
                      </div>
                      {c.filter !== "none" && <div className="truncate px-2 text-white/55">{c.filter}</div>}
                      {/* Fades, drawn as the ramp Vegas draws. */}
                      {c.fadeIn > 0 && <div className="pointer-events-none absolute left-0 top-0 h-full bg-gradient-to-r from-black/50 to-transparent" style={{ width: c.fadeIn * zoom }} />}
                      {c.fadeOut > 0 && <div className="pointer-events-none absolute right-0 top-0 h-full bg-gradient-to-l from-black/50 to-transparent" style={{ width: c.fadeOut * zoom }} />}
                      <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-white/30" onPointerDown={(e) => startDrag(e, c, "start")} aria-label="Trim start" />
                      <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize hover:bg-white/30" onPointerDown={(e) => startDrag(e, c, "end")} aria-label="Trim end" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {/* Playhead */}
        <div className="pointer-events-none absolute top-0 z-20 h-full w-px bg-mcz-ember" style={{ left: HEAD + t * zoom }}>
          <div className="-ml-1.5 h-2 w-3 rounded-b bg-mcz-ember" />
        </div>
      </div>
    </div>
  );
}
