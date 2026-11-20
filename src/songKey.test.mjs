import test from "node:test";
import assert from "node:assert/strict";
import { detectKey, keyFromChroma, NAMES } from "./songKey.js";

const SR = 22050;
// A little tune in a key: a held tonic triad then the scale degrees, with two harmonics like a real instrument.
function tune(midis, secs = 12) {
  const x = new Float32Array(SR * secs);
  const per = Math.floor(x.length / midis.length);
  midis.forEach((m, k) => {
    const f = 440 * Math.pow(2, (m - 69) / 12);
    for (let i = 0; i < per; i++) {
      const t = i / SR, v = Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t) + 0.2 * Math.sin(6 * Math.PI * f * t);
      x[k * per + i] = 0.3 * v;
    }
  });
  return x;
}
const C = 60, A = 57;

test("a C major tune reads as C major, and names its relative", () => {
  const k = detectKey(tune([C, C + 4, C + 7, C, C + 2, C + 4, C + 5, C + 7, C + 9, C + 7, C + 4, C]), SR);
  assert.equal(k.label, "C major");
  assert.equal(k.relative, "A minor");
});
test("an A minor tune reads as A minor", () => {
  const k = detectKey(tune([A, A + 3, A + 7, A, A + 2, A + 3, A + 5, A + 7, A + 8, A + 7, A + 3, A]), SR);
  assert.equal(k.label, "A minor");
});
test("a key a few steps away is found in the right place", () => {
  const D = 62;
  assert.equal(detectKey(tune([D, D + 4, D + 7, D, D + 2, D + 4, D + 5, D + 7, D + 9, D + 7, D + 4, D]), SR).label, "D major");
});
test("silence and noise-free nothing is no key, never a guess", () => {
  assert.equal(detectKey(new Float32Array(SR * 5), SR), null);
  assert.equal(detectKey(new Float32Array(100), SR), null);
  assert.equal(keyFromChroma(new Array(12).fill(0)), null);
  assert.equal(keyFromChroma(new Array(12).fill(1)), null);
});
test("names are the twelve pitch classes", () => assert.equal(NAMES.length, 12));

import { detectKeyFromChannels } from "./songKey.js";
test("a DAW track rendered to channels is read like any audio, stereo or mono", () => {
  const mono = tune([60, 64, 67, 60, 62, 64, 65, 67, 69, 67, 64, 60]);
  assert.equal(detectKeyFromChannels({ channels: [mono, mono], rate: SR }).label, "C major");
  assert.equal(detectKeyFromChannels({ channels: [mono], rate: SR }).label, "C major");
  assert.equal(detectKeyFromChannels({ channels: [], rate: SR }), null);
  assert.equal(detectKeyFromChannels({ channels: [new Float32Array(0)], rate: SR }), null);
});
