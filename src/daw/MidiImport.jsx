// The MIDI window — in every DAW (Arsenal, Fruity Möbius, FormulaWon, Intuition…), because they
// share one engine. Open a .mid (from the device, or handed over from Instrumental ConnectZ) or start
// a new part, draw and edit notes in the piano roll, pick
// an instrument for each part, hear it, and send every part to its own track as audio.
//
// Free and on the device. The instruments ladder by Corey's numbers (Free 3, Premium 6, StatZ all —
// the served `imagez_layers`), and a part opens on a fitting one from its General MIDI program.
import { useEffect, useRef, useState } from "react";
import { FileUp, Play, Send, Square } from "lucide-react";
import { parseMidi, beatsOf } from "./midi.js";
import PianoRoll from "./PianoRoll.jsx";
import { INSTRUMENTS, instrumentFor, renderNotes } from "./instruments.js";
import { loadLimits, TIER_LABEL } from "../limits.js";
import { goToSpot } from "../goto.js";

export default function MidiImport({ daw, bpm, busy: working, initial, onSend, onBpm }) {
  const [file, setFile] = useState(null);       // { name, bpm, tracks, cut }
  const [pick, setPick] = useState({});          // track index -> instrument
  const [on, setOn] = useState({});              // track index -> included
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [lim, setLim] = useState(null);
  const [rollOf, setRollOf] = useState(null);     // index of the part open in the piano roll
  const live = useRef(null);
  useEffect(() => { loadLimits().then(setLim).catch(() => {}); }, []);
  const cap = lim && "imagez_layers" in lim ? lim.imagez_layers : null;
  const ok = new Set((cap == null ? INSTRUMENTS : INSTRUMENTS.slice(0, cap)).map(([k]) => k));
  const allowed = (k) => (ok.has(k) ? k : INSTRUMENTS[0][0]);

  const open = async (name, bytes) => {
    setErr("");
    try {
      const m = parseMidi(bytes);
      setFile({ name, ...m });
      setPick(Object.fromEntries(m.tracks.map((t, i) => [i, instrumentFor(t)])));
      setOn(Object.fromEntries(m.tracks.map((_, i) => [i, true])));
    } catch (e) { setErr(e.message); setFile(null); }
  };
  useEffect(() => {
    if (!initial?.url) return;
    fetch(initial.url).then((r) => r.arrayBuffer()).then((b) => open(initial.name || "Imported.mid", b)).catch(() => setErr("That MIDI file couldn't be read."));
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new, empty part to draw in — the start of a melody with no file at all.
  const newPart = () => {
    const base = file || { name: "New parts", bpm, tracks: [], cut: false };
    const i = base.tracks.length;
    setFile({ ...base, tracks: [...base.tracks, { name: `Part ${i + 1}`, channel: 0, program: 0, drums: false, notes: [] }] });
    setPick((x) => ({ ...x, [i]: "piano" }));
    setOn((x) => ({ ...x, [i]: true }));
    setRollOf(i);
  };
  const setNotes = (i, notes) => setFile((f) => ({ ...f, tracks: f.tracks.map((t, k) => (k === i ? { ...t, notes } : t)) }));

  const stop = () => { try { live.current?.src?.stop(); } catch { /* ended */ } setPlaying(null); };
  useEffect(() => () => { stop(); live.current?.ctx?.close().catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const hear = async (i) => {
    stop(); setErr("");
    try {
      const l = live.current || (live.current = { ctx: new (window.AudioContext || window.webkitAudioContext)() });
      if (l.ctx.state !== "running") await l.ctx.resume();
      const t = file.tracks[i];
      const buf = await renderNotes(t.notes.filter((n) => n[1] < 32), allowed(pick[i]), { bpm, rate: l.ctx.sampleRate });
      const src = l.ctx.createBufferSource(); src.buffer = buf; src.connect(l.ctx.destination); src.start();
      src.onended = () => setPlaying((p) => (p === i ? null : p));
      l.src = src; setPlaying(i);
    } catch (e) { setErr(e.message); }
  };
  const send = async () => {
    setSending(true); setErr("");
    try {
      let n = 0;
      for (const [i, t] of file.tracks.entries()) {
        if (!on[i] || !t.notes.length) continue;
        const inst = allowed(pick[i]);
        const buf = await renderNotes(t.notes, inst, { bpm, rate: daw.sampleRate() });
        await onSend(daw.toWav(buf, 24), `${t.name} · ${INSTRUMENTS.find(([k]) => k === inst)[1]}.wav`);
        n++;
      }
      if (!n) setErr("Tick at least one part.");
    } catch (e) { setErr(e.message || "Couldn't render the parts."); } finally { setSending(false); }
  };

  return (
    <div className="neon-frame space-y-3 p-4" data-tour="daw-midi">
      <div className="flex flex-wrap items-center gap-2">
        <label className="neon-btn-primary !w-auto cursor-pointer px-4"><FileUp size={14} /> Open a MIDI file
          <input type="file" accept=".mid,.midi,audio/midi,audio/x-midi" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) open(f.name, await f.arrayBuffer()); }} />
        </label>
        <button className="re-btn !w-auto px-4" onClick={newPart}>+ New part — draw notes</button>
        <span className="text-xs text-white/55">Free · every part becomes its own audio track, played by the instrument you pick, at this session&apos;s {bpm} BPM.</span>
      </div>
      {file && <>
        <p className="text-sm"><span className="font-semibold">{file.name}</span> <span className="text-white/50">· {file.tracks.length} part{file.tracks.length === 1 ? "" : "s"} · written at {file.bpm} BPM</span>
          {file.bpm !== bpm && onBpm && <button className="re-link ml-2 text-xs" onClick={() => onBpm(file.bpm)}>Use {file.bpm} BPM</button>}</p>
        {file.cut && <p className="text-xs text-mcz-gold">This file has more notes than a tab can hold; the extra were left out.</p>}
        <div className="space-y-1.5">
          {file.tracks.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-xs">
              <input type="checkbox" checked={!!on[i]} onChange={(e) => setOn({ ...on, [i]: e.target.checked })} aria-label={`Include ${t.name}`} />
              <input className="w-28 rounded bg-black/30 px-1" value={t.name} aria-label="Part name"
                onChange={(e) => setFile((f) => ({ ...f, tracks: f.tracks.map((x, k) => (k === i ? { ...x, name: e.target.value.slice(0, 40) } : x)) }))} />
              <span className="text-white/40">{t.notes.length} notes · {Math.ceil(beatsOf(t.notes) / 4)} bars{t.drums ? " · drums" : ""}</span>
              <select className="neon-input !w-auto !py-1 text-xs" data-nomemo="true" value={pick[i]} onChange={(e) => setPick({ ...pick, [i]: e.target.value })}>
                {INSTRUMENTS.map(([k, label]) => <option key={k} value={k} disabled={!ok.has(k)}>{label}{ok.has(k) ? "" : " — upgrade"}</option>)}
              </select>
              {!ok.has(pick[i]) && <span className="text-mcz-gold">plays as {INSTRUMENTS[0][1]} on {TIER_LABEL[lim?.tier] || "your tier"}</span>}
              <button className="re-btn !w-auto px-2" onClick={() => setRollOf(rollOf === i ? null : i)}>{rollOf === i ? "Close notes" : "Edit notes"}</button>
              {playing === i
                ? <button className="re-btn !w-auto px-2" onClick={stop}><Square size={12} /> Stop</button>
                : <button className="re-btn !w-auto px-2" onClick={() => hear(i)} title="Hear the first 8 bars"><Play size={12} /> Hear</button>}
            </div>
          ))}
        </div>
        {rollOf != null && file.tracks[rollOf] && (
          <PianoRoll key={rollOf} part={file.tracks[rollOf]} onChange={(n) => setNotes(rollOf, n)} onClose={() => setRollOf(null)} />
        )}
        {cap != null && cap < INSTRUMENTS.length && (
          <p className="text-[11px] text-white/45">{cap} of {INSTRUMENTS.length} instruments on {TIER_LABEL[lim?.tier] || "your tier"}.{" "}
            <button className="re-link" onClick={() => goToSpot("membershipz", "")}>Premium has 6; StatZ has all</button></p>
        )}
        <button className="neon-btn-primary !w-auto px-4" disabled={sending || !!working} onClick={send}><Send size={14} /> {sending ? "Rendering…" : "Send the parts to tracks"}</button>
      </>}
      {!file && !err && <p className="text-xs text-white/45">A .mid from any DAW or from Instrumental ConnectZ. The sounds are this app&apos;s own instruments, made on your device — outside plugins (VST) can&apos;t run in a browser.</p>}
      {err && <p className="text-xs text-mcz-ember">{err}</p>}
    </div>
  );
}
