// Mix ConnectZ's mastering chain: measure, decide, process, measure again.
//
// The "AI" in an AI master is only worth the name if every move it makes can
// be traced to something it measured. So `plan()` returns each move WITH the
// measurement that caused it, the screen prints that sentence beside the
// move, and nothing is done that the plan does not name. A member can read
// exactly why their low end came down 1.8 dB, and turn it off.
//
// The chain, in order — the order a mastering engineer works in:
//   0. a separate vocal file, when one is given, is mixed onto the beat at the
//      member's level FIRST — that is a mix, and a master goes over a mix
//   1. rumble filter (20 Hz), then corrective + style EQ, then the member's trims,
//      then the vocal lift (the centre of the mix in the voice range)
//   2. stereo: width on the side channel, low end folded to mono when it is wide
//   3. DynamicZ: punch (a transient shaper) and glue compression — one band
//      or three — the glue only when the track is not already dense
//   4. gain to the loudness target through a true-peak lookahead limiter,
//      re-measured until it lands, and stopped short — and said so — rather
//      than crushing the peaks past the intensity's ceiling.
import {
  dbToGain, gainToDb, peaking, lowShelf, highShelf, highPass, lowPass, biquadInPlace, responseDb,
  truePeakEnvelope, truePeak,
} from "./dsp.js";
import { analyse, integratedLoudness, BANDS } from "./meter.js";
import { resample } from "./resample.js";

export const STYLES = {
  warm: { label: "Warm", slope: -0.4, side: 1.0, desc: "Rounder lows, softer top. Tilts the balance down around 1 kHz." },
  balanced: { label: "Balanced", slope: 0, side: 1.0, desc: "Keeps your mix's own tilt and evens out what sticks out of it." },
  open: { label: "Open", slope: 0.4, side: 1.08, desc: "More air and a little more width. Tilts the balance up around 1 kHz." },
};

// Which of these a member may pick is the SERVER's ladder (catalog.py,
// served with the limits), never decided here: the engine masters at any
// intensity it is handed. `max` is the heaviest compression on offer —
// faster attack, a steeper ratio and the most limiting — which is a sound
// some genres want and most masters should not have.
export const INTENSITY = {
  low: { label: "Low", eqAmount: 0.35, eqMax: 2, glueGr: 1, ratio: 1.5, attackMs: 30, maxLimitGr: 3 },
  medium: { label: "Medium", eqAmount: 0.55, eqMax: 3, glueGr: 2, ratio: 2, attackMs: 30, maxLimitGr: 5 },
  high: { label: "High", eqAmount: 0.75, eqMax: 4.5, glueGr: 3, ratio: 2.5, attackMs: 20, maxLimitGr: 8 },
  max: { label: "Heaviest", eqAmount: 0.85, eqMax: 5, glueGr: 5, ratio: 4, attackMs: 10, maxLimitGr: 12 },
};

// Loudness targets and why each exists. The services' own normalisation is
// what makes "louder" a trade rather than a win: a track mastered to −9 LUFS
// is turned DOWN to their level and arrives with less dynamics, not more
// volume. The screen says that beside the choice.
export const TARGETS = {
  streaming: { label: "Streaming", lufs: -14, ceiling: -1, desc: "Spotify, YouTube, Tidal and Amazon play back near −14 LUFS." },
  apple: { label: "Apple Music", lufs: -16, ceiling: -1, desc: "Apple Music's Sound Check plays back near −16 LUFS." },
  loud: { label: "Loud", lufs: -9, ceiling: -1, desc: "Club and DJ use. Streaming services turn it down to their level." },
};

export const DEFAULTS = {
  style: "balanced", intensity: "medium", target: "streaming",
  width: null,            // percent; null = the style's own
  monoBass: "auto",       // auto | on | off
  eq: true,               // corrective + style EQ; trims still apply when off
  trims: { low: 0, mid: 0, high: 0 },
  glueDb: null,           // compression amount in dB of reduction; null = the intensity's
  lufs: -14,              // the loudness when target is "custom"
  multiband: false,       // DynamicZ: compress lows, mids and highs separately
  punch: 0,               // DynamicZ: −50..+50, softens or sharpens the start of each hit
  vocal: "auto",          // vocal lift: "auto" (measured) or dB on the CENTRE of the mix, 0..VOCAL_LIFT_MAX
  vocalLevel: 0,          // a separate vocal file's level against the beat, ±VOCAL_LEVEL_MAX dB
};

// Vocal lift. A finished stereo mix cannot be un-mixed here — there is no stem
// separation on the device — so the honest move is the one an engineer reaches
// for on a bounced track: the lead vocal almost always sits dead centre, so
// lift the MID channel where a voice lives and leave the sides alone. It raises
// whatever else is centred in that range too (a snare, a centred lead), and the
// screen says so. With the vocal as its own file, `vocalLevel` is the real fix.
export const VOCAL_LIFT_MAX = 6;
export const VOCAL_LIFT_HZ = 2000;   // centre of a wide bell, about 900 Hz to 4.5 kHz
export const VOCAL_LIFT_Q = 0.7;
export const VOCAL_LEVEL_MAX = 12;

