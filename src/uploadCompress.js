// A smaller COPY of an audio take, made in the browser, for the coach only.
//
// A member sent a 129MB WAV and watched it upload for about five minutes. The
// coach does not need a studio file to score a take, and a WAV is mostly
// numbers nobody will ever hear. So before the coach POST, a big audio take is
// turned into 16-bit mono WAV at (up to) 16kHz — 32KB a second, whatever the
// original was — and THAT is what goes up.
//
// What this does and does not claim:
//
// * It is a copy for SCORING. The original is never touched: PostZ, "Post this
//   take with the coach's read", storage and the member's own file are the
//   original. Nothing here replaces what the member keeps.
// * It is smaller and faster to send. That is all the UI says. Whether Google
//   itself reduces audio on its side is not something this repo can verify
//   (nothing in the backend states it), so no sentence leans on it. Speech and
//   instrument pitch/timing live well under 8kHz, which is why 16kHz is the
//   choice, but a copy is never lossless and the screen says "copy".
// * Nobody is gated. A tier says how much, never whether; a faster upload helps
//   every tier equally. There is one level.
// * Any failure means the ORIGINAL is sent, as before. `compressForCoach`
//   never throws.
// * No transcoding of video in v1: video is skipped, and says nothing.
//
// Pure functions are at the top and run under plain node (no import.meta.env,
// nothing touching window at import time). The browser half is at the bottom.

export const TARGET_RATE = 16000;
export const MB = 1024 * 1024;
/** Under this a file is already quick to send; compressing it is wasted effort. */
export const SKIP_BELOW_BYTES = 8 * MB;
/** The streaming WAV path never holds the file, so this is only a sanity ceiling
 *  (the coach's own ceiling is 200MB). */
export const MAX_WAV_BYTES = 400 * MB;
/** Compressed formats (mp3, m4a, flac, ogg) must be fully decoded by the
 *  browser, ~10x their size in floats. Above this, send the original. */
export const MAX_DECODE_BYTES = 40 * MB;
/** Longest audio the decode path will take (decoded float memory on a phone). */
export const MAX_DECODE_SECONDS = 20 * 60;
const CHUNK_BYTES = 4 * MB;

const WAV_TYPES = new Set(["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"]);
const DECODE_TYPES = /^audio\/(mpeg|mp3|mp4|x-m4a|m4a|aac|flac|x-flac|ogg|opus|webm|aiff|x-aiff)$/;

/** Is this file a WAV, by type or by name? */
export function looksLikeWav(file) {
  const t = String(file?.type || "").split(";")[0].trim().toLowerCase();
  return WAV_TYPES.has(t) || /\.wave?$/i.test(String(file?.name || ""));
}

/**
 * Decide, from what is known before reading anything, whether to try.
 * Returns { action: "skip" | "wav" | "decode", reason }.
 * `reason` is a slug for tests, never copy.
 */
export function planCompression(file, { isVideo = false } = {}) {
  if (!file || !file.size) return { action: "skip", reason: "empty" };
  if (isVideo || String(file.type || "").startsWith("video/")) return { action: "skip", reason: "video" };
  if (file.size < SKIP_BELOW_BYTES) return { action: "skip", reason: "small" };
  if (looksLikeWav(file)) {
    return file.size > MAX_WAV_BYTES ? { action: "skip", reason: "too_big" } : { action: "wav", reason: "wav" };
  }
  const t = String(file.type || "").split(";")[0].trim().toLowerCase();
  if (DECODE_TYPES.test(t)) {
    return file.size > MAX_DECODE_BYTES ? { action: "skip", reason: "too_big_to_decode" } : { action: "decode", reason: "compressed" };
  }
  return { action: "skip", reason: "not_audio" };
}

/** Bytes of a 16-bit mono WAV of this length at this rate. */
export function wavBytes(seconds, rate = TARGET_RATE) {
  return 44 + Math.round(seconds * rate) * 2;
}

/** The rate we write: never upsample, so an 8kHz file stays 8kHz. */
export function outRateFor(inRate) {
  return Math.max(1, Math.min(TARGET_RATE, Math.round(inRate) || TARGET_RATE));
}

/** Number of output samples the resampler yields for n input samples. */
export function resampledLength(n, inRate, outRate) {
  return Math.floor((n * outRate) / inRate);
}

/**
 * Read a RIFF/WAVE header out of the first bytes of a file.
 * Returns { format, channels, rate, bits, dataOffset, dataBytes } or null.
 * format: 1 = integer PCM, 3 = IEEE float; WAVE_FORMAT_EXTENSIBLE is unwrapped
 * to its sub-format. A data size of 0 or 0xFFFFFFFF (streamed WAVs) or one
 * running past the file is clamped to `fileSize`.
 */
