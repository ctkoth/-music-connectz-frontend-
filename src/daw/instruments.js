// The DAW's built-in instruments: what a MIDI part plays through. Every sound is synthesised on
// the member's device (Web Audio), so an instrument is no download and no plugin. The list is in
// LADDER ORDER — a tier may use the first N (Corey's numbers, Free 3, Premium 6, StatZ all), so the
// everyday ones come first. The model (list, General MIDI mapping) is pure and tested; the synth
// needs an OfflineAudioContext, so `renderNotes` only runs in a browser.

export const INSTRUMENTS = [
  ["piano", "Piano"], ["bass", "Bass"], ["drums", "Drum kit"],
  ["epiano", "Electric piano"], ["strings", "Strings"], ["lead", "Synth lead"],
  ["pad", "Warm pad"], ["organ", "Organ"], ["pluck", "Pluck"], ["bell", "Bell"],
  ["brass", "Brass"], ["sub808", "808"],
];
import { PRESETS, PRESET_IDS, presetPatch } from "./synth/patch.js";
import { renderSynth } from "./synth/engine.js";
import { isUserSound, userPatch } from "./synth/userPatches.js";

// The synth engine's patches, after the original twelve, so the tier ladder (the first N) never moves what a member
// already had: Free 3 and Premium 6 are unchanged, StatZ's "all" now includes these.
const SYNTHS = PRESET_IDS.map((id) => [`synth:${id}`, `🎛️ ${PRESETS[id].name} (synth)`]);
INSTRUMENTS.push(...SYNTHS);
const KEYS = new Set(INSTRUMENTS.map(([k]) => k));

/** Pick a sensible instrument for a MIDI track from its General MIDI program (0-127). */
export function instrumentFor(track) {
  if (track.drums) return "drums";
  const p = track.program | 0;
  if (p < 4) return "piano";
  if (p < 8) return "epiano";
  if (p < 16) return "bell";
  if (p < 24) return "organ";
  if (p < 32) return "pluck";          // guitars
  if (p < 40) return "bass";
  if (p < 52) return "strings";
  if (p < 56) return "pad";            // choir
  if (p < 64) return "brass";
  if (p < 80) return "lead";           // reeds, pipes
  if (p < 88) return "lead";
  if (p < 96) return "pad";
  return "bell";
}
export const cleanInstrument = (k) => (KEYS.has(k) ? k : "piano");

const hz = (n) => 440 * 2 ** ((n - 69) / 12);

function noise(ctx, secs) {
  const b = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * secs)), ctx.sampleRate);
  const d = b.getChannelData(0);
  let x = 12345;
  for (let i = 0; i < d.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; d[i] = (x / 0x3fffffff) - 1; }
  const s = ctx.createBufferSource(); s.buffer = b; return s;
}

