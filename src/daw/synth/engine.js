// The synth engine: a patch + MIDI notes in, stereo audio out. Pure JavaScript on Float32Arrays, so the same code
// runs in the browser, in a worker or worklet, and in plain node under test. Per voice: two band-limited wavetable
// oscillators with up to 7 unison voices each, a sub oscillator and noise, a state-variable filter, two envelopes, two
// LFOs and an 8-slot modulation matrix. Per patch: drive, chorus, ping-pong delay and a Freeverb-style reverb.
// Control-rate work (envelopes, LFOs, the matrix, filter coefficients) runs every CR samples; audio runs every sample.
import { cleanPatch, MAX_UNISON } from "./patch.js";
import { SHAPE_FRAME, FRAME_NAMES, levelFor, readFrame, tables } from "./tables.js";

const CR = 32;
const TWO_PI = Math.PI * 2;
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

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

/** Notes are [pitch, startBeat, lengthBeats, velocity 0-127]. Returns { left, right, rate, length }. */
export async function renderSynth(notes, patchRaw, { bpm = 120, rate = 44100, tick = null } = {}) {
  const P = cleanPatch(patchRaw);
  const F = tables();
  const spb = 60 / bpm;
  const list = notes.map(([pitch, start, len, vel]) => ({ pitch: clamp(Math.round(pitch), 0, 127), start: Math.max(0, start) * spb, len: Math.max(0.02, len * spb), vel: clamp((vel ?? 100) / 127, 0.02, 1) }))
    .sort((a, b) => a.start - b.start);

  // Polyphony: past the voice limit the oldest still-held note is released early (what a hardware synth does).
  const held = [];
  for (const nt of list) {
    for (let i = held.length - 1; i >= 0; i--) if (held[i].start + held[i].len <= nt.start) held.splice(i, 1);
    while (held.length >= P.voices) { const o = held.shift(); o.len = Math.max(0.02, nt.start - o.start); }
    held.push(nt);
  }

  const lastEnd = list.reduce((m, x) => Math.max(m, x.start + x.len), 0);
  const fxTail = (P.fx.reverb.mix > 0 ? 2 + 2.5 * P.fx.reverb.size : 0) + (P.fx.delay.mix > 0 ? Math.min(5, P.fx.delay.time * 9) : 0);
  const length = Math.max(1, Math.ceil((lastEnd + P.amp.r * 1.6 + 0.1 + fxTail) * rate));
  const L = new Float32Array(length); const R = new Float32Array(length);

  let n = 0;
  for (const nt of list) {
    renderVoice(nt, n++);
    if (tick && n % 4 === 0) await tick();
  }

  function renderVoice(nt, id) {
    const rand = rng(id * 7919 + nt.pitch);
    const n0 = Math.round(nt.start * rate);
    const gateT = nt.len;
    const maxT = gateT + P.amp.r * 1.6 + 0.05;
    const nSamp = Math.min(length - n0, Math.ceil(maxT * rate));
    if (nSamp <= 0) return;

    // oscillator state: phases per osc per unison voice, a fixed spread of detune and pan offsets
    const osc = P.oscs.map((o) => ({
      o, u: o.unison, ph: Array.from({ length: MAX_UNISON }, () => rand()), inc: new Float64Array(MAX_UNISON),
      off: Array.from({ length: o.unison }, (_, i) => (o.unison === 1 ? 0 : (i / (o.unison - 1)) * 2 - 1)),
      gl: new Float64Array(MAX_UNISON), gr: new Float64Array(MAX_UNISON), trim: 1 / Math.sqrt(o.unison),
    }));
    let subPh = 0; let noiseState = 0;
    const lpf = { ic1L: 0, ic2L: 0, ic1R: 0, ic2R: 0 };
    const velScale = 0.18 * (0.35 + 0.65 * nt.vel ** 0.8);
    const keyN = clamp((nt.pitch - 60) / 36, -1, 1);
    const baseHz = hz(nt.pitch);
    let a1 = 0, a2 = 0, a3 = 0, kk = 1;

    for (let i = 0; i < nSamp; i += CR) {
      const t = i / rate;
      const abs = nt.start + t;
      const aEnv = envAt(P.amp, t, gateT);
      if (t > gateT && aEnv < 1e-4) break;
      const e2 = envAt(P.env2, t, gateT);
      const l1 = lfoAt(P.lfo1, (P.lfo1.retrig ? t : abs) * P.lfo1.rate, 11);
      const l2 = lfoAt(P.lfo2, (P.lfo2.retrig ? t : abs) * P.lfo2.rate, 23);
      const sum = { pitch: 0, cutoff: 0, level: 0, wave: 0, pan: 0, reso: 0 };
      for (const m of P.mods) sum[m.dst] += m.amount * (m.src === "lfo1" ? l1 : m.src === "lfo2" ? l2 : m.src === "env2" ? e2 : m.src === "velocity" ? nt.vel : keyN);

      // per-oscillator increments, pan gains and the mip level for this tick
      const lv = [];
      for (const s of osc) {
        const o = s.o;
        const semis = o.coarse + o.fine / 100 + sum.pitch * 12;
        const f0 = baseHz * 2 ** (semis / 12);
        let top = 0;
        for (let u = 0; u < s.u; u++) {
          const f = f0 * 2 ** ((s.off[u] * o.detune) / 1200);
          s.inc[u] = f / rate; top = Math.max(top, f);
          const pan = clamp(s.off[u] * o.spread + sum.pan, -1, 1);
          const ang = ((pan + 1) * Math.PI) / 4;
          s.gl[u] = Math.cos(ang) * s.trim * o.level; s.gr[u] = Math.sin(ang) * s.trim * o.level;
        }
        lv.push(levelFor(top, rate));
      }
      const subInc = (baseHz * (P.sub.octave === -2 ? 0.25 : 0.5)) / rate;

      // filter coefficients (TPT state-variable)
      const oct = sum.cutoff * 5 + P.filter.env * 6 * e2 + P.filter.keytrack * ((nt.pitch - 60) / 12);
      const fc = clamp(P.filter.cutoff * 2 ** oct, 20, 0.45 * rate);
      const reso = clamp(P.filter.reso + sum.reso, 0, 1);
      const g = Math.tan((Math.PI * fc) / rate);
      kk = 2 * (1 - reso) + 0.05;
      a1 = 1 / (1 + g * (g + kk)); a2 = g * a1; a3 = g * a2;
      const drive = 1 + P.filter.drive * 5;
      const type = P.filter.type;
      const outGain = velScale * aEnv * Math.max(0, 1 + sum.level);
      const m = Math.min(CR, nSamp - i);

      for (let k = 0; k < m; k++) {
        let xl = 0, xr = 0;
        for (let oi = 0; oi < 2; oi++) {
          const s = osc[oi];
          if (s.o.level <= 0) continue;
          const shape = s.o.shape;
          const fixed = shape !== "wavetable" ? SHAPE_FRAME[shape] : -1;
          let fa = 0, fb = 0, fr = 0;
          if (fixed < 0) { const p = s.o.wave + sum.wave; const x = clamp(p, 0, 1) * (FRAME_NAMES.length - 1); fa = x | 0; fb = Math.min(fa + 1, FRAME_NAMES.length - 1); fr = x - fa; }
          for (let u = 0; u < s.u; u++) {
            let ph = s.ph[u] + s.inc[u]; ph -= ph | 0; s.ph[u] = ph;
            const v = fixed >= 0 ? readFrame(F, fixed, lv[oi], ph) : (fr === 0 ? readFrame(F, fa, lv[oi], ph) : readFrame(F, fa, lv[oi], ph) * (1 - fr) + readFrame(F, fb, lv[oi], ph) * fr);
            xl += v * s.gl[u]; xr += v * s.gr[u];
          }
        }
        if (P.sub.level > 0) { subPh += subInc; subPh -= subPh | 0; const v = Math.sin(TWO_PI * subPh) * P.sub.level * 0.7; xl += v; xr += v; }
        if (P.noise > 0) { noiseState = (Math.imul(noiseState, 1103515245) + 12345) | 0; const v = (noiseState / 2147483648) * P.noise * 0.5; xl += v; xr += v; }
        if (drive > 1) { xl = Math.tanh(xl * drive) / Math.sqrt(drive); xr = Math.tanh(xr * drive) / Math.sqrt(drive); }
        // filter, left then right
        let v3 = xl - lpf.ic2L; let v1 = a1 * lpf.ic1L + a2 * v3; let v2 = lpf.ic2L + a2 * lpf.ic1L + a3 * v3;
        lpf.ic1L = 2 * v1 - lpf.ic1L; lpf.ic2L = 2 * v2 - lpf.ic2L;
        const yl = type === "lp" ? v2 : type === "bp" ? v1 : type === "hp" ? xl - kk * v1 - v2 : xl - kk * v1;
        v3 = xr - lpf.ic2R; v1 = a1 * lpf.ic1R + a2 * v3; v2 = lpf.ic2R + a2 * lpf.ic1R + a3 * v3;
        lpf.ic1R = 2 * v1 - lpf.ic1R; lpf.ic2R = 2 * v2 - lpf.ic2R;
        const yr = type === "lp" ? v2 : type === "bp" ? v1 : type === "hp" ? xr - kk * v1 - v2 : xr - kk * v1;
        L[n0 + i + k] += yl * outGain; R[n0 + i + k] += yr * outGain;
      }
    }
  }

  // ---- effects on the summed bus ----
  const fx = P.fx;
  if (fx.drive > 0) { const d = 1 + fx.drive * 4; const mk = 1 / Math.sqrt(d); for (let i = 0; i < length; i++) { L[i] = Math.tanh(L[i] * d) * mk; R[i] = Math.tanh(R[i] * d) * mk; } }
  if (fx.chorus.mix > 0) {
    const len = Math.ceil(0.06 * rate); const bl = new Float32Array(len); const br = new Float32Array(len);
    let w = 0;
    for (let i = 0; i < length; i++) {
      bl[w] = L[i]; br[w] = R[i];
      const ph = (i / rate) * fx.chorus.rate;
      const dl = (0.014 + 0.007 * fx.chorus.depth * (1 + Math.sin(TWO_PI * ph))) * rate;
      const dr = (0.014 + 0.007 * fx.chorus.depth * (1 + Math.sin(TWO_PI * (ph + 0.5)))) * rate;
      const rd = (buf, d) => { const p = w - d; const i0 = Math.floor(p); const f = p - i0; const a = buf[((i0 % len) + len) % len]; const b = buf[(((i0 + 1) % len) + len) % len]; return a + (b - a) * f; };
      L[i] += rd(bl, dl) * fx.chorus.mix; R[i] += rd(br, dr) * fx.chorus.mix;
      w = (w + 1) % len;
    }
  }
  if (fx.delay.mix > 0) {
    const len = Math.max(1, Math.round(fx.delay.time * rate)); const dl = new Float32Array(len); const dr = new Float32Array(len);
    let idx = 0; let lpl = 0, lpr = 0;
    for (let i = 0; i < length; i++) {
      const yl = dl[idx]; const yr = dr[idx];
      lpl += (yl - lpl) * 0.35; lpr += (yr - lpr) * 0.35;           // a darker repeat each time
      const inL = L[i]; const inR = R[i];
      dl[idx] = inL + lpr * fx.delay.feedback; dr[idx] = inR + lpl * fx.delay.feedback;
      L[i] = inL + yl * fx.delay.mix; R[i] = inR + yr * fx.delay.mix;
      idx = (idx + 1) % len;
    }
  }
  if (fx.reverb.mix > 0) {
    const sc = rate / 44100;
    const mk = (sizes, extra) => sizes.map((s) => ({ buf: new Float32Array(Math.max(1, Math.round((s + extra) * sc))), i: 0, store: 0 }));
    const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]; const apT = [556, 441, 341, 225];
    const cL = mk(combT, 0), cR = mk(combT, 23), aL = mk(apT, 0), aR = mk(apT, 23);
    const fb = 0.7 + fx.reverb.size * 0.28; const damp = 0.25;
    const comb = (c, x) => { const y = c.buf[c.i]; c.store = y * (1 - damp) + c.store * damp; c.buf[c.i] = x + c.store * fb; c.i = (c.i + 1) % c.buf.length; return y; };
    const ap = (a, x) => { const b = a.buf[a.i]; const y = -x + b; a.buf[a.i] = x + b * 0.5; a.i = (a.i + 1) % a.buf.length; return y; };
    const wet = fx.reverb.mix;
    for (let i = 0; i < length; i++) {
      const inp = (L[i] + R[i]) * 0.015;
      let sl = 0, sr = 0;
      for (const c of cL) sl += comb(c, inp);
      for (const c of cR) sr += comb(c, inp);
      for (const a of aL) sl = ap(a, sl);
      for (const a of aR) sr = ap(a, sr);
      L[i] = L[i] * (1 - wet * 0.5) + sl * 3 * wet; R[i] = R[i] * (1 - wet * 0.5) + sr * 3 * wet;
    }
  }
  for (let i = 0; i < length; i++) { L[i] = Math.tanh(L[i] * P.gain); R[i] = Math.tanh(R[i] * P.gain); }
  return { left: L, right: R, rate, length };
}
