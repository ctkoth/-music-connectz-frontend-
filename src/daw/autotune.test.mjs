import test from "node:test";
import assert from "node:assert/strict";
import { autotune, detect, snap } from "./autotune.js";

const rate = 24000;
const tone = (f, secs = 1) => { const x = new Float32Array(rate * secs); for (let i = 0; i < x.length; i++) x[i] = 0.4 * Math.sin(2 * Math.PI * f * i / rate) + 0.15 * Math.sin(4 * Math.PI * f * i / rate); return x; };
const median = (a) => { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
const pitchOf = (x) => median(detect([x], rate).filter((p) => p.f > 0).map((p) => p.f));

test("the detector hears the note that was sung", () => {
  assert.ok(Math.abs(pitchOf(tone(220)) - 220) < 2);
});

test("snapping keeps to the key: in C major, F# goes to F or G, never stays", () => {
  assert.equal(snap(69.4, 9, "chromatic"), 69);            // A4 + 40 cents -> A4
  assert.ok([65, 67].includes(snap(66, 0, "major")));       // F#4 in C major -> F4 or G4
});

test("a flat A (about 30 cents under 440) comes out on 440, and its length is kept", () => {
  const sung = 440 * 2 ** (-0.3 / 12);
  const x = tone(sung);
  const { channels, avgCents } = autotune([x], rate, { key: 9, scale: "chromatic", speedMs: 0 });
  assert.equal(channels[0].length, x.length);
  assert.ok(Math.abs(pitchOf(channels[0]) - 440) < 3, `got ${pitchOf(channels[0])}`);
  assert.ok(avgCents > 20 && avgCents < 40);
});

test("silence stays silence", () => {
  const { channels } = autotune([new Float32Array(rate)], rate);
  assert.ok(channels[0].every((v) => v === 0));
});
