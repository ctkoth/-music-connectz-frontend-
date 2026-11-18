// The Loop Library window — Witchcraft's front door (Mixcraft's loop browser). Pick a key, browse
// drums, chords, keys, bass and arps at the session's tempo, hear any loop, and drop it on its own
// track for as many bars as you want. Every loop is made on the device by the engine's own generators.
// The library ladders by Corey's numbers per family (Free 3, Premium 6, StatZ all).
import { useEffect, useRef, useState } from "react";
import { Play, Send, Square } from "lucide-react";
import { drumPart, styleSwing } from "./drummer.js";
import { renderBars } from "./rack.js";
import { KEYS, MODES, progressionChords, renderProgression } from "./chords.js";
import { allowedLoops, loopCatalogue } from "./loops.js";
import { loadLimits, TIER_LABEL } from "../limits.js";
import { goToSpot } from "../goto.js";

const LOOPS = loopCatalogue();

export default function LoopLibrary({ daw, bpm, busy: working, onSend }) {
  const [key, setKey] = useState(9);
  const [mode, setMode] = useState("minor");
  const [bars, setBars] = useState(8);
  const [fam, setFam] = useState("Drums");
  const [playing, setPlaying] = useState(null);
  const [sending, setSending] = useState(null);
  const [err, setErr] = useState("");
  const [lim, setLim] = useState(null);
  const live = useRef(null);
  useEffect(() => { loadLimits().then(setLim).catch(() => {}); }, []);
  const cap = lim && "imagez_layers" in lim ? lim.imagez_layers : null;
  const ok = allowedLoops(cap);

  // Chord loops are 4 chords; drums are 1 bar a pattern. `n` bars of either.
  const render = (l, n, rate) => (l.kind === "drums"
    ? renderBars(drumPart(l.style, { busy: 0.5, hard: 0.6, bars: n, fillEvery: 4 }), { bpm, swing: styleSwing(l.style), rate })
    : renderProgression(progressionChords(key, mode, l.prog), { bpm, beatsPerChord: 4, times: Math.max(1, Math.round(n / 4)), layers: l.layers, rate }));

  const stop = () => { try { live.current?.src?.stop(); } catch { /* ended */ } setPlaying(null); };
  useEffect(() => () => { stop(); live.current?.ctx?.close().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const hear = async (l) => {
    stop(); setErr("");
    try {
      const c = live.current || (live.current = { ctx: new (window.AudioContext || window.webkitAudioContext)() });
      if (c.ctx.state !== "running") await c.ctx.resume();
      const buf = await render(l, 4, c.ctx.sampleRate);
      const src = c.ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(c.ctx.destination); src.start();
      c.src = src; setPlaying(l.id);
    } catch (e) { setErr(e.message || "This browser couldn't play the loop."); }
  };
  const send = async (l) => {
    setSending(l.id); setErr("");
    try {
      const buf = await render(l, bars, daw.sampleRate());
      const where = l.kind === "drums" ? "" : ` in ${KEYS[key]} ${MODES[mode].label.toLowerCase()}`;
      await onSend(daw.toWav(buf, 24), `${l.label}${where} ×${bars}.wav`);
    } catch (e) { setErr(e.message || "Couldn't render the loop."); } finally { setSending(null); }
  };

  const families = [...new Set(LOOPS.map((l) => l.family))];
  return (
    <div className="neon-frame space-y-3 p-4" data-tour="daw-loops">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">Loop library</span>
        <label className="flex items-center gap-1">Key
          <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" value={key} onChange={(e) => setKey(+e.target.value)}>
            {KEYS.map((k, i) => <option key={k} value={i}>{k}</option>)}</select></label>
        <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" value={mode} onChange={(e) => setMode(e.target.value)}>
          {Object.entries(MODES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select>
        <label className="flex items-center gap-1">Bars
          <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" value={bars} onChange={(e) => setBars(+e.target.value)}>
            {[4, 8, 16, 32].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <span className="text-white/50">at {bpm} BPM · free · each loop goes on its own track</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {families.map((f) => (
          <button key={f} className={`pill text-[11px] ${fam === f ? "!border-mcz-cyan !text-mcz-cyan" : ""}`} onClick={() => setFam(f)}>{f}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {LOOPS.filter((l) => l.family === fam).map((l) => {
          const allowed = ok.has(l.id);
          return (
            <div key={l.id} className={`flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs ${allowed ? "" : "opacity-50"}`}>
              <span className="min-w-0 flex-1 truncate">{l.label}{allowed ? "" : " — upgrade"}</span>
              {playing === l.id
                ? <button className="re-btn !w-auto px-2" onClick={stop}><Square size={12} /></button>
                : <button className="re-btn !w-auto px-2" disabled={!allowed} onClick={() => hear(l)} aria-label={`Hear ${l.label}`}><Play size={12} /></button>}
              <button className="re-btn !w-auto px-2" disabled={!allowed || !!sending || !!working} onClick={() => send(l)} aria-label={`Add ${l.label}`}>
                <Send size={12} /> {sending === l.id ? "…" : "Add"}</button>
            </div>
          );
        })}
      </div>
      {cap != null && (
        <p className="text-[11px] text-white/45">The first {cap} of each family on {TIER_LABEL[lim?.tier] || "your tier"}.{" "}
          <button className="re-link" onClick={() => goToSpot("membershipz", "")}>Premium has 6; StatZ has the whole library</button></p>
      )}
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}
