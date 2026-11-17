// Several tracks into one stereo mix, on the member's device, before the master runs.
//
// Each track has a gain (dB) and a pan (−1 left … +1 right), and can be muted or soloed.
// The pan is the Web Audio StereoPannerNode's own law for a stereo input
// (https://webaudio.github.io/web-audio-api/#stereopanner-algorithm), applied here sample for
// sample, so the live preview (which IS a StereoPannerNode) and the rendered mix are the same
// sound: what was set by ear is what gets mastered. Every input is made stereo first
// (`toStereo`), so a mono file and a stereo one follow the same law.
//
// `suggestMix` is a starting point, not a measurement of a good mix. It measures each track
// (BS.1770 loudness, its tonal centre, how wide it already is) and applies rules of thumb that
// are written down below with their reasons — the member sees every reason and moves anything.
import { integratedLoudness, bandSpectrum, sideToMidDb, correlation, lowEndCorrelation } from "./meter.js";
import { resample } from "./resample.js";
import { lowPass, biquadInto, biquadInPlace } from "./dsp.js";

export const GAIN_MIN = -24;
export const GAIN_MAX = 12;

const toStereo = (ch) => (ch.length >= 2 ? [ch[0], ch[1]] : [ch[0], ch[0]]);
const dbToGain = (db) => Math.pow(10, db / 20);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (v) => Math.round(v * 10) / 10;
const fmtDb = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(r1(v)).toFixed(1)} dB`;
export const panLabel = (p) => (Math.abs(p) < 0.005 ? "C" : `${p < 0 ? "L" : "R"}${Math.round(Math.abs(p) * 100)}`);

// What a track is, so the suggestion knows where it usually sits. Level is relative to the
// lead vocal (or, with no lead, the loudest track); `centre` keeps it in the middle.
export const ROLES = {
  lead: { label: "Lead vocal", level: 0, centre: true,
    why: "the lead carries the song, so everything else is set against it, in the centre" },
  beat: { label: "Beat / instrumental", level: -1, centre: true,
    why: "a finished beat is already a stereo mix: kept centred, just under the vocal" },
  drums: { label: "Drums", level: -2, centre: true,
    why: "kick and snare anchor the groove from the centre" },
  bass: { label: "Bass / 808", level: -3, centre: true,
    why: "low end stays centred — panned bass cancels on a phone or club speaker" },
  instrument: { label: "Instrument (keys, guitar, synth)", level: -6, centre: false,
    why: "parts that share a range are spread apart so each has its own space" },
  backing: { label: "Backing vocals / ad-libs", level: -7, centre: false,
    why: "backing vocals sit under the lead and wide, so the lead keeps the centre" },
  other: { label: "Other", level: -6, centre: false,
    why: "spread a little off centre to leave the middle for the lead" },
};

// A first guess at a track's role from its file name. Only a default for the dropdown.
export function guessRole(name = "") {
  const n = String(name).toLowerCase();
  if (/(backing|bgv|\bbv|harmon|adlib|ad-lib|double|choir)/.test(n)) return "backing";
  if (/(vox|vocal|lead|verse|hook|acapella|a cappella)/.test(n)) return "lead";
  if (/(bass|808|sub)/.test(n)) return "bass";
  if (/(kick|snare|drum|hat|perc|clap|tom|cymbal)/.test(n)) return "drums";
  if (/(beat|instrumental|inst\b|backing track|karaoke)/.test(n)) return "beat";
  if (/(key|piano|guitar|gtr|synth|pad|string|lead synth|pluck|organ|horn|flute|sax)/.test(n)) return "instrument";
  return "other";
}

// The Web Audio StereoPannerNode law for a stereo input, in place on copies.
export function panStereo(l, r, pan) {
  const p = clamp(Number(pan) || 0, -1, 1);
  const n = l.length;
  const L = new Float32Array(n), R = new Float32Array(n);
  if (p <= 0) {
    const x = (p + 1) * Math.PI / 2, gl = Math.cos(x), gr = Math.sin(x);
    for (let i = 0; i < n; i++) { L[i] = l[i] + r[i] * gl; R[i] = r[i] * gr; }
  } else {
    const x = p * Math.PI / 2, gl = Math.cos(x), gr = Math.sin(x);
    for (let i = 0; i < n; i++) { L[i] = l[i] * gl; R[i] = r[i] + l[i] * gr; }
  }
  return [L, R];
}

/** Which tracks are heard: soloed ones if any are soloed, otherwise everything not muted. */
export function audible(tracks) {
  const anySolo = tracks.some((t) => t.solo);
  return tracks.map((t) => (anySolo ? !!t.solo : !t.mute));
}

/** True when the tracks would change the sound (so one plain song skips the mix entirely). */
export function needsMix(tracks) {
  if (!tracks || !tracks.length) return false;
  if (tracks.length > 1) return true;
  const t = tracks[0];
  return Math.abs(Number(t.gainDb) || 0) > 0.001 || Math.abs(Number(t.pan) || 0) > 0.001 || !!t.mute;
}

/**
 * Mix the tracks to one stereo pair at `fs`. Each: { channels, sampleRate, gainDb, pan, mute, solo, name }.
 * Returns { channels, lines } — `lines` says what was done, one per track, for the result's list.
 */
export function mixTracks(tracks, fs) {
  const on = audible(tracks);
  const prepared = tracks.map((t, i) => {
    if (!on[i]) return null;
    let ch = toStereo(t.channels);
    const rate = t.sampleRate || fs;
    if (rate !== fs) ch = resample([ch[0], ch[1]], rate, fs);
    return { t, ch, resampled: rate !== fs };
  });
  const n = Math.max(1, ...prepared.filter(Boolean).map((p) => p.ch[0].length));
  const out = [new Float32Array(n), new Float32Array(n)];
  const lines = [];
  tracks.forEach((t, i) => {
    const p = prepared[i];
    const name = t.name || `Track ${i + 1}`;
    if (!p) { lines.push(`${name}: ${!t.solo && tracks.some((x) => x.solo) ? "not soloed" : "muted"}, left out.`); return; }
    const g = dbToGain(clamp(Number(t.gainDb) || 0, GAIN_MIN, GAIN_MAX));
    const [L, R] = panStereo(p.ch[0], p.ch[1], t.pan);
    for (let k = 0; k < L.length; k++) { out[0][k] += g * L[k]; out[1][k] += g * R[k]; }
    lines.push(`${name}: ${fmtDb(Number(t.gainDb) || 0)}, pan ${panLabel(Number(t.pan) || 0)}${p.resampled ? `, converted from ${r1((t.sampleRate || fs) / 1000)} kHz` : ""}.`);
  });
  return { channels: out, lines };
}

// A track's tonal centre in octaves above 1 kHz: the power-weighted mean of its band levels.
// Bigger is brighter. Used only to decide which of two spread parts goes wider.
function brightness(bands) {
  let w = 0, s = 0;
  for (const b of bands) {
    if (b.db == null) continue;
    const p = Math.pow(10, b.db / 10);
    w += p; s += p * Math.log2(b.f / 1000);
  }
  return w ? s / w : 0;
}

/** Measure one track for the suggestion: { lufs, bright, widthDb }. Runs in the worker. */
export function measureTrack(channels, fs) {
  const st = toStereo(channels);
  return {
    lufs: integratedLoudness(st, fs),
    bright: brightness(bandSpectrum(st, fs, 120)),
    widthDb: channels.length >= 2 ? sideToMidDb(st[0], st[1]) : -Infinity,
  };
}

// A stereo track whose sides are already within this of its centre is a stereo mix of its own;
// panning it would mostly turn one side down, so the suggestion leaves it centred.
export const ALREADY_WIDE_DB = -12;
const SPREAD = [0.35, 0.55, 0.7];       // successive off-centre pairs go wider, brightest widest

/**
 * Suggest gains and pans from measurements. tracks: [{ role, m: measureTrack(...) , name }].
 * Returns [{ gainDb, pan, why }] in the same order. Silent tracks are left alone.
 */
export function suggestMix(tracks) {
  const live = tracks.map((t) => t.m && Number.isFinite(t.m.lufs));
  if (!live.some(Boolean)) return tracks.map(() => ({ gainDb: 0, pan: 0, why: "Silent — nothing to set." }));
  const leadIdx = tracks.findIndex((t, i) => live[i] && t.role === "lead");
  // Anchor: the lead at 0 dB, or (no lead) the loudest track at 0 dB.
  let anchor = leadIdx;
  if (anchor < 0) anchor = tracks.reduce((best, t, i) => (live[i] && (best < 0 || t.m.lufs > tracks[best].m.lufs) ? i : best), -1);
  const ref = tracks[anchor].m.lufs - (ROLES[tracks[anchor].role] || ROLES.other).level;

  // Off-centre tracks, brightest first, alternate left / right in pairs that go wider.
  const spread = tracks.map((t, i) => ({ t, i })).filter(({ t, i }) => live[i] && !(ROLES[t.role] || ROLES.other).centre
    && !(t.m.widthDb > ALREADY_WIDE_DB))
    .sort((a, b) => b.t.m.bright - a.t.m.bright);
  const pans = new Map();
  spread.forEach(({ i }, k) => {
    const side = k % 2 === 0 ? -1 : 1;
    pans.set(i, side * SPREAD[Math.min(SPREAD.length - 1, Math.floor(k / 2))]);
  });
  // A single spread part on its own would tip the whole mix to one side: keep it nearer the middle.
  if (spread.length === 1) pans.set(spread[0].i, -0.2);

  return tracks.map((t, i) => {
    if (!live[i]) return { gainDb: 0, pan: 0, why: "Silent — nothing to set." };
    const role = ROLES[t.role] || ROLES.other;
    const gainDb = r1(clamp(ref + role.level - t.m.lufs, GAIN_MIN, GAIN_MAX));
    const pan = pans.has(i) ? pans.get(i) : 0;
    const level = i === anchor
      ? `the level the others are set against (${r1(t.m.lufs)} LUFS)`
      : `${role.level === 0 ? "level with" : `${Math.abs(role.level)} dB under`} ${leadIdx >= 0 ? "the lead" : "the loudest track"} (measured ${r1(t.m.lufs)} LUFS)`;
    const where = role.centre ? "centre"
      : t.m.widthDb > ALREADY_WIDE_DB ? "centre, because it is already a wide stereo track"
        : `${panLabel(pan)}`;
    return { gainDb, pan, why: `${fmtDb(gainDb)} to sit ${level}; ${where} — ${role.why}.` };
  });
}

/** What the mix's stereo image measures, each with what it means. Runs in the worker. */
export function stereoReport(channels, fs) {
  const [l, r] = toStereo(channels);
  const corr = correlation(l, r);
  const low = lowEndCorrelation(l, r, fs);
  const width = sideToMidDb(l, r);
  // Which side the low end leans to (dB, + is right). Correlation cannot see this: a bass panned
  // hard to one side is perfectly "correlated" with the silence on the other.
  const lp = lowPass(fs, 150);
  const lo = (x) => biquadInPlace(biquadInto(x, lp), lp);
  const e = (x) => x.reduce((a, v) => a + v * v, 0);
  const el = e(lo(l)), er = e(lo(r));
  const lowLean = el > 0 && er > 0 ? 10 * Math.log10(er / el) : el + er > 0 ? (er > el ? 60 : -60) : 0;
  const notes = [];
  if (Math.abs(lowLean) > 3) notes.push(`The low end leans ${lowLean > 0 ? "right" : "left"} by ${r1(Math.min(60, Math.abs(lowLean)))} dB: centre the bass, 808 and kick so the weight comes from the middle.`);
  else if (low < 0.5) notes.push("The low end is spread across the speakers: centre the bass, 808 and kick, or they lose weight in mono.");
  if (corr < 0) notes.push("Parts of the mix cancel when summed to mono — a stereo track may be out of phase, or panned copies are fighting.");
  else if (width < -20) notes.push("The mix is close to mono: spreading backing vocals and instruments off centre opens it up.");
  else if (width > -4) notes.push("The sides are nearly as loud as the centre: bring spread parts in a little so the lead stays in front.");
  return { correlation: Math.round(corr * 100) / 100, lowCorrelation: Math.round(low * 100) / 100, lowLeanDb: r1(lowLean), widthDb: Number.isFinite(width) ? r1(width) : null, notes };
}

/** The tier's ceiling on tracks (the shared Free 3 / Premium 6 / StatZ unlimited count). */
export function trackRoom(count, cap) {
  if (cap === undefined) return { ok: true, left: null };   // not loaded yet: nothing blocked, nothing guessed
  if (cap === null) return { ok: true, left: null };        // unlimited
  return { ok: count < cap, left: Math.max(0, cap - count) };
}
