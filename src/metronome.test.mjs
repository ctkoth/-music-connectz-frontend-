// node --test src/metronome.test.mjs
//
// The property worth holding this file to: MetZ never shows a tempo the coach
// did not say.
//
// A metronome opened at 75 BPM because the drill said 75, and one opened at 75
// because the parser guessed, look identical on screen — and the member
// practises to whichever one they got. So every field here is null when the
// text didn't name it, and the tests that matter most are the ones asserting
// nothing was found.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BPM_MAX, BPM_MIN, clampBpm, drillIsRunnable, marking, parseDrill, tap } from "./metronome.js";

// The drill from a real Boss Take, which is what this parser exists for.
const REAL = "Run the phrase 'supreme machine' slowly across eight steady "
  + "metronome clicks at 75 BPM, exaggerating the 's', 'p', and 'm' sounds on "
  + "each beat for ten reps before your next take.";

test("a real coach drill gives up its tempo, its length and its reps", () => {
  const d = parseDrill(REAL);
  assert.equal(d.bpm, 75);
  assert.equal(d.clicks, 8);
  assert.equal(d.reps, 10);
  assert.equal(drillIsRunnable(d), true);
});

test("'beats per minute' is a tempo, never a count of beats", () => {
  // The trap: the tempo's own number is followed by the word "beats", so a
  // parser that looks for clicks before it consumes the tempo reads "count 90".
  const d = parseDrill("Hold each vowel for 4 beats at 90 beats per minute.");
  assert.equal(d.bpm, 90);
  assert.equal(d.clicks, 4);
});

test("digits and words are the same number", () => {
  assert.equal(parseDrill("across 8 clicks at 75bpm for 10 reps").clicks, 8);
  assert.equal(parseDrill("across eight clicks at 75bpm for ten reps").reps, 10);
  assert.equal(parseDrill("run it x8 at 120 BPM").reps, 8);
});

test("bars are counted as bars, not as clicks", () => {
  const d = parseDrill("Loop the hook over 4 bars at 128 BPM.");
  assert.equal(d.bars, 4);
  assert.equal(d.clicks, null);
  assert.equal(d.bpm, 128);
});

test("the subdivision is read only when it is written", () => {
  assert.equal(parseDrill("count the quarter notes out loud").subdivision, "quarter");
  assert.equal(parseDrill("swing the eighth notes").subdivision, "eighth");
  assert.equal(parseDrill("in triplets, slowly").subdivision, "triplet");
  assert.equal(parseDrill("sixteenth-note hi-hats").subdivision, "sixteenth");
  assert.equal(parseDrill("sing it slowly and evenly").subdivision, null);
});

test("a drill that names nothing yields nothing — no invented tempo", () => {
  for (const text of [
    "Sit upright and push each vowel off the front of your mouth.",
    "Warm up before your next take.",
    "", null, undefined,
  ]) {
    const d = parseDrill(text);
    assert.equal(d.bpm, null, JSON.stringify(text));
    assert.equal(d.clicks, null);
    assert.equal(d.bars, null);
    assert.equal(d.reps, null);
    assert.equal(drillIsRunnable(d), false);
  }
});

test("a tempo outside what anybody practises to is a typo, not a tempo", () => {
  assert.equal(parseDrill("at 900 BPM").bpm, null);
  assert.equal(parseDrill("at 12 BPM").bpm, null);
  assert.equal(parseDrill("at 30 BPM").bpm, 30);
  assert.equal(parseDrill("at 300 BPM").bpm, 300);
});

test("clampBpm keeps every route into the tool inside the range", () => {
  assert.equal(clampBpm(0), BPM_MIN);
  assert.equal(clampBpm(-40), BPM_MIN);
  assert.equal(clampBpm(9999), BPM_MAX);
  assert.equal(clampBpm("75"), 75);
  assert.equal(clampBpm(75.4), 75);
  assert.equal(clampBpm(NaN), 90);       // the default, not zero
  assert.equal(clampBpm(undefined), 90);
});

test("markings are the conventional bands, not invented ones", () => {
  assert.equal(marking(50), "Largo");
  assert.equal(marking(80), "Andante");
  assert.equal(marking(110), "Moderato");
  assert.equal(marking(140), "Allegro");
  assert.equal(marking(210), "Prestissimo");
});

test("tap tempo averages the taps, and a pause starts a new count", () => {
  // Four taps 500ms apart is 120 BPM.
  let s = { times: [], bpm: null };
  for (const t of [0, 500, 1000, 1500]) s = tap(s.times, t);
  assert.equal(s.bpm, 120);

  // One tap is not a tempo — there is no gap to measure yet.
  assert.equal(tap([], 0).bpm, null);

  // A long gap is somebody starting again, not a very slow beat. Without the
  // reset that 10s gap averages in and reports a tempo nobody tapped.
  const after = tap(s.times, 11500);
  assert.equal(after.bpm, null);
  assert.equal(after.times.length, 1);
});