export function parseWavHeader(bytes, fileSize = bytes.length) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o) => (o + 4 <= bytes.length ? String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]) : "");
  if (bytes.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;
  let off = 12;
  let fmt = null;
  while (off + 8 <= bytes.length) {
    const id = tag(off);
    const size = dv.getUint32(off + 4, true);
    const body = off + 8;
    if (id === "fmt " && body + 16 <= bytes.length) {
      let format = dv.getUint16(body, true);
      const channels = dv.getUint16(body + 2, true);
      const rate = dv.getUint32(body + 4, true);
      const bits = dv.getUint16(body + 14, true);
      if (format === 0xfffe && size >= 26 && body + 26 <= bytes.length) format = dv.getUint16(body + 24, true);
      fmt = { format, channels, rate, bits };
    } else if (id === "data") {
      if (!fmt) return null;
      let dataBytes = size;
      if (dataBytes === 0 || dataBytes === 0xffffffff || body + dataBytes > fileSize) dataBytes = Math.max(0, fileSize - body);
      return { ...fmt, dataOffset: body, dataBytes };
    }
    off = body + size + (size & 1);
  }
  return null;
}

/** Is this header one the streaming reader can convert? */
export function wavSupported(h) {
  if (!h || !h.channels || !h.rate) return false;
  if (h.format === 1) return [8, 16, 24, 32].includes(h.bits);
  if (h.format === 3) return h.bits === 32;
  return false;
}

/** Seconds of audio a header describes. */
export function wavSeconds(h) {
  const frame = h.channels * (h.bits / 8);
  return frame ? h.dataBytes / frame / h.rate : 0;
}

/**
 * Decode whole frames of interleaved PCM into ONE mono Float32 channel (the
 * average of all channels). Trailing partial frames are dropped.
 */
export function pcmToMono(bytes, h) {
  const bps = h.bits / 8;
  const frame = h.channels * bps;
  const n = Math.floor(bytes.length / frame);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(n);
  const ch = h.channels;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let o = i * frame;
    for (let c = 0; c < ch; c++, o += bps) {
      let v;
      if (h.format === 3) v = dv.getFloat32(o, true);
      else if (h.bits === 16) v = dv.getInt16(o, true) / 32768;
      else if (h.bits === 8) v = (bytes[o] - 128) / 128;
      else if (h.bits === 24) v = (((bytes[o + 2] << 24) | (bytes[o + 1] << 16) | (bytes[o] << 8)) >> 8) / 8388608;
      else v = dv.getInt32(o, true) / 2147483648;
      sum += v;
    }
    out[i] = sum / ch;
  }
  return out;
}

/** Average several equal-length Float32 channels into one. */
export function downmix(channels) {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i];
  const k = 1 / channels.length;
  for (let i = 0; i < n; i++) out[i] *= k;
  return out;
}

/**
 * Streaming box-filter resampler. Each output sample is the average of the
 * input span it covers, which is the anti-aliasing a plain pick-every-Nth
 * decimation lacks. Feed chunks with push(); outputs are the same whatever the
 * chunking, so a read boundary never changes a sample.
 */
export class Resampler {
  constructor(inRate, outRate) {
    this.ratio = inRate / outRate;
    this.pos = 0;            // input samples consumed so far
    this.acc = 0;            // weighted sum for the current output sample
    this.next = this.ratio;  // input position where the current output ends
  }

  push(input) {
    if (this.ratio === 1) return input;
    const out = new Float32Array(Math.ceil(input.length / this.ratio) + 2);
    let k = 0;
    for (let i = 0; i < input.length; i++) {
      const s = input[i];
      const start = this.pos;
      const end = start + 1;
      if (end < this.next) {
        this.acc += s;
      } else {
        // The sample straddles (or ends exactly on) the output boundary.
        this.acc += s * (this.next - start);
        out[k++] = this.acc / this.ratio;
        this.acc = s * (end - this.next);
        this.next += this.ratio;
      }
      this.pos = end;
    }
    return out.subarray(0, k);
  }
}

export function floatToInt16(f) {
  const o = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const v = Math.max(-1, Math.min(1, f[i]));
    o[i] = v < 0 ? Math.round(v * 32768) : Math.round(v * 32767);
  }
  return o;
}

/** 44-byte header for 16-bit mono PCM of `samples` samples at `rate`. */
export function wavHeader(samples, rate) {
  const b = new ArrayBuffer(44);
  const dv = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  const dataBytes = samples * 2;
  w(0, "RIFF"); dv.setUint32(4, 36 + dataBytes, true); w(8, "WAVE");
  w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, "data"); dv.setUint32(40, dataBytes, true);
  return new Uint8Array(b);
}

/** Whole-buffer encode (tests, and the decode path). Returns a Uint8Array. */
export function encodeWav(mono, rate) {
  const pcm = floatToInt16(mono);
  const out = new Uint8Array(44 + pcm.length * 2);
  out.set(wavHeader(pcm.length, rate), 0);
  out.set(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength), 44);
  return out;
}

function fmtBytes(n) {
  return n < MB ? `${Math.max(1, Math.round(n / 1024))}KB` : `${(n / MB).toFixed(1)}MB`;
}

/** "129.2MB → about 23.4MB copy for the coach · …" — numbers from the file. */
export function copyLine(originalBytes, estimateBytes) {
  return `${fmtBytes(originalBytes)} → about ${fmtBytes(estimateBytes)} copy for the coach · your original is kept for posting`;
}

