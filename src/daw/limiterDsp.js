// The DAW limiter's DSP: a stereo-linked LOOKAHEAD limiter. The signal is delayed by `D` samples while the
// gain for each sample is worked out from the peaks that are still coming, so the gain is already down when a
// peak arrives and nothing has to be clipped. Same construction as the mastering limiter (`limiterGains` in
// mastering/master.js), run block by block so it can live in an AudioWorklet and in the bounce alike.
//
// For the sample at index k:
//   req[j]  = ceiling / (linked peak[j] * drive)   when that peak would pass the ceiling, else 1
//   hold[k] = min(req[k .. k+L-1])                 the gain every sample in the window can afford
//   gain[k] = mean(hold[k-L+1 .. k])               a smooth ramp, which is why it does not crackle
// Every value averaged into gain[k] is a minimum over a window that contains k, so gain[k] <= req[k]: the
// output cannot pass the ceiling (for the samples; see the note on true peak in plugins.js). Release is
// applied to `hold`, not to the final gain, so the guarantee is untouched.
//
// SELF-CONTAINED ON PURPOSE: `limiterWorkletSource()` prints this function into the worklet, which has no
// imports, so nothing here may reach outside its own body.

export function createLimiterCore(fs, lookMs = 2) {
  const L = Math.max(2, Math.round((lookMs / 1000) * fs));
  const D = L - 1;                              // the signal is late by this many samples
  const dl = new Float32Array(D), dr = new Float32Array(D);   // signal delay lines
  const req = new Float32Array(L);              // last L requested gains
  const hold = new Float64Array(L);             // last L held gains (for the moving mean)
  req.fill(1); hold.fill(1);                    // nothing requested yet: no reduction
  let w = 0, sum = L, prev = 1, grMax = 1, n = 0;

  /** In: channels l, r (r may be the same array as l) and the settings. Out: o1/o2. Returns the gain
   *  reduction in dB the block needed at most (0 = untouched). */
  function process(l, r, o1, o2, len, drive, ceiling, releaseMs) {
    const rc = 1 - Math.exp(-1 / (Math.max(1, releaseMs) / 1000 * fs));
    grMax = 1;
    for (let i = 0; i < len; i++) {
      const a = l[i], b = r[i];
      const peak = Math.max(Math.abs(a), Math.abs(b)) * drive;
      const wi = w % L;
      req[wi] = peak > ceiling ? ceiling / peak : 1;
      let m = 1;
      for (let k = 0; k < L; k++) if (req[k] < m) m = req[k];     // min over the last L requests
      // release: the held gain may fall at once but climbs back no faster than the release allows
      const up = prev + (1 - prev) * rc;
      prev = m < up ? m : up;
      sum += prev - hold[wi]; hold[wi] = prev;
      if (++n >= 1 << 16) { n = 0; sum = 0; for (let k = 0; k < L; k++) sum += hold[k]; }   // stop float drift
      const g = sum / L;
      if (g < grMax) grMax = g;
      // the delayed sample, scaled by the gain computed from the peaks that were ahead of it
      const di = w % D;
      const ol = dl[di] * drive * g, or = dr[di] * drive * g;
      dl[di] = a; dr[di] = b;
      o1[i] = ol; o2[i] = or;
      w++;
    }
    return grMax >= 1 ? 0 : -20 * Math.log10(grMax);
  }
  return { process, latency: D };
}

/** The worklet's source text: the core above plus the thin processor around it. */
export function limiterWorkletSource() {
  // `const createLimiterCore = <the function>`: a production build RENAMES the function, and the worklet below calls it by its
  // original name, so printing the bare declaration left the processor throwing "createLimiterCore is not defined" the moment
  // it was made (silent in dev, where nothing is renamed — found by reading the minified bundle).
  return `
const createLimiterCore = ${createLimiterCore.toString()};
class McLimiter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "drive", defaultValue: 1, minValue: 0, maxValue: 16, automationRate: "k-rate" },
      { name: "ceiling", defaultValue: 0.89, minValue: 0.001, maxValue: 1, automationRate: "k-rate" },
      { name: "release", defaultValue: 100, minValue: 1, maxValue: 5000, automationRate: "k-rate" },
    ];
  }
  constructor() { super(); this.core = createLimiterCore(sampleRate, 2); this.t = 0; }
  process(inputs, outputs, p) {
    const inp = inputs[0], out = outputs[0];
    if (!inp || !inp.length || !out || !out.length) return true;
    const l = inp[0], r = inp[1] || inp[0];
    const o2 = out[1] || new Float32Array(l.length);
    const gr = this.core.process(l, r, out[0], o2, l.length, p.drive[0], p.ceiling[0], p.release[0]);
    this.t += l.length;
    if (this.t > sampleRate / 20) { this.t = 0; this.port.postMessage({ gr }); }
    return true;
  }
}
registerProcessor("mcz-limiter", McLimiter);`;
}