// AUTO: the master measures whether the centre of the mix is thin where a voice
// lives, and lifts it only when it is. What is measured is the centre (mid)
// spectrum across these bands against the same target the EQ uses — the mix's
// own tonal trend, or the Inspiration track — AFTER the EQ's own moves, so the
// two never boost the same dip twice. It acts past VOCAL_AUTO_MIN dB, lifts
// VOCAL_AUTO_SHARE of what is missing, and stops at VOCAL_AUTO_MAX: a master
// nudges, it does not remix. It cannot hear "the voice" in a finished track — a
// beat that fills the same range reads as a full centre — and the screen says so.
export const VOCAL_BANDS = [1000, 1250, 1600, 2000, 2500, 3150, 4000];
export const VOCAL_AUTO_MIN = 1;
export const VOCAL_AUTO_SHARE = 0.75;
export const VOCAL_AUTO_MAX = 4;

// The loudness a member may set by hand. Quieter than −20 is not a master; past
// −7 every service turns it down and nothing of the music survives the limiter.
export const CUSTOM_LUFS = { min: -20, max: -7 };
export const PUNCH_MAX = 50;
// Where multiband glue splits the track: under the kick and bass, and above
// the body of the vocal and guitars, where the cymbals and the air live.
export const BANDS_SPLIT = [120, 4000];

export const GLUE_DB_MAX = 8;

