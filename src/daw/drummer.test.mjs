// The Smart Drummer: the same settings always play the same thing, busier means more notes, and a fill is a fill.
import test from "node:test";
import assert from "node:assert/strict";
import { STYLES, drumPart, fillBar, groove, layersFor, styleSwing } from "./drummer.js";
import { STEPS } from "./rack.js";

const hits = (p) => p.channels.reduce((n, c) => n + c.steps.filter(Boolean).length, 0);
const shape = (p) => p.channels.map((c) => [c.voice, c.vol, c.steps]);

test("every style gives a groove with a kick, sixteen steps a drum", () => {
  for (const k of Object.keys(STYLES)) {
    const g = groove(k);
    assert.ok(g.channels.some((c) => c.voice === "kick"), k);
    assert.ok(g.channels.every((c) => c.steps.length === STEPS), k);
    assert.ok(hits(g) > 0, k);
  }
});

test("the same settings always play the same groove", () => {
  assert.deepEqual(shape(groove("trap", { busy: 0.8, hard: 0.3 })), shape(groove("trap", { busy: 0.8, hard: 0.3 })));
});

test("busier never plays fewer notes, and busiest plays more than simplest", () => {
  for (const k of Object.keys(STYLES)) {
    const [a, b, c] = [0, 0.5, 1].map((busy) => hits(groove(k, { busy })));
    assert.ok(a <= b && b <= c && a < c, `${k}: ${a} ${b} ${c}`);
  }
  assert.deepEqual([0, 0.33, 0.34, 0.66, 0.67, 1].map(layersFor), [1, 1, 2, 2, 3, 3]);
});

test("harder is louder, and volumes stay playable", () => {
  const soft = groove("rock", { hard: 0 }).channels;
  const loud = groove("rock", { hard: 1 }).channels;
  soft.forEach((c, i) => assert.ok(loud[i].vol > c.vol));
  assert.ok([...soft, ...loud].every((c) => c.vol > 0 && c.vol <= 1));
});

test("a fill keeps the first half of the groove and changes the second", () => {
  for (const k of Object.keys(STYLES)) {
    const g = groove(k); const f = fillBar(k);
    const kick = (p) => p.channels.find((c) => c.voice === "kick").steps;
    assert.deepEqual(kick(f).slice(0, 8).map((v, i) => v || !kick(g)[i]).includes(false), false, `${k} first half`);
    const second = (p) => p.channels.map((c) => [c.voice, c.steps.slice(8)]);
    assert.notDeepEqual(second(f), second(g), k);
    assert.ok(f.channels.every((c) => c.steps.length === STEPS));
  }
});

test("a part is one pattern a bar with the fill closing each phrase", () => {
  const part = drumPart("pop", { bars: 8, fillEvery: 4 });
  assert.equal(part.length, 8);
  assert.deepEqual(part.map((p) => /fill/.test(p.name)), [false, false, false, true, false, false, false, true]);
  assert.ok(drumPart("pop", { bars: 4, fillEvery: 0 }).every((p) => !/fill/.test(p.name)));
  assert.equal(drumPart("pop", { bars: 0 }).length, 1);
});

test("an unknown style falls back instead of breaking, and swing comes from the style", () => {
  assert.ok(hits(groove("polka")) > 0);
  assert.equal(styleSwing("hiphop"), 0.25);
  assert.equal(styleSwing("polka"), 0);
});
