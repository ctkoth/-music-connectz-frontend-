import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planCompression, parseWavHeader, wavSupported, wavSeconds, pcmToMono, downmix,
  Resampler, encodeWav, wavHeader, floatToInt16, outRateFor, wavBytes, copyLine,
  worthSaying, resampledLength, MB,
} from "./uploadCompress.js";

const f = (size, type, name = "t") => ({ size, type, name });

test("decision: small, video, empty, unknown are skipped", () => {
  assert.equal(planCompression(f(5 * MB, "audio/wav", "a.wav")).action, "skip");
  assert.equal(planCompression(f(50 * MB, "video/mp4")).reason, "video");
  assert.equal(planCompression(f(50 * MB, "audio/wav"), { isVideo: true }).reason, "video");
  assert.equal(planCompression(f(0, "audio/wav")).reason, "empty");
  assert.equal(planCompression(f(50 * MB, "application/zip")).reason, "not_audio");
});
test("decision: big wav streams, big mp3 decodes only if safe", () => {
  assert.equal(planCompression(f(129 * MB, "audio/wav")).action, "wav");
  assert.equal(planCompression(f(129 * MB, "", "mix.WAV")).action, "wav");
  assert.equal(planCompression(f(20 * MB, "audio/mpeg")).action, "decode");
  assert.equal(planCompression(f(120 * MB, "audio/mpeg")).reason, "too_big_to_decode");
  assert.equal(planCompression(f(900 * MB, "audio/wav")).reason, "too_big");
});

function makeWav({ channels = 2, rate = 44100, bits = 16, frames = 1000, fill }) {
  const bps = bits / 8;
  const buf = new Uint8Array(44 + frames * channels * bps);
  buf.set(wavHeader(1, 1), 0);
  const dv = new DataView(buf.buffer);
  dv.setUint16(22, channels, true); dv.setUint32(24, rate, true); dv.setUint16(34, bits, true);
  dv.setUint32(40, frames * channels * bps, true);
  for (let i = 0; i < frames; i++) for (let c = 0; c < channels; c++) fill(dv, 44 + (i * channels + c) * bps, i, c);
  return buf;
}

test("header parse + seconds", () => {
  const w = makeWav({ frames: 44100, fill: (dv, o) => dv.setInt16(o, 0, true) });
  const h = parseWavHeader(w);
  assert.deepEqual([h.format, h.channels, h.rate, h.bits, h.dataOffset], [1, 2, 44100, 16, 44]);
  assert.ok(wavSupported(h));
  assert.equal(wavSeconds(h), 1);
  assert.equal(parseWavHeader(new Uint8Array(20)), null);
});
test("streamed header (data size 0xFFFFFFFF) clamps to the file", () => {
  const w = makeWav({ frames: 100, fill: (dv, o) => dv.setInt16(o, 1, true) });
  new DataView(w.buffer).setUint32(40, 0xffffffff, true);
  assert.equal(parseWavHeader(w).dataBytes, 100 * 4);
});
test("downmix is the average of channels (16-bit, 24-bit, float)", () => {
  const w = makeWav({ frames: 4, fill: (dv, o, i, c) => dv.setInt16(o, c ? -16384 : 32767 - 0, true) });
  const m = pcmToMono(w.subarray(44), parseWavHeader(w));
  assert.ok(Math.abs(m[0] - ((32767 - 16384) / 2 / 32768)) < 1e-6);
  const w24 = makeWav({ bits: 24, frames: 2, fill: (dv, o, i, c) => { const v = c ? -4194304 : 4194304; dv.setUint8(o, v & 255); dv.setUint8(o + 1, (v >> 8) & 255); dv.setUint8(o + 2, (v >> 16) & 255); } });
  assert.ok(Math.abs(pcmToMono(w24.subarray(44), parseWavHeader(w24))[0]) < 1e-9);
  assert.deepEqual(Array.from(downmix([Float32Array.of(1, 0), Float32Array.of(0, 1)])), [0.5, 0.5]);
});
test("resample length and chunk-independence", () => {
  const n = 44100 * 2;
  const x = Float32Array.from({ length: n }, (_, i) => Math.sin(i / 50));
  const one = new Resampler(44100, 16000).push(x);
  assert.ok(Math.abs(one.length - resampledLength(n, 44100, 16000)) <= 1);
  const r = new Resampler(44100, 16000);
  const parts = [];
  for (let p = 0; p < n; p += 3333) parts.push(r.push(x.subarray(p, p + 3333)));
  const cat = Float32Array.from(parts.flatMap((a) => Array.from(a)));
  assert.equal(cat.length, one.length);
  for (let i = 0; i < one.length; i++) assert.ok(Math.abs(cat[i] - one[i]) < 1e-5);
});
test("resample keeps DC level and averages (anti-alias)", () => {
  const dc = new Resampler(48000, 16000).push(new Float32Array(4800).fill(0.5));
  assert.ok(dc.length >= 1599 && dc.every((v) => Math.abs(v - 0.5) < 1e-5));
  const alt = Float32Array.from({ length: 4800 }, (_, i) => (i % 2 ? 1 : -1));
  assert.ok(new Resampler(48000, 16000).push(alt).every((v) => Math.abs(v) < 0.4));
});
test("WAV round trip: header, sample count, values", () => {
  const mono = Float32Array.of(0, 0.5, -0.5, 1, -1, 2);
  const out = encodeWav(mono, 16000);
  const h = parseWavHeader(out);
  assert.deepEqual([h.format, h.channels, h.rate, h.bits, h.dataBytes], [1, 1, 16000, 16, 12]);
  assert.equal(out.length, 44 + 12);
  assert.equal(new DataView(out.buffer).getUint32(4, true), out.length - 8);
  assert.deepEqual(Array.from(floatToInt16(mono)), [0, 16384, -16384, 32767, -32768, 32767]);
});
test("rate never upsamples; sentence from the file's numbers", () => {
  assert.equal(outRateFor(8000), 8000);
  assert.equal(outRateFor(96000), 16000);
  assert.equal(wavBytes(60), 44 + 60 * 32000);
  assert.ok(worthSaying(129 * MB, 24 * MB));
  assert.ok(!worthSaying(10 * MB, 9.5 * MB));
  assert.match(copyLine(129.2 * MB, 23.4 * MB), /^129\.2MB → about 23\.4MB copy for the coach · your original is kept/);
});