const r1 = (v) => Math.round(v * 10) / 10;
const fmtDb = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(r1(v)).toFixed(1)} dB`;
const fmtHz = (f) => (f >= 1000 ? `${r1(f / 1000)} kHz` : `${Math.round(f)} Hz`);

export function cleanSettings(raw = {}) {
  const s = { ...DEFAULTS, ...(raw || {}) };
  if (!STYLES[s.style]) s.style = DEFAULTS.style;
  if (!INTENSITY[s.intensity]) s.intensity = DEFAULTS.intensity;
  if (!TARGETS[s.target] && s.target !== "reference" && s.target !== "custom") s.target = DEFAULTS.target;
  const lu = Number(s.lufs);
  s.lufs = Number.isFinite(lu) ? Math.min(CUSTOM_LUFS.max, Math.max(CUSTOM_LUFS.min, Math.round(lu * 2) / 2)) : DEFAULTS.lufs;
  s.multiband = s.multiband === true;
  const pu = Number(s.punch);
  s.punch = Number.isFinite(pu) ? Math.min(PUNCH_MAX, Math.max(-PUNCH_MAX, Math.round(pu))) : 0;
  const w = Number(s.width);
  s.width = s.width == null || !Number.isFinite(w) ? null : Math.min(150, Math.max(50, w));
  if (!["auto", "on", "off"].includes(s.monoBass)) s.monoBass = "auto";
  s.eq = s.eq !== false;
  const t = { ...DEFAULTS.trims, ...(raw && raw.trims) };
  s.trims = {
    low: Math.min(4, Math.max(-4, Number(t.low) || 0)),
    mid: Math.min(4, Math.max(-4, Number(t.mid) || 0)),
    high: Math.min(4, Math.max(-4, Number(t.high) || 0)),
  };
  if (s.vocal !== "auto") {
    const vl = Number(s.vocal);
    s.vocal = Number.isFinite(vl) ? Math.min(VOCAL_LIFT_MAX, Math.max(0, Math.round(vl * 2) / 2)) : 0;
  }
  const vv = Number(s.vocalLevel);
  s.vocalLevel = Number.isFinite(vv) ? Math.min(VOCAL_LEVEL_MAX, Math.max(-VOCAL_LEVEL_MAX, Math.round(vv * 2) / 2)) : 0;
  const gd = Number(s.glueDb);
  s.glueDb = s.glueDb == null || s.glueDb === "" || !Number.isFinite(gd)
    ? null : Math.min(GLUE_DB_MAX, Math.max(0, gd));
  return s;
}

// ---- The decisions ---------------------------------------------------------

function curveAt(bands, f) {
  const b = bands.find((x) => x.f === f);
  return b ? b.v : null;
}

// What the EQ should do, band by band, before it is turned into filters.
// Without a reference the target is the track's OWN tonal trend, tilted by the
// style — so a bass-heavy trap mix is not dragged toward somebody's idea of a
// "correct" curve, it is evened out against itself. With a reference, the
// target is the reference's measured balance, level-matched over 100 Hz–8 kHz.
export function eqTarget(analysis, settings, reference = null) {
  const style = STYLES[settings.style];
  const meas = analysis.bands.filter((b) => b.db != null && b.f >= 40 && b.f <= 16000);
  let target;
  let basis;
  if (reference && reference.bands) {
    const ref = new Map(reference.bands.filter((b) => b.db != null).map((b) => [b.f, b.db]));
    const shared = meas.filter((b) => ref.has(b.f) && b.f >= 100 && b.f <= 8000);
    const offset = shared.length
      ? shared.reduce((a, b) => a + (b.db - ref.get(b.f)), 0) / shared.length
      : 0;
    target = meas.map((b) => ({ f: b.f, v: ref.has(b.f) ? ref.get(b.f) + offset : b.db }));
    basis = "reference";
  } else {
    const { slope, at1k } = analysis.tilt;
    const s = slope + style.slope;
    target = meas.map((b) => ({ f: b.f, v: at1k + s * Math.log2(b.f / 1000) }));
    basis = "trend";
  }
  // Deviation, smoothed over neighbouring bands: mastering moves are broad,
  // and chasing a single third-octave bump is a mixing decision.
  const dev = meas.map((b, i) => ({ f: b.f, v: target[i].v - b.db }));
  const smooth = dev.map((d, i) => {
    const win = dev.slice(Math.max(0, i - 1), i + 2);
    return { f: d.f, v: win.reduce((a, x) => a + x.v, 0) / win.length };
  });
  return { basis, target, deviation: smooth };
}

// Turn the wanted correction into a handful of broad filters, greedily: each
// filter takes what is still wanted across its own region after the ones
// before it, and is skipped if that is under 0.4 dB (inaudible as a move).
const EQ_SLOTS = [
  { type: "lowshelf", f: 100, lo: 40, hi: 125, label: "low end" },
  { type: "highshelf", f: 8000, lo: 6300, hi: 16000, label: "top end" },
  { type: "peak", f: 250, q: 0.9, lo: 160, hi: 400, label: "low mids" },
  { type: "peak", f: 600, q: 0.9, lo: 400, hi: 1000, label: "mids" },
  { type: "peak", f: 1600, q: 0.9, lo: 1000, hi: 2500, label: "upper mids" },
  { type: "peak", f: 3500, q: 0.9, lo: 2500, hi: 5000, label: "presence" },
];

export function coefficients(move, fs) {
  if (move.type === "lowshelf") return lowShelf(fs, move.f, move.gain);
  if (move.type === "highshelf") return highShelf(fs, move.f, move.gain);
  if (move.type === "peak") return peaking(fs, move.f, move.gain, move.q || 0.9);
  if (move.type === "highpass") return highPass(fs, move.f, move.q || Math.SQRT1_2);
  throw new Error(`unknown EQ move ${move.type}`);
}

export function plan(analysis, rawSettings, reference = null) {
  const settings = cleanSettings(rawSettings);
  const fs = analysis.sampleRate;
  const it = INTENSITY[settings.intensity];
  const style = STYLES[settings.style];
  const moves = [];
  const warnings = [];

  moves.push({
    type: "highpass", f: 20, q: Math.SQRT1_2, gain: 0,
    why: "Rumble filter at 20 Hz: nothing below it is heard, and it still takes up headroom the limiter has to pay for.",
  });

  let eqTargetInfo = null;
  if (settings.eq) {
    eqTargetInfo = eqTarget(analysis, settings, reference);
    const wanted = eqTargetInfo.deviation.map((d) => {
      let v = d.v * it.eqAmount;
      if (d.f < 80) v *= 0.5; // the sub is where a trend line is least trustworthy
      return { f: d.f, v: Math.max(-it.eqMax, Math.min(it.eqMax, v)) };
    });
    const placed = [];
    for (const slot of EQ_SLOTS) {
      const region = wanted.filter((w) => w.f >= slot.lo && w.f <= slot.hi);
      if (!region.length) continue;
      const already = (f) => responseDb(placed.map((m) => coefficients(m, fs)), fs, f);
      let g = region.reduce((a, w) => a + (w.v - already(w.f)), 0) / region.length;
      g = Math.max(-it.eqMax, Math.min(it.eqMax, g));
      if (Math.abs(g) < 0.4) continue;
      const move = { type: slot.type, f: slot.f, q: slot.q, gain: r1(g) };
      const measuredOff = region.reduce((a, w) => {
        const d = eqTargetInfo.deviation.find((x) => x.f === w.f);
        return a + (d ? -d.v : 0);
      }, 0) / region.length;
      // "against the the reference" and "against the balanced balance" are what this
      // said before: the template below adds no article, so each phrase carries its own.
      const against = eqTargetInfo.basis === "reference"
        ? "the reference"
        : style.slope === 0 ? "your mix's own trend" : `your mix's own trend, tilted ${style.label.toLowerCase()}`;
      move.why = `Your ${slot.label} (${fmtHz(slot.lo)}–${fmtHz(slot.hi)}) measured ${fmtDb(measuredOff)} against ${against} → ${fmtDb(move.gain)} ${slot.type === "peak" ? "bell" : "shelf"} at ${fmtHz(slot.f)}.`;
      placed.push(move);
    }
    if (!placed.length) {
      warnings.push(eqTargetInfo.basis === "reference"
        ? "Your balance already sits within half a dB of the reference everywhere — no EQ moves were needed."
        : "Your tonal balance already follows its own trend closely — no corrective EQ was needed.");
    }
    moves.push(...placed);
  }

  const trimMap = [
    ["low", { type: "lowshelf", f: 120 }, "Your low trim"],
    ["mid", { type: "peak", f: 1000, q: 0.7 }, "Your mid trim"],
    ["high", { type: "highshelf", f: 8000 }, "Your high trim"],
  ];
  for (const [k, m, label] of trimMap) {
    const g = settings.trims[k];
    if (g) moves.push({ ...m, gain: g, why: `${label}: ${fmtDb(g)}, set by you, on top of everything above.` });
  }

  // ---- Stereo
  const stereo = analysis.channels > 1;
  let side = settings.width != null ? settings.width / 100 : style.side;
  let widthWhy = settings.width != null
    ? `Width ${Math.round(side * 100)}%, set by you.`
    : side === 1 ? "Width left as you mixed it." : `Width ${Math.round(side * 100)}% — the ${style.label} style opens the sides a little.`;
  if (stereo && side > 1 && analysis.correlation < 0.2) {
    side = 1;
    widthWhy = `Width left alone: your L/R correlation is ${analysis.correlation.toFixed(2)}, and widening a mix that already partly cancels in mono makes that worse.`;
    warnings.push(`Correlation ${analysis.correlation.toFixed(2)}: parts of your mix cancel when it is played in mono (a phone speaker, a club). Check for phase problems in the mix.`);
  } else if (stereo && side > 1 && analysis.sideToMidDb > -4) {
    side = 1;
    widthWhy = `Width left alone: your sides are already ${fmtDb(analysis.sideToMidDb)} against the centre, which is wide.`;
  }
  let monoBelow = null;
  let monoWhy = null;
  if (stereo && (settings.monoBass === "on" || (settings.monoBass === "auto" && analysis.lowCorrelation < 0.8))) {
    monoBelow = 120;
    monoWhy = settings.monoBass === "on"
      ? "Low end folded to mono below 120 Hz, as you asked."
      : `Low end folded to mono below 120 Hz: it measured correlation ${analysis.lowCorrelation.toFixed(2)} down there, and stereo bass sums unevenly on mono systems.`;
  }

  // ---- Glue
  let glue = null;
  let glueWhy;
  const chosen = settings.glueDb;
  const grTarget = chosen != null ? chosen : it.glueGr;
  if (grTarget <= 0) {
    glueWhy = "No glue compression: you set it to 0.";
  } else if (chosen == null && analysis.plr < 8) {
    // Only the automatic choice backs off. A member who dialled compression
    // in on purpose gets it, with the density stated, not second-guessed.
    glueWhy = `No glue compression: your track is already dense (peak-to-loudness ${r1(analysis.plr)} dB). More would only flatten it.`;
  } else {
    glue = { ratio: it.ratio, grTarget, attackMs: it.attackMs, releaseMs: 200, kneeDb: 6, multiband: settings.multiband };
    const attack = it.attackMs >= 30 ? "slow attack, so the transients still hit" : it.attackMs >= 20 ? "a medium attack that rounds the sharpest transients" : "a fast attack that flattens transients — the heaviest sound on offer";
    glueWhy = `Glue compression at ${it.ratio}:1, set to take about ${r1(grTarget)} dB off your loudest moments${chosen != null ? " (your setting)" : ""} — ${attack}.`;
    if (settings.multiband) {
      glueWhy += ` Multiband: lows (under ${BANDS_SPLIT[0]} Hz), mids and highs (over ${BANDS_SPLIT[1] / 1000} kHz) are each compressed on their own, so a loud kick no longer pulls the vocal and cymbals down with it.`;
    }
    if (chosen != null && analysis.plr < 8) {
      warnings.push(`Your track is already dense (peak-to-loudness ${r1(analysis.plr)} dB) and you asked for ${r1(chosen)} dB more compression. It will sound flatter; that may be what you want.`);
    }
  }

  // ---- Punch
  let punch = null;
  let punchWhy = "Punch left as you mixed it.";
  if (settings.punch) {
    const amt = settings.punch / 100;
    punch = { amount: amt, maxDb: 6 };
    punchWhy = settings.punch > 0
      ? `Punch +${settings.punch}%: the first few milliseconds of each hit are raised (up to ${punch.maxDb} dB) and the ring after it is left alone, so drums and plucks cut through.`
      : `Punch ${settings.punch}%: the first few milliseconds of each hit are softened (up to ${punch.maxDb} dB), which rounds harsh attacks and lets the limiter work less.`;
    if (settings.punch > 0 && analysis.plr < 8) {
      warnings.push(`Your track is dense (peak-to-loudness ${r1(analysis.plr)} dB), so the peaks you add with Punch will mostly be taken back off by the limiter.`);
    }
  }

  // ---- Loudness
  let lufs; let ceiling; let loudWhy;
  if (settings.target === "custom") {
    lufs = settings.lufs;
    ceiling = -1;
    loudWhy = `Your loudness: ${lufs} LUFS integrated, true peaks held under ${ceiling} dBTP.${lufs > -14 ? " Streaming services play back near −14 LUFS and will turn this down to that." : ""}`;
  } else if (settings.target === "reference" && reference && Number.isFinite(reference.lufs)) {
    lufs = Math.max(-20, Math.min(-7, reference.lufs));
    ceiling = -1;
    loudWhy = `Loudness matched to your reference: ${r1(lufs)} LUFS, peaks held under ${ceiling} dBTP.`;
  } else {
    const t = TARGETS[settings.target === "reference" ? "streaming" : settings.target];
    lufs = t.lufs; ceiling = t.ceiling;
    loudWhy = `${t.label}: ${lufs} LUFS integrated, true peaks held under ${ceiling} dBTP. ${t.desc}`;
  }

  if (analysis.clippedSamples > 0) {
    warnings.push(`${analysis.clippedSamples} samples in your file are already at full scale (clipped). Mastering cannot un-clip them; a version from before the clipping will master cleaner.`);
  }

  let vocal = null;
  if (settings.vocal === "auto") {
    const info = eqTargetInfo || eqTarget(analysis, settings, reference);
    const cascade = moves.map((m) => coefficients(m, fs));
    const left = VOCAL_BANDS.map((f) => {
      const d = info.deviation.find((x) => x.f === f);
      return d ? d.v - responseDb(cascade, fs, f) : null;
    }).filter((v) => v != null);
    const missing = left.length ? left.reduce((a, v) => a + v, 0) / left.length : 0;
    const against = info.basis === "reference" ? "your Inspiration track" : "your mix's own balance";
    if (missing >= VOCAL_AUTO_MIN) {
      const db = Math.min(VOCAL_AUTO_MAX, Math.round(missing * VOCAL_AUTO_SHARE * 2) / 2);
      vocal = { db, auto: true, measuredDb: r1(-missing),
        why: `Auto vocal lift: the centre of your mix measured ${fmtDb(-missing)} against ${against} around 1–4 kHz, where a lead vocal sits, after the EQ → +${r1(db)} dB on the centre only, sides untouched. It measures the centre, not the voice itself: if the vocal still sounds low, raise the lift by hand or add the vocal as its own file.` };
    } else {
      vocal = { db: 0, auto: true, measuredDb: r1(-missing),
        why: `Auto vocal lift: the centre of your mix around 1–4 kHz measured ${fmtDb(-missing)} against ${against} after the EQ — not low enough to lift. If the vocal still sounds buried, the beat may be filling the same range: raise the lift by hand or add the vocal as its own file.` };
    }
  } else if (settings.vocal > 0) {
    vocal = { db: settings.vocal, auto: false,
      why: `Vocal lift: +${r1(settings.vocal)} dB on the centre of the mix around ${fmtHz(VOCAL_LIFT_HZ)} (about 900 Hz to 4.5 kHz), sides untouched — where a lead vocal sits. Anything else centred in that range rises with it; a separate vocal file is the clean fix.` };
  }

  return {
    settings,
    sampleRate: fs,
    eq: moves,
    vocal,
    eqBasis: eqTargetInfo ? eqTargetInfo.basis : null,
    width: { side, monoBelow, why: widthWhy, monoWhy },
    glue, glueWhy,
    punch, punchWhy,
    loudness: { lufs, ceiling, maxLimitGr: it.maxLimitGr, why: loudWhy },
    warnings,
  };
}

