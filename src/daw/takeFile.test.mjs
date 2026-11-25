import test from "node:test";
import assert from "node:assert/strict";
import { sliceChannels, takeFileName, wavBytes } from "./takeFile.js";

const ramp = (n) => Float32Array.from({ length: n }, (_, i) => i);

test("a region's window is cut out of every channel, sample for sample", () => {
  const out = sliceChannels([ramp(100), ramp(100)], 10, 2, 5);        // 2s..5s at 10 Hz = samples 20..50
  assert.equal(out.length, 2);
  assert.equal(out[0].length, 30);
  assert.equal(out[0][0], 20); assert.equal(out[1][29], 49);
});

test("the window is clamped to the recording and an empty one is null, never a zero-length file", () => {
  assert.equal(sliceChannels([ramp(100)], 10, -5, 99)[0].length, 100);
  assert.equal(sliceChannels([ramp(100)], 10, 5, 5), null);
  assert.equal(sliceChannels([ramp(100)], 10, 8, 2), null);
  assert.equal(sliceChannels([], 10, 0, 1), null);
  assert.equal(sliceChannels([ramp(10)], 0, 0, 1), null);
});

test("the size is known before the file is made", () => {
  assert.equal(wavBytes(48000, 2, 24), 44 + 48000 * 2 * 3);
  assert.equal(wavBytes(-1, 2), 44);
});

test("file names are safe and never empty", () => {
  assert.equal(takeFileName("verse", "verse take"), "verse - verse take.wav");
  assert.equal(takeFileName('a/b:c*d?"e<f>g|h'), "a b c d e f g h.wav");
  assert.equal(takeFileName("", null), "take.wav");
  assert.ok(takeFileName("x".repeat(500)).length <= 84);
});

test("an imported file's own extension is not doubled", () => {
  assert.equal(takeFileName("Audio 1", "take.wav"), "Audio 1 - take.wav");
  assert.equal(takeFileName("She's too Good for me m37 beat.WAV"), "She's too Good for me m37 beat.wav");
});
