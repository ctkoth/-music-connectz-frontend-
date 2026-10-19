// WAV out. A master is delivered as PCM — every distributor takes it and no
// lossy encoder gets a say in the sound before the member does.
//
// Dither: going to 16 bits rounds every sample to one of 65,536 steps, and on
// quiet passages that rounding is correlated with the music and heard as a
// gritty distortion on fades and reverb tails. TPDF dither adds ±1 step of
// triangular noise first, which turns that distortion into a steady hiss
// about 96 dB down. It is the industry default for 16-bit delivery and it is
// on unless the member turns it off. 24-bit's steps are 256 times finer, so
// its rounding sits around −144 dB, below any playback chain; no dither is
// added there and the screen says why.
import { xorshift } from "./dsp.js";

function writeStr(view, off, s) {
  for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
}

export function encodeWav(channels, sampleRate, { bitDepth = 24, dither = true, seed = 1 } = {}) {
  const ch = channels.length;
  const n = channels[0].length;
  const float = bitDepth === 32;
  const bytes = bitDepth / 8;
  const dataLen = n * ch * bytes;
  const fmtLen = float ? 18 : 16;
  const factLen = float ? 12 : 0;
  const headerLen = 12 + (8 + fmtLen) + factLen + 8;
  const buf = new ArrayBuffer(headerLen + dataLen);
  const v = new DataView(buf);
  writeStr(v, 0, "RIFF");
  v.setUint32(4, headerLen + dataLen - 8, true);
  writeStr(v, 8, "WAVE");
  writeStr(v, 12, "fmt ");
  v.setUint32(16, fmtLen, true);
  v.setUint16(20, float ? 3 : 1, true);       // 1 = PCM, 3 = IEEE float
  v.setUint16(22, ch, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * ch * bytes, true);
  v.setUint16(32, ch * bytes, true);
  v.setUint16(34, bitDepth, true);
  let off = 36;
  if (float) {
    v.setUint16(off, 0, true); off += 2;       // cbSize
    writeStr(v, off, "fact"); v.setUint32(off + 4, 4, true); v.setUint32(off + 8, n, true); off += 12;
  }
  writeStr(v, off, "data");
  v.setUint32(off + 4, dataLen, true);
  off += 8;

  const rand = xorshift(seed);
  const useDither = dither && bitDepth === 16;
  if (float) {
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { v.setFloat32(off, channels[c][i], true); off += 4; }
  } else if (bitDepth === 16) {
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
      let s = channels[c][i] * 32767;
      if (useDither) s += rand() - rand();       // TPDF, ±1 LSB
      s = Math.round(s);
      v.setInt16(off, s > 32767 ? 32767 : s < -32768 ? -32768 : s, true);
      off += 2;
    }
  } else if (bitDepth === 24) {
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
      let s = Math.round(channels[c][i] * 8388607);
      if (s > 8388607) s = 8388607; else if (s < -8388608) s = -8388608;
      v.setUint8(off, s & 0xff);
      v.setUint8(off + 1, (s >> 8) & 0xff);
      v.setUint8(off + 2, (s >> 16) & 0xff);
      off += 3;
    }
  } else {
    throw new Error(`unsupported bit depth ${bitDepth}`);
  }
  return buf;
}

// The inverse, for tests and for reading back what was just written.
export function decodeWav(buf) {
  const v = new DataView(buf);
  const fmtTag = v.getUint16(20, true);
  const ch = v.getUint16(22, true);
  const sampleRate = v.getUint32(24, true);
  const bitDepth = v.getUint16(34, true);
  let off = 12;
  let data = -1, len = 0;
  while (off + 8 <= buf.byteLength) {
    const id = String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3));
    const size = v.getUint32(off + 4, true);
    if (id === "data") { data = off + 8; len = size; break; }
    off += 8 + size + (size & 1);
  }
  const bytes = bitDepth / 8;
  const n = len / (ch * bytes);
  const out = Array.from({ length: ch }, () => new Float32Array(n));
  let p = data;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    let s;
    if (fmtTag === 3) s = v.getFloat32(p, true);
    else if (bitDepth === 16) s = v.getInt16(p, true) / 32768;
    else { s = v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16); s /= 8388608; }
    out[c][i] = s; p += bytes;
  }
  return { sampleRate, bitDepth, channels: out };
}
