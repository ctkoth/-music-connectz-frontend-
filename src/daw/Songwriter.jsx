// The Songwriter window — Intuition's front door. Pick a key and a progression,
// stack instruments on it, hear it, send it to a track. chords.js works out the
// notes and makes the sound; Smart Tempo sets the session's BPM from taps.
import { useEffect, useRef, useState } from "react";
import { Hand, Play, Send, Square } from "lucide-react";
import {
  KEYS, LAYERS, MODES, PROGRESSIONS, cleanSong, progressionChords, progressionSeconds, renderProgression, tapTempo,
} from "./chords.js";

const KEY = (app) => `mcz_song_${app}`;
const load = (app) => { try { return cleanSong(JSON.parse(localStorage.getItem(KEY(app)) || "null")); } catch { return cleanSong(null); } };

export default function Songwriter({ app, daw, bpm, busy, onSend, onBpm }) {
  const [song, setSong] = useState(() => load(app));
  const [times, setTimes] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [taps, setTaps] = useState([]);
  const live = useRef(null);

  useEffect(() => { try { localStorage.setItem(KEY(app), JSON.stringify(song)); } catch { /* this session only */ } }, [app, song]);

  const chords = progressionChords(song.key, song.mode, song.prog);
  const silence = () => {
    const l = live.current;
    if (l?.src) { try { l.src.stop(); } catch { /* already ended */ } l.src = null; }
  };
  const start = async () => {
    setErr("");
    try {
      const l = live.current || (live.current = { ctx: new (window.AudioContext || window.webkitAudioContext)(), src: null });
      if (l.ctx.state !== "running") await l.ctx.resume();
      const buf = await renderProgression(chords, { bpm, beatsPerChord: song.beats, times: 1, layers: song.layers, rate: l.ctx.sampleRate });
      silence();
      const src = l.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(l.ctx.destination);
      src.start(l.ctx.currentTime + 0.03);
      l.src = src;
      setPlaying(true);
    } catch (e) { setErr(e.message || "This browser couldn't play the chords."); setPlaying(false); }
  };
  const stop = () => { silence(); setPlaying(false); };
  // A change while it plays is heard, not queued for the next Play.
  useEffect(() => { if (playing) start(); }, [song, bpm]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { silence(); live.current?.ctx.close().catch(() => {}); live.current = null; }, []);

  const tap = () => {
    const now = performance.now();
    // A pause of two seconds starts a new count rather than averaging in the gap.
    const next = [...(taps.length && now - taps.at(-1) > 2000 ? [] : taps), now].slice(-8);
    setTaps(next);
    const found = tapTempo(next);
    if (found) onBpm(found);
  };

  const send = async () => {
    setErr(""); setSending(true);
    try {
      const buf = await renderProgression(chords, { bpm, beatsPerChord: song.beats, times, layers: song.layers, rate: daw.sampleRate() });
      await onSend(daw.toWav(buf, 24), `${KEYS[song.key]} ${MODES[song.mode].label.toLowerCase()} ${PROGRESSIONS[song.prog].label} ×${times}.wav`);
    } catch (e) { setErr(e.message || "Couldn't render the chords."); } finally { setSending(false); }
  };

  const secs = Math.round(progressionSeconds(chords.length, { bpm, beatsPerChord: song.beats, times }));
  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-3" aria-label="Songwriter">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1 text-white/70">Key
          <select className="neon-input !w-auto !py-1.5" data-nomemo="true" value={song.key} onChange={(e) => setSong((s) => ({ ...s, key: Number(e.target.value) }))}>
            {KEYS.map((k, i) => <option key={k} value={i}>{k}</option>)}
          </select>
        </label>
        <div className="flex overflow-hidden rounded-lg border border-white/15" role="radiogroup" aria-label="Major or minor">
          {Object.entries(MODES).map(([k, m]) => (
            <button key={k} type="button" role="radio" aria-checked={song.mode === k} onClick={() => setSong((s) => ({ ...s, mode: k }))}
                    className={`px-3 py-1.5 ${song.mode === k ? "bg-mcz-cyan/25 text-white" : "text-white/60"}`}>{m.label}</button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-white/70">Progression
          <select className="neon-input !w-auto !py-1.5" data-nomemo="true" value={song.prog} onChange={(e) => setSong((s) => ({ ...s, prog: e.target.value }))}>
            {Object.entries(PROGRESSIONS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 text-white/70">Beats a chord
          <select className="neon-input !w-auto !py-1.5" data-nomemo="true" value={song.beats} onChange={(e) => setSong((s) => ({ ...s, beats: Number(e.target.value) }))}>
            {[2, 4, 8].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <ol className="flex flex-wrap gap-1.5" aria-label="Chords in order">
        {chords.map((c, i) => (
          <li key={i} className="min-w-[3.5rem] rounded-lg bg-white/10 px-3 py-2 text-center">
            <span className="block text-base font-bold text-white">{c.name}</span>
            <span className="block text-[10px] text-white/45">{c.roman}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label="Instrument stack">
        <span className="text-white/60">Stack:</span>
        {Object.entries(LAYERS).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={song.layers[k]} title={l.what}
                  onClick={() => setSong((s) => {
                    const layers = { ...s.layers, [k]: !s.layers[k] };
                    // An empty stack is silence; the last instrument stays on.
                    return Object.values(layers).some(Boolean) ? { ...s, layers } : s;
                  })}
                  className={`rounded-lg px-3 py-1.5 font-semibold ${song.layers[k] ? "bg-mcz-cyan/30 text-white ring-1 ring-mcz-cyan" : "bg-white/10 text-white/60"}`}>{l.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {playing
          ? <button type="button" className="neon-btn-primary !w-auto px-3" onClick={stop}><Square size={14} /> Stop</button>
          : <button type="button" className="neon-btn-primary !w-auto px-3" onClick={start}><Play size={14} /> Hear the chords</button>}
        <button type="button" className="re-btn !w-auto px-3" onClick={tap} title="Tap along to your song; three taps set the tempo">
          <Hand size={13} /> Smart Tempo: tap
        </button>
        <span className="text-white/45" role="status">{taps.length >= 3 ? `Set to ${bpm} BPM from your taps` : taps.length ? `${3 - taps.length} more tap${taps.length === 2 ? "" : "s"}…` : `${bpm} BPM`}</span>
        <span className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1 text-white/60">Times through
            <select className="neon-input !w-auto !py-1.5" data-nomemo="true" value={times} onChange={(e) => setTimes(Number(e.target.value))}>
              {[1, 2, 4, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button type="button" className="neon-btn-primary !w-auto px-3" onClick={send} disabled={sending || !!busy}>
            <Send size={13} /> {sending ? "Rendering…" : "Send to Tracks"}
          </button>
        </span>
      </div>
      <p className="text-[11px] text-white/45">
        <span className="text-emerald-300">Free.</span> Send to Tracks puts the progression ({secs}s) on its own track at the playhead — then arm a track and record your
        melody or vocal over it. Smart Tempo here is your taps; it does not listen to a file. Every sound is made on your device.
      </p>
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </section>
  );
}