/** Only worth saying (and doing) when the copy is meaningfully smaller. */
export function worthSaying(originalBytes, estimateBytes) {
  return estimateBytes > 0 && estimateBytes < originalBytes * 0.85;
}

// ---------------------------------------------------------------------------
// Browser half. Everything below touches File/Blob/window only when CALLED.
// ---------------------------------------------------------------------------

async function readHead(file, n = 64 * 1024) {
  return new Uint8Array(await file.slice(0, Math.min(n, file.size)).arrayBuffer());
}

/**
 * What the copy will weigh, from the file alone (WAV: exact, from the header).
 * Resolves null when it cannot be known without decoding, or no worthwhile
 * copy will be made. Never throws.
 */
export async function previewCopy(file, opts) {
  try {
    const plan = planCompression(file, opts);
    if (plan.action !== "wav") return null;
    const h = parseWavHeader(await readHead(file), file.size);
    if (!wavSupported(h)) return null;
    const seconds = wavSeconds(h);
    const est = wavBytes(seconds, outRateFor(h.rate));
    return worthSaying(file.size, est) ? { seconds, estimateBytes: est, originalBytes: file.size } : null;
  } catch {
    return null;
  }
}

async function compressWav(file, h, onProgress) {
  const outRate = outRateFor(h.rate);
  const rs = new Resampler(h.rate, outRate);
  const frame = h.channels * (h.bits / 8);
  const step = Math.max(frame, Math.floor(CHUNK_BYTES / frame) * frame);
  const parts = [null]; // slot 0 = header, written last
  let samples = 0;
  const end = h.dataOffset + h.dataBytes - (h.dataBytes % frame);
  for (let p = h.dataOffset; p < end; p += step) {
    const bytes = new Uint8Array(await file.slice(p, Math.min(end, p + step)).arrayBuffer());
    const out = floatToInt16(rs.push(pcmToMono(bytes, h)));
    samples += out.length;
    parts.push(out);
    if (onProgress) onProgress(Math.min(1, (p + step - h.dataOffset) / Math.max(1, end - h.dataOffset)));
  }
  parts[0] = wavHeader(samples, outRate);
  return { blob: new Blob(parts, { type: "audio/wav" }), seconds: samples / outRate };
}

async function compressDecoded(file, onProgress) {
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Off) throw new Error("no OfflineAudioContext");
  const buf = await file.arrayBuffer();
  const audio = await new Promise((res, rej) => {
    const p = new Off(1, 1, 44100).decodeAudioData(buf, res, rej);
    if (p && p.then) p.then(res, rej);
  });
  if (audio.duration > MAX_DECODE_SECONDS) throw new Error("too long to decode safely");
  const outRate = outRateFor(audio.sampleRate);
  const len = Math.max(1, Math.round(audio.duration * outRate));
  // Rendering into a mono 16kHz context makes the browser downmix and resample.
  const ctx = new Off(1, len, outRate);
  const src = ctx.createBufferSource();
  src.buffer = audio;
  src.connect(ctx.destination);
  src.start();
  const rendered = await ctx.startRendering();
  if (onProgress) onProgress(1);
  return { blob: new Blob([encodeWav(rendered.getChannelData(0), outRate)], { type: "audio/wav" }), seconds: audio.duration };
}

const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * Make the coach copy. ALWAYS resolves; `file` is the thing to upload: the copy
 * when one was made and is really smaller, otherwise the original.
 *
 *   { file, original, compressed, reason, originalBytes, newBytes,
 *     tookSeconds, audioSeconds, method }
 */
export async function compressForCoach(original, { isVideo = false, onProgress } = {}) {
  const t0 = clock();
  const keep = (reason, extra = {}) => ({
    file: original, original, compressed: false, reason,
    originalBytes: original?.size || 0, newBytes: original?.size || 0,
    tookSeconds: (clock() - t0) / 1000, audioSeconds: 0, method: null, ...extra,
  });
  try {
    const plan = planCompression(original, { isVideo });
    if (plan.action === "skip") return keep(plan.reason);
    let made;
    let method = plan.action;
    if (plan.action === "wav") {
      const h = parseWavHeader(await readHead(original), original.size);
      if (wavSupported(h)) made = await compressWav(original, h, onProgress);
      else if (original.size <= MAX_DECODE_BYTES) { made = await compressDecoded(original, onProgress); method = "decode"; }
      else return keep("wav_unsupported");
    } else {
      made = await compressDecoded(original, onProgress);
    }
    if (!made.blob.size || made.blob.size >= original.size * 0.85) return keep("not_smaller");
    const base = String(original.name || "take").replace(/\.[^.]+$/, "") || "take";
    const file = new File([made.blob], `${base}-coach.wav`, { type: "audio/wav" });
    return {
      file, original, compressed: true, reason: "ok",
      originalBytes: original.size, newBytes: file.size,
      tookSeconds: (clock() - t0) / 1000, audioSeconds: made.seconds, method,
    };
  } catch (e) {
    return keep("failed", { error: String(e?.message || e) });
  }
}
