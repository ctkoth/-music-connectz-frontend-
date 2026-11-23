// The synth's patch editor: start from a built-in or a saved patch, change anything, hear it, and save it as your own.
// It decides nothing about what a number may be: every change goes through cleanPatch (src/daw/synth/patch.js), the one
// place the ranges live. Saved patches are the member's on every device (/api/economy/tonez/, kind "synth") and count
// against the tier's room for that kind, said beside the Save button before it is pressed.
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, Plus, Save, Square, Trash2 } from "lucide-react";
import { FILTER_TYPES, LFO_SHAPES, MAX_MODS, MOD_DESTS, MOD_SOURCES, OSC_SHAPES, PRESETS, PRESET_IDS, cleanPatch, presetPatch } from "./patch.js";
import { renderSynth } from "./engine.js";
import { PHRASES, PHRASE_KEYS } from "./synthPhrases.js";
import { setUserPatches } from "./userPatches.js";
import { useTonePresets } from "../TonePresets.jsx";
import { presetRoom } from "../tonePresets.js";
import { FRAME_NAMES } from "./tables.js";
import { BASE_DEFAULT, OCTAVE_KEYS, clampBase, isBlack, layout, noteName, parseMidi, pitchForKey } from "./liveKeys.js";
import { createLiveSynth, liveSupported } from "./liveSynth.js";
import { eventsToNotes } from "./performance.js";
import { writeMidi } from "../midiWrite.js";
import { renderPatchNotes } from "../instruments.js";

