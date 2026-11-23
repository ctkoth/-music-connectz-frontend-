// The synth engine: a patch and notes in, stereo audio out. Pure JavaScript on Float32Arrays, so ONE core runs in the
// browser's AudioWorklet (live playing), in the offline renderer (a MIDI part, an audition) and in plain node under test.
//
//   SynthCore: noteOn / noteOff / process(L, R, n). Per voice: two band-limited wavetable oscillators with up to 7 unison
//   voices each, a sub oscillator and noise, a state-variable filter, two envelopes, two LFOs and an 8-slot modulation
//   matrix. Per patch: drive, chorus, ping-pong delay and a Freeverb-style reverb. Control-rate work (envelopes, LFOs, the
//   matrix, filter coefficients) runs every CR samples; audio runs every sample. `setPatch` changes a sounding patch
//   without cutting its notes: every voice reads the live patch each control tick.
//   renderSynth: the same core driven by a list of notes, to arrays. It is what the tests and the DAW's MIDI parts use.
import { cleanPatch, MAX_UNISON } from "./patch.js";
import { SHAPE_FRAME, FRAME_NAMES, levelFor, readFrame, tables } from "./tables.js";

const CR = 32;
const TWO_PI = Math.PI * 2;
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const NF = FRAME_NAMES.length;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash01 = (i, seed) => { let x = (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) >>> 0; x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

function envAt(e, t, gateT) {
  const rel = t > gateT;
  const tg = rel ? gateT : t;
  let lvl = tg < e.a ? (e.a > 0 ? tg / e.a : 1) : e.s + (1 - e.s) * Math.exp((-4 * (tg - e.a)) / Math.max(e.d, 1e-3));
  if (rel) lvl *= Math.exp((-4 * (t - gateT)) / Math.max(e.r, 1e-3));
  return lvl;
}
function lfoAt(l, x, seed) {                       // x = cycles
  switch (l.shape) {
    case "triangle": { const f = x - Math.floor(x); return f < 0.5 ? 4 * f - 1 : 3 - 4 * f; }
    case "saw": return 2 * (x - Math.floor(x)) - 1;
    case "square": return x - Math.floor(x) < 0.5 ? 1 : -1;
    case "random": return hash01(Math.floor(x), seed) * 2 - 1;
    default: return Math.sin(TWO_PI * x);
  }
}

class Voice {
  constructor(core, pitch, vel127, id) {
    this.core = core; this.pitch = pitch; this.id = id;
    this.vel = clamp((vel127 ?? 100) / 127, 0.02, 1);
    this.t0 = core.time;                                  // free-running LFOs are in the core's clock
    this.n = 0; this.tickLeft = 0; this.gateT = Infinity; this.done = false;
    const rand = rng(id * 7919 + pitch);
    this.ph = [new Float64Array(MAX_UNISON), new Float64Array(MAX_UNISON)];
    for (const p of this.ph) for (let u = 0; u < MAX_UNISON; u++) p[u] = rand();
    this.inc = [new Float64Array(MAX_UNISON), new Float64Array(MAX_UNISON)];
    this.gl = [new Float64Array(MAX_UNISON), new Float64Array(MAX_UNISON)];
    this.gr = [new Float64Array(MAX_UNISON), new Float64Array(MAX_UNISON)];
    this.uni = [1, 1]; this.lv = [0, 0]; this.fixed = [-1, -1]; this.fa = [0, 0]; this.fb = [0, 0]; this.fr = [0, 0]; this.lvl = [0, 0];
    this.subPh = 0; this.subInc = 0; this.noiseState = 0;
    this.ic1L = 0; this.ic2L = 0; this.ic1R = 0; this.ic2R = 0;
    this.a1 = 0; this.a2 = 0; this.a3 = 0; this.kk = 1; this.drive = 1; this.ftype = "lp"; this.outGain = 0;
    this.sum = { pitch: 0, cutoff: 0, level: 0, wave: 0, pan: 0, reso: 0 };
    this.velScale = 0.18 * (0.35 + 0.65 * this.vel ** 0.8);
    this.keyN = clamp((pitch - 60) / 36, -1, 1);
    this.baseHz = hz(pitch);
  }
  release() { if (this.gateT === Infinity) this.gateT = this.n / this.core.rate; }
  control() {
    const { core } = this; const P = core.P; const rate = core.rate;
    const t = this.n / rate; const abs = this.t0 + t;
    const aEnv = envAt(P.amp, t, this.gateT);
    if (t > this.gateT && aEnv < 1e-4) { this.done = true; return; }
    const e2 = envAt(P.env2, t, this.gateT);
    const l1 = lfoAt(P.lfo1, (P.lfo1.retrig ? t : abs) * P.lfo1.rate, 11);
    const l2 = lfoAt(P.lfo2, (P.lfo2.retrig ? t : abs) * P.lfo2.rate, 23);
    const sum = this.sum; sum.pitch = sum.cutoff = sum.level = sum.wave = sum.pan = sum.reso = 0;
    for (const m of P.mods) sum[m.dst] += m.amount * (m.src === "lfo1" ? l1 : m.src === "lfo2" ? l2 : m.src === "env2" ? e2 : m.src === "velocity" ? this.vel : this.keyN);
    for (let oi = 0; oi < 2; oi++) {
      const o = P.oscs[oi]; const u = o.unison; this.uni[oi] = u; this.lvl[oi] = o.level;
      const semis = o.coarse + o.fine / 100 + sum.pitch * 12;
      const f0 = this.baseHz * 2 ** (semis / 12);
      let top = 0;
      const trim = 1 / Math.sqrt(u);
      for (let k = 0; k < u; k++) {
        const off = u === 1 ? 0 : (k / (u - 1)) * 2 - 1;
        const f = f0 * 2 ** ((off * o.detune) / 1200);
        this.inc[oi][k] = f / rate; if (f > top) top = f;
        const pan = clamp(off * o.spread + sum.pan, -1, 1);
        const ang = ((pan + 1) * Math.PI) / 4;
        this.gl[oi][k] = Math.cos(ang) * trim * o.level; this.gr[oi][k] = Math.sin(ang) * trim * o.level;
      }
      this.lv[oi] = levelFor(top, rate);
      const fixed = o.shape !== "wavetable" ? SHAPE_FRAME[o.shape] : -1;
      this.fixed[oi] = fixed;
      if (fixed < 0) { const x = clamp(o.wave + sum.wave, 0, 1) * (NF - 1); const fa = x | 0; this.fa[oi] = fa; this.fb[oi] = Math.min(fa + 1, NF - 1); this.fr[oi] = x - fa; }
    }
    this.subInc = (this.baseHz * (P.sub.octave === -2 ? 0.25 : 0.5)) / rate;
    const oct = sum.cutoff * 5 + P.filter.env * 6 * e2 + P.filter.keytrack * ((this.pitch - 60) / 12);
    const fc = clamp(P.filter.cutoff * 2 ** oct, 20, 0.45 * rate);
    const reso = clamp(P.filter.reso + sum.reso, 0, 1);
    const g = Math.tan((Math.PI * fc) / rate);
    this.kk = 2 * (1 - reso) + 0.05;
    this.a1 = 1 / (1 + g * (g + this.kk)); this.a2 = g * this.a1; this.a3 = g * this.a2;
    this.drive = 1 + P.filter.drive * 5; this.ftype = P.filter.type;
    this.outGain = this.velScale * aEnv * Math.max(0, 1 + sum.level);
  }
  /** Add `count` samples of this voice into L / R starting at `off`. */
  process(L, R, off, count) {
    let i = 0;
    while (i < count && !this.done) {
      if (this.tickLeft <= 0) { this.control(); this.tickLeft = CR; if (this.done) break; }
      const m = Math.min(this.tickLeft, count - i);
      this.run(L, R, off + i, m);
      this.n += m; this.tickLeft -= m; i += m;
    }
  }
  run(L, R, at, m) {
    const { core } = this; const F = core.F; const P = core.P;
    const { a1, a2, a3, kk, drive, ftype, outGain } = this;
    const subLevel = P.sub.level, noiseLevel = P.noise;
    let { ic1L, ic2L, ic1R, ic2R, subPh, noiseState } = this;
    for (let k = 0; k < m; k++) {
      let xl = 0, xr = 0;
      for (let oi = 0; oi < 2; oi++) {
        if (this.lvl[oi] <= 0) continue;
        const ph = this.ph[oi]; const inc = this.inc[oi]; const gl = this.gl[oi]; const gr = this.gr[oi];
        const fixed = this.fixed[oi]; const lv = this.lv[oi]; const fa = this.fa[oi]; const fb = this.fb[oi]; const fr = this.fr[oi];
        for (let u = 0, n = this.uni[oi]; u < n; u++) {
          let p = ph[u] + inc[u]; p -= p | 0; ph[u] = p;
          const v = fixed >= 0 ? readFrame(F, fixed, lv, p) : fr === 0 ? readFrame(F, fa, lv, p) : readFrame(F, fa, lv, p) * (1 - fr) + readFrame(F, fb, lv, p) * fr;
          xl += v * gl[u]; xr += v * gr[u];
        }
      }
      if (subLevel > 0) { subPh += this.subInc; subPh -= subPh | 0; const v = Math.sin(TWO_PI * subPh) * subLevel * 0.7; xl += v; xr += v; }
      if (noiseLevel > 0) { noiseState = (Math.imul(noiseState, 1103515245) + 12345) | 0; const v = (noiseState / 2147483648) * noiseLevel * 0.5; xl += v; xr += v; }
      if (drive > 1) { const s = Math.sqrt(drive); xl = Math.tanh(xl * drive) / s; xr = Math.tanh(xr * drive) / s; }
      let v3 = xl - ic2L; let v1 = a1 * ic1L + a2 * v3; let v2 = ic2L + a2 * ic1L + a3 * v3;
      ic1L = 2 * v1 - ic1L; ic2L = 2 * v2 - ic2L;
      const yl = ftype === "lp" ? v2 : ftype === "bp" ? v1 : ftype === "hp" ? xl - kk * v1 - v2 : xl - kk * v1;
      v3 = xr - ic2R; v1 = a1 * ic1R + a2 * v3; v2 = ic2R + a2 * ic1R + a3 * v3;
      ic1R = 2 * v1 - ic1R; ic2R = 2 * v2 - ic2R;
      const yr = ftype === "lp" ? v2 : ftype === "bp" ? v1 : ftype === "hp" ? xr - kk * v1 - v2 : xr - kk * v1;
      L[at + k] += yl * outGain; R[at + k] += yr * outGain;
    }
    this.ic1L = ic1L; this.ic2L = ic2L; this.ic1R = ic1R; this.ic2R = ic2R; this.subPh = subPh; this.noiseState = noiseState;
  }
}

/** The effects bus, stateful across blocks. Parameters are read from the live patch each block. */
function makeFx(core) {
  const rate = core.rate;
  const cLen = Math.ceil(0.06 * rate); const cbl = new Float32Array(cLen); const cbr = new Float32Array(cLen); let cw = 0; let cn = 0;
  const dMax = Math.ceil(1.5 * rate) + 2; const dbl = new Float32Array(dMax); const dbr = new Float32Array(dMax); let di = 0; let lpl = 0; let lpr = 0;
  let rv = null;
  const makeReverb = () => {
    const sc = rate / 44100;
    const mk = (sizes, extra) => sizes.map((s) => ({ buf: new Float32Array(Math.max(1, Math.round((s + extra) * sc))), i: 0, store: 0 }));
    const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]; const apT = [556, 441, 341, 225];
    return { cL: mk(combT, 0), cR: mk(combT, 23), aL: mk(apT, 0), aR: mk(apT, 23) };
  };
  const rd = (buf, w, d) => { const p = w - d; const i0 = Math.floor(p); const f = p - i0; const a = buf[((i0 % cLen) + cLen) % cLen]; const b = buf[(((i0 + 1) % cLen) + cLen) % cLen]; return a + (b - a) * f; };
  return (L, R, n) => {
    const P = core.P; const fx = P.fx;
    if (fx.drive > 0) { const d = 1 + fx.drive * 4; const mk = 1 / Math.sqrt(d); for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] * d) * mk; R[i] = Math.tanh(R[i] * d) * mk; } }
    if (fx.chorus.mix > 0) {
      for (let i = 0; i < n; i++) {
        cbl[cw] = L[i]; cbr[cw] = R[i];
        const ph = ((cn + i) / rate) * fx.chorus.rate;
        const dl = (0.014 + 0.007 * fx.chorus.depth * (1 + Math.sin(TWO_PI * ph))) * rate;
        const dr = (0.014 + 0.007 * fx.chorus.depth * (1 + Math.sin(TWO_PI * (ph + 0.5)))) * rate;
        L[i] += rd(cbl, cw, dl) * fx.chorus.mix; R[i] += rd(cbr, cw, dr) * fx.chorus.mix;
        cw = (cw + 1) % cLen;
      }
      cn += n;
    }
    if (fx.delay.mix > 0) {
      const len = clamp(Math.round(fx.delay.time * rate), 1, dMax); di %= len;
      for (let i = 0; i < n; i++) {
        const yl = dbl[di]; const yr = dbr[di];
        lpl += (yl - lpl) * 0.35; lpr += (yr - lpr) * 0.35;
        const inL = L[i]; const inR = R[i];
        dbl[di] = inL + lpr * fx.delay.feedback; dbr[di] = inR + lpl * fx.delay.feedback;
        L[i] = inL + yl * fx.delay.mix; R[i] = inR + yr * fx.delay.mix;
        di = (di + 1) % len;
      }
    }
    if (fx.reverb.mix > 0) {
      rv ||= makeReverb();
      const fb = 0.7 + fx.reverb.size * 0.28; const damp = 0.25; const wet = fx.reverb.mix;
      const comb = (c, x) => { const y = c.buf[c.i]; c.store = y * (1 - damp) + c.store * damp; c.buf[c.i] = x + c.store * fb; c.i = (c.i + 1) % c.buf.length; return y; };
      const ap = (a, x) => { const b = a.buf[a.i]; const y = -x + b; a.buf[a.i] = x + b * 0.5; a.i = (a.i + 1) % a.buf.length; return y; };
      for (let i = 0; i < n; i++) {
        const inp = (L[i] + R[i]) * 0.015;
        let sl = 0, sr = 0;
        for (const c of rv.cL) sl += comb(c, inp);
        for (const c of rv.cR) sr += comb(c, inp);
        for (const a of rv.aL) sl = ap(a, sl);
        for (const a of rv.aR) sr = ap(a, sr);
        L[i] = L[i] * (1 - wet * 0.5) + sl * 3 * wet; R[i] = R[i] * (1 - wet * 0.5) + sr * 3 * wet;
      }
    }
  };
}