// ---- Processing --------------------------------------------------------------

function applyEq(channels, fs, moves) {
  const cascade = moves.map((m) => coefficients(m, fs));
  for (const x of channels) for (const co of cascade) biquadInPlace(x, co);
}

function applyStereo(channels, fs, { side, monoBelow }) {
  if (channels.length < 2 || (side === 1 && !monoBelow)) return;
  const [l, r] = channels;
  const n = l.length;
  const S = new Float32Array(n);
  const M = new Float32Array(n);
  for (let i = 0; i < n; i++) { M[i] = (l[i] + r[i]) / 2; S[i] = ((l[i] - r[i]) / 2) * side; }
  if (monoBelow) {
    // Linkwitz-Riley high-pass (two Butterworths) on the side channel only:
    // the centre is untouched, so nothing moves in phase that the member can hear.
    const hp = highPass(fs, monoBelow);
    biquadInPlace(S, hp); biquadInPlace(S, hp);
  }
  for (let i = 0; i < n; i++) { l[i] = M[i] + S[i]; r[i] = M[i] - S[i]; }
}

// Stereo-linked compressor with an RMS-ish power detector and a soft knee.
// The threshold is chosen from THIS track: the 90th percentile of its 50 ms
// detector levels, set so the loudest moments see `grTarget` dB.
export function glueThreshold(channels, fs, glue) {
  const win = Math.max(1, Math.round(fs * 0.05));
  const n = channels[0].length;
  const levels = [];
  for (let s = 0; s + win <= n; s += win) {
    let p = 0;
    for (let i = s; i < s + win; i++) {
      let m = 0;
      for (const x of channels) { const v = x[i] * x[i]; if (v > m) m = v; }
      p += m;
    }
    levels.push(10 * Math.log10(p / win + 1e-12));
  }
  if (!levels.length) return 0;
  const top = Math.max(...levels);
  const live = levels.filter((v) => v > top - 40).sort((a, b) => a - b);
  const l90 = live[Math.floor((live.length - 1) * 0.9)];
  return l90 - glue.grTarget / (1 - 1 / glue.ratio);
}

