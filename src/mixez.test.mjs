import test from "node:test";
import assert from "node:assert/strict";
import { balanceRound, balanceGrade, BALANCE_RANGE, findRound, gradeFind, peakDb, matchRound, matchError, matchGrade, addResult, summary, LEVELS, SLIDERS, rng } from "./mixez.js";

test("peaking filter hits its gain at centre and is flat far away", () => {
  assert.ok(Math.abs(peakDb(1000, 1000, 9, 1.4) - 9) < 0.05);
  assert.ok(Math.abs(peakDb(30, 4000, 9, 1.4)) < 0.3);
  assert.ok(Math.abs(peakDb(1000, 1000, -6, 2) + 6) < 0.05);
});
test("rounds are deterministic, from the level's bands, and never repeat the last band", () => {
  const a = findRound(5, "easy"), b = findRound(5, "easy");
  assert.deepEqual(a, b);
  for (let s = 0; s < 200; s++) {
    const r = findRound(s, "medium", 1000);
    assert.ok(LEVELS.medium.bands.includes(r.band) && r.band !== 1000);
  }
  assert.equal(gradeFind(a, a.band).right, true);
  assert.equal(gradeFind(a, a.band * 2).right, false);
});
test("matching: identical curves are 0 dB off; a missed slider is not", () => {
  const t = matchRound(3, "medium");
  assert.equal(matchError(t.gains, t.gains), 0);
  const miss = t.gains.map((g, i) => (i === t.gains.findIndex((x) => x) ? 0 : g));
  assert.ok(matchError(t.gains, miss) > 1.5);
  assert.equal(matchGrade(0).words, "Spot on");
  assert.equal(matchGrade(2.5).close, false);
});
test("a target always moves some sliders and keeps whole dB", () => {
  for (let s = 0; s < 100; s++) for (const lv of ["easy", "medium", "hard"]) {
    const g = matchRound(s, lv).gains;
    assert.equal(g.length, SLIDERS.length);
    assert.ok(g.some((x) => x !== 0) && g.every(Number.isInteger));
  }
});
test("rng is stable", () => { assert.equal(rng(1)(), rng(1)()); });
test("progress counts only the drill asked, caps at 200, and says null with no tries", () => {
  let log = [];
  for (let i = 0; i < 250; i++) log = addResult(log, i % 2 ? "find" : "match", i % 3 === 0, i);
  assert.equal(log.length, 200);
  assert.equal(summary([], "find").pct, null);
  const s = summary(addResult(addResult([], "find", true), "find", false), "find");
  assert.deepEqual([s.n, s.ok, s.pct], [2, 1, 50]);
});

test("balance: rounds stay inside the fader, never at zero, grading is the plain dB gap", () => {
  for (let s = 0; s < 200; s++) for (const lv of ["easy", "medium", "hard"]) {
    const { db } = balanceRound(s, lv);
    assert.ok(db !== 0 && Math.abs(db) <= BALANCE_RANGE && Number.isInteger(db));
  }
  assert.equal(balanceGrade(5, 5).words, "Spot on");
  assert.equal(balanceGrade(5, 4.2).close, true);
  assert.equal(balanceGrade(-6, 0).close, false);
  assert.equal(balanceGrade(3, 6).side, "too loud");
  assert.equal(balanceGrade(3, 0).side, "too quiet");
});