export class SynthCore {
  constructor(patchRaw, rate = 44100) {
    this.rate = rate; this.P = cleanPatch(patchRaw); this.F = tables();
    this.voices = []; this.nextId = 0; this.time = 0;
    this.fx = makeFx(this);
  }
  setPatch(raw) { this.P = cleanPatch(raw); }
  /** Start a note. Returns the voice (a caller that knows when it ends can `.release()` it). */
  noteOn(pitch, vel127 = 100) {
    const held = this.voices.filter((v) => v.gateT === Infinity);
    while (held.length >= this.P.voices) held.shift().release();       // out of voices: the oldest held note lets go
    if (this.voices.length >= this.P.voices * 2) this.voices.shift();  // and a pile of long tails is cut, oldest first
    const v = new Voice(this, clamp(Math.round(pitch), 0, 127), vel127, this.nextId++);
    this.voices.push(v);
    return v;
  }
  noteOff(pitch) {
    const v = this.voices.find((x) => x.pitch === pitch && x.gateT === Infinity);
    if (v) v.release();
  }
  allNotesOff() { for (const v of this.voices) v.release(); }
  get active() { return this.voices.length; }
  /** Fill L[0..n) and R[0..n) with the next n samples (they are overwritten, not added to). */
  process(L, R, n) {
    L.fill(0, 0, n); R.fill(0, 0, n);
    for (const v of this.voices) v.process(L, R, 0, n);
    if (this.voices.some((v) => v.done)) this.voices = this.voices.filter((v) => !v.done);
    this.fx(L, R, n);
    const g = this.P.gain;
    for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] * g); R[i] = Math.tanh(R[i] * g); }
    this.time += n / this.rate;
  }
}

