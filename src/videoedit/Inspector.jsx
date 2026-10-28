// VideoZ's inspector: everything about the selected clip — timing, look, FX,
// picture-in-picture, title, sound and (for a photo) lip-sync. It decides
// nothing about what a value means: ranges and filters are look.js's, and the
// edit is project.js's.
import { useEffect, useRef, useState } from "react";
import { Copy, Scissors, Trash2 } from "lucide-react";
import { ADJUST, FILTERS, MOTIONS, TEXT_MAX, TEXT_SPOTS } from "./look.js";
import { FADE_MAX, SPEEDS, STILL_SECONDS, endOf, lenOf, trackName } from "./project.js";
import { DEFAULT_BOX, NOTE as LIP_NOTE, cleanBox, onVoices, voices } from "./lipsync.js";
import { StatzSample } from "../components/StatzSample.jsx";

function Slider({ label, value, min, max, step = 1, unit = "", onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-white/60">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} className="flex-1 accent-mcz-cyan"
        onChange={(e) => onChange(Number(e.target.value))} />
      <span className="w-12 text-right tabular-nums text-white/70">{value}{unit}</span>
    </label>
  );
}

const Section = ({ title, children, tour }) => (
  <div className="space-y-2 border-t border-white/10 pt-3" data-tour={tour}>
    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{title}</p>
    {children}
  </div>
);

/** Drag the box onto the closed lips; drag its corner to size it. */
function MouthBox({ src, box, onChange }) {
  const ref = useRef(null);
  const b = cleanBox(box);
  const drag = (e, mode) => {
    e.preventDefault(); e.stopPropagation();
    const r = ref.current.getBoundingClientRect();
    const x0 = e.clientX, y0 = e.clientY, start = { ...b };
    const move = (ev) => {
      const dx = (ev.clientX - x0) / r.width, dy = (ev.clientY - y0) / r.height;
      onChange(cleanBox(mode === "move" ? { ...start, x: start.x + dx, y: start.y + dy } : { ...start, w: start.w + dx, h: start.h + dy }), false);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); onChange(null, true); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div ref={ref} className="relative mx-auto max-w-[260px] select-none" style={{ touchAction: "none" }}>
      <img src={src} alt="The photo to lip-sync" className="block w-full rounded-lg" draggable={false} />
      <div className="absolute cursor-move rounded border-2 border-mcz-ember bg-mcz-ember/15"
        style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
        onPointerDown={(e) => drag(e, "move")} aria-label="Mouth box — drag onto the closed lips">
        <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm bg-mcz-ember" onPointerDown={(e) => drag(e, "size")} />
      </div>
    </div>
  );
}

function useVoices() {
  const [, bump] = useState(0);
  useEffect(() => onVoices(() => bump((n) => n + 1)), []);
  return voices;
}

