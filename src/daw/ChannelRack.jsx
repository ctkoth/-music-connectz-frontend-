// The Channel Rack window — Fruity Möbius's front door. Tap steps, hear the loop,
// send the pattern to the Playlist as audio. The model and the synth are rack.js;
// this is the screen and the loop that plays it.
import { useEffect, useRef, useState } from "react";
import { Copy, Eraser, Play, Plus, Send, Square, Trash2 } from "lucide-react";
import {
  MAX_CHANNELS, MAX_PATTERNS, NOTES, STEPS, VOICES, addChannel, addPattern, barSeconds, cleanRack, clearPattern,
  currentPattern, hasNotes, noteName, removeChannel, removePattern, renderPattern, selectPattern, setChannel, setSwing,
  toggleStep,
} from "./rack.js";

const KEY = (app) => `mcz_rack_${app}`;
const load = (app) => { try { return cleanRack(JSON.parse(localStorage.getItem(KEY(app)) || "null")); } catch { return cleanRack(null); } };

export default function ChannelRack({ app, daw, bpm, busy, onSend }) {
  const [rack, setRack] = useState(() => load(app));
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [bars, setBars] = useState(4);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const live = useRef(null);      // { ctx, src, t0, len }
  const pattern = currentPattern(rack);

  useEffect(() => { try { localStorage.setItem(KEY(app), JSON.stringify(rack)); } catch { /* this session only */ } }, [app, rack]);

  const silence = () => {
    const l = live.current;
    if (l?.src) { try { l.src.stop(); } catch { /* already ended */ } }
    if (l) l.src = null;
  };

  // (Re)start the loop from whatever the pattern is now.
  const start = async () => {
    setErr("");
    try {
      const l = live.current || (live.current = { ctx: new (window.AudioContext || window.webkitAudioContext)(), src: null, t0: 0, len: 1 });
      if (l.ctx.state !== "running") await l.ctx.resume();
      const buf = await renderPattern(currentPattern(rack), { bpm, swing: rack.swing, bars: 1, rate: l.ctx.sampleRate });
      silence();
      const src = l.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(l.ctx.destination);
      l.t0 = l.ctx.currentTime + 0.03;
      l.len = buf.duration;
      src.start(l.t0);
      l.src = src;
      setPlaying(true);
    } catch (e) { setErr(e.message || "This browser couldn't play the pattern."); setPlaying(false); }
  };
  const stop = () => { silence(); setPlaying(false); setStep(-1); };

  // An edit while it loops is heard on the next pass, not after pressing Play again.
  useEffect(() => { if (playing) start(); }, [rack, bpm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    const tick = () => {
      const l = live.current;
      if (l?.src) {
        const pos = ((l.ctx.currentTime - l.t0) % l.len + l.len) % l.len;
        setStep(Math.min(STEPS - 1, Math.floor((pos / l.len) * STEPS)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => () => {
    silence();
    live.current?.ctx.close().catch(() => {});
    live.current = null;
  }, []);

  const send = async () => {
    setErr(""); setSending(true);
    try {
      const buf = await renderPattern(pattern, { bpm, swing: rack.swing, bars, rate: daw.sampleRate() });
      await onSend(daw.toWav(buf, 24), `${pattern.name} ×${bars}.wav`);
    } catch (e) { setErr(e.message || "Couldn't render the pattern."); } finally { setSending(false); }
  };

  const empty = !hasNotes(pattern);
  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-3" aria-label="Channel Rack">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {playing
          ? <button type="button" className="neon-btn-primary !w-auto px-3" onClick={stop}><Square size={14} /> Stop</button>
          : <button type="button" className="neon-btn-primary !w-auto px-3" onClick={start} disabled={empty}><Play size={14} /> Play pattern</button>}
        <div className="flex overflow-hidden rounded-lg border border-white/15" role="tablist" aria-label="Pattern">
          {rack.patterns.map((p, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === rack.current} title={p.name}
                    onClick={() => setRack((r) => selectPattern(r, i))}
                    className={`px-2.5 py-1.5 ${i === rack.current ? "bg-mcz-cyan/25 text-white" : "text-white/60"}`}>{i + 1}</button>
          ))}
        </div>
        <button type="button" className="re-btn !w-auto px-2" onClick={() => setRack((r) => addPattern(r))}
                disabled={rack.patterns.length >= MAX_PATTERNS} title="New empty pattern"><Plus size={13} /> Pattern</button>
        <button type="button" className="re-btn !w-auto px-2" onClick={() => setRack((r) => addPattern(r, { copy: true }))}
                disabled={rack.patterns.length >= MAX_PATTERNS} title="Copy this pattern to a new one"><Copy size={13} /> Clone</button>
        <button type="button" className="re-btn !w-auto px-2" onClick={() => setRack(clearPattern)} disabled={empty} title="Clear every step in this pattern"><Eraser size={13} /> Clear</button>
        <button type="button" className="re-btn !w-auto px-2" onClick={() => setRack(removePattern)}
                disabled={rack.patterns.length <= 1} aria-label="Delete this pattern"><Trash2 size={13} /></button>
        <label className="flex items-center gap-1 text-white/60">Swing
          <input type="range" min={0} max={0.6} step={0.05} value={rack.swing} className="w-20"
                 onChange={(e) => setRack((r) => setSwing(r, e.target.value))} />
          <span className="w-8 tabular-nums text-white/45">{Math.round(rack.swing * 100)}%</span>
        </label>
        <span className="text-white/40">{bpm} BPM · the tempo is the session's, above</span>
      </div>

      <div className="space-y-1.5 overflow-x-auto pb-1">
        {pattern.channels.map((c) => (
          <div key={c.id} className="flex min-w-[620px] items-center gap-2">
            <select className="neon-input !w-28 shrink-0 !py-1 text-xs" data-nomemo="true" value={c.voice} aria-label="Sound"
                    onChange={(e) => setRack((r) => setChannel(r, c.id, { voice: e.target.value }))}>
              {Object.entries(VOICES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {VOICES[c.voice].pitched
              ? <select className="neon-input !w-20 shrink-0 !py-1 text-xs" data-nomemo="true" value={c.note} aria-label="Note"
                        onChange={(e) => setRack((r) => setChannel(r, c.id, { note: e.target.value }))}>
                  {NOTES.map((n) => <option key={n} value={n}>{noteName(n)}</option>)}
                </select>
              : <span className="w-20 shrink-0" />}
            <input type="range" min={0} max={1} step={0.05} value={c.vol} className="w-14 shrink-0" aria-label={`${VOICES[c.voice].label} volume`}
                   onChange={(e) => setRack((r) => setChannel(r, c.id, { vol: e.target.value }))} />
            <div className="flex flex-1 gap-0.5" role="group" aria-label={`${VOICES[c.voice].label} steps`}>
              {c.steps.map((hit, i) => (
                <button key={i} type="button" aria-pressed={hit} aria-label={`Step ${i + 1}`}
                        onClick={() => setRack((r) => toggleStep(r, c.id, i))}
                        className={`h-8 flex-1 rounded ${i % 4 === 0 ? "ml-1 first:ml-0" : ""} ${hit
                          ? "bg-orange-400" : Math.floor(i / 4) % 2 ? "bg-white/[0.07]" : "bg-white/[0.14]"} ${step === i ? "ring-2 ring-white" : ""}`} />
              ))}
            </div>
            <button type="button" className="shrink-0 rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                    aria-label={`Remove ${VOICES[c.voice].label}`} onClick={() => setRack((r) => removeChannel(r, c.id))}><Trash2 size={13} /></button>
          </div>
        ))}
        {!pattern.channels.length && <p className="text-xs text-white/50">No channels in this pattern — add a sound below.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select className="neon-input !w-auto !py-1.5" data-nomemo="true" value="" aria-label="Add a channel"
                disabled={pattern.channels.length >= MAX_CHANNELS}
                onChange={(e) => e.target.value && setRack((r) => addChannel(r, e.target.value))}>
          <option value="">+ Add a sound…</option>
          {Object.entries(VOICES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1 text-white/60">Bars
            <select className="neon-input !w-auto !py-1.5" data-nomemo="true" value={bars} onChange={(e) => setBars(Number(e.target.value))}>
              {[1, 2, 4, 8, 16].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" className="neon-btn-primary !w-auto px-3" onClick={send} disabled={empty || sending || !!busy}>
            <Send size={13} /> {sending ? "Rendering…" : "Send to Playlist"}
          </button>
        </span>
      </div>
      <p className="text-[11px] text-white/45">
        <span className="text-emerald-300">Free.</span> Send to Playlist drops this pattern at the playhead as {bars} bar{bars === 1 ? "" : "s"} of audio
        ({Math.round(barSeconds(bpm) * bars * 10) / 10}s) on its own track — arrange it there, mix it in the Mixer. Every sound is made on your device.
      </p>
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </section>
  );
}
