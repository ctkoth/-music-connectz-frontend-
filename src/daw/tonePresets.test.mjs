import test from "node:test";
import assert from "node:assert/strict";
import { STARTERS, chainToInserts, insertsToChain, presetRoom } from "./tonePresets.js";
import { PLUGINS, cleanInserts } from "./plugins.js";

test("every starter is made of built-in effects with every value inside its range", () => {
  for (const s of STARTERS) {
    const chain = s.chain();
    assert.ok(chain.length > 0 && chain.length <= 8, s.name);
    assert.deepEqual(cleanInserts(chain).map((i) => [i.params, i.bands]), chain.map((i) => [i.params, i.bands]), `${s.name} has a value out of range`);
    for (const i of chain) if (i.type === "eq") assert.equal(i.bands.length, 3, `${s.name}: a starter fits the Free plan's three bands`);
    for (const i of chain) assert.ok(PLUGINS[i.type]);
    assert.ok(s.what.length > 10);
  }
});

test("a saved chain loses its ids and comes back with fresh ones, settings intact", () => {
  const ins = STARTERS[0].chain();
  const saved = insertsToChain(ins);
  assert.ok(saved.every((c) => !("id" in c)));
  const back = chainToInserts(saved);
  assert.deepEqual(back.map((i) => [i.params, i.bands]), ins.map((i) => [i.params, i.bands]));
  assert.ok(back.every((i, k) => i.id && i.id !== ins[k].id));
});

test("a stored value out of range is pulled back in, and junk is dropped", () => {
  const back = chainToInserts([{ type: "comp", params: { ratio: 99 } }, { type: "bogus" }]);
  assert.equal(back.length, 1);
  assert.equal(back[0].params.ratio, 20);
});

test("each kind's ceiling reads on its own, in a unit you can check", () => {
  const st = { limit: 3, kinds: { tone: { count: 3 }, fx: { count: 1 } } };
  assert.deepEqual(presetRoom(st, "fx"), { ok: true, line: "1 of 3 saved" });
  assert.equal(presetRoom(st, "tone").ok, false);
  assert.deepEqual(presetRoom(st, "master"), { ok: true, line: "0 of 3 saved" });
  assert.equal(presetRoom({ limit: null, kinds: { tone: { count: 40 } } }, "tone").ok, true);
});

test("an EQ saved before bands opens as the three bands it was, and a chain keeps every band", () => {
  const [old] = cleanInserts([{ type: "eq", params: { lowGain: -2, lowFreq: 200, midGain: 2, midFreq: 3000, midQ: 1.5, highGain: 3, highFreq: 10000 } }]);
  assert.deepEqual(old.bands, [{ type: "lowshelf", f: 200, gain: -2, q: 1 }, { type: "peaking", f: 3000, gain: 2, q: 1.5 }, { type: "highshelf", f: 10000, gain: 3, q: 1 }]);
  const seven = Array.from({ length: 7 }, (_, k) => ({ type: "peaking", f: 200 * (k + 1), gain: -1, q: 2 }));
  const back = chainToInserts(insertsToChain(cleanInserts([{ type: "eq", bands: seven }])));
  assert.equal(back[0].bands.length, 7);
});

test("starters have unique keys, cover the whole kit, and borrow nobody's preset names", () => {
  const keys = STARTERS.map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length);
  const groups = new Set(STARTERS.map((s) => s.group));
  for (const g of ["Voice", "Guitar", "Bass", "Keys", "Drums", "Strings and brass", "Mix"]) assert.ok(groups.has(g), g);
  // Ours are written from ordinary practice; a name that implies a vendor's preset would imply a link we do not have.
  for (const s of STARTERS) assert.ok(!/fabfilter|ozone|izotope|waves|pro-?q|pro-?c|pro tools|logic|bitwig/i.test(`${s.name} ${s.what}`), s.name);
});

test("only free effects are used, so a Free member can apply every starter", () => {
  for (const s of STARTERS) for (const i of s.chain()) assert.ok(!PLUGINS[i.type].statz, `${s.name} uses ${i.type}`);
});