// Transient shaper. Two envelopes follow the track: one opens in a millisecond,
// the other in 25. They differ only while a hit is starting, so the gain moves
// only there — the attack is raised or softened and the sustain is untouched.
export function applyPunch(channels, fs, punch) {
  const fastA = Math.exp(-1 / (0.001 * fs));
  const slowA = Math.exp(-1 / (0.025 * fs));
  // A long release holds both envelopes at the waveform's own peaks through a
  // sustained note, so a low tone's cycles never read as hits.
  const rel = Math.exp(-1 / (0.3 * fs));
  const n = channels[0].length;
  let fast = 0, slow = 0, maxDb = 0;
  for (let i = 0; i < n; i++) {
    let p = 0;
    for (const x of channels) { const v = Math.abs(x[i]); if (v > p) p = v; }
    fast = p > fast ? fastA * fast + (1 - fastA) * p : rel * fast + (1 - rel) * p;
    slow = p > slow ? slowA * slow + (1 - slowA) * p : rel * slow + (1 - rel) * p;
    const diff = fast > 1e-6 && slow > 1e-6 ? 20 * Math.log10(fast / slow) : 0;
    // Under 1 dB apart is the envelopes breathing with a sustained note, not a hit.
    let gdb = diff > 1 ? punch.amount * 2 * (diff - 1) : 0;
    if (gdb > punch.maxDb) gdb = punch.maxDb; else if (gdb < -punch.maxDb) gdb = -punch.maxDb;
    if (Math.abs(gdb) > Math.abs(maxDb)) maxDb = gdb;
    if (gdb) { const g = dbToGain(gdb); for (const x of channels) x[i] *= g; }
  }
  return { maxDb };
}

