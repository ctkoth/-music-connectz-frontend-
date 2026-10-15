// The coach form's starting values: device choice, then history, then built-in.
//
// The rules these hold: a stored value that is no longer an option never reaches
// a <select>; a throwing or junk store means "nothing saved", never a crash; and
// the built-in choice is the last resort and says nothing about itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUILTIN_CHOICE, SOURCE_NOTE, browserStorage, readPrefs, resolveChoice, writePref,
} from "./coachPrefs.js";

const fakeStore = (seed = {}) => {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    _m: m,
  };
};
const throwing = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); },
};

const GENRES = ["R&B", "Soul", "Jazz"];
const RANGES = ["bass", "tenor", "soprano"];
const DIFFS = ["starter", "builder", "performer", "stageboss"];

test("the device choice wins over history and the built-in choice", () => {
  const r = resolveChoice("genre", {
    device: { genre: "Jazz" }, server: { genre: "Soul" }, options: GENRES,
  });
  assert.deepEqual(r, { value: "Jazz", source: "device" });
});

test("history is used when there is no device choice", () => {
  const r = resolveChoice("genre", { device: {}, server: { genre: "Soul" }, options: GENRES });
  assert.deepEqual(r, { value: "Soul", source: "server" });
});

test("a new member with no history gets the built-in choice and no note", () => {
  const r = resolveChoice("range", { device: {}, server: { range: null }, options: RANGES });
  assert.deepEqual(r, { value: "tenor", source: "builtin" });
  assert.equal(SOURCE_NOTE[r.source], "");
});

test("a stored value no longer in the option list falls back, it never reaches the select", () => {
  const r = resolveChoice("genre", {
    device: { genre: "Renamed Genre" }, server: { genre: "Soul" }, options: GENRES,
  });
  assert.deepEqual(r, { value: "Soul", source: "server" });
});

test("a stale device value with no history falls back to the built-in choice", () => {
  const r = resolveChoice("difficulty", {
    device: { difficulty: "legend" }, server: {}, options: DIFFS,
  });
  assert.deepEqual(r, { value: "builder", source: "builtin" });
});

test("when the built-in choice is not offered, the first option is used", () => {
  const r = resolveChoice("range", { device: {}, server: {}, options: ["bass", "soprano"] });
  assert.deepEqual(r, { value: "bass", source: "builtin" });
});

test("an empty or non-string saved value is ignored", () => {
  assert.equal(resolveChoice("genre", { device: { genre: "" }, server: {}, options: GENRES }).source,
    "builtin");
  assert.equal(resolveChoice("genre", { device: { genre: 7 }, server: {}, options: GENRES }).source,
    "builtin");
});

test("the built-in choice matches what the screen always started on", () => {
  assert.deepEqual(BUILTIN_CHOICE, { genre: "R&B", range: "tenor", difficulty: "builder" });
});

test("only a device or a history choice has a note beside it", () => {
  assert.equal(SOURCE_NOTE.device, "Your last choice");
  assert.equal(SOURCE_NOTE.server, "From your last take");
  assert.equal(SOURCE_NOTE.builtin, "");
  assert.equal(SOURCE_NOTE.post, undefined);
});

test("readPrefs returns an object for junk, arrays and a throwing store", () => {
  assert.deepEqual(readPrefs("singz", fakeStore()), {});
  assert.deepEqual(readPrefs("singz", fakeStore({ mcz_coach_prefs_singz: "not json" })), {});
  assert.deepEqual(readPrefs("singz", fakeStore({ mcz_coach_prefs_singz: "[1,2]" })), {});
  assert.deepEqual(readPrefs("singz", fakeStore({ mcz_coach_prefs_singz: "null" })), {});
  assert.deepEqual(readPrefs("singz", throwing), {});
  assert.deepEqual(readPrefs("singz", null), {});
});

test("writePref keeps other fields and is stored per app", () => {
  const s = fakeStore();
  writePref("singz", "genre", "Soul", s);
  writePref("singz", "range", "bass", s);
  writePref("rapz", "genre", "Trap", s);
  assert.deepEqual(readPrefs("singz", s), { genre: "Soul", range: "bass" });
  assert.deepEqual(readPrefs("rapz", s), { genre: "Trap" });
});

test("writePref never throws, and a failed write leaves nothing saved", () => {
  assert.doesNotThrow(() => writePref("singz", "genre", "Soul", throwing));
  assert.doesNotThrow(() => writePref("singz", "genre", "Soul", null));
  assert.deepEqual(readPrefs("singz", throwing), {});
});

test("browserStorage returns null where window does not exist or throws", () => {
  // Plain node has no window: the access itself throws and is caught.
  assert.equal(browserStorage(), null);
});
