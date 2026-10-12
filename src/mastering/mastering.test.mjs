// Mix ConnectZ's numbers, checked against signals whose answer is known.
// A loudness meter that is 1 LU off ships masters a distributor will turn
// down, and nobody on a phone speaker would ever hear why — so these are not
// "does it run" tests, they are "is it right" tests.
import test from "node:test";
import assert from "node:assert/strict";
import {
  dbToGain, gainToDb, peaking, lowShelf, highShelf, responseDb, truePeak, samplePeak, xorshift,
} from "./dsp.js";
import { integratedLoudness, loudness, analyse, correlation, bandSpectrum, tilt } from "./meter.js";
import { master, plan, limiterGains, cleanSettings, INTENSITY, toStereo, balanceChart, GLUE_DB_MAX } from "./master.js";
import { truePeakEnvelope } from "./dsp.js";
import { encodeWav, decodeWav } from "./wav.js";
import { sniffSampleRate } from "./sniff.js";

const FS = 44100;

function sine(seconds, freq, ampDb, fs = FS, phase = 0) {
  const n = Math.round(seconds * fs);
  const a = dbToGain(ampDb);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = a * Math.sin((2 * Math.PI * freq * i) / fs + phase);
  return x;
}

function concat(...parts) {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

// Pink-ish noise (Paul Kellet's filter) with a slow kick under it: something
// with a song's spectral slope and a song's peaks, reproducible from a seed.
function track(seconds, { seed = 7, levelDb = -20, wide = false, bumpHz = 0, bumpDb = 0 } = {}) {
  const rand = xorshift(seed);
  const n = Math.round(seconds * FS);
  const mk = () => {
    const x = new Float32Array(n);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return x;
  };
  const l = mk();
  const r = wide ? mk() : Float32Array.from(l);
  // kick: 55 Hz decaying sine every half second
  for (let s = 0; s < n; s += Math.round(FS / 2)) {
    for (let i = 0; i < Math.min(n - s, 8000); i++) {
      const k = 0.6 * Math.exp(-i / 2500) * Math.sin((2 * Math.PI * 55 * i) / FS);
      l[s + i] += k; r[s + i] += k;
    }
  }
  if (bumpHz) {
    const co = peaking(FS, bumpHz, bumpDb, 1.0);
    for (const x of [l, r]) {
      let z1 = 0, z2 = 0;
      for (let i = 0; i < n; i++) {
        const v = x[i]; const y = co.b0 * v + z1;
        z1 = co.b1 * v - co.a1 * y + z2; z2 = co.b2 * v - co.a2 * y; x[i] = y;
      }
    }
  }
  const ch = [l, r];
  const g = dbToGain(levelDb - integratedLoudness(ch, FS));
  for (const x of ch) for (let i = 0; i < n; i++) x[i] *= g;
  return ch;
}

test("EBU Tech 3341 case 1: a stereo 1 kHz sine at −23 dBFS reads −23.0 LUFS", () => {
  const x = sine(20, 1000, -23);
  const L = integratedLoudness([x, Float32Array.from(x)], FS);
  assert.ok(Math.abs(L + 23) <= 0.1, `read ${L}`);
});

test("loudness is right at 48 kHz too — the K-weighting is derived per sample rate", () => {
  const x = sine(10, 1000, -20, 48000);
  const L = integratedLoudness([x, Float32Array.from(x)], 48000);
  assert.ok(Math.abs(L + 20) <= 0.1, `read ${L}`);
});

test("a full-scale sine on ONE channel reads −3.01 LUFS (BS.1770's own example)", () => {
  const x = sine(10, 1000, 0);
  const L = integratedLoudness([x, new Float32Array(x.length)], FS);
  assert.ok(Math.abs(L + 3.01) <= 0.1, `read ${L}`);
});

test("silence is gated out: a song with a silent half is as loud as its loud half", () => {
  const loudPart = sine(10, 1000, -20);
  const x = concat(loudPart, new Float32Array(10 * FS));
  const L = integratedLoudness([x, Float32Array.from(x)], FS);
  assert.ok(Math.abs(L + 20) <= 0.1, `read ${L}`);
});

test("the relative gate drops a much quieter section, as EBU R128 specifies", () => {
  const x = concat(sine(20, 1000, -20), sine(20, 1000, -40));
  const L = integratedLoudness([x, Float32Array.from(x)], FS);
  assert.ok(Math.abs(L + 20) <= 0.2, `read ${L}`);
});

test("loudness range: a steady tone has none; two levels 10 dB apart have about 10", () => {
  const steady = sine(30, 1000, -20);
  assert.ok(loudness([steady, steady], FS).lra < 0.5);
  const two = concat(sine(30, 1000, -20), sine(30, 1000, -30));
  const lra = loudness([two, two], FS).lra;
  assert.ok(lra > 8 && lra < 11, `lra ${lra}`);
});

test("true peak finds the peak between the samples that sample peak misses", () => {
  // A sine at a quarter of the sample rate, phased so every sample lands at
  // ±0.707: sample peak says −3 dB, the reconstructed wave reaches 0 dB.
  const x = sine(1, FS / 4, 0, FS, Math.PI / 4);
  assert.ok(Math.abs(gainToDb(samplePeak([x])) + 3.01) < 0.05);
  const tp = gainToDb(truePeak([x]));
  assert.ok(Math.abs(tp) < 0.25, `true peak ${tp}`);
});

test("true peak of an ordinary low tone equals its sample peak", () => {
  const x = sine(1, 100, -6);
  assert.ok(Math.abs(gainToDb(truePeak([x])) + 6) < 0.05);
});

test("each EQ filter does what its label says at its own frequency", () => {
  assert.ok(Math.abs(responseDb([peaking(FS, 1000, 3, 1)], FS, 1000) - 3) < 0.01);
  assert.ok(Math.abs(responseDb([peaking(FS, 250, -2.5, 0.9)], FS, 250) + 2.5) < 0.01);
  assert.ok(Math.abs(responseDb([lowShelf(FS, 100, 4)], FS, 20) - 4) < 0.3);
  assert.ok(Math.abs(responseDb([highShelf(FS, 8000, -3)], FS, 18000) + 3) < 0.3);
  assert.ok(Math.abs(responseDb([lowShelf(FS, 100, 4)], FS, 5000)) < 0.1);
});

test("correlation: identical channels are +1, inverted are −1", () => {
  const x = sine(1, 440, -10);
  assert.ok(correlation(x, x) > 0.999);
  assert.ok(correlation(x, x.map((v) => -v)) < -0.999);
});

test("the spectrum sees a tone in the right third-octave band", () => {
  const x = sine(5, 1000, -10);
  const bands = bandSpectrum([x, x], FS);
  const loudest = bands.filter((b) => b.db != null).sort((a, b) => b.db - a.db)[0];
  assert.equal(loudest.f, 1000);
});

test("pink noise reads flat in third-octave bands, the way a studio analyser shows it", () => {
  // Pink noise has equal energy per octave, so summed band power is level
  // across the bands — which is why it is the calibration signal for one.
  // (The kick in `track()` would tilt it, so this is the noise alone.)
  const ch = track(10, { levelDb: -20 });
  const rand = xorshift(11);
  const n = FS * 10;
  const x = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = rand() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  const t = tilt(bandSpectrum([x, x], FS), 63, 12500);
  assert.ok(Math.abs(t.slope) < 0.7, `slope ${t.slope} dB/oct`);
  // and a bass-heavy track (the kick) tilts down from there
  assert.ok(tilt(bandSpectrum(ch, FS)).slope < t.slope);
});

test("the limiter's gain never lets any sample past the ceiling", () => {
  const rand = xorshift(3);
  const n = FS * 3;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = (rand() * 2 - 1) * (i % 9000 < 300 ? 1 : 0.2);
  const env = truePeakEnvelope([x]);
  const G = dbToGain(12);
  const ceiling = dbToGain(-1);
  const g = limiterGains(env, G, ceiling, FS);
  let worst = 0;
  for (let i = 0; i < n; i++) worst = Math.max(worst, env[i] * G * g[i]);
  assert.ok(worst <= ceiling * 1.0001, `worst ${gainToDb(worst)} dB`);
});

test("a quiet mix is mastered to −14 LUFS with true peaks under −1 dBTP", () => {
  const ch = track(20, { levelDb: -24 });
  const out = master(ch, FS, { target: "streaming", intensity: "medium" });
  assert.ok(out.report.reached, out.outcome.join(" "));
  assert.ok(Math.abs(out.after.lufs + 14) <= 0.3, `lufs ${out.after.lufs}`);
  assert.ok(out.after.truePeakDb <= -0.95, `tp ${out.after.truePeakDb}`);
  assert.equal(out.channels.length, 2);
  assert.equal(out.channels[0].length, ch[0].length);
});

test("Apple Music lands near −16; 'Loud' gets louder than streaming", () => {
  const ch = track(15, { levelDb: -22 });
  const apple = master(ch, FS, { target: "apple" });
  assert.ok(Math.abs(apple.after.lufs + 16) <= 0.3, `apple ${apple.after.lufs}`);
  const loud = master(ch, FS, { target: "loud", intensity: "max" });
  assert.ok(loud.after.lufs > -14, `loud ${loud.after.lufs}`);
  assert.ok(loud.after.truePeakDb <= -0.95);
});

test("it stops short of crushing the peaks, and says so, instead of landing at any cost", () => {
  const ch = track(15, { levelDb: -26 });
  const out = master(ch, FS, { target: "loud", intensity: "low" });
  assert.equal(out.report.reached, false);
  assert.equal(out.report.stopped, "limit");
  assert.ok(out.report.limiterMaxGrDb <= INTENSITY.low.maxLimitGr + 0.1);
  assert.match(out.outcome[0], /Stopped at/);
  assert.ok(out.after.truePeakDb <= -0.95);
});

test("every EQ move carries the measurement that caused it", () => {
  const ch = track(10, { bumpHz: 250, bumpDb: 7 });
  const a = analyse(ch, FS);
  const p = plan(a, { intensity: "high" });
  const lowMid = p.eq.find((m) => m.type === "peak" && m.f === 250);
  assert.ok(lowMid, `moves: ${JSON.stringify(p.eq.map((m) => [m.type, m.f, m.gain]))}`);
  assert.ok(lowMid.gain < 0, "a bump is cut, not boosted");
  for (const m of p.eq) assert.ok(typeof m.why === "string" && m.why.length > 10);
  assert.match(lowMid.why, /measured/);
});

test("EQ off leaves only the rumble filter and the member's own trims", () => {
  const ch = track(8, { bumpHz: 250, bumpDb: 7 });
  const p = plan(analyse(ch, FS), { eq: false, trims: { high: 2 } });
  assert.deepEqual(p.eq.map((m) => m.type), ["highpass", "highshelf"]);
  assert.match(p.eq[1].why, /set by you/);
});

test("wide low end is folded to mono; a mono mix is not", () => {
  const wide = track(8, { wide: true });
  assert.equal(plan(analyse(wide, FS), {}).width.monoBelow, 120);
  const narrow = track(8, { wide: false });
  assert.equal(plan(analyse(narrow, FS), {}).width.monoBelow, null);
});

test("a mix that cancels in mono is never widened, and the member is told", () => {
  const l = sine(5, 300, -12);
  const r = l.map((v) => -v * 0.9);
  const p = plan(analyse([l, r], FS), { style: "open" });
  assert.equal(p.width.side, 1);
  assert.ok(p.warnings.some((w) => /mono/.test(w)));
});

test("the compressor amount is the member's when they set it, up to the ceiling", () => {
  const ch = track(8);
  const a = analyse(ch, FS);
  assert.equal(plan(a, { glueDb: 4 }).glue.grTarget, 4);
  assert.equal(plan(a, { glueDb: 0 }).glue, null);
  assert.equal(cleanSettings({ glueDb: 99 }).glueDb, GLUE_DB_MAX);
  assert.equal(cleanSettings({ intensity: "nonsense" }).intensity, "medium");
  assert.equal(plan(a, { intensity: "max" }).glue.ratio, 4);
});

test("the automatic compressor backs off a track that is already dense", () => {
  // A square-ish wave has almost no crest: peak-to-loudness well under 8 dB.
  const x = sine(8, 110, -6).map((v) => Math.sign(v) * Math.min(Math.abs(v) * 4, 0.5));
  const p = plan(analyse([x, x], FS), {});
  assert.equal(p.glue, null);
  assert.match(p.glueWhy, /already dense/);
});

test("mono in, stereo out — a mono file is played on both speakers", () => {
  const x = sine(2, 440, -12);
  const st = toStereo([x]);
  assert.equal(st.length, 2);
  assert.notEqual(st[0], st[1]);
});

test("the balance chart is normalised at 1 kHz so it shows shape, not gain", () => {
  const ch = track(8);
  const out = master(ch, FS, {});
  const chart = balanceChart(out.before, out.after);
  const k = chart.find((b) => b.f === 1000);
  assert.equal(k.before, 0);
  assert.equal(k.after, 0);
});

test("WAV round trip: 24-bit is exact to the step, 32-bit float is exact", () => {
  const x = sine(0.5, 440, -3);
  const ch = [x, x.map((v) => v * 0.5)];
  const d24 = decodeWav(encodeWav(ch, FS, { bitDepth: 24 }));
  assert.equal(d24.sampleRate, FS);
  assert.equal(d24.channels.length, 2);
  for (let i = 0; i < x.length; i += 97) assert.ok(Math.abs(d24.channels[0][i] - x[i]) < 2 / 8388608);
  const d32 = decodeWav(encodeWav(ch, FS, { bitDepth: 32 }));
  for (let i = 0; i < x.length; i += 97) assert.equal(d32.channels[1][i], ch[1][i]);
});

test("the file's own sample rate is read from its header, so nothing is resampled behind the member's back", () => {
  for (const rate of [44100, 48000, 96000]) {
    assert.equal(sniffSampleRate(encodeWav([new Float32Array(10)], rate, { bitDepth: 16 })), rate);
  }
  // FLAC: "fLaC", a STREAMINFO block header, then the 20-bit rate 10 bytes in.
  const fl = new Uint8Array(64);
  fl.set([0x66, 0x4c, 0x61, 0x43, 0x00, 0x00, 0x00, 0x22], 0);
  const r = 48000;
  fl[18] = (r >> 12) & 0xff; fl[19] = (r >> 4) & 0xff; fl[20] = (r & 0x0f) << 4;
  assert.equal(sniffSampleRate(fl), 48000);
  // MP3 behind an ID3 tag: MPEG-1 layer III at 44.1 kHz, then MPEG-1 at 48 kHz.
  const mp = new Uint8Array(64);
  mp.set([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 4], 0); // "ID3", 4-byte tag body
  mp.set([0xff, 0xfb, 0x90, 0x00], 14);
  assert.equal(sniffSampleRate(mp), 44100);
  mp[16] = 0x94; // sample-rate index 1
  assert.equal(sniffSampleRate(mp), 48000);
  // Ogg Vorbis identification header.
  const og = new Uint8Array(128);
  og.set([0x4f, 0x67, 0x67, 0x53], 0);
  const vh = [0x01, ...[..."vorbis"].map((c) => c.charCodeAt(0)), 0, 0, 0, 0, 2, 0x44, 0xac, 0, 0];
  og.set(vh, 28);
  assert.equal(sniffSampleRate(og), 44100);
  assert.equal(sniffSampleRate(new Uint8Array(100)), null);
});

test("16-bit export dithers silence to a faint hiss, and off means off", () => {
  const silent = [new Float32Array(FS), new Float32Array(FS)];
  const on = decodeWav(encodeWav(silent, FS, { bitDepth: 16, dither: true, seed: 5 }));
  let ss = 0;
  for (const v of on.channels[0]) ss += (v * 32768) ** 2;
  const rmsLsb = Math.sqrt(ss / FS);
  assert.ok(rmsLsb > 0.3 && rmsLsb < 0.8, `dither rms ${rmsLsb} LSB`);
  const off = decodeWav(encodeWav(silent, FS, { bitDepth: 16, dither: false }));
  assert.ok(off.channels[0].every((v) => v === 0));
  // Same seed, same bytes: two exports of one master are identical files.
  const a = new Uint8Array(encodeWav(silent, FS, { bitDepth: 16, seed: 9 }));
  const b = new Uint8Array(encodeWav(silent, FS, { bitDepth: 16, seed: 9 }));
  assert.deepEqual(a, b);
});