// Linkwitz-Riley split: two Butterworths in cascade. Low and high halves of an
// LR4 pair add back to the input with only a phase turn, so with the
// compressors at rest the three bands sum to the track as it was.
function lr4(x, fs, f, high) {
  const co = high ? highPass(fs, f) : lowPass(fs, f);
  biquadInPlace(x, co); biquadInPlace(x, co);
}

function applyMultiband(channels, fs, glue) {
  const [f1, f2] = BANDS_SPLIT;
  const rest = channels.map((x) => { const y = Float32Array.from(x); lr4(y, fs, f1, true); return y; });
  // Lows, given the same phase turn the upper split gives the other two bands.
  for (const x of channels) {
    lr4(x, fs, f1, false);
    const a = Float32Array.from(x);
    lr4(a, fs, f2, false); lr4(x, fs, f2, true);
    for (let i = 0; i < x.length; i++) x[i] += a[i];
  }
  const low = applyGlue(channels, fs, { ...glue, releaseMs: 300 });
  const high = rest.map((x) => { const y = Float32Array.from(x); lr4(y, fs, f2, true); return y; });
  for (const x of rest) lr4(x, fs, f2, false);
  const mid = applyGlue(rest, fs, glue);
  const top = applyGlue(high, fs, { ...glue, releaseMs: 120 });
  for (let c = 0; c < channels.length; c++) {
    const x = channels[c], m = rest[c], h = high[c];
    for (let i = 0; i < x.length; i++) x[i] += m[i] + h[i];
  }
  const bands = [["low", low], ["mid", mid], ["high", top]].map(([band, r]) => ({ band, ...r }));
  return {
    multiband: true, bands,
    avgGrDb: Math.max(...bands.map((b) => b.avgGrDb)), maxGrDb: Math.max(...bands.map((b) => b.maxGrDb)),
  };
}

function applyGlue(channels, fs, glue) {
  const T = glueThreshold(channels, fs, glue);
  const { ratio, kneeDb } = glue;
  const aA = Math.exp(-1 / ((glue.attackMs / 1000) * fs));
  const aR = Math.exp(-1 / ((glue.releaseMs / 1000) * fs));
  const n = channels[0].length;
  let env = 0;
  let grSum = 0, grCount = 0, grMax = 0;
  const slope = 1 / ratio - 1;
  for (let i = 0; i < n; i++) {
    let p = 0;
    for (const x of channels) { const v = x[i] * x[i]; if (v > p) p = v; }
    env = p > env ? aA * env + (1 - aA) * p : aR * env + (1 - aR) * p;
    const lvl = 10 * Math.log10(env + 1e-12);
    const over = lvl - T;
    let gdb;
    if (2 * over < -kneeDb) gdb = 0;
    else if (2 * Math.abs(over) <= kneeDb) gdb = (slope * (over + kneeDb / 2) ** 2) / (2 * kneeDb);
    else gdb = slope * over;
    if (gdb < -0.1) { grSum += -gdb; grCount++; if (-gdb > grMax) grMax = -gdb; }
    const g = dbToGain(gdb);
    for (const x of channels) x[i] *= g;
  }
  return { thresholdDb: T, avgGrDb: grCount ? grSum / grCount : 0, maxGrDb: grMax };
}

// Sliding minimum over [i, i+L-1] in O(n) (van Herk / Gil-Werman).
function forwardMin(req, L) {
  const n = req.length;
  const pre = new Float32Array(n), suf = new Float32Array(n), out = new Float32Array(n);
  for (let s = 0; s < n; s += L) {
    const e = Math.min(n, s + L);
    pre[s] = req[s];
    for (let i = s + 1; i < e; i++) pre[i] = Math.min(pre[i - 1], req[i]);
    suf[e - 1] = req[e - 1];
    for (let i = e - 2; i >= s; i--) suf[i] = Math.min(suf[i + 1], req[i]);
  }
  for (let i = 0; i < n; i++) {
    const j = Math.min(n - 1, i + L - 1);
    out[i] = Math.min(suf[i], pre[j]);
  }
  return out;
}

