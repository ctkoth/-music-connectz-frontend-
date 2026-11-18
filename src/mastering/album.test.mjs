import test from "node:test";
import assert from "node:assert/strict";
import { albumTone, toneDistance, shapeOf, songSettings, albumLufs, albumReport, albumRoom, trackNumber, MAX_ALBUM } from "./album.js";
import { master, toStereo } from "./master.js";
import { analyse } from "./meter.js";

const F = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const bands = (fn) => F.map((f) => ({ f, db: fn(f) }));

test("the album's tone is the songs' shapes averaged, so a loud song does not outvote a quiet one", () => {
  const dark = bands((f) => -10 - 3 * Math.log2(f / 1000));          // tilts down
  const bright = bands((f) => -30 + 3 * Math.log2(f / 1000));        // tilts up, 20 dB quieter
  const tone = albumTone([{ bands: dark }, { bands: bright }]);
  for (const x of tone) assert.ok(Math.abs(x.db) < 1e-9, `${x.f} Hz should be flat, got ${x.db}`);
  assert.equal(albumTone([]), null);
});

test("tone distance is the shape gap, not the level gap", () => {
  const a = bands((f) => -10 - 2 * Math.log2(f / 1000));
  const louder = a.map((x) => ({ ...x, db: x.db + 12 }));
  assert.ok(toneDistance(louder, a) < 1e-9);
  assert.ok(toneDistance(bands(() => -10), a) > 1);
  assert.equal(toneDistance(a, null), null);
  assert.ok(Math.abs(shapeOf(a).filter((x) => x.f >= 100 && x.f <= 8000).reduce((s, x) => s + x.db, 0)) < 1e-9);
});

test("every song gets the album's loudness, plus its own trim", () => {
  const s = { target: "streaming", style: "balanced" };
  assert.deepEqual(songSettings(s, 0), s, "no trim keeps the preset");
  assert.deepEqual(songSettings(s, -3), { ...s, target: "custom", lufs: -17 });
  assert.equal(songSettings(s, -99).lufs, -20, "a trim never goes past −6 dB");
  assert.equal(songSettings({ target: "custom", lufs: -10 }, -2).lufs, -12);
  assert.equal(albumLufs({ target: "reference" }, { lufs: -9 }), -9);
  assert.equal(albumLufs({ target: "reference" }, null), -14, "no Inspiration: streaming");
});

test("the report takes the trims back out before it says how far apart the songs ended", () => {
  const r = albumReport([{ lufs: -14.1, trimDb: 0, toneBefore: 2.4, toneAfter: 0.8 }, { lufs: -17.0, trimDb: -3, toneBefore: 1.6, toneAfter: 0.6 }]);
  assert.equal(r.spread, 0.1);
  assert.match(r.lines[0], /within 0\.1 dB .* not counting the trims/);
  assert.match(r.lines[1], /2 dB from the album's balance before, 0\.7 dB after/);
  assert.equal(albumReport([]), null);
});

test("the plan's song count is applied where a song is added", () => {
  assert.deepEqual(albumRoom(3, 3), { ok: false, left: 0 });
  assert.deepEqual(albumRoom(1, 6), { ok: true, left: 5 });
  assert.equal(albumRoom(MAX_ALBUM, null).ok, false);
  assert.equal(trackNumber(0), "01");
});

test("two songs with different balances master closer to the album's tone, at one loudness", () => {
  const fs = 44100, secs = 6;
  const make = (lowAmp, highAmp, gain) => {
    const x = new Float32Array(fs * secs);
    let seed = 1;
    for (let i = 0; i < x.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const n = seed / 0x7fffffff * 2 - 1;
      x[i] = gain * (lowAmp * Math.sin(2 * Math.PI * 120 * i / fs) + highAmp * Math.sin(2 * Math.PI * 5000 * i / fs) + 0.05 * n);
    }
    return [x, Float32Array.from(x)];
  };
  const songs = [make(0.6, 0.05, 0.5), make(0.1, 0.4, 0.2)];
  const before = songs.map((c) => analyse(c, fs));
  const tone = albumTone(before);
  const out = songs.map((c) => master(c, fs, songSettings({ target: "streaming" }, 0), { bands: tone }));
  const after = out.map((o) => analyse(toStereo(o.channels), fs));
  for (let i = 0; i < 2; i++) assert.ok(toneDistance(after[i].bands, tone) < toneDistance(before[i].bands, tone), `song ${i + 1} moved toward the album`);
  assert.ok(Math.abs(after[0].lufs - after[1].lufs) < 1.5, `loudness ${after[0].lufs} vs ${after[1].lufs}`);
});
