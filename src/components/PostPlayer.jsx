import { useEffect, useState } from "react";
import { playTrack, useNowPlaying } from "../nowPlaying.js";

// A real waveform: the recording is decoded in the browser and each bar is the loudest sample in its slice.
// Nothing is drawn when it cannot be (too big, not audio, blocked) — never a made-up shape.
const WAVES = new Map();
async function waveFor(src, bars = 56) {
  if (WAVES.has(src)) return WAVES.get(src);
  const r = await fetch(src);
  if (!r.ok || (Number(r.headers.get("content-length")) || 0) > 25e6) throw new Error("skip");
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const a = await ctx.decodeAudioData(await r.arrayBuffer());
    const ch = a.getChannelData(0), size = Math.max(1, Math.floor(ch.length / bars)), peaks = [];
    for (let i = 0; i < bars; i++) {
      let m = 0;
      for (let j = i * size; j < Math.min(ch.length, (i + 1) * size); j += 16) m = Math.max(m, Math.abs(ch[j]));
      peaks.push(m);
    }
    const top = Math.max(...peaks) || 1;
    const out = { peaks: peaks.map((v) => v / top), seconds: a.duration };
    WAVES.set(src, out);
    return out;
  } finally { ctx.close?.(); }
}
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const COLORS = ["#a35cff", "#ff3fbf", "#22d3ee"];

export function PostPlayer({ post, color }) {
  const [wave, setWave] = useState(null);
  const np = useNowPlaying();
  const src = post.media?.audio || (post.media_type === "audio" ? post.media_url : "");
  const item = `post:${post.id}`;
  useEffect(() => { if (src) waveFor(src).then(setWave).catch(() => {}); }, [src]);
  if (!src) return null;
  const on = np.track?.item === item;
  return (
    <div className="mt-2 flex items-center gap-3">
      <button type="button" aria-label={on ? `Playing ${post.title}` : `Play ${post.title}`}
        onClick={() => playTrack({ item, src, title: post.title, author: post.author, url: `/p/${post.id}` })}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black" style={{ background: color }}>
        {on ? "❚❚" : "▶"}
      </button>
      {wave && (
        <svg viewBox={`0 0 ${wave.peaks.length * 4} 32`} preserveAspectRatio="none" className="h-8 min-w-0 flex-1" aria-hidden="true">
          {wave.peaks.map((v, i) => {
            const h = Math.max(2, v * 30);
            return <rect key={i} x={i * 4} y={16 - h / 2} width="2.2" height={h} rx="1" fill={color} />;
          })}
        </svg>
      )}
      {wave && <span className="shrink-0 text-[13px] text-white/70">{clock(wave.seconds)}</span>}
    </div>
  );
}


export const ago = (sec) => {
  const d = Math.floor((sec || 0) / 86400);
  return d < 1 ? "today" : d === 1 ? "1 day ago" : d < 7 ? `${d} days ago` : d < 14 ? "1 week ago" : `${Math.floor(d / 7)} weeks ago`;
};
