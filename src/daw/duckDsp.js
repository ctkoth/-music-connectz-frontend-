// The DAW's sidechain ducker: the level of ANOTHER track (the sidechain: a kick, a voice) turns this track down while it is
// loud — a pad that ducks under the kick, a beat that ducks under the vocal. Run block by block so it lives in an
// AudioWorklet (live and in the bounce alike). SELF-CONTAINED ON PURPOSE: `duckWorkletSource()` prints this function into the
// worklet, which has no imports, so nothing here may reach outside its own body.

export function createDuckCore(fs) {
  let env = 0;
  /** In: the track (l, r) and the sidechain (sl, sr). Out: o1, o2. Returns the most gain reduction in dB the block used. */
  function process(l, r, sl, sr, o1, o2, len, thrDb, ratio, attMs, relMs, depthDb) {
    const ca = 1 - Math.exp(-1 / (Math.max(0.1, attMs) / 1000 * fs));
    const cr = 1 - Math.exp(-1 / (Math.max(1, relMs) / 1000 * fs));
    const slope = 1 - 1 / Math.max(1, ratio);
    let worst = 0;
    for (let i = 0; i < len; i++) {
      const peak = Math.max(Math.abs(sl[i]), Math.abs(sr[i]));
      env += (peak - env) * (peak > env ? ca : cr);
      const over = 20 * Math.log10(env + 1e-9) - thrDb;
      const gr = over > 0 ? Math.min(depthDb, over * slope) : 0;
      if (gr > worst) worst = gr;
      const g = gr > 0 ? Math.pow(10, -gr / 20) : 1;
      o1[i] = l[i] * g; o2[i] = r[i] * g;
    }
    return worst;
  }
  return { process };
}

export function duckWorkletSource() {
  return `
const createDuckCore = ${createDuckCore.toString()};
class McDuck extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "threshold", defaultValue: -30, minValue: -80, maxValue: 0, automationRate: "k-rate" },
      { name: "ratio", defaultValue: 6, minValue: 1, maxValue: 20, automationRate: "k-rate" },
      { name: "attack", defaultValue: 5, minValue: 0.1, maxValue: 200, automationRate: "k-rate" },
      { name: "release", defaultValue: 150, minValue: 1, maxValue: 2000, automationRate: "k-rate" },
      { name: "depth", defaultValue: 18, minValue: 0, maxValue: 60, automationRate: "k-rate" },
    ];
  }
  constructor() { super(); this.core = createDuckCore(sampleRate); this.dead = false; this.zero = new Float32Array(128); this.port.onmessage = (e) => { if (e.data === "stop") this.dead = true; }; }
  process(inputs, outputs, p) {
    if (this.dead) return false;
    const inp = inputs[0], sc = inputs[1], out = outputs[0];
    if (!inp || !inp.length || !out || !out.length) return true;
    const l = inp[0], r = inp[1] || inp[0];
    const sl = sc && sc.length ? sc[0] : this.zero, sr = sc && sc.length ? (sc[1] || sc[0]) : this.zero;
    const o2 = out[1] || new Float32Array(l.length);
    this.core.process(l, r, sl, sr, out[0], o2, l.length, p.threshold[0], p.ratio[0], p.attack[0], p.release[0], p.depth[0]);
    // A mono track comes out as two equal channels. The pan after it treats stereo at full level where it would have put mono
    // at -3 dB a side, so without this, adding the ducker would make a mono track 3 dB louder even when nothing ducks.
    if (inp.length === 1) { const k = Math.SQRT1_2; for (let i = 0; i < l.length; i++) { out[0][i] *= k; o2[i] *= k; } }
    return true;
  }
}
registerProcessor("mcz-duck", McDuck);
`;
}
