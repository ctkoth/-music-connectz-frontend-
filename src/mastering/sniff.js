// The sample rate a file was MADE at, read from its header.
//
// Why this exists: the browser's decodeAudioData resamples to whatever rate
// its context runs at. Decode a 48 kHz master in a 44.1 kHz context and the
// member downloads a 44.1 kHz file without anyone deciding that. So the rate
// is read here first and the decoding context is built at it. Unknown formats
// return null and the caller says which rate it used.

const MP3_RATES = {
  3: [44100, 48000, 32000],   // MPEG-1
  2: [22050, 24000, 16000],   // MPEG-2
  0: [11025, 12000, 8000],    // MPEG-2.5
};

const str = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));

function wav(b) {
  if (str(b, 0, 4) !== "RIFF" || str(b, 8, 4) !== "WAVE") return null;
  let o = 12;
  while (o + 8 <= b.length) {
    const id = str(b, o, 4);
    const size = b[o + 4] | (b[o + 5] << 8) | (b[o + 6] << 16) | (b[o + 7] << 24);
    if (id === "fmt ") return (b[o + 12] | (b[o + 13] << 8) | (b[o + 14] << 16) | (b[o + 15] << 24)) >>> 0;
    o += 8 + size + (size & 1);
  }
  return null;
}

function flac(b) {
  if (str(b, 0, 4) !== "fLaC") return null;
  // STREAMINFO is always the first metadata block; the rate is the top 20
  // bits starting 10 bytes into its body.
  const s = 8 + 10;
  return ((b[s] << 12) | (b[s + 1] << 4) | (b[s + 2] >> 4)) >>> 0 || null;
}

function mp3(b) {
  let o = 0;
  if (str(b, 0, 3) === "ID3") {
    const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
    o = 10 + size;
  }
  for (let i = o; i + 4 < Math.min(b.length, o + 64 * 1024); i++) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) continue;
    const version = (b[i + 1] >> 3) & 3;      // 3 = MPEG-1, 2 = MPEG-2, 0 = 2.5
    const layer = (b[i + 1] >> 1) & 3;
    const idx = (b[i + 2] >> 2) & 3;
    if (version === 1 || layer === 0 || idx === 3) continue;
    return MP3_RATES[version][idx];
  }
  return null;
}

function ogg(b) {
  if (str(b, 0, 4) !== "OggS") return null;
  const head = str(b, 0, Math.min(b.length, 512));
  // Opus always decodes at 48 kHz, whatever the input rate field says.
  if (head.includes("OpusHead")) return 48000;
  const v = head.indexOf("\x01vorbis");
  if (v >= 0) {
    const r = v + 7 + 4 + 1;
    return (b[r] | (b[r + 1] << 8) | (b[r + 2] << 16) | (b[r + 3] << 24)) >>> 0 || null;
  }
  return null;
}

function mp4(b) {
  if (str(b, 4, 4) !== "ftyp") return null;
  // Find the AudioSampleEntry ('mp4a', 'alac', 'fLaC', 'Opus'); its rate is a
  // 16.16 fixed-point field 24 bytes into the entry's body.
  const limit = Math.min(b.length - 32, 8 * 1024 * 1024);
  for (let i = 8; i < limit; i++) {
    const t = str(b, i, 4);
    if (t === "mp4a" || t === "alac" || t === "fLaC" || t === "Opus") {
      const p = i + 4 + 24;
      const rate = (b[p] << 8) | b[p + 1];
      if (rate >= 8000 && rate <= 192000) return t === "Opus" ? 48000 : rate;
    }
  }
  return null;
}

export function sniffSampleRate(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length < 16) return null;
  for (const f of [wav, flac, ogg, mp4, mp3]) {
    try {
      const r = f(b);
      if (r && r >= 8000 && r <= 384000) return r;
    } catch { /* a malformed header is just "unknown" */ }
  }
  return null;
}
