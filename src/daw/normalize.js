// Normalize a track: the fader gain that puts the track's loudest sample at a target peak. Pure and tested.
// It is PEAK normalizing (the loudest instant), not loudness: two tracks normalized to the same peak can still sound
// different in level, so the screen says so. Measured on the track as it sounds solo at 0 dB, centre, with its effects.
import { GAIN_DB } from "./session.js";

export const NORMALIZE_TARGET_DB = -1;

/** Highest absolute sample across every channel, 0..1+ (not dB). */
export function peakOf(channels) {
  let p = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > p) p = a; }
  return p;
}

/** { peakDb, gain, clamped } for a measured track, or null when it is silent (nothing to normalize). */
export function normalizeGain(channels, targetDb = NORMALIZE_TARGET_DB) {
  const peak = peakOf(channels);
  if (peak < 1e-5) return null;                          // under about -100 dBFS: silence, not a quiet take
  const peakDb = 20 * Math.log10(peak);
  const want = targetDb - peakDb;
  const gain = Math.min(GAIN_DB.max, Math.max(GAIN_DB.min, Math.round(want * 10) / 10));
  return { peakDb: Math.round(peakDb * 10) / 10, gain, clamped: gain !== Math.round(want * 10) / 10 };
}
