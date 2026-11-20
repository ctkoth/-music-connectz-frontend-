// Input levels, in words. Pure: samples in, a verdict out, so it is tested under node. The thresholds are the usual ones for
// recording: aim to peak between about -18 and -6 dBFS, because below that the noise floor is a bigger share of the take and
// above -1 dBFS the converter is about to clip, which cannot be repaired afterwards.
export const FLOOR_DB = -60;

/** Peak and RMS of a block, in dBFS (0 = full scale). Silence is the floor, never -Infinity. */
export function levelFromSamples(buf) {
  let peak = 0, sum = 0;
  for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > peak) peak = a; sum += buf[i] * buf[i]; }
  const db = (x) => (x > 0 ? Math.max(FLOOR_DB, 20 * Math.log10(x)) : FLOOR_DB);
  return { peakDb: db(peak), rmsDb: db(Math.sqrt(sum / (buf.length || 1))), clipped: peak >= 0.999 };
}

/** A held peak that falls back slowly (dB per second), so a brief spike stays readable. */
export function holdPeak(prev, now, dt, fall = 12) {
  return Math.max(now, (prev ?? FLOOR_DB) - fall * dt);
}

/** What to tell the performer about the level they are sending. */
export function levelAdvice(peakDb, clipped) {
  if (clipped || peakDb >= -1) return { state: "clip", say: "Too loud: it is clipping, and clipping can't be fixed later. Turn the input gain down on your interface or mic, or sing further back." };
  if (peakDb > -6) return { state: "hot", say: "Close to the top. Leave a little room: aim for peaks between -18 and -6." };
  if (peakDb >= -18) return { state: "good", say: "Good level: your peaks sit in the sweet spot, with room above and well clear of the noise." };
  if (peakDb > -40) return { state: "low", say: "A bit quiet. Raise the input gain a little so the take sits well above the noise." };
  return { state: "silent", say: "Almost nothing is coming in. Check the right input is chosen, the mic is on, and the gain is up." };
}

/** Position 0..1 along a meter that runs from the floor to 0 dBFS. */
export const meterPos = (db) => Math.min(1, Math.max(0, (db - FLOOR_DB) / -FLOOR_DB));

/** A round-trip estimate the screen can show beside the monitor switch (output + base latency), in ms, or null if the browser does not say. */
export function latencyMs(ctx) {
  const t = (ctx?.baseLatency || 0) + (ctx?.outputLatency || 0);
  return t > 0 ? Math.round(t * 1000) : null;
}
