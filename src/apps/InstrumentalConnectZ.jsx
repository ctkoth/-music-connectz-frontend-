import { useEffect, useRef, useState } from "react";
import { playSound } from "../sound.js";
import { Download, Loader2, Music, Play, Search, Square } from "lucide-react";
import { api, apiBlob } from "../api.js";
import { goToSpot } from "../goto.js";
import { IconImg } from "../App.jsx";
import { PROMPTZ } from "../resources.js";
import UseIn from "../components/UseIn.jsx";
import { StatzSample, useStatzTrial } from "../components/StatzSample.jsx";

// Instrumental ConnectZ — AI-composed MIDI loops. Keys, moods, instruments,
// limits and price all come from /api/economy/instrumentalz/; the .mid is
// written by the server. The preview below is a sketch, not the sound: plain
// synth voices so a member can hear the notes before downloading them.

function Price({ s }) {
  if (!s) return null;
  if (s.free_today) {
    return <span className="text-[11px] text-emerald-300">Free today <span className="text-white/45">— uses 1 of the {s.daily_remaining} {PROMPTZ} you have left</span></span>;
  }
  return <span className="text-[11px] text-mcz-ember">−{s.cost_cents} {PROMPTZ} <span className="text-white/35">— no free prompts left today</span></span>;
}

const WAVE = { bass: "sawtooth", synth_bass: "sawtooth", lead: "square", organ: "sine", brass: "sawtooth",
  strings: "sawtooth", pad: "sawtooth", choir: "triangle" };
const SOFT = new Set(["strings", "pad", "choir"]);

function hz(p) { return 440 * Math.pow(2, (p - 69) / 12); }

function drum(ctx, out, pitch, t, vel) {
  const g = ctx.createGain();
  g.connect(out);
  if (pitch === 35 || pitch === 36) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g); o.start(t); o.stop(t + 0.3);
    return;
  }
  const len = pitch >= 42 ? 0.06 : pitch === 46 || pitch >= 49 ? 0.4 : 0.15;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = pitch >= 42 ? "highpass" : "bandpass";
  f.frequency.value = pitch >= 42 ? 7000 : 1800;
  g.gain.setValueAtTime(vel * 0.7, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(f); f.connect(g); src.start(t);
}

function playLoop(work, repeats = 2) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.25;
  master.connect(ctx.destination);
  const spb = 60 / work.bpm;
  const loopLen = work.bars * 4 * spb;
  const t0 = ctx.currentTime + 0.1;
  for (let r = 0; r < repeats; r++) {
    for (const tr of work.tracks) {
      for (const [pitch, start, length, v] of tr.notes) {
        const t = t0 + r * loopLen + start * spb;
        const vel = v / 127;
        if (tr.instrument === "drums") { drum(ctx, master, pitch, t, vel); continue; }
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = WAVE[tr.instrument] || "triangle";
        o.frequency.value = hz(pitch);
        const end = t + Math.max(0.05, length * spb);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vel * 0.5, t + (SOFT.has(tr.instrument) ? 0.12 : 0.01));
        g.gain.exponentialRampToValueAtTime(0.001, end);
        o.connect(g); g.connect(master); o.start(t); o.stop(end + 0.05);
      }
    }
  }
  return { ctx, ends: t0 + repeats * loopLen };
}

