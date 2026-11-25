// The bar above the dock that keeps a track playing across tabs. Renders
// nothing until something is played. See nowPlaying.js.
import { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { trackListening } from "../listen.js";
import { noteHeard, stopTrack, useNowPlaying } from "../nowPlaying.js";

// Compact: while somebody is DESIGNING (ImageZ, VideoZ, a DAW) the full bar is a slab over the work. Compact is a
// small round play/pause and a title, bottom-left, and the choice is kept on this device. The track keeps playing
// either way — this only changes how much room the controls take.
const NP_KEY = "mcz_np_compact";
const readCompact = () => { try { return localStorage.getItem(NP_KEY) === "1"; } catch { return false; } };
export function useNpCompact() {
  const [c, setC] = useState(readCompact);
  useEffect(() => {
    const h = () => setC(readCompact());
    window.addEventListener("mcz-np-compact", h);
    return () => window.removeEventListener("mcz-np-compact", h);
  }, []);
  return c;
}
const setCompact = (on) => {
  try { localStorage.setItem(NP_KEY, on ? "1" : "0"); } catch { /* per-session then */ }
  window.dispatchEvent(new Event("mcz-np-compact"));
};

export default function NowPlayingBar() {
  const compact = useNpCompact();
  const { track } = useNowPlaying();
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState({ cur: 0, dur: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return undefined;
    el.src = track.src;
    el.play().catch(() => {});     // a blocked autoplay just waits for ▶
    const off = trackListening(el, track.item, (r) => noteHeard(track.item, r));
    const toggle = () => (el.paused ? el.play().catch(() => {}) : el.pause());
    window.addEventListener("mcz-player-toggle", toggle);
    return () => { off(); window.removeEventListener("mcz-player-toggle", toggle); el.pause(); };
  }, [track?.item]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

  return (
    <>
      <audio ref={ref} preload="none" className="hidden"
             onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
             onTimeUpdate={(e) => setT({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration })} />
      {track && compact && (
        <div className="fixed bottom-[76px] left-2 z-40 flex max-w-[70vw] items-center gap-2 rounded-full border border-mcz-ember/40 bg-[#14121c]/95 py-1 pl-1 pr-3 shadow-neon backdrop-blur"
             data-tour="now-playing">
          <button type="button" aria-label={playing ? "Pause" : "Play"}
                  onClick={() => window.dispatchEvent(new Event("mcz-player-toggle"))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mcz-ember text-black">
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <span className="min-w-0 truncate text-[12px] font-semibold text-white/90">{track.title || "Untitled"}</span>
          <button type="button" aria-label="Show the full player" onClick={() => setCompact(false)} className="shrink-0 text-white/50 hover:text-white">⤢</button>
          <button type="button" aria-label="Close player" onClick={stopTrack} className="shrink-0 text-white/50 hover:text-white"><X size={14} /></button>
        </div>
      )}
      {track && !compact && (
        <div className="fixed inset-x-2 bottom-[76px] z-40 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-mcz-ember/40 bg-[#14121c]/95 px-3 py-2 shadow-neon backdrop-blur"
             data-tour="now-playing">
          <button type="button" aria-label={playing ? "Pause" : "Play"}
                  onClick={() => window.dispatchEvent(new Event("mcz-player-toggle"))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mcz-ember text-black">
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="min-w-0 flex-1">
            <a href={track.url} className="block truncate text-sm font-semibold text-white hover:underline">
              {track.title || "Untitled"}{track.author ? <span className="font-normal text-white/50"> · @{track.author}</span> : null}
            </a>
            <input type="range" min={0} max={t.dur || 0} step="0.1" value={t.cur} aria-label="Seek"
                   onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); }}
                   className="h-1 w-full accent-[#ff5500]" />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-white/60">{fmt(t.cur)} / {fmt(t.dur)}</span>
          <button type="button" aria-label="Make the player small" title="Small player — out of the way while you design"
                  onClick={() => setCompact(true)} className="shrink-0 text-white/50 hover:text-white">⤡</button>
          <button type="button" aria-label="Close player" onClick={stopTrack} className="shrink-0 text-white/50 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
