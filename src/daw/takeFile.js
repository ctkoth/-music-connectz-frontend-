// A take as a file. A region is a window (in..out, seconds) onto a recording the DAW already holds on the device, so
// saving it is cutting that window out and writing it as a WAV — no server, no charge. What is written is the clip as
// trimmed, as recorded: NOT the track's fader, pan, effects or the region's gain and fades (those belong to the mix,
// which Bounce writes), and the screen says so beside the button.

/** The `in`..`out` window of every channel, clamped to the recording. Null when nothing is left. */
export function sliceChannels(chans, sampleRate, inSec, outSec) {
  if (!Array.isArray(chans) || !chans.length || !(sampleRate > 0)) return null;
  const len = chans[0].length;
  const a = Math.max(0, Math.min(len, Math.floor((Number(inSec) || 0) * sampleRate)));
  const b = Math.max(0, Math.min(len, Math.ceil((Number(outSec) || 0) * sampleRate)));
  if (b <= a) return null;
  return chans.map((c) => c.slice(a, b));
}

/** Bytes a 24-bit WAV of this many frames takes, so the size can be said BEFORE it is made. */
export const wavBytes = (frames, channels, bitDepth = 24) => 44 + Math.max(0, frames) * channels * (bitDepth / 8);

/** A filename a file system accepts: no slashes or colons, trimmed, never empty. */
export function takeFileName(...parts) {
  const base = parts.map((p) => String(p || "").trim().replace(/\.(wav|mp3|m4a|aac|ogg|flac|webm|mp4)$/i, "")).filter(Boolean).join(" - ")
    .replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `${base || "take"}.wav`;
}