// The limiter's gain curve for an input gain G. Guarantees gain[i] ≤ what
// sample i needs to stay under the ceiling: every value averaged into gain[i]
// is a minimum over a window that contains i. Lookahead is the window, so the
// gain is already down when the peak arrives — no overshoot to clip.
export function limiterGains(env, G, ceilingLin, fs, lookMs = 1.5, releaseMs = 120) {
  const n = env.length;
  const L = Math.max(1, Math.round((lookMs / 1000) * fs));
  const req = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = env[i] * G;
    req[i] = p > ceilingLin ? ceilingLin / p : 1;
  }
  const hold = forwardMin(req, L);
  const rc = 1 - Math.exp(-1 / ((releaseMs / 1000) * fs));
  let prev = 1;
  for (let i = 0; i < n; i++) {
    const up = prev + (1 - prev) * rc;
    prev = hold[i] < up ? hold[i] : up;
    hold[i] = prev;
  }
  const out = new Float32Array(n);
  let run = 0;
  for (let i = 0; i < n; i++) {
    run += hold[i];
    if (i >= L) run -= hold[i - L];
    out[i] = run / Math.min(L, i + 1);
  }
  // The running mean at the very start averages fewer than L values; clamp so
  // the guarantee holds there too.
  for (let i = 0; i < Math.min(n, L); i++) if (out[i] > req[i]) out[i] = req[i];
  return out;
}

function grStats(gains) {
  let min = 1, sum = 0, cnt = 0;
  for (let i = 0; i < gains.length; i++) {
    const g = gains[i];
    if (g < min) min = g;
    if (g < 0.9886) { sum += -gainToDb(g); cnt++; } // > 0.1 dB of reduction
  }
  return { maxGrDb: -gainToDb(min), avgGrDb: cnt ? sum / cnt : 0, share: cnt / (gains.length || 1) };
}

// Gain to the target through the limiter, re-measuring the real integrated
// loudness each time (limiting lowers it), until it lands within 0.1 LU — or
// until the limiter would have to take more than `maxLimitGr` off a peak, in
// which case it stops at the loudest master inside that and says how far
// short it is. Landing on a number by crushing the music is not mastering.
function loudnessStage(channels, fs, loud, onProgress) {
  const env = truePeakEnvelope(channels);
  const ceilingLin = dbToGain(loud.ceiling);
  const before = integratedLoudness(channels, fs);
  const out = channels.map((x) => new Float32Array(x.length));
  const run = (gDb) => {
    const G = dbToGain(gDb);
    const gains = limiterGains(env, G, ceilingLin, fs);
    for (let c = 0; c < channels.length; c++) {
      const x = channels[c], y = out[c];
      for (let i = 0; i < x.length; i++) y[i] = x[i] * G * gains[i];
    }
    return { gDb, lufs: integratedLoudness(out, fs), stats: grStats(gains) };
  };
  if (!Number.isFinite(before)) {
    return { channels: out, gainDb: 0, lufs: before, stats: grStats(new Float32Array(1).fill(1)), reached: false, stopped: "silent" };
  }
  let g = loud.lufs - before;
  let best = null;
  let tooHot = null;
  for (let k = 0; k < 6; k++) {
    onProgress && onProgress(0.6 + k * 0.05, "Landing on the loudness target");
    const r = run(g);
    if (r.stats.maxGrDb > loud.maxLimitGr + 0.05) {
      tooHot = r;
      break;
    }
    best = r;
    const miss = loud.lufs - r.lufs;
    if (Math.abs(miss) <= 0.1) break;
    g += miss;
  }
  let stopped = null;
  if (tooHot) {
    // Binary search the largest gain whose peaks stay within the ceiling.
    let lo = best ? best.gDb : tooHot.gDb - 24, hi = tooHot.gDb;
    let keep = best;
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      const r = run(mid);
      if (r.stats.maxGrDb > loud.maxLimitGr + 0.05) hi = mid; else { lo = mid; keep = r; }
      if (hi - lo < 0.05) break;
    }
    best = keep || run(lo);
    if (best.lufs < loud.lufs - 0.1) stopped = "limit";
  }
  if (!best) best = run(g);
  // Re-render the chosen gain so `out` holds it (the search may have left a
  // different candidate in the buffers).
  const final = run(best.gDb);
  return { channels: out, gainDb: final.gDb, lufs: final.lufs, stats: final.stats, reached: !stopped, stopped };
}

// Raise the mid (L+R) channel with a wide bell and rebuild left and right from
// mid and side, so only what is common to both speakers moves.
export function applyVocalLift(channels, fs, db) {
  if (!(db > 0) || channels.length < 2) return;
  const [L, R] = channels;
  const mid = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) mid[i] = (L[i] + R[i]) / 2;
  const lifted = Float32Array.from(mid);
  biquadInPlace(lifted, peaking(fs, VOCAL_LIFT_HZ, db, VOCAL_LIFT_Q));
  for (let i = 0; i < L.length; i++) {
    const d = lifted[i] - mid[i];
    L[i] += d;
    R[i] += d;
  }
}

// A vocal file laid onto the beat at `gainDb`, matched to the beat's rate and
// made stereo. The result is as long as the longer of the two, so a vocal that
// runs past the beat's end is not cut off.
export function mixVocal(beat, fs, vocal, vocalFs, gainDb) {
  let v = toStereo(vocal);
  const resampled = vocalFs !== fs;
  if (resampled) v = resample(v, vocalFs, fs);
  const b = toStereo(beat);
  const n = Math.max(b[0].length, v[0].length);
  const g = dbToGain(gainDb);
  const out = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) {
    out[c].set(b[c]);
    const x = v[c];
    for (let i = 0; i < x.length; i++) out[c][i] += g * x[i];
  }
  return { channels: out, resampled };
}

