// The Channel Rack — Fruity Möbius's pattern step sequencer.
//
// A rack is patterns; a pattern is channels; a channel is one built-in voice and
// sixteen steps. Nothing here is a sample pack or a plugin: every sound is
// synthesised on the member's device, so a beat costs no download and no
// storage until they send it to the Playlist.
//
// The model (everything above `renderPattern`) is pure and tested. The synth
// needs an OfflineAudioContext, so it only runs in a browser.

export const STEPS = 16;
export const MAX_CHANNELS = 12;
export const MAX_PATTERNS = 8;

// `pitched` voices take a note; the rest ignore it.
export const VOICES = {
  kick: { label: "Kick" },
  snare: { label: "Snare" },
  clap: { label: "Clap" },
  hat: { label: "Closed hat" },
  openhat: { label: "Open hat" },
  bass808: { label: "808 bass", pitched: true },
  pluck: { label: "Pluck", pitched: true },
};

// MIDI notes offered for pitched voices: two octaves, C1–B2 for the 808 range upward.
export const NOTES = Array.from({ length: 37 }, (_, i) => 24 + i);
const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const noteName = (n) => `${NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
export const noteHz = (n) => 440 * 2 ** ((n - 69) / 12);

let seq = 0;
const cid = () => `ch${Date.now().toString(36)}${(seq++).toString(36)}`;
const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

export function newChannel(voice = "kick", steps = []) {
  const v = VOICES[voice] ? voice : "kick";
  return {
    id: cid(), voice: v, vol: 0.8, note: v === "bass808" ? 36 : 60,
    steps: Array.from({ length: STEPS }, (_, i) => !!steps[i]),
  };
}

const on = (...idx) => Array.from({ length: STEPS }, (_, i) => idx.includes(i));

export function newPattern(name = "Pattern 1", { starter = false } = {}) {
  return {
    name,
    channels: starter
      // Something that already sounds like a beat: an empty grid teaches nobody what the grid is.
      ? [newChannel("kick", on(0, 6, 8)), newChannel("snare", on(4, 12)),
         newChannel("hat", on(0, 2, 4, 6, 8, 10, 12, 14)), newChannel("bass808", on(0, 6))]
      : [newChannel("kick"), newChannel("snare"), newChannel("hat"), newChannel("bass808")],
  };
}

export const newRack = () => ({ patterns: [newPattern("Pattern 1", { starter: true })], current: 0, swing: 0 });

/** Whatever was stored, as a rack that cannot break the screen. */
export function cleanRack(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.patterns) || !raw.patterns.length) return newRack();
  const patterns = raw.patterns.slice(0, MAX_PATTERNS).map((p, i) => ({
    name: String(p?.name || `Pattern ${i + 1}`).slice(0, 30),
    channels: (Array.isArray(p?.channels) ? p.channels : []).slice(0, MAX_CHANNELS).map((c) => ({
      id: typeof c?.id === "string" && c.id ? c.id : cid(),
      voice: VOICES[c?.voice] ? c.voice : "kick",
      vol: clamp(c?.vol, 0, 1, 0.8),
      note: Math.round(clamp(c?.note, NOTES[0], NOTES.at(-1), 60)),
      steps: Array.from({ length: STEPS }, (_, s) => !!c?.steps?.[s]),
    })),
  }));
  return { patterns, current: Math.round(clamp(raw.current, 0, patterns.length - 1, 0)), swing: clamp(raw.swing, 0, 0.6, 0) };
}

export const currentPattern = (rack) => rack.patterns[rack.current] || rack.patterns[0];

const withPattern = (rack, fn) => ({
  ...rack, patterns: rack.patterns.map((p, i) => (i === rack.current ? fn(p) : p)),
});
const withChannel = (rack, id, fn) => withPattern(rack, (p) => ({
  ...p, channels: p.channels.map((c) => (c.id === id ? fn(c) : c)),
}));

export const toggleStep = (rack, id, step) => withChannel(rack, id, (c) => ({
  ...c, steps: c.steps.map((v, i) => (i === step ? !v : v)),
}));
export const setChannel = (rack, id, patch) => withChannel(rack, id, (c) => {
  const voice = VOICES[patch.voice] ? patch.voice : c.voice;
  return {
    ...c, voice,
    vol: patch.vol == null ? c.vol : clamp(patch.vol, 0, 1, c.vol),
    note: patch.note == null ? c.note : Math.round(clamp(patch.note, NOTES[0], NOTES.at(-1), c.note)),
  };
});
export const addChannel = (rack, voice) => withPattern(rack, (p) => (
  p.channels.length >= MAX_CHANNELS ? p : { ...p, channels: [...p.channels, newChannel(voice)] }));
export const removeChannel = (rack, id) => withPattern(rack, (p) => ({ ...p, channels: p.channels.filter((c) => c.id !== id) }));
export const clearPattern = (rack) => withPattern(rack, (p) => ({
  ...p, channels: p.channels.map((c) => ({ ...c, steps: c.steps.map(() => false) })),
}));

/** A new pattern after the current one — a copy of it (new ids), or empty. Selects it. */
export function addPattern(rack, { copy = false } = {}) {
  if (rack.patterns.length >= MAX_PATTERNS) return rack;
  const src = currentPattern(rack);
  const name = `Pattern ${rack.patterns.length + 1}`;
  const next = copy ? { name, channels: src.channels.map((c) => ({ ...c, id: cid(), steps: [...c.steps] })) } : newPattern(name);
  return { ...rack, patterns: [...rack.patterns, next], current: rack.patterns.length };
}
export function removePattern(rack) {
  if (rack.patterns.length <= 1) return rack;
  const patterns = rack.patterns.filter((_, i) => i !== rack.current);
  return { ...rack, patterns, current: Math.min(rack.current, patterns.length - 1) };
}
export const selectPattern = (rack, i) => ({ ...rack, current: Math.round(clamp(i, 0, rack.patterns.length - 1, 0)) });
export const setSwing = (rack, v) => ({ ...rack, swing: clamp(v, 0, 0.6, 0) });

export const hasNotes = (pattern) => pattern.channels.some((c) => c.steps.some(Boolean));

/** One bar of sixteenths in seconds. `beats` is the session's beats per bar; a step is a quarter of a beat. */
export const barSeconds = (bpm, beats = 4) => (60 / bpm) * beats;
export const stepSeconds = (bpm) => 60 / bpm / 4;

/**
 * When each step of `bars` bars sounds, in seconds. Swing pushes every second
 * sixteenth late by a share of a step — 0 is straight, 0.6 is the limit.
 */
export function stepTimes(bpm, swing = 0, bars = 1) {
  const step = stepSeconds(bpm);
  return Array.from({ length: STEPS * bars }, (_, i) => i * step + (i % 2 ? swing * step : 0));
}

// ---- the synth (browser only) ----

function noise(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function env(ctx, out, t, peak, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  g.connect(out);
  return g;
}

function burst(ctx, out, hiss, t, peak, decay, type, freq) {
  const src = ctx.createBufferSource();
  src.buffer = hiss;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq;
  src.connect(f).connect(env(ctx, out, t, peak, decay));
  src.start(t); src.stop(t + decay + 0.02);
}

const PLAY = {
  kick(ctx, out, hiss, t, v) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    o.connect(env(ctx, out, t, v, 0.32));
    o.start(t); o.stop(t + 0.36);
  },
  snare(ctx, out, hiss, t, v) {
    burst(ctx, out, hiss, t, v * 0.8, 0.18, "highpass", 1800);
    const o = ctx.createOscillator();
    o.type = "triangle"; o.frequency.setValueAtTime(190, t);
    o.connect(env(ctx, out, t, v * 0.5, 0.1));
    o.start(t); o.stop(t + 0.14);
  },
  clap(ctx, out, hiss, t, v) {
    for (const d of [0, 0.011, 0.023]) burst(ctx, out, hiss, t + d, v * 0.7, d === 0.023 ? 0.16 : 0.03, "bandpass", 1300);
  },
  hat(ctx, out, hiss, t, v) { burst(ctx, out, hiss, t, v * 0.45, 0.05, "highpass", 7000); },
  openhat(ctx, out, hiss, t, v) { burst(ctx, out, hiss, t, v * 0.4, 0.3, "highpass", 6500); },
  bass808(ctx, out, hiss, t, v, note) {
    const hz = noteHz(note);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(hz * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(hz, t + 0.05);
    o.connect(env(ctx, out, t, v, 0.7));
    o.start(t); o.stop(t + 0.75);
  },
  pluck(ctx, out, hiss, t, v, note) {
    const o = ctx.createOscillator();
    o.type = "sawtooth"; o.frequency.setValueAtTime(noteHz(note), t);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(4000, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.2);
    o.connect(f).connect(env(ctx, out, t, v * 0.5, 0.28));
    o.start(t); o.stop(t + 0.32);
  },
};

/** Schedule one hit of a channel's voice on any (live or offline) context. */
export function playVoice(ctx, out, hiss, channel, t) {
  PLAY[channel.voice]?.(ctx, out, hiss, t, channel.vol, channel.note);
}

/**
 * Render a list of patterns one bar each, in order, as one AudioBuffer — a
 * drummer's groove with a fill on the last bar is three of one and one of another.
 */
export async function renderBars(patterns, { bpm, swing = 0, rate = 44100 }) {
  const bar = barSeconds(bpm, 4);
  const ctx = new OfflineAudioContext(2, Math.ceil(bar * patterns.length * rate), rate);
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);
  const hiss = noise(ctx, 0.5);
  const times = stepTimes(bpm, swing, 1);
  patterns.forEach((pattern, b) => {
    for (const c of pattern.channels) {
      if (c.vol <= 0) continue;
      times.forEach((t, i) => { if (c.steps[i]) playVoice(ctx, out, hiss, c, b * bar + t); });
    }
  });
  return ctx.startRendering();
}

/**
 * Render `bars` bars of a pattern to an AudioBuffer exactly `bars` bars long,
 * so it loops seamlessly and lines up bar-for-bar on the Playlist. Tails that
 * run past the end are cut there — which is what a loop does.
 */
export async function renderPattern(pattern, { bpm, swing = 0, bars = 1, beats = 4, rate = 44100 }) {
  const seconds = barSeconds(bpm, 4) * bars;      // a rack bar is always sixteen steps
  void beats;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);
  const hiss = noise(ctx, 0.5);
  const times = stepTimes(bpm, swing, bars);
  for (const c of pattern.channels) {
    if (c.vol <= 0) continue;
    times.forEach((t, i) => { if (c.steps[i % STEPS]) playVoice(ctx, out, hiss, c, t); });
  }
  return ctx.startRendering();
}
