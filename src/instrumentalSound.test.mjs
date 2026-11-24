import test from "node:test";
import assert from "node:assert/strict";
import { soundFor, soundsByName, PART_SOUND } from "./instrumentalz.js";
import { INSTRUMENTS } from "./daw/instruments.js";

test("every sound a part maps to is a real DAW instrument", () => {
  const keys = new Set(INSTRUMENTS.map(([k]) => k));
  for (const [part, snd] of Object.entries(PART_SOUND)) assert.ok(keys.has(snd), `${part} -> ${snd} is not an instrument`);
});
test("an unknown part falls back to piano, never to nothing", () => assert.equal(soundFor("kazoo"), "piano"));
test("sounds are looked up by the part's label for the Arsenal hand-off", () => {
  assert.deepEqual(soundsByName([{ id: "synth_bass", label: "Synth bass" }, { id: "drums", label: "Drums" }]), { "Synth bass": "synth:reese", Drums: "drums" });
});
