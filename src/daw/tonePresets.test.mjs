import test from "node:test";
import assert from "node:assert/strict";
import { STARTERS, chainToInserts, insertsToChain, presetRoom } from "./tonePresets.js";
import { PLUGINS, cleanInserts } from "./plugins.js";

test("every starter is made of built-in effects with every value inside its range", () => {
  for (const s of STARTERS) {
    const chain = s.chain();
    assert.ok(chain.length > 0 && chain.length <= 8, s.name);
    assert.deepEqual(cleanInserts(chain).map((i) => i.params), chain.map((i) => i.params), `${s.name} has a value out of range`);
    for (const i of chain) assert.ok(PLUGINS[i.type]);
    assert.ok(s.what.length > 10);
  }
});

test("a saved chain loses its ids and comes back with fresh ones, settings intact", () => {
  const ins = STARTERS[0].chain();
  const saved = insertsToChain(ins);
  assert.ok(saved.every((c) => !("id" in c)));
  const back = chainToInserts(saved);
  assert.deepEqual(back.map((i) => i.params), ins.map((i) => i.params));
  assert.ok(back.every((i, k) => i.id && i.id !== ins[k].id));
});

test("a stored value out of range is pulled back in, and junk is dropped", () => {
  const back = chainToInserts([{ type: "comp", params: { ratio: 99 } }, { type: "bogus" }]);
  assert.equal(back.length, 1);
  assert.equal(back[0].params.ratio, 20);
});

test("the ceiling reads in a unit you can check", () => {
  assert.deepEqual(presetRoom({ count: 2, limit: 3 }), { ok: true, line: "2 of 3 saved" });
  assert.equal(presetRoom({ count: 3, limit: 3 }).ok, false);
  assert.equal(presetRoom({ count: 40, limit: null }).ok, true);
});