export function render(input, fs, thePlan, onProgress) {
  const channels = input.map((x) => Float32Array.from(x));
  onProgress && onProgress(0.1, "EQ");
  applyEq(channels, fs, thePlan.eq);
  if (thePlan.vocal && thePlan.vocal.db > 0) {
    onProgress && onProgress(0.2, "Vocal lift");
    applyVocalLift(channels, fs, thePlan.vocal.db);
  }
  onProgress && onProgress(0.25, "Stereo");
  applyStereo(channels, fs, thePlan.width);
  onProgress && onProgress(0.3, "Punch");
  const punch = thePlan.punch ? applyPunch(channels, fs, thePlan.punch) : null;
  onProgress && onProgress(0.35, thePlan.glue && thePlan.glue.multiband ? "Multiband glue" : "Glue");
  const glue = !thePlan.glue ? null
    : thePlan.glue.multiband ? applyMultiband(channels, fs, thePlan.glue) : applyGlue(channels, fs, thePlan.glue);
  onProgress && onProgress(0.5, "Measuring");
  const loud = loudnessStage(channels, fs, thePlan.loudness, onProgress);
  // Final safety: measure the actual true peak of what will be exported and,
  // if the limiter's smoothing let anything over, trim the whole master by
  // the excess. Costs a fraction of a dB of loudness and is reported.
  onProgress && onProgress(0.92, "Checking peaks");
  let tp = truePeak(loud.channels);
  let safetyDb = 0;
  const ceilingLin = dbToGain(thePlan.loudness.ceiling);
  if (tp > ceilingLin) {
    const s = (ceilingLin / tp) * 0.999;
    safetyDb = gainToDb(s);
    for (const x of loud.channels) for (let i = 0; i < x.length; i++) x[i] *= s;
    tp *= s;
  }
  return {
    channels: loud.channels,
    report: {
      gainDb: loud.gainDb + safetyDb,
      limiterMaxGrDb: loud.stats.maxGrDb,
      limiterAvgGrDb: loud.stats.avgGrDb,
      limiterShare: loud.stats.share,
      glue,
      punch,
      safetyDb,
      truePeakDb: gainToDb(tp),
      truePeakLin: tp,
      reached: loud.reached,
      stopped: loud.stopped,
    },
  };
}

// Mono in, stereo out: a mono file is played on both speakers, so it is
// measured and mastered as dual mono — which is how a listener hears it.
export function toStereo(channels) {
  if (channels.length >= 2) return [channels[0], channels[1]];
  return [channels[0], Float32Array.from(channels[0])];
}

export function master(inputChannels, fs, settings, reference = null, onProgress, vocal = null) {
  let input = toStereo(inputChannels);
  let vocalMix = null;
  if (vocal && vocal.channels && vocal.channels.length) {
    onProgress && onProgress(0.01, "Mixing in the vocal");
    const level = cleanSettings(settings).vocalLevel;
    const m = mixVocal(input, fs, vocal.channels, vocal.sampleRate || fs, level);
    input = m.channels;
    vocalMix = { levelDb: level, resampled: m.resampled,
      why: `Vocal file mixed onto the beat at ${fmtDb(level)}${m.resampled ? `, converted from ${r1((vocal.sampleRate || fs) / 1000)} kHz to match the beat` : ""}, before anything else.` };
  }
  onProgress && onProgress(0.02, "Measuring your mix");
  const before = analyse(input, fs);
  const thePlan = plan(before, settings, reference);
  const { channels, report } = render(input, fs, thePlan, onProgress);
  onProgress && onProgress(0.96, "Measuring the master");
  const after = analyse(channels, fs, { truePeak: report.truePeakLin });
  const outcome = [];
  if (report.stopped === "limit") {
    outcome.push(`Stopped at ${r1(after.lufs)} LUFS, ${r1(thePlan.loudness.lufs - after.lufs)} LU short of ${thePlan.loudness.lufs}: getting louder would have taken more than ${thePlan.loudness.maxLimitGr} dB off your peaks at ${INTENSITY[thePlan.settings.intensity].label} intensity. High intensity allows more, and costs dynamics.`);
  } else if (report.stopped === "silent") {
    outcome.push("Nothing to master: the file is silent.");
  }
  if (report.safetyDb < -0.01) {
    outcome.push(`A final ${fmtDb(report.safetyDb)} trim kept the true peak under ${thePlan.loudness.ceiling} dBTP.`);
  }
  return { plan: { ...thePlan, vocalMix }, before, after, report, outcome, channels };
}

// Band levels before and after, normalised to the same 1 kHz reference, for
// the balance chart — so the chart shows the shape that changed, not the gain.
export function balanceChart(before, after) {
  const at = (bands) => {
    const k = bands.find((b) => b.f === 1000);
    return k && k.db != null ? k.db : 0;
  };
  const b0 = at(before.bands), a0 = at(after.bands);
  return BANDS.map((f) => {
    const b = before.bands.find((x) => x.f === f);
    const a = after.bands.find((x) => x.f === f);
    return {
      f,
      before: b && b.db != null ? r1(b.db - b0) : null,
      after: a && a.db != null ? r1(a.db - a0) : null,
    };
  }).filter((x) => x.f >= 31.5 && x.f <= 16000);
}

export { lowPass, curveAt };