export default function Inspector({ project, clip: c, t, lipAllowed, onChange, onLive, onSplit, onDuplicate, onDelete }) {
  const v = useVoices();
  if (!c) {
    return <p className="text-xs text-white/45">Select a clip on the timeline to trim it, give it a look, add FX, make it picture-in-picture or put words on it.</p>;
  }
  const visual = c.kind !== "audio";
  const media = c.kind === "video" || c.kind === "audio";
  const set = (patch) => onChange(patch);
  const adj = (k, val) => set({ adj: { ...c.adj, [k]: val } });
  const look = { ...(FILTERS[c.filter]?.adj || {}), ...c.adj };
  const inside = t > c.at && t < endOf(c);
  const sounding = project.clips.filter((x) => x.kind === "video" || x.kind === "audio");
  const lipSrc = c.lip?.source === "mix" ? sounding.map((x) => x.src) : [project.clips.find((x) => x.id === c.lip?.source)?.src];
  const voiceStates = lipSrc.filter(Boolean).map((s) => v.get(s));
  const voiceErr = voiceStates.find((x) => x?.state === "error")?.error;
  const voiceLoading = voiceStates.some((x) => x?.state === "loading");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{c.kind === "text" ? "Title" : c.name || c.kind} <span className="text-xs font-normal text-white/45">· {trackName(project, c.track)}</span></p>
        <div className="flex gap-1">
          <button className="re-btn !w-auto px-2 py-1 text-xs" disabled={!inside} onClick={onSplit} title="Split at the playhead (S)"><Scissors size={12} /> Split</button>
          <button className="re-btn !w-auto px-2 py-1 text-xs" onClick={onDuplicate} title="Duplicate"><Copy size={12} /></button>
          <button className="re-btn !w-auto px-2 py-1 text-xs text-mcz-ember" onClick={onDelete} title="Delete (Del)"><Trash2 size={12} /></button>
        </div>
      </div>

      <Section title="Timing">
        <p className="text-xs text-white/55">Starts {c.at.toFixed(2)}s · lasts {lenOf(c).toFixed(2)}s{media ? ` · from ${c.in.toFixed(2)}s to ${c.out.toFixed(2)}s of the file` : ""}</p>
        {!media && <Slider label="Length" value={Number(c.seconds.toFixed(1))} min={STILL_SECONDS.min} max={STILL_SECONDS.max} step={0.1} unit="s" onChange={(x) => set({ seconds: x })} />}
        {media && (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="w-24 text-white/60">Speed</span>
            {SPEEDS.map((s) => (
              <button key={s} onClick={() => set({ speed: s })}
                className={`rounded-full border px-2 py-0.5 ${c.speed === s ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>{s}×</button>
            ))}
          </div>
        )}
        <Slider label="Fade in" value={c.fadeIn} min={0} max={FADE_MAX} step={0.1} unit="s" onChange={(x) => set({ fadeIn: x })} />
        <Slider label="Fade out" value={c.fadeOut} min={0} max={FADE_MAX} step={0.1} unit="s" onChange={(x) => set({ fadeOut: x })} />
        <p className="text-[11px] text-white/40">Crossfade: drag a clip onto the end of the one before it on the same track — the overlap dissolves.</p>
      </Section>

      {visual && c.kind !== "text" && (
        <Section title="Look — filters and FX">
          <div className="flex flex-wrap gap-1">
            {Object.entries(FILTERS).map(([k, f]) => (
              <button key={k} onClick={() => set({ filter: k, adj: {} })}
                className={`rounded-full border px-2 py-0.5 text-xs ${c.filter === k ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>{f.label}</button>
            ))}
          </div>
          {Object.entries(ADJUST).map(([k, a]) => (
            <Slider key={k} label={a.label} value={look[k] || 0} min={a.min} max={a.max} unit={a.unit} onChange={(x) => adj(k, x)} />
          ))}
          {c.kind === "image" && (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="w-24 text-white/60">Motion</span>
              {Object.entries(MOTIONS).map(([k, m]) => (
                <button key={k} onClick={() => set({ motion: k })}
                  className={`rounded-full border px-2 py-0.5 ${c.motion === k ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>{m.label}</button>
              ))}
            </div>
          )}
        </Section>
      )}

      {visual && (
        <Section title={c.kind === "text" ? "Position" : "Picture-in-picture"}>
          <Slider label="Size" value={c.scale} min={5} max={c.kind === "text" ? 300 : 200} unit="%" onChange={(x) => set({ scale: x })} />
          <Slider label="Left / right" value={c.x} min={-100} max={100} unit="%" onChange={(x) => set({ x })} />
          <Slider label="Up / down" value={c.y} min={-100} max={100} unit="%" onChange={(x) => set({ y: x })} />
          <Slider label="Opacity" value={c.opacity} min={0} max={100} unit="%" onChange={(x) => set({ opacity: x })} />
          {c.kind !== "text" && <p className="text-[11px] text-white/40">On an upper track, a smaller size makes a picture-in-picture over the tracks below.</p>}
        </Section>
      )}

      {visual && (
        <Section title={c.kind === "text" ? "Title" : "Words on it"}>
          <input className="neon-input w-full" maxLength={TEXT_MAX} value={c.text} placeholder={c.kind === "text" ? "Your title" : "A caption (optional)"}
            aria-label="Text" onChange={(e) => set({ text: e.target.value })} />
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {TEXT_SPOTS.map((s) => (
              <button key={s} onClick={() => set({ textAt: s })}
                className={`rounded-full border px-2 py-0.5 ${c.textAt === s ? "border-mcz-cyan bg-mcz-cyan/15" : "border-white/15 text-white/60"}`}>{s}</button>
            ))}
            <label className="ml-2 flex items-center gap-1 text-white/60">Colour <input type="color" value={c.color} onChange={(e) => set({ color: e.target.value })} /></label>
          </div>
        </Section>
      )}

      {media && (
        <Section title="Sound">
          <Slider label="Volume" value={c.volume} min={0} max={200} unit="%" onChange={(x) => set({ volume: x })} />
        </Section>
      )}

      {c.kind === "image" && (
        <Section title="Lip-sync 👄" tour="videoz-lipsync">
          {!lipAllowed ? (
            <>
              <p className="text-xs text-white/60">Make this photo's mouth move with a voice — the video's own sound or a separate audio track.</p>
              <StatzSample what="Lip-sync" />
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={c.lip.on} onChange={(e) => set({ lip: { ...c.lip, on: e.target.checked, box: c.lip.box || DEFAULT_BOX } })} />
                Move the mouth with a voice
              </label>
              {c.lip.on && (
                <>
                  <label className="flex items-center gap-2 text-xs">
                    <span className="w-24 text-white/60">Voice</span>
                    <select data-nomemo="true" className="neon-input flex-1 py-1 text-xs" value={c.lip.source}
                      onChange={(e) => set({ lip: { ...c.lip, source: e.target.value } })}>
                      <option value="mix">Everything you hear at that moment</option>
                      {sounding.map((x) => (
                        <option key={x.id} value={x.id}>{x.name || x.kind} — {trackName(project, x.track)}</option>
                      ))}
                    </select>
                  </label>
                  <MouthBox src={c.src} box={c.lip.box}
                    onChange={(box, done) => (done ? onLive(null, true) : onLive({ lip: { ...c.lip, box } }, false))} />
                  {!sounding.length && <p className="text-xs text-mcz-gold">Add a video with sound or an audio file — the mouth needs a voice to follow.</p>}
                  {voiceLoading && <p className="text-xs text-white/50">Reading the voice…</p>}
                  {voiceErr && <p className="text-xs text-mcz-ember">{voiceErr}</p>}
                </>
              )}
              <p className="text-[11px] text-white/45">{LIP_NOTE}</p>
              <StatzSample what="Lip-sync" />
            </>
          )}
        </Section>
      )}
    </div>
  );
}