/** Notes are [pitch, startBeat, lengthBeats, velocity 0-127]. Returns { left, right, rate, length }. */
export async function renderSynth(notes, patchRaw, { bpm = 120, rate = 44100, tick = null } = {}) {
  const core = new SynthCore(patchRaw, rate);
  const P = core.P;
  const spb = 60 / bpm;
  const evs = [];
  let lastEnd = 0;
  for (const [pitch, start, len, vel] of notes) {
    const s = Math.max(0, start) * spb; const l = Math.max(0.02, len * spb);
    const note = { pitch, vel, voice: null };
    evs.push({ at: Math.round(s * rate), on: true, note }, { at: Math.round((s + l) * rate), on: false, note });
    lastEnd = Math.max(lastEnd, s + l);
  }
  evs.sort((a, b) => a.at - b.at || (a.on ? 1 : 0) - (b.on ? 1 : 0));     // at one instant, notes end before the next begins
  const fxTail = (P.fx.reverb.mix > 0 ? 2 + 2.5 * P.fx.reverb.size : 0) + (P.fx.delay.mix > 0 ? Math.min(5, P.fx.delay.time * 9) : 0);
  const length = Math.max(1, Math.ceil((lastEnd + P.amp.r * 2.4 + 0.1 + fxTail) * rate));
  const L = new Float32Array(length); const R = new Float32Array(length);
  let pos = 0; let k = 0;
  const run = (to) => { if (to > pos) { core.process(L.subarray(pos, to), R.subarray(pos, to), to - pos); pos = to; } };
  for (const ev of evs) {
    run(Math.min(ev.at, length));
    if (ev.on) ev.note.voice = core.noteOn(ev.note.pitch, ev.note.vel); else ev.note.voice?.release();
    if (tick && ++k % 8 === 0) await tick();
  }
  run(length);
  return { left: L, right: R, rate, length };
}