// General MIDI drum map → a synthesised hit.
function drumHit(ctx, out, pitch, t, vel) {
  const g = ctx.createGain(); g.connect(out);
  if (pitch === 35 || pitch === 36) {            // kick
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); o.start(t); o.stop(t + 0.4); return;
  }
  const n = noise(ctx, 0.5), f = ctx.createBiquadFilter();
  const closed = [42, 44].includes(pitch), open = pitch === 46, cym = pitch >= 49 && pitch <= 59;
  const snare = [37, 38, 39, 40].includes(pitch);
  f.type = snare ? "bandpass" : "highpass"; f.frequency.value = snare ? 1800 : 7000;
  const len = closed ? 0.05 : open ? 0.3 : cym ? 0.9 : snare ? 0.18 : 0.12;
  g.gain.setValueAtTime(vel * (snare ? 0.8 : 0.4), t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  n.connect(f); f.connect(g); n.start(t); n.stop(t + len + 0.05);
  if (pitch >= 41 && pitch <= 50 && !closed && !open && !cym) {   // toms get a body
    const o = ctx.createOscillator(); const og = ctx.createGain(); og.connect(out);
    o.frequency.setValueAtTime(80 + (pitch - 41) * 18, t); og.gain.setValueAtTime(vel * 0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(og); o.start(t); o.stop(t + 0.35);
  }
}

// Each voice: oscillators, a filter and an envelope. attack/release in seconds.
const VOICE = {
  piano: { osc: [["triangle", 1, 0], ["sine", 2, 0.25]], attack: 0.005, decay: 1.2, sustain: 0.0, release: 0.3, cutoff: 5000 },
  bass: { osc: [["sawtooth", 1, 0], ["sine", 0.5, 0.6]], attack: 0.005, decay: 0.3, sustain: 0.6, release: 0.08, cutoff: 900 },
  epiano: { osc: [["sine", 1, 0], ["sine", 4, 0.15]], attack: 0.005, decay: 1.5, sustain: 0.1, release: 0.4, cutoff: 6000 },
  strings: { osc: [["sawtooth", 1, 0], ["sawtooth", 1.006, 0]], attack: 0.25, decay: 0.2, sustain: 0.8, release: 0.6, cutoff: 3000 },
  lead: { osc: [["square", 1, 0], ["sawtooth", 1.003, 0]], attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.15, cutoff: 4000 },
  pad: { osc: [["triangle", 1, 0], ["sawtooth", 0.5, 0.3], ["triangle", 1.008, 0]], attack: 0.6, decay: 0.4, sustain: 0.8, release: 1.2, cutoff: 1800 },
  organ: { osc: [["sine", 1, 0], ["sine", 2, 0.5], ["sine", 3, 0.3], ["sine", 4, 0.2]], attack: 0.01, decay: 0, sustain: 1, release: 0.05, cutoff: 8000 },
  pluck: { osc: [["sawtooth", 1, 0]], attack: 0.002, decay: 0.35, sustain: 0, release: 0.1, cutoff: 2500 },
  bell: { osc: [["sine", 1, 0], ["sine", 2.76, 0.5], ["sine", 5.4, 0.25]], attack: 0.002, decay: 2, sustain: 0, release: 0.8, cutoff: 9000 },
  brass: { osc: [["sawtooth", 1, 0], ["sawtooth", 2, 0.25]], attack: 0.06, decay: 0.2, sustain: 0.75, release: 0.15, cutoff: 2200 },
  sub808: { osc: [["sine", 1, 0]], attack: 0.003, decay: 1.4, sustain: 0.2, release: 0.3, cutoff: 400, glideFrom: 1.5 },
};

function note(ctx, out, inst, pitch, t, len, vel) {
  const v = VOICE[inst] || VOICE.piano;
  const g = ctx.createGain(), f = ctx.createBiquadFilter();
  f.type = "lowpass"; f.frequency.value = v.cutoff;
  g.connect(out); f.connect(g);
  const peak = vel * 0.35, end = t + len;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + v.attack);
  const sus = Math.max(0.0001, peak * v.sustain);
  if (v.decay) g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + v.attack + v.decay);
  g.gain.setValueAtTime(Math.max(sus, 0.0001), Math.max(end, t + v.attack + 0.001));
  g.gain.exponentialRampToValueAtTime(0.0001, end + v.release);
  for (const [type, mult, level] of v.osc) {
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.type = type;
    const base = hz(pitch) * mult;
    if (v.glideFrom) { o.frequency.setValueAtTime(base * v.glideFrom, t); o.frequency.exponentialRampToValueAtTime(base, t + 0.06); }
    else o.frequency.value = base;
    og.gain.value = level || 0.6;
    o.connect(og); og.connect(f); o.start(t); o.stop(end + v.release + 0.05);
  }
}

/**
 * Render one MIDI part through an instrument to an AudioBuffer: notes are [pitch, startBeat,
 * lengthBeats, velocity], played at `bpm`. Stereo, at the DAW's sample rate.
 */
export async function renderNotes(notes, instrument, { bpm, rate = 44100 }) {
  const Off = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Off) throw new Error("This browser can't render audio.");
  const spb = 60 / bpm;
  const lastEnd = notes.reduce((m, n) => Math.max(m, (n[1] + n[2]) * spb), 0);
  const ctx = new Off(2, Math.ceil((lastEnd + 2.5) * rate), rate);
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
  const inst = isUserSound(instrument) && userPatch(instrument) ? instrument : cleanInstrument(instrument);
  if (inst.startsWith("synth:")) {
    const patch = isUserSound(inst) ? userPatch(inst) : presetPatch(inst.slice(6));
    const out = await renderSynth(notes, patch, { bpm, rate, tick: () => new Promise((r) => setTimeout(r, 0)) });
    const buf = new Off(2, 1, rate).createBuffer(2, out.length, rate);
    buf.copyToChannel(out.left, 0); buf.copyToChannel(out.right, 1);
    return buf;
  }
  for (const [pitch, start, length, vel] of notes) {
    const t = start * spb, v = Math.max(0.05, vel / 127);
    if (inst === "drums") drumHit(ctx, master, pitch, t, v);
    else note(ctx, master, inst, pitch, t, Math.max(0.05, length * spb), v);
  }
  return ctx.startRendering();
}