export default function InstrumentalConnectZ() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [genre, setGenre] = useState("");
  const [brief, setBrief] = useState("");
  const [picked, setPicked] = useState(["drums", "bass", "piano"]);
  const [bpm, setBpm] = useState(90);
  const [key, setKey] = useState("A minor");
  const [bars, setBars] = useState(4);
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [mood, setMood] = useState("");
  const [moodHits, setMoodHits] = useState(null);
  const player = useRef(null);

  const load = () => api("/api/economy/instrumentalz/").then(setS).catch((e) => setErr(e.message));
  useEffect(() => { load(); return () => stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const { s: trial } = useStatzTrial();
  useEffect(() => { if (trial) load(); }, [trial?.active]); // eslint-disable-line react-hooks/exhaustive-deps

  function stop() {
    player.current?.ctx?.close?.();
    player.current = null;
    setPlaying(false);
  }
  function play() {
    stop();
    const p = playLoop(work);
    if (!p) return setErr("This browser can't play a preview — download the .mid instead.");
    player.current = p;
    setPlaying(true);
    setTimeout(() => { if (player.current === p) stop(); }, (p.ends - p.ctx.currentTime) * 1000 + 200);
  }

  const toggle = (id) => setPicked((cur) => cur.includes(id) ? cur.filter((x) => x !== id)
    : cur.length >= (s?.max_tracks ?? 6) ? cur : [...cur, id]);

  async function compose() {
    setErr(""); setBusy(true); stop();
    try {
      const w = await api("/api/economy/instrumentalz/", { method: "POST",
        body: { genre, brief, instruments: picked, bpm, key, bars } });
      setWork(w); load();
      playSound("build_done");
    } catch (e) { playSound("build_fail"); setErr(e.message); } finally { setBusy(false); }
  }

  async function download() {
    try {
      const blob = await apiBlob(`/api/economy/instrumentalz/${work.id}/midi/`);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(work.genre || "instrumental").replace(/\W+/g, "-")}-${work.key.replace(/\W+/g, "")}-${work.bpm}bpm.mid`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { setErr(e.message); }
  }

  async function searchMood() {
    try { setMoodHits((await api(`/api/economy/instrumentalz/moods/?q=${encodeURIComponent(mood)}`)).results); }
    catch (e) { setErr(e.message); }
  }

  const keyMood = s?.keys?.find((k) => k.key === key)?.mood;
  const [lo, hi] = s?.bpm || [60, 200];

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-4">
        <IconImg icon="instrumentalconnectz.png" alt="Instrumental ConnectZ" className="h-16 w-16 rounded-2xl shadow-neon" />
        <div>
          <h2 className="font-display text-3xl font-extrabold text-mcz-cyan">Instrumental ConnectZ</h2>
          <p className="text-sm text-white/60">AI-composed MIDI loops — pick the sound, the speed and the mood.</p>
        </div>
      </header>

      {s && !s.configured && <p className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mcz-gold">The composer isn't switched on yet.</p>}

      <div className="neon-frame space-y-4 p-4">
        <input className="neon-input w-full" maxLength={60} placeholder="Genre (boom bap, drill, R&B, lo-fi…)"
          value={genre} onChange={(e) => setGenre(e.target.value)} />

        <div>
          <p className="mb-2 text-sm text-white/70">Instruments <span className="text-white/40">(up to {s?.max_tracks ?? 6})</span></p>
          <div className="flex flex-wrap gap-2">
            {(s?.instruments || []).map((i) => (
              <button key={i.id} onClick={() => toggle(i.id)}
                className={`rounded-full border px-3 py-1.5 text-sm ${picked.includes(i.id)
                  ? "border-mcz-cyan bg-mcz-cyan/15 text-white" : "border-white/15 text-white/70 hover:border-white/40"}`}>
                {i.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-white/70">BPM
            <input type="number" min={lo} max={hi} className="neon-input mt-1 w-full" value={bpm}
              onChange={(e) => setBpm(Number(e.target.value) || lo)} />
          </label>
          <label className="text-sm text-white/70">Key
            <select className="neon-input mt-1 w-full" value={key} onChange={(e) => setKey(e.target.value)}>
              {(s?.keys || []).map((k) => <option key={k.key} value={k.key}>{k.key}</option>)}
            </select>
          </label>
          <label className="text-sm text-white/70">Length
            <select className="neon-input mt-1 w-full" value={bars} onChange={(e) => setBars(Number(e.target.value))}>
              {(s?.bars || [4, 8]).map((b) => <option key={b} value={b}>{b} bars</option>)}
            </select>
          </label>
        </div>
        {keyMood && <p className="text-sm italic text-white/70">“{keyMood}”</p>}

        {s?.mood_search ? (
          <div data-tour="instrumental-mood" className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <StatzSample what="Searching keys by mood" />
            <div className="flex gap-2">
              <input className="neon-input flex-1" placeholder="Find a key by mood — dark, hopeful, heartbroken…"
                value={mood} onChange={(e) => setMood(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchMood()} />
              <button className="re-btn !w-auto px-3" onClick={searchMood}><Search size={16} /></button>
            </div>
            {moodHits && (moodHits.length ? moodHits.slice(0, 6).map((h) => (
              <button key={h.key} onClick={() => setKey(h.key)}
                className="block w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-white/10">
                <span className="font-semibold">{h.key}</span> <span className="text-white/55">— {h.mood}</span>
              </button>
            )) : <p className="text-xs text-white/50">No key matches that mood — try another word.</p>)}
          </div>
        ) : s && (
          <div data-tour="instrumental-mood" className="space-y-1">
            <StatzSample what="Searching keys by mood" />
            <p className="text-[11px] text-white/40">Every key's mood still shows when you pick it.</p>
          </div>
        )}

        <textarea className="neon-input min-h-20 w-full" maxLength={500} placeholder="Anything else? (optional)"
          value={brief} onChange={(e) => setBrief(e.target.value)} />

        <div className="flex flex-wrap items-center gap-3">
          <button className="neon-btn-primary !w-auto px-5" disabled={busy || !picked.length || (s && !s.can_run)} onClick={compose}>
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Music size={16} />} Compose it
          </button>
          <Price s={s} />
          <span className="text-[11px] text-white/40">An answer that isn't a usable loop isn't charged.</span>
        </div>
        {s?.royalty_rule && <p className="text-xs text-white/50">{s.royalty_rule}</p>}
        {err && <p className="text-sm text-mcz-ember">{err}</p>}
      </div>

      {work && (
        <div key={work.id} className="mcz-reveal neon-frame space-y-3 p-4">
          <h3 className="font-semibold">{work.genre || "Instrumental"} · {work.key} · {work.bpm} BPM · {work.bars} bars</h3>
          <p className="text-xs text-white/50">{work.tracks.map((t) => `${t.instrument} (${t.notes.length} notes)`).join(" · ")}</p>
          <div className="flex flex-wrap gap-3">
            {playing
              ? <button className="re-btn !w-auto px-4" onClick={stop}><Square size={14} /> Stop</button>
              : <button className="re-btn !w-auto px-4" onClick={play}><Play size={14} /> Preview</button>}
            <button className="re-btn !w-auto px-4" onClick={download}><Download size={14} /> Download .mid</button>
          </div>
          <p className="text-[11px] text-white/40">The preview uses simple built-in sounds. Load the .mid into your DAW for the real instruments.</p>
          <UseIn source="instrumental" sourceId={work.id} pct={s?.royalty_pct ?? 10} />
        </div>
      )}

      {s?.works?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/70">Your loops</h3>
          {s.works.map((w) => (
            <button key={w.id} onClick={() => { stop(); setWork(w); }}
              className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-white/30">
              {w.genre || "Instrumental"} <span className="text-white/45">— {w.key}, {w.bpm} BPM</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
