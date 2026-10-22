// Three things the free trial door adds around the recorder, each answering one
// reason a stranger did not get as far as a score:
//
//   ExampleCard  — "what would I even get?" A REAL card, the owner's own shared take
//                  (the server picks it: `example` on GET /api/<key>/trial/), never an
//                  invented one. No example on this coach means nothing renders.
//   PracticeBeat — "what do I perform?" Four bars over a beat is easier to say yes to
//                  than a blank recorder. Made in the browser (Web Audio), so there is no
//                  file and nothing licensed; headphones keep it out of the take.
//   EmailMe      — "I can't wait 90 seconds." The score is emailed the moment it exists,
//                  so closing the tab no longer loses it. Renders only when the server
//                  says mail can actually leave (`remind.ready`).
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play } from "lucide-react";

export function ExampleCard({ example, open: startOpen = false, title }) {
  const [open, setOpen] = useState(startOpen);
  if (!example) return null;
  const shown = example.shown || example.score;
  const who = example.username ? `@${example.username}'s` : "A";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left">
      <button type="button" className="flex w-full items-center justify-between gap-2 text-[12px] text-white/70"
              onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title || "👀 See a real scored take first"}</span>
        <span className="text-[11px] text-mcz-cyan">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] text-white/45">{who} own take, scored by this same coach. Yours gets the same read.</p>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold text-mcz-cyan">{shown}<span className="text-sm text-white/30">/10</span></span>
            <p className="flex-1 text-[12px] text-white/75">{example.verdict}</p>
          </div>
          {example.why?.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-[11px] text-white/60">
              {example.why.slice(0, 3).map((w, i) => <li key={i}>{w.kind === "fixes" ? "To fix: " : "Worked: "}{w.text}</li>)}
            </ul>
          )}
          <Link to={`/s/${example.token}`} target="_blank" className="text-[11px] text-mcz-cyan hover:underline">Open the full card</Link>
        </div>
      )}
    </div>
  );
}

// A 16-step boom-bap loop: kick, snare on 2 and 4, eighth-note hats. Scheduled a little
// ahead on the audio clock, which is what keeps it in time when the page is busy.
const KICK = [0, 6, 8, 10], SNARE = [4, 12];
function useBeat() {
  const ctx = useRef(null), timer = useRef(null);
  const [bpm, setBpm] = useState(90);
  const [on, setOn] = useState(false);
  const stop = () => { clearInterval(timer.current); timer.current = null; ctx.current?.close(); ctx.current = null; setOn(false); };
  useEffect(() => () => stop(), []);   // never leave a beat running on another screen
  const start = (tempo = bpm) => {
    stop();
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    ctx.current = ac;
    const noise = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const hit = (t, kind) => {
      const g = ac.createGain(); g.connect(ac.destination);
      if (kind === "kick") {
        const o = ac.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g); o.start(t); o.stop(t + 0.3);
      } else {
        const s = ac.createBufferSource(); s.buffer = noise;
        const f = ac.createBiquadFilter(); f.type = kind === "hat" ? "highpass" : "bandpass";
        f.frequency.value = kind === "hat" ? 7000 : 1800;
        const len = kind === "hat" ? 0.05 : 0.18;
        g.gain.setValueAtTime(kind === "hat" ? 0.25 : 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
        s.connect(f); f.connect(g); s.start(t); s.stop(t + len);
      }
    };
    const step = 60 / tempo / 4;
    let n = 0, next = ac.currentTime + 0.05;
    timer.current = setInterval(() => {
      while (next < ac.currentTime + 0.12) {
        const i = n % 16;
        if (KICK.includes(i)) hit(next, "kick");
        if (SNARE.includes(i)) hit(next, "snare");
        if (i % 2 === 0) hit(next, "hat");
        next += step; n += 1;
      }
    }, 25);
    setOn(true);
  };
  return { on, bpm, start, stop, setTempo: (t) => { setBpm(t); if (timer.current) start(t); } };
}

export function PracticeBeat({ vocal }) {
  const beat = useBeat();
  return (
    <div className="space-y-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[12px] text-white/75">
        Not sure what to do? {vocal ? "Rap or sing four bars over this beat" : "Play four bars along to this beat"} — that's enough for a score.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="neon-btn-ghost !w-auto px-3 py-1.5 text-xs inline-flex items-center gap-1"
                onClick={() => (beat.on ? beat.stop() : beat.start())}>
          {beat.on ? <Pause size={13} /> : <Play size={13} />} {beat.on ? "Stop the beat" : "Play a beat"}
        </button>
        {[[70, "Slow"], [90, "Medium"], [140, "Fast"]].map(([t, l]) => (
          <button key={t} type="button" onClick={() => beat.setTempo(t)}
                  className={`pill !text-[11px] ${beat.bpm === t ? "pill-on" : ""}`}>{l} · {t} BPM</button>
        ))}
      </div>
      <p className="text-[11px] text-white/40">Headphones if you have them — otherwise the beat ends up in your recording too.</p>
    </div>
  );
}

export function EmailMe({ remind, value, onChange }) {
  if (!remind?.ready) return null;
  return (
    <label className="block space-y-1">
      <span className="text-[12px] text-white/70">Email me the score <span className="text-white/40">(optional)</span></span>
      <input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" maxLength={254}
             className="neon-input !py-2 w-full text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="block text-[11px] text-white/40">
        So you can close this tab while the coach listens. {remind.schedule}
      </span>
    </label>
  );
}