const setIn = (obj, path, val) => {
  const out = Array.isArray(obj) ? [...obj] : { ...obj };
  const [k, ...rest] = path;
  out[k] = rest.length ? setIn(obj[k] ?? {}, rest, val) : val;
  return out;
};
const MOD_LABEL = { lfo1: "LFO 1", lfo2: "LFO 2", env2: "Envelope 2", velocity: "Velocity", key: "Key (pitch)", pitch: "Pitch", cutoff: "Filter cutoff", level: "Level", wave: "Wavetable position", pan: "Pan", reso: "Resonance" };
const hzFmt = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`);

function Slider({ label, value, min, max, step = 0.01, onChange, fmt, log }) {
  const pos = log ? Math.log(value / min) / Math.log(max / min) : value;
  return (
    <label className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-2 text-[11px] text-white/70">
      <span className="truncate">{label}</span>
      <input type="range" className="w-full accent-cyan-400" aria-label={label} min={log ? 0 : min} max={log ? 1 : max} step={log ? 0.001 : step} value={pos}
             onChange={(e) => onChange(log ? min * (max / min) ** Number(e.target.value) : Number(e.target.value))} />
      <span className="text-right font-mono tabular-nums text-white/55">{fmt ? fmt(value) : Number(value).toFixed(step < 0.1 ? 2 : 0)}</span>
    </label>
  );
}
function Pick({ label, value, options, onChange, labels = {} }) {
  return (
    <label className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-[11px] text-white/70">
      <span>{label}</span>
      <select className="neon-input !w-full !py-0.5 text-xs" data-nomemo="true" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => <option key={o} value={o}>{labels[o] || o}</option>)}
      </select>
    </label>
  );
}
const Section = ({ title, hint, children }) => (
  <section className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-mcz-cyan">{title}{hint && <span className="ml-2 normal-case tracking-normal text-white/45">{hint}</span>}</h4>
    {children}
  </section>
);

const typing = (el) => !!el?.closest?.("input, select, textarea, [contenteditable=true]");

// Play it: an on-screen keyboard (touch and mouse, several keys at once), the computer's keys, and any MIDI keyboard.
// The sound is the patch as it is right now: move a slider while holding a chord and the chord changes. Nothing is
// recorded and nothing is charged; it is the same engine that renders a part, running live on this device.
function LivePlay({ patch, studio, name = "" }) {
  const [live, setLive] = useState(null);
  const [starting, setStarting] = useState(false);
  const [base, setBase] = useState(BASE_DEFAULT);
  const [down, setDown] = useState(() => new Set());
  const [midi, setMidi] = useState({ names: [], err: "" });
  const [err, setErr] = useState("");
  const ctxRef = useRef(null);
  const [pedal, setPedal] = useState(false);
  const [rec, setRec] = useState(null);                       // { notes, secs } while a take is running
  const [along, setAlong] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [note, setNote] = useState("");
  const [kept, setKept] = useState(null);                      // the last take as notes: { notes, bpm, from, patch, name }
  const take = useRef(null);                                  // { from, along, t0, events }
  const held = useRef(new Map());                         // pointerId or key -> pitch, so every release matches its press
  const supported = liveSupported();

  const mark = (pitch, on) => setDown((d) => { const n = new Set(d); if (on) n.add(pitch); else n.delete(pitch); return n; });
  // Seconds into the take: on the session's own clock when playing along (so the part lines up with what is heard), else wall time.
  const stamp = () => {
    const t = take.current; if (!t) return 0;
    if (t.along) { const p = studio?.position?.(); if (p != null) return Math.max(0, p - t.from); }
    return (performance.now() - t.t0) / 1000;
  };
  const record = (e) => { if (take.current) { take.current.events.push({ t: stamp(), ...e }); } };
  const on = (id, pitch, vel = 100) => { if (!live || held.current.has(id)) return; held.current.set(id, pitch); live.noteOn(pitch, vel); mark(pitch, true); record({ type: "on", pitch, vel }); };
  const off = (id) => { const p = held.current.get(id); if (p === undefined) return; held.current.delete(id); if (live) live.noteOff(p); if (![...held.current.values()].includes(p)) mark(p, false); record({ type: "off", pitch: p }); };
  const sustain = (v) => { if (!live) return; live.sustain(v); setPedal(v); record({ type: "sustain", on: v }); };
  const panic = () => { held.current.clear(); setDown(new Set()); setPedal(false); live?.panic(); };

  const startTake = async () => {
    if (!live || take.current) return;
    setNote(""); setErr(""); setKept(null);
    const withSession = along && studio?.hasAudio;
    take.current = { from: studio.playhead, along: withSession, t0: performance.now(), events: [] };
    setRec({ notes: 0, secs: 0 });
    if (withSession) { try { await studio.start(studio.playhead); take.current.t0 = performance.now(); } catch (e) { setErr(e.message); } }
  };
  const stopTake = async () => {
    const t = take.current; if (!t) return;
    const endT = stamp();
    take.current = null; setRec(null);
    if (t.along) studio.stop();
    const notes = eventsToNotes(t.events, studio.bpm, endT);
    if (!notes.length) { setNote("Nothing was played, so nothing was added."); return; }
    setPlacing(true);
    try {
      const buf = await renderPatchNotes(notes, patch, { bpm: studio.bpm, rate: studio.sampleRate() });
      const nm = `${(name || patch.name || "Synth").slice(0, 50)} (played)`;
      await studio.place(studio.toWav(buf), nm, t.from);
      setKept({ notes, bpm: studio.bpm, from: t.from, patch, name: nm });
      setNote(`Recorded ${notes.length} note${notes.length === 1 ? "" : "s"} onto a new track at ${Math.floor(t.from / 60)}:${String(Math.floor(t.from % 60)).padStart(2, "0")}. Open Edit to see it; Undo takes it off.`);
    } catch (e) { setErr(e.message); } finally { setPlacing(false); }
  };
  useEffect(() => {
    if (!rec) return undefined;
    const id = setInterval(() => setRec({ notes: take.current?.events.filter((e) => e.type === "on").length || 0, secs: Math.round(stamp()) }), 300);
    return () => clearInterval(id);
  }, [!!rec]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setErr(""); setStarting(true);
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = ctxRef.current || (ctxRef.current = new Ctx({ latencyHint: "interactive" }));
      setLive(await createLiveSynth(ctx, patch));
    } catch (e) { setErr(e.message); } finally { setStarting(false); }
  };
  const stop = () => { if (take.current) { take.current.events.length = 0; take.current = null; setRec(null); studio?.stop?.(); } panic(); live?.close(); setLive(null); };
  useEffect(() => () => { try { ctxRef.current?.close(); } catch { /* gone */ } }, []);
  useEffect(() => { live?.setPatch(patch); }, [patch, live]);       // moving a slider changes what is sounding

  // The computer keyboard. Captured before the DAW's own shortcuts see the key, and only for the keys the synth plays.
  useEffect(() => {
    if (!live) return undefined;
    const down$ = (e) => {
      if (typing(e.target)) return;
      const shift = OCTAVE_KEYS[String(e.key).toLowerCase()];
      if (shift !== undefined && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) setBase((b) => clampBase(b + shift)); return; }
      if (e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) sustain(true); return; }
      const p = pitchForKey(e, base);
      if (p === null) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) on(`k:${e.key.toLowerCase()}`, p);
    };
    const up$ = (e) => { if (e.key === " ") { sustain(false); return; } off(`k:${String(e.key).toLowerCase()}`); };
    window.addEventListener("keydown", down$, true); window.addEventListener("keyup", up$, true);
    window.addEventListener("blur", panic);
    return () => { window.removeEventListener("keydown", down$, true); window.removeEventListener("keyup", up$, true); window.removeEventListener("blur", panic); };
  }, [live, base]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectMidi = async () => {
    setMidi({ names: [], err: "" });
    if (!navigator.requestMIDIAccess) { setMidi({ names: [], err: "This browser can't read MIDI keyboards. Chrome and Edge can; Safari and Firefox need the keys below." }); return; }
    try {
      const access = await navigator.requestMIDIAccess();
      const bind = () => {
        const names = [];
        access.inputs.forEach((inp) => {
          names.push(inp.name || "MIDI input");
          inp.onmidimessage = (m) => {
            const d = parseMidi(m.data);
            if (!d) return;
            if (d.type === "on") on(`m:${d.pitch}`, d.pitch, d.vel); else if (d.type === "off") off(`m:${d.pitch}`); else if (d.type === "sustain") sustain(d.on); else panic();
          };
        });
        setMidi({ names, err: names.length ? "" : "No MIDI keyboard found. Plug one in and it will appear here." });
      };
      access.onstatechange = bind; bind();
    } catch (e) { setMidi({ names: [], err: e?.name === "SecurityError" ? "MIDI access was blocked. Allow it for this site in the browser's address bar." : `Couldn't open MIDI: ${e.message || e}` }); }
  };

  const { keys, whites } = layout(base, 25);
  const w = 100 / whites;
  return (
    <section className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-tour="daw-synth-live">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-mcz-cyan">Play it live</h4>
        {live
          ? <button type="button" className="re-btn !w-auto px-3 text-xs" onClick={stop}><Square size={12} /> Stop playing</button>
          : <button type="button" className="re-btn !w-auto px-3 text-xs" onClick={start} disabled={starting || !supported}>{starting ? <><Loader2 size={12} className="animate-spin" /> Starting…</> : "🎹 Start playing"}</button>}
        {live && (<>
          <span className="flex items-center gap-1 text-[11px] text-white/60">Octave
            <button type="button" className="pill !px-2 text-[11px]" onClick={() => setBase((b) => clampBase(b - 12))} aria-label="Octave down">−</button>
            <span className="w-8 text-center font-mono text-white/80">{noteName(base)}</span>
            <button type="button" className="pill !px-2 text-[11px]" onClick={() => setBase((b) => clampBase(b + 12))} aria-label="Octave up">+</button>
          </span>
          <button type="button" className="pill text-[11px]" onClick={connectMidi}>{midi.names.length ? `MIDI: ${midi.names.join(", ")}` : "Connect a MIDI keyboard"}</button>
        </>)}
      </div>
      {live && studio && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {rec
            ? <button type="button" className="re-btn !w-auto px-3 !border-mcz-ember !text-mcz-ember" onClick={stopTake}><Square size={12} /> Stop and put it on a track</button>
            : <button type="button" className="re-btn !w-auto px-3" onClick={startTake} disabled={placing || studio.busy}>{placing ? <><Loader2 size={12} className="animate-spin" /> Rendering…</> : "● Record what I play"}</button>}
          {rec && <span className="font-mono text-mcz-ember" role="status">● {Math.floor(rec.secs / 60)}:{String(rec.secs % 60).padStart(2, "0")} · {rec.notes} note{rec.notes === 1 ? "" : "s"}</span>}
          <label className={`flex items-center gap-1 ${studio.hasAudio ? "text-white/70" : "text-white/35"}`} title={studio.hasAudio ? "Plays the session from the playhead while you record, so you play along and the part lines up exactly" : "Add something to the session to play along with it"}>
            <input type="checkbox" checked={along && studio.hasAudio} disabled={!!rec || !studio.hasAudio} onChange={(e) => setAlong(e.target.checked)} /> Play the session along
          </label>
          <span className="text-white/50">Free. Lands on a new track at the playhead; Undo removes it.</span>
          <span className={pedal ? "text-mcz-cyan" : "text-white/35"}>Sustain: {pedal ? "down" : "up"}</span>
        </div>
      )}
      {note && <p className="text-xs text-emerald-300" role="status">{note}</p>}
      {kept && (
        <div className="flex flex-wrap items-center gap-2 text-xs" data-tour="daw-synth-kept">
          <span className="text-white/60">The take is also kept as notes:</span>
          {studio?.editNotes && <button type="button" className="re-btn !w-auto px-3" onClick={() => studio.editNotes(kept)}>Edit the notes (piano roll)</button>}
          <button type="button" className="re-btn !w-auto px-3" onClick={() => {
            const bytes = writeMidi({ bpm: kept.bpm, name: kept.name, parts: [{ name: kept.name, notes: kept.notes }] });
            const url = URL.createObjectURL(new Blob([bytes], { type: "audio/midi" }));
            const a = document.createElement("a"); a.href = url; a.download = `${kept.name.replace(/[^\w\- ]+/g, "").trim() || "take"}.mid`; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          }}>Download .mid</button>
          <span className="text-white/45">Free. Edit, then Send to put the fixed part on a track. Starts at the point you began recording.</span>
        </div>
      )}
      {!supported && <p className="text-xs text-mcz-gold">This browser can't run the live synth (it needs AudioWorklet). You can still build and hear patches with Hear it.</p>}
      {live && (
        <div className="relative h-28 select-none touch-none" role="group" aria-label="Piano keyboard">
          {keys.filter((k) => !k.black).map((k) => (
            <button key={k.pitch} type="button" tabIndex={-1} aria-label={noteName(k.pitch)}
                    className={`absolute top-0 h-full rounded-b-md border border-black/50 ${down.has(k.pitch) ? "bg-mcz-cyan" : "bg-white"} touch-none`} style={{ left: `${k.at * w}%`, width: `${w}%` }}
                    onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); on(`p:${e.pointerId}`, k.pitch); }}
                    onPointerUp={(e) => off(`p:${e.pointerId}`)} onPointerCancel={(e) => off(`p:${e.pointerId}`)}>
              {k.pitch % 12 === 0 && <span className="pointer-events-none absolute bottom-1 left-1 text-[9px] text-black/60">{noteName(k.pitch)}</span>}
            </button>
          ))}
          {keys.filter((k) => k.black).map((k) => (
            <button key={k.pitch} type="button" tabIndex={-1} aria-label={noteName(k.pitch)}
                    className={`absolute top-0 z-10 h-[60%] rounded-b-md border border-black ${down.has(k.pitch) ? "bg-mcz-cyan" : "bg-zinc-900"} touch-none`} style={{ left: `${k.at * w - w * 0.3}%`, width: `${w * 0.6}%` }}
                    onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); on(`p:${e.pointerId}`, k.pitch); }}
                    onPointerUp={(e) => off(`p:${e.pointerId}`)} onPointerCancel={(e) => off(`p:${e.pointerId}`)} />
          ))}
        </div>
      )}
      <p className="text-[11px] text-white/50">
        {live ? "Computer keys: A S D F G H J K are the white keys, W E T Y U O P the black ones; Z and X move the octave; hold Space for the sustain pedal. A MIDI keyboard plays the same sound, pedal included. Recording renders the part with the patch as it is when you stop. Move any slider while you hold a chord and it changes under your fingers."
          : "Plays the patch below in real time: click or touch the keys, use your computer keyboard, or plug in a MIDI keyboard. It runs on this device and is free."}
      </p>
      {midi.err && <p className="text-xs text-mcz-gold">{midi.err}</p>}
      {err && <p className="text-xs text-mcz-ember" role="alert">{err}</p>}
    </section>
  );
}

