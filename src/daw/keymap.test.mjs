import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, SKINS, actionFor, assign, keyName, loadKeymap, saveKeymap, skinFilter } from "./keymap.js";

const ev = (key, mods = {}) => ({ key, code: key === " " ? "Space" : "", ...mods });
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test("key names: Ctrl and Cmd are one, Backspace is Delete, modifiers alone are nothing", () => {
  assert.equal(keyName(ev("z", { ctrlKey: true, shiftKey: true })), "Ctrl+Shift+Z");
  assert.equal(keyName(ev("z", { metaKey: true })), "Ctrl+Z");
  assert.equal(keyName(ev(" ")), "Space");
  assert.equal(keyName(ev("Backspace")), "Delete");
  assert.equal(keyName(ev("Shift", { shiftKey: true })), "");
});

test("the defaults work, and reassigning a key takes it from the action that had it", () => {
  assert.equal(actionFor(DEFAULTS, ev("b")), "split");
  const m = assign(DEFAULTS, "record", "B");
  assert.equal(actionFor(m, ev("b")), "record");
  assert.equal(m.split, "");
  assert.equal(actionFor(m, ev("r")), null);
});

test("a keymap is kept per DAW, and skins say what they draw", () => {
  const s = mem();
  saveKeymap("azrael", assign(DEFAULTS, "play", "P"), s);
  assert.equal(loadKeymap("azrael", s).play, "P");
  assert.equal(loadKeymap("arsenal", s).play, "Space");
  assert.equal(skinFilter("default"), "");
  assert.match(skinFilter("mono"), /grayscale/);
  assert.ok(SKINS.length > 6);
});
