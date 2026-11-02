// MP3 out, for sharing and previews. WAV stays the delivery format for
// distributors: an MP3 throws information away, and the screen says so.
//
// The encoder is LAME's (lamejs, LGPL-3.0). It is loaded as its own chunk the
// first time somebody asks for an MP3, unmodified, so it is never bundled into
// the app's own code and nobody who only wants a WAV downloads it.
//
// An encoder rebuilds the waveform from fewer bits, and the rebuilt peaks can
// land above the master's — which is why the master is held under −1 dBTP in
// the first place. Below 192 kbps the overshoot grows, so the screen warns.

export const MP3_KBPS = [128, 192, 256, 320];
export const MP3_DEFAULT_KBPS = 320;

const FRAME = 1152;

function toInt16(x) {
  const out = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const s = Math.round(x[i] * 32767);
    out[i] = s > 32767 ? 32767 : s < -32768 ? -32768 : s;
  }
  return out;
}

// LAME encodes 32, 44.1 and 48 kHz (and the lower MPEG-2 rates); a master at
// 88.2 or 96 kHz has to be exported at one of the export rates first.
export const MP3_RATES = [32000, 44100, 48000];

export async function encodeMp3(channels, sampleRate, { kbps = MP3_DEFAULT_KBPS, onProgress } = {}) {
  if (!MP3_RATES.includes(sampleRate)) {
    throw new Error(`MP3 needs 44.1 or 48 kHz; this master is ${sampleRate / 1000} kHz. Pick an export rate first.`);
  }
  if (!MP3_KBPS.includes(kbps)) kbps = MP3_DEFAULT_KBPS;
  const mod = await import("@breezystack/lamejs");
  const { Mp3Encoder } = mod.Mp3Encoder ? mod : mod.default;
  const stereo = channels.length > 1;
  const enc = new Mp3Encoder(stereo ? 2 : 1, sampleRate, kbps);
  const l = toInt16(channels[0]);
  const r = stereo ? toInt16(channels[1]) : null;
  const parts = [];
  let size = 0;
  for (let i = 0; i < l.length; i += FRAME) {
    const chunk = stereo ? enc.encodeBuffer(l.subarray(i, i + FRAME), r.subarray(i, i + FRAME))
      : enc.encodeBuffer(l.subarray(i, i + FRAME));
    if (chunk.length) { parts.push(chunk); size += chunk.length; }
    if (onProgress && i % (FRAME * 400) === 0) onProgress(i / l.length);
  }
  const tail = enc.flush();
  if (tail.length) { parts.push(tail); size += tail.length; }
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out.buffer;
}

// What an MP3 at `kbps` will weigh, for stating the size before it is made.
export function mp3Mb(seconds, kbps) {
  return (seconds * kbps * 1000) / 8 / (1024 * 1024);
}