export default function SynthEditor({ studio = null }) {
  const tones = useTonePresets();
  const mine = useMemo(() => (tones.state?.presets || []).filter((p) => p.kind === "synth"), [tones.state]);
  useEffect(() => { if (tones.state) setUserPatches(tones.state.presets); }, [tones.state]);
  const [patch, setPatch] = useState(() => presetPatch("ether"));
  const [editing, setEditing] = useState(null);               // id of the saved patch being edited, else null
  const [name, setName] = useState("My patch");
  const [phrase, setPhrase] = useState("mid");
  const [busy, setBusy] = useState("");
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const live = useRef(null);
  const ticket = useRef(0);
  useEffect(() => () => { try { live.current?.ctx?.close(); } catch { /* gone */ } }, []);

  const set = (path, val) => setPatch((p) => cleanPatch(setIn(p, path, val)));
  const room = presetRoom(tones.state, "synth");

  const load = (p, id = null, nm) => { setPatch(cleanPatch(p)); setEditing(id); setName(nm || p.name || "My patch"); setMsg(""); setErr(""); };
  const stop = () => { ticket.current += 1; try { live.current?.src?.stop(); } catch { /* ended */ } setPlaying(false); };
  const audition = async () => {
    stop(); setErr("");
    const mine = (ticket.current += 1);
    setBusy("Rendering…");
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error("This browser can't play audio.");
      const l = live.current || (live.current = { ctx: new Ctx() });
      if (l.ctx.state !== "running") await l.ctx.resume();
      const ph = PHRASES[phrase];
      const out = await renderSynth(ph.notes, patch, { bpm: ph.bpm, rate: l.ctx.sampleRate, tick: () => new Promise((r) => setTimeout(r, 0)) });
      if (mine !== ticket.current) return;
      const buf = l.ctx.createBuffer(2, out.length, out.rate);
      buf.copyToChannel(out.left, 0); buf.copyToChannel(out.right, 1);
      const src = l.ctx.createBufferSource(); src.buffer = buf; src.connect(l.ctx.destination);
      src.onended = () => setPlaying(false);
      src.start(); l.src = src; setPlaying(true);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const save = async (asNew) => {
    setErr(""); setMsg("");
    try {
      const nm = (name || "My patch").slice(0, 60);
      const saved = await tones.save(nm, { ...patch, name: nm }, asNew ? undefined : editing || undefined, "synth");
      setEditing(saved?.id ?? null);
      setMsg(`Saved "${nm}". It is in the MIDI window's instrument list now, on every device.`);
    } catch (e) { setErr(e.message); }
  };
  const del = async () => {
    if (editing == null) return;
    try { await tones.remove(editing); setEditing(null); setMsg("Deleted."); } catch (e) { setErr(e.message); }
  };

  const o = patch.oscs;
  return (
    <div className="space-y-3" data-tour="daw-synth">
      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label className="space-y-0.5 text-white/70">Start from
          <select className="neon-input !w-auto !py-1" data-nomemo="true" value="" aria-label="Start from a patch"
                  onChange={(e) => { const v = e.target.value; if (!v) return; if (v.startsWith("mine:")) { const p = mine.find((x) => String(x.id) === v.slice(5)); if (p) load(p.chain, p.id, p.name); } else load(presetPatch(v)); }}>
            <option value="">Pick a patch…</option>
            <optgroup label="Built in">{PRESET_IDS.map((id) => <option key={id} value={id}>{PRESETS[id].name}</option>)}</optgroup>
            {mine.length > 0 && <optgroup label="Mine">{mine.map((p) => <option key={p.id} value={`mine:${p.id}`}>{p.name}</option>)}</optgroup>}
          </select>
        </label>
        <label className="space-y-0.5 text-white/70">Name
          <input className="neon-input !w-44 !py-1" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Patch name" />
        </label>
        <label className="space-y-0.5 text-white/70">Hear it as
          <select className="neon-input !w-auto !py-1" data-nomemo="true" value={phrase} onChange={(e) => setPhrase(e.target.value)} aria-label="Audition phrase">
            {PHRASE_KEYS.map((k) => <option key={k} value={k}>{PHRASES[k].label}</option>)}
          </select>
        </label>
        {playing
          ? <button type="button" className="re-btn !w-auto px-3" onClick={stop}><Square size={13} /> Stop</button>
          : <button type="button" className="re-btn !w-auto px-3" onClick={audition} disabled={!!busy}>{busy ? <><Loader2 size={13} className="animate-spin" /> {busy}</> : <><Play size={13} /> Hear it</>}</button>}
      </div>

      <LivePlay patch={patch} studio={studio} name={name} />

      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Section key={i} title={`Oscillator ${i + 1}`} hint={i === 1 ? "level 0 = off" : ""}>
            <Pick label="Shape" value={o[i].shape} options={OSC_SHAPES} onChange={(v) => set(["oscs", i, "shape"], v)} />
            {o[i].shape === "wavetable" && <Slider label="Wave" value={o[i].wave} min={0} max={1} onChange={(v) => set(["oscs", i, "wave"], v)} fmt={(v) => FRAME_NAMES[Math.round(v * (FRAME_NAMES.length - 1))]} />}
            <Slider label="Level" value={o[i].level} min={0} max={1} onChange={(v) => set(["oscs", i, "level"], v)} />
            <Slider label="Octave/semi" value={o[i].coarse} min={-48} max={48} step={1} onChange={(v) => set(["oscs", i, "coarse"], v)} fmt={(v) => `${v > 0 ? "+" : ""}${v} st`} />
            <Slider label="Fine" value={o[i].fine} min={-100} max={100} step={1} onChange={(v) => set(["oscs", i, "fine"], v)} fmt={(v) => `${v} ct`} />
            <Slider label="Unison" value={o[i].unison} min={1} max={7} step={1} onChange={(v) => set(["oscs", i, "unison"], v)} fmt={(v) => `${v} voice${v === 1 ? "" : "s"}`} />
            <Slider label="Detune" value={o[i].detune} min={0} max={100} step={1} onChange={(v) => set(["oscs", i, "detune"], v)} fmt={(v) => `${Math.round(v)} ct`} />
            <Slider label="Stereo spread" value={o[i].spread} min={0} max={1} onChange={(v) => set(["oscs", i, "spread"], v)} />
          </Section>
        ))}
        <Section title="Sub & noise">
          <Slider label="Sub level" value={patch.sub.level} min={0} max={1} onChange={(v) => set(["sub", "level"], v)} />
          <Pick label="Sub octave" value={String(patch.sub.octave)} options={["-1", "-2"]} labels={{ "-1": "1 down", "-2": "2 down" }} onChange={(v) => set(["sub", "octave"], Number(v))} />
          <Slider label="Noise" value={patch.noise} min={0} max={1} onChange={(v) => set(["noise"], v)} />
        </Section>
        <Section title="Filter">
          <Pick label="Type" value={patch.filter.type} options={FILTER_TYPES} labels={{ lp: "Low-pass", hp: "High-pass", bp: "Band-pass", notch: "Notch" }} onChange={(v) => set(["filter", "type"], v)} />
          <Slider label="Cutoff" value={patch.filter.cutoff} min={20} max={20000} log fmt={hzFmt} onChange={(v) => set(["filter", "cutoff"], v)} />
          <Slider label="Resonance" value={patch.filter.reso} min={0} max={1} onChange={(v) => set(["filter", "reso"], v)} />
          <Slider label="Drive" value={patch.filter.drive} min={0} max={1} onChange={(v) => set(["filter", "drive"], v)} />
          <Slider label="Key tracking" value={patch.filter.keytrack} min={0} max={1} onChange={(v) => set(["filter", "keytrack"], v)} />
          <Slider label="Env 2 amount" value={patch.filter.env} min={-1} max={1} onChange={(v) => set(["filter", "env"], v)} />
        </Section>
        {[["amp", "Amp envelope"], ["env2", "Envelope 2"]].map(([k, title]) => (
          <Section key={k} title={title} hint={k === "env2" ? "drives the filter and any modulation using it" : ""}>
            <Slider label="Attack" value={patch[k].a} min={0} max={5} onChange={(v) => set([k, "a"], v)} fmt={(v) => `${v.toFixed(2)} s`} />
            <Slider label="Decay" value={patch[k].d} min={0.001} max={5} onChange={(v) => set([k, "d"], v)} fmt={(v) => `${v.toFixed(2)} s`} />
            <Slider label="Sustain" value={patch[k].s} min={0} max={1} onChange={(v) => set([k, "s"], v)} />
            <Slider label="Release" value={patch[k].r} min={0.001} max={8} onChange={(v) => set([k, "r"], v)} fmt={(v) => `${v.toFixed(2)} s`} />
          </Section>
        ))}
        {["lfo1", "lfo2"].map((k, i) => (
          <Section key={k} title={`LFO ${i + 1}`} hint="route it in the matrix below">
            <Pick label="Shape" value={patch[k].shape} options={LFO_SHAPES} labels={{ random: "Sample & hold" }} onChange={(v) => set([k, "shape"], v)} />
            <Slider label="Rate" value={patch[k].rate} min={0.05} max={30} log fmt={(v) => `${v.toFixed(2)} Hz`} onChange={(v) => set([k, "rate"], v)} />
            <label className="flex items-center gap-2 text-[11px] text-white/70"><input type="checkbox" checked={patch[k].retrig} onChange={(e) => set([k, "retrig"], e.target.checked)} /> Restart on every note</label>
          </Section>
        ))}
      </div>

      <Section title="Modulation matrix" hint={`${patch.mods.length} of ${MAX_MODS} routes`}>
        {patch.mods.map((m, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:grid-cols-[8rem_auto_9rem_1fr_auto]">
            <select className="neon-input !py-0.5 text-xs" data-nomemo="true" value={m.src} aria-label="Source" onChange={(e) => set(["mods", i, "src"], e.target.value)}>{MOD_SOURCES.map((x) => <option key={x} value={x}>{MOD_LABEL[x]}</option>)}</select>
            <span className="text-white/40">→</span>
            <select className="neon-input !py-0.5 text-xs" data-nomemo="true" value={m.dst} aria-label="Destination" onChange={(e) => set(["mods", i, "dst"], e.target.value)}>{MOD_DESTS.map((x) => <option key={x} value={x}>{MOD_LABEL[x]}</option>)}</select>
            <input type="range" min={-1} max={1} step={0.01} value={m.amount} aria-label="Amount" className="col-span-2 w-full accent-cyan-400 sm:col-span-1" onChange={(e) => set(["mods", i, "amount"], Number(e.target.value))} />
            <button type="button" className="text-white/50 hover:text-mcz-ember" aria-label="Remove route" onClick={() => setPatch((p) => cleanPatch({ ...p, mods: p.mods.filter((_, k) => k !== i) }))}><Trash2 size={13} /></button>
          </div>
        ))}
        <button type="button" className="pill text-[11px]" disabled={patch.mods.length >= MAX_MODS}
                onClick={() => setPatch((p) => cleanPatch({ ...p, mods: [...p.mods, { src: "lfo1", dst: "cutoff", amount: 0.3 }] }))}><Plus size={11} className="mr-1 inline" /> Add a route</button>
        <p className="text-[10px] text-white/45">Amount: cutoff ±5 octaves, pitch ±12 semitones, the rest ±100%. Negative flips the direction.</p>
      </Section>

      <Section title="Effects" hint="in this order: drive → chorus → delay → reverb">
        <div className="grid gap-x-6 gap-y-1.5 md:grid-cols-2">
          <Slider label="Drive" value={patch.fx.drive} min={0} max={1} onChange={(v) => set(["fx", "drive"], v)} />
          <Slider label="Chorus mix" value={patch.fx.chorus.mix} min={0} max={1} onChange={(v) => set(["fx", "chorus", "mix"], v)} />
          <Slider label="Chorus rate" value={patch.fx.chorus.rate} min={0.05} max={5} onChange={(v) => set(["fx", "chorus", "rate"], v)} fmt={(v) => `${v.toFixed(2)} Hz`} />
          <Slider label="Chorus depth" value={patch.fx.chorus.depth} min={0} max={1} onChange={(v) => set(["fx", "chorus", "depth"], v)} />
          <Slider label="Delay mix" value={patch.fx.delay.mix} min={0} max={1} onChange={(v) => set(["fx", "delay", "mix"], v)} />
          <Slider label="Delay time" value={patch.fx.delay.time} min={0.02} max={1.5} onChange={(v) => set(["fx", "delay", "time"], v)} fmt={(v) => `${Math.round(v * 1000)} ms`} />
          <Slider label="Feedback" value={patch.fx.delay.feedback} min={0} max={0.85} onChange={(v) => set(["fx", "delay", "feedback"], v)} />
          <Slider label="Reverb mix" value={patch.fx.reverb.mix} min={0} max={1} onChange={(v) => set(["fx", "reverb", "mix"], v)} />
          <Slider label="Reverb size" value={patch.fx.reverb.size} min={0} max={1} onChange={(v) => set(["fx", "reverb", "size"], v)} />
          <Slider label="Master gain" value={patch.gain} min={0} max={1.5} onChange={(v) => set(["gain"], v)} />
          <Slider label="Max voices" value={patch.voices} min={1} max={32} step={1} onChange={(v) => set(["voices"], v)} />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" className="re-btn !w-auto px-3" disabled={!room.ok && editing == null} onClick={() => save(false)}><Save size={13} /> {editing != null ? "Update this patch" : "Save as my patch"}</button>
        {editing != null && <button type="button" className="re-btn !w-auto px-3" disabled={!room.ok} onClick={() => save(true)}>Save as a new one</button>}
        {editing != null && <button type="button" className="re-btn !w-auto px-3 !text-mcz-ember" onClick={del}><Trash2 size={13} /> Delete</button>}
        <span className="text-white/60">{room.line || "Saving is free"}{!room.ok && editing == null ? " — update or delete one to make room" : ""}</span>
      </div>
      {tones.failed && <p className="text-xs text-mcz-gold">Your saved patches couldn't be loaded, so saving is off for now. The editor and the built-in patches still work.</p>}
      {msg && <p className="text-xs text-emerald-300" role="status">{msg}</p>}
      {err && <p className="text-xs text-mcz-ember" role="alert">{err}</p>}
      <p className="text-[11px] text-white/50">Nothing here is charged or sent anywhere but your saved patches. The sound is rendered on this device. Pick it for a part in the MIDI window, or hear it in Instrumental ConnectZ's Open in Arsenal.</p>
    </div>
  );
}
