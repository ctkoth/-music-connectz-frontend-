// Time-stretch a clip to the project's tempo (Mixcraft's "Use Project Tempo"), pitch kept. Pure, so it runs under
// plain node. The stretch itself is pitch.js's WSOLA — the same one that transposes a track — and the clip's own
// tempo comes from the tempo detector, or from the member typing it, which always wins.
import { wsola } from "./pitch.js";

export const STRETCH_MIN = 0.5, STRETCH_MAX = 2;          // beyond this a stretch sounds like a different recording

/** A detected tempo is often the half or double of what the music feels like; pick the reading nearest the project's. */
export function foldTempo(bpm, target) {
  if (!(bpm > 0) || !(target > 0)) return null;
  return [bpm / 2, bpm, bpm * 2].reduce((best, c) => (Math.abs(Math.log(c / target)) < Math.abs(Math.log(best / target)) ? c : best));
}

/** How much longer the clip becomes: a 100 BPM clip at a 120 BPM project is 100/120 as long. null when out of range. */
export function stretchFor(clipBpm, projectBpm) {
  if (!(clipBpm > 0) || !(projectBpm > 0)) return null;
  const r = clipBpm / projectBpm;
  return r >= STRETCH_MIN && r <= STRETCH_MAX ? r : null;
}

/** The region's part of a source, stretched: channels in, channels out. */
export function stretchChannels(channels, rate, from, to, ratio) {
  const a = Math.max(0, Math.round(from * rate)), b = Math.min(channels[0].length, Math.round(to * rate));
  return channels.map((c) => wsola(c.subarray(a, b), ratio, rate));
}
