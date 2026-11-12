// The Smart Drummer window — FormulaWon's front door. Pick a style, set how busy
// and how hard the drummer plays, hear it, and send it to a track. No steps to
// program; drummer.js writes the bars and rack.js makes the sound.
import { useEffect, useRef, useState } from "react";
import { Play, Send, Square } from "lucide-react";
import { STYLES, drumPart, styleSwing } from "./drummer.js";
import { barSeconds, renderBars } from "./rack.js";

const KEY = (app) => `mcz_drummer_${app}`;
const load = (app) => {
  try {
    const d = JSON.parse(localStorage.getItem(KEY(app)) || "null") || {};
    return { style: STYLES[d.style] ? d.style : "pop", busy: Number(d.busy) >= 0 && Number(d.busy) <= 1 ? Number(d.busy) : 0.5,
             hard: Number(d.hard) >= 0 && Number(d.hard) <= 1 ? Number(d.hard) : 0.6, fills: d.fills !== false };
  } catch { return { style: "pop", busy: 0.5, hard: 0.6, fills: true }; }
};
const word = (v, low, mid, high) => (v < 0.34 ? low : v < 0.67 ? mid : high);

export default function SmartDrummer({ app, daw, bpm, busy: working, onSend }) {
  const [set, setSet] = useState(() => load(app));
  const [bars, setBars] = useState(8);
  const [playing, setPlaying] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const live = useRef(null);      // { ctx, src }

  useEffect(() => { try { localStorage.setItem(KEY(app), JSON.stringify(set)); } catch { /* this session only */ } }, [app, set]);

  const part = (n) => drumPart(set.style, { busy: set.busy, hard: set.hard, bars: n, fillEvery: set.fills ? 4 : 0 });
  const silence = () => {
    const l = live.current;
    if (l?.src) { try { l.src.stop(); } catch { /* already ended */ } l.src = null; }
  };
  const start = async () => {
    setErr("");
    try {
      const l = live.current || (live.current = { ctx: new (window.AudioContext || window.webkitAudioContext)(), src: null });
      if (l.ctx.state !== "running") await l.ctx.resume();
      const buf = await renderBars(part(4), { bpm, swing: styleSwing(set.style), rate: l.ctx.sampleRate });
      silence();
      const src = l.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(l.ctx.destination);
      src.start(l.ctx.currentTime + 0.03);
      l.src = src;
      setPlaying(true);
    } catch (e) { setErr(e.message || "This browser couldn't play the drummer."); setPlaying(false); }
  };
  const stop = () => { silence(); setPlaying(false); };
  // A dial moved while it plays is heard, not queued for the next Play.
  useEffect(() => { if (playing) start(); }, [set, bpm]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { silence(); live.current?.ctx.close().catch(() => {}); live.current = null; }, []);

  const send = async () => {
    setErr(""); setSending(true);
    try {
      const buf = await renderBars(part(bars), { bpm, swing: styleSwing(set.style), rate: daw.sampleRate() });
      await onSend(daw.toWav(buf, 24), `${STYLES[set.style].label} drummer ×${bars}.wav`);
    } catch (e) { setErr(e.message || "Couldn't render the drummer."); } finally { setSending(false); }
  };

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-3" aria-label="Smart Drummer">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Style">
        {Object.entries(STYLES).map(([k, s]) => (
          <button key={k} type="button" role="radio" aria-checked={set.style === k}
                  onClick={() => setSet((v) => ({ ...v, style: k }))}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${set.style === k ? "bg-mcz-cyan/30 text-white ring-1 ring-mcz-cyan" : "bg-white/10 text-white/70 hover:bg-white/15"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-white/70">
          <span className="flex justify-between"><span>Simple ↔ Busy</span><span className="text-white/45">{word(set.busy, "simple", "steady", "busy")}</span></span>
          <input type="range" min={0} max={1} step={0.01} value={set.busy} className="mt-1 w-full" aria-label="How busy the drummer plays"
                 onChange={(e) => setSet((v) => ({ ...v, busy: Number(e.target.value) }))} />
        </label>
        <label className="block text-xs text-white/70">
          <span className="flex justify-between"><span>Soft ↔ Hard</span><span className="text-white/45">{word(set.hard, "soft", "solid", "hard")}</span></span>
          <input type="range" min={0} max={1} step={0.01} value={set.hard} className="mt-1 w-full" aria-label="How hard the drummer plays"
                 onChange={(e) => setSet((v) => ({ ...v, hard: Number(e.target.value) }))} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {playing
          ? <button type="button" className="neon-btn-primary !w-auto px-3" onClick={stop}><Square size={14} /> Stop</button>
          : <button type="button" className="neon-btn-primary !w-auto px-3" onClick={start}><Play size={14} /> Hear the drummer</button>}
        <label className="flex items-center gap-1 text-white/70">
          <input type="checkbox" checked={set.fills} onChange={(e) => setSet((v) => ({ ...v, fills: e.target.checked }))} /> Fill every 4 bars
        </label>
        <span className="text-white/40">{bpm} BPM · set the tempo above</span>
        <span className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1 text-white/60">Bars
            <select className="neon-input !w-auto !py-1.5" data-nomemo="true" value={bars} onChange={(e) => setBars(Number(e.target.value))}>
              {[4, 8, 16, 32].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" className="neon-btn-primary !w-auto px-3" onClick={send} disabled={sending || !!working}>
            <Send size={13} /> {sending ? "Rendering…" : "Send to Tracks"}
          </button>
        </span>
      </div>
      <p className="text-[11px] text-white/45">
        <span className="text-emerald-300">Free.</span> Send to Tracks puts {bars} bars of this drummer ({Math.round(barSeconds(bpm) * bars)}s) on its own track at the playhead.
        Then arm a track and press Record to sing or play over it. Every sound is made on your device.
      </p>
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </section>
  );
}
