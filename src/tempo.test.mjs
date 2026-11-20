import test from "node:test";
import assert from "node:assert/strict";
import { detectTempo } from "./tempo.js";

const RATE = 22050;

/** A kick-like click every beat at `bpm`, for `seconds`, with an offbeat hat at half volume when `hats` is set. */
function clicks(bpm, seconds, { hats = false } = {}) {
  const out = new Float32Array(Math.round(RATE * seconds));
  const beat = (60 / bpm) * RATE;
  const hit = (at, amp) => { for (let i = 0; i < 1400 && at + i < out.length; i++) out[Math.round(at) + i] += amp * Math.sin(2 * Math.PI * 80 * i / RATE) * Math.exp(-i / 350); };
  for (let k = 0; k * beat < out.length; k++) { hit(k * beat, 0.8); if (hats) hit(k * beat + beat / 2, 0.35); }
  return out;
}

test("a steady pulse reads as its tempo", () => {
  for (const bpm of [70, 93, 120, 140, 160]) {
    const t = detectTempo(clicks(bpm, 40), RATE);
    assert.ok(t, `${bpm}`);
    assert.ok(Math.abs(t.bpm - bpm) <= 2, `${bpm} read as ${t.bpm}`);
  }
});

test("offbeat hats do not turn the tempo into double time", () => {
  const t = detectTempo(clicks(90, 40, { hats: true }), RATE);
  assert.ok(Math.abs(t.bpm - 90) <= 2, `read ${t.bpm}`);
});

test("silence and an unchanging tone say nothing rather than inventing a tempo", () => {
  assert.equal(detectTempo(new Float32Array(RATE * 20), RATE), null);
  const tone = new Float32Array(RATE * 20).map((_, i) => 0.3 * Math.sin(2 * Math.PI * 220 * i / RATE));
  assert.equal(detectTempo(tone, RATE), null);
});

test("too little audio, or nothing at all, is null", () => {
  assert.equal(detectTempo(new Float32Array(100), RATE), null);
  assert.equal(detectTempo(null, RATE), null);
});

test("the answer is a whole number and carries how sure it is", () => {
  const t = detectTempo(clicks(120, 30), RATE);
  assert.equal(t.bpm, Math.round(t.bpm));
  assert.ok(t.strength > 0 && t.strength <= 1);
});
