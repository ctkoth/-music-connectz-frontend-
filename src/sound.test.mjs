import test from "node:test";
import assert from "node:assert/strict";

// sound.js reads localStorage and window at import; give it the least it needs.
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; Object.assign(this, o); } };
const { PACKS, PACK_KEYS, SOUND_KEYS, voicesFor } = await import("./sound.js");

test("every pack keeps the grammar: gains rise, spends fall, in every voice it adds", () => {
  for (const pack of PACK_KEYS) {
    for (const [key, dir] of [["energy_gain", 1], ["energy_spend", -1], ["promptz_spend", -1]]) {
      for (const v of voicesFor(key, pack)) {
        assert.ok(Math.sign((v.to ?? v.from) - v.from) === dir, `${pack}/${key} moves the wrong way`);
      }
    }
  }
});

test("every sound is audible in every pack, and nothing is louder than a click should be", () => {
  for (const pack of PACK_KEYS) {
    for (const key of SOUND_KEYS) {
      const vs = voicesFor(key, pack);
      assert.ok(vs.length > 0, `${pack}/${key} is silent`);
      for (const v of vs) {
        assert.ok(v.from > 20 && v.from < 12000 && v.gain > 0 && v.gain <= 0.12 && v.dur > 0 && v.at >= 0, `${pack}/${key}`);
      }
    }
  }
});

test("the casino packs add voices on top; an unknown pack is the house set", () => {
  assert.ok(voicesFor("like", "casino").length > voicesFor("like", "house").length);
  assert.ok(voicesFor("like", "highroller").length > voicesFor("like", "house").length);
  assert.deepEqual(voicesFor("like", "nope"), voicesFor("like", "house"));
  assert.ok(PACKS.house.free && !PACKS.casino.free);
  assert.ok(SOUND_KEYS.includes("score_high"));
});
