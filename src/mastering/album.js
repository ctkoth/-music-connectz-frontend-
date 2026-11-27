// Album mastering: several songs brought to ONE loudness and ONE tone, the thing eMastered and LANDR sell
// as album mastering. Pure, so it is tested under node; the screen is components/AlbumMaster.jsx.
//
// How it works, in the order the screen says it:
//   1. Every song is measured (meter.js `analyse`): its loudness and its tonal balance in third-octave bands.
//   2. The album's tone is the AVERAGE of those balances, each song level-matched over 100 Hz–8 kHz first,
//      so a loud song does not outvote a quiet one. With an Inspiration track loaded, its balance is the
//      tone instead. Either way it goes to the master as its reference, so each song's EQ moves toward the
//      same curve — the master's existing reference matching, not a second EQ.
//   3. Every song is mastered to the same loudness, plus the member's own trim per song (a ballad can sit
//      a few dB under the rest, as albums are sequenced). The trim is said in the result.
//   4. The result says how close each song now sits to the album's tone (before → after) and how far apart
//      the loudness ended, measured from the mastered audio, never assumed.
// The tier says how many songs one album holds (`album_songs`: Free 8, Premium 11, StatZ unlimited);
// mastering one song at a time stays every tier's.
import { TARGETS, CUSTOM_LUFS } from "./master.js";

export const TRIM = { min: -6, max: 0 };
export const MAX_ALBUM = 40;              // the engine's own bound, what "unlimited" runs to
const LO = 100, HI = 8000;                // the band range songs are level-matched over (as eqTarget does)

const live = (bands) => (bands || []).filter((b) => b && b.db != null && Number.isFinite(b.db));
const mean = (xs) => xs.reduce((a, x) => a + x, 0) / (xs.length || 1);
const r1 = (v) => Math.round(v * 10) / 10;
export const neg = (v) => `${v < 0 ? "−" : ""}${Math.abs(r1(v))}`;   // a real minus sign, as the rest of Mix ConnectZ prints

/** A song's bands, shifted so their mean over 100 Hz–8 kHz is 0 dB: the shape, not the level. */
export function shapeOf(bands) {
  const b = live(bands);
  const mid = b.filter((x) => x.f >= LO && x.f <= HI);
  const off = mid.length ? mean(mid.map((x) => x.db)) : 0;
  return b.map((x) => ({ f: x.f, db: x.db - off }));
}

/** The album's tone: the mean shape of every song, band by band. Null when nothing was measured. */
export function albumTone(analyses) {
  const shapes = (analyses || []).filter(Boolean).map((a) => shapeOf(a.bands)).filter((s) => s.length);
  if (!shapes.length) return null;
  const byF = new Map();
  for (const s of shapes) for (const x of s) { if (!byF.has(x.f)) byF.set(x.f, []); byF.get(x.f).push(x.db); }
  return [...byF.entries()].sort((a, b) => a[0] - b[0]).map(([f, v]) => ({ f, db: mean(v) }));
}

/** How far a song's shape sits from the tone: RMS dB over 100 Hz–8 kHz. Null when they share no band. */
export function toneDistance(bands, tone) {
  if (!tone) return null;
  const t = new Map(shapeOf(tone).map((x) => [x.f, x.db]));
  const d = shapeOf(bands).filter((x) => x.f >= LO && x.f <= HI && t.has(x.f)).map((x) => x.db - t.get(x.f));
  return d.length ? Math.sqrt(mean(d.map((v) => v * v))) : null;
}

/** The loudness every song is mastered to, before its trim. */
export function albumLufs(settings, inspiration = null) {
  if (settings.target === "custom" && Number.isFinite(settings.lufs)) return settings.lufs;
  if (settings.target === "reference" && inspiration && Number.isFinite(inspiration.lufs)) return Math.max(CUSTOM_LUFS.min, Math.min(CUSTOM_LUFS.max, inspiration.lufs));
  return (TARGETS[settings.target] || TARGETS.streaming).lufs;
}

/** One song's master settings: the album's, with its trim. A preset target with no trim stays the preset. */
export function songSettings(settings, trimDb = 0, inspiration = null) {
  const trim = Math.max(TRIM.min, Math.min(TRIM.max, Number(trimDb) || 0));
  if (!trim && TARGETS[settings.target]) return { ...settings };
  const lufs = Math.max(CUSTOM_LUFS.min, Math.min(CUSTOM_LUFS.max, albumLufs(settings, inspiration) + trim));
  return { ...settings, target: "custom", lufs: r1(lufs) };
}

/** What the album came out as, from the mastered measurements: [{name, lufs, trimDb, toneBefore, toneAfter}]. */
export function albumReport(rows) {
  const done = rows.filter((r) => r && Number.isFinite(r.lufs));
  if (!done.length) return null;
  // Loudness spread with each song's own trim taken back out: what is left is what the master missed.
  const untrimmed = done.map((r) => r.lufs - (r.trimDb || 0));
  const spread = Math.max(...untrimmed) - Math.min(...untrimmed);
  const lines = [`${done.length} song${done.length === 1 ? "" : "s"} mastered. Loudness ${done.length > 1 ? `within ${Math.max(0.1, r1(spread))} dB of each other` : `${neg(done[0].lufs)} LUFS`}${done.some((r) => r.trimDb) ? ", not counting the trims you set" : ""}.`];
  const moved = done.filter((r) => r.toneBefore != null && r.toneAfter != null);
  if (moved.length) {
    const b = mean(moved.map((r) => r.toneBefore)), a = mean(moved.map((r) => r.toneAfter));
    lines.push(`Tone: on average ${r1(b)} dB from the album's balance before, ${r1(a)} dB after${a < b - 0.2 ? "" : " — these songs already shared a balance, so little moved"}.`);
  }
  return { spread: r1(spread), lines };
}

/** Room for another song on this plan: a number left, or null when unlimited or not known yet. */
export function albumRoom(count, cap) {
  const max = cap == null ? MAX_ALBUM : Math.min(cap, MAX_ALBUM);
  return { ok: count < max, left: cap == null ? null : Math.max(0, max - count) };
}

/** "01 Song name" for a file name, in album order. */
export const trackNumber = (i) => String(i + 1).padStart(2, "0");
