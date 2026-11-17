import test from "node:test";
import assert from "node:assert/strict";
import { panLabel, panSplit, panStereo, mixTracks, needsMix, audible, suggestMix, measureTrack, stereoReport, trackRoom, guessRole } from "./multitrack.js";

const fs = 44100;
const tone = (f, amp = 0.3, secs = 1) => { const x = new Float32Array(fs * secs); for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin(2 * Math.PI * f * i / fs); return x; };
const rms = (x) => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);

test("centre pan leaves a stereo track exactly as it was", () => {
  const l = tone(440), r = tone(660);
  const [L, R] = panStereo(l, r, 0);
  assert.deepEqual([...L.slice(0, 50)], [...l.slice(0, 50)]);
  assert.deepEqual([...R.slice(0, 50)], [...r.slice(0, 50)]);
});

test("hard left puts everything in the left speaker (the StereoPannerNode law)", () => {
  const x = tone(440);
  const [L, R] = panStereo(x, x, -1);
  assert.ok(rms(R) < 1e-6);
  assert.ok(Math.abs(rms(L) - 2 * rms(x)) < 1e-4);
});

test("gain is in dB, and a mono file is treated as dual mono", () => {
  const x = tone(440);
  const { channels } = mixTracks([{ channels: [x], gainDb: -6.0206, pan: 0 }], fs);
  assert.ok(Math.abs(rms(channels[0]) - rms(x) / 2) < 1e-4);
  assert.ok(Math.abs(rms(channels[1]) - rms(x) / 2) < 1e-4);
});

test("tracks of different lengths and rates mix to the longest, at the song's rate", () => {
  const a = tone(440, 0.3, 1), b = new Float32Array(48000 * 2).fill(0.1);
  const { channels } = mixTracks([{ channels: [a, a] }, { channels: [b, b], sampleRate: 48000 }], fs);
  assert.ok(Math.abs(channels[0].length - fs * 2) < 50);
});

test("solo wins over mute, and mute takes a track out", () => {
  assert.deepEqual(audible([{ mute: true }, {}, {}]), [false, true, true]);
  assert.deepEqual(audible([{ mute: true, solo: true }, { solo: false }, {}]), [true, false, false]);
  const x = tone(440);
  const { channels } = mixTracks([{ channels: [x, x], mute: true }], fs);
  assert.ok(rms(channels[0]) === 0);
});

test("a single untouched song is not re-mixed", () => {
  assert.equal(needsMix([{ gainDb: 0, pan: 0 }]), false);
  assert.equal(needsMix([{ gainDb: 2, pan: 0 }]), true);
  assert.equal(needsMix([{}, {}]), true);
  assert.equal(needsMix(null), false);
});

test("the suggestion sets each track against the lead, centres bass, spreads backing vocals apart", () => {
  const lead = { channels: [tone(300, 0.2), tone(300, 0.2)] };
  const bass = { channels: [tone(60, 0.6)] };
  const bv1 = { channels: [tone(2000, 0.5)] };
  const bv2 = { channels: [tone(1500, 0.5)] };
  const rows = [["lead", lead], ["bass", bass], ["backing", bv1], ["backing", bv2]]
    .map(([role, t]) => ({ role, m: measureTrack(t.channels, fs) }));
  const s = suggestMix(rows);
  assert.equal(s[0].gainDb, 0);
  assert.equal(s[0].pan, 0);
  assert.equal(s[1].pan, 0);
  assert.ok(s[2].pan * s[3].pan < 0, "the two backing vocals go to opposite sides");
  // After the gains, each sits at its role's level under the lead (−3 bass, −7 backing).
  const after = (i) => rows[i].m.lufs + s[i].gainDb;
  assert.ok(Math.abs(after(1) - (after(0) - 3)) < 0.11);
  assert.ok(Math.abs(after(2) - (after(0) - 7)) < 0.11);
  for (const r of s) assert.ok(r.why.length > 10);
});

test("a track that is already wide stereo is left centred", () => {
  const l = tone(500, 0.3), r = tone(733, 0.3);
  const rows = [{ role: "lead", m: measureTrack([tone(300), tone(300)], fs) }, { role: "instrument", m: measureTrack([l, r], fs) }];
  const s = suggestMix(rows);
  assert.equal(s[1].pan, 0);
  assert.match(s[1].why, /already a wide stereo/);
});

test("silent tracks are left alone and never set to the gain ceiling", () => {
  const s = suggestMix([{ role: "lead", m: measureTrack([tone(300)], fs) }, { role: "other", m: measureTrack([new Float32Array(fs)], fs) }]);
  assert.equal(s[1].gainDb, 0);
});

test("the stereo report flags a bass panned to one side", () => {
  const bass = tone(60, 0.5);
  const rep = stereoReport(panStereo(bass, bass, -1), fs);
  assert.ok(rep.notes.some((n) => /low end/.test(n)));
});

test("the tier's track count: 3, 6, unlimited, and nothing blocked before it loads", () => {
  assert.deepEqual(trackRoom(2, 3), { ok: true, left: 1 });
  assert.equal(trackRoom(3, 3).ok, false);
  assert.equal(trackRoom(50, null).ok, true);
  assert.equal(trackRoom(50, undefined).ok, true);
});

test("roles are guessed from file names", () => {
  assert.equal(guessRole("Lead Vox.wav"), "lead");
  assert.equal(guessRole("808.wav"), "bass");
  assert.equal(guessRole("backing vocals 2.wav"), "backing");
  assert.equal(guessRole("Beat (instrumental).mp3"), "beat");
});

test("the pan reads as a percentage to each side, always adding to 100", () => {
  assert.equal(panLabel(0), "Centre · L 50% · R 50%");
  assert.equal(panLabel(-1), "L 100% · R 0%");
  assert.equal(panLabel(0.4), "L 30% · R 70%");
  for (const p of [-0.83, -0.05, 0.35, 0.999]) { const s = panSplit(p); assert.equal(s.left + s.right, 100); }
});
