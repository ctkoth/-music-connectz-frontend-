import test from "node:test";
import assert from "node:assert/strict";
import { PALETTE, allowed, effective, room } from "./glow.js";

test("a tier's number is how many colours it may choose from", () => {
  assert.equal(room(3), 3);
  assert.equal(room(6), 6);
  assert.equal(room(null), PALETTE.length, "null is unlimited, never a number");
  assert.equal(room(undefined), PALETTE.length);
  assert.equal(room(999), PALETTE.length);
});

test("the first N colours are a tier's, in order", () => {
  assert.ok(allowed("ember", 3) && allowed("pink", 3) && allowed("cyan", 3));
  assert.ok(!allowed("purple", 3));
  assert.ok(allowed("purple", 6) && allowed(PALETTE[5].key, 6) && !allowed(PALETTE[6].key, 6));
  assert.ok(allowed(PALETTE.at(-1).key, null));
});

test("a lapse stops a colour applying and takes nothing from the member", () => {
  assert.equal(effective("gold", 3), null);
  assert.equal(effective("gold", 6).hex, "#ffcf3f");
  assert.equal(effective("nope", null), null);
});

test("the palette is big enough for every tier to have a higher plan to point at", () => {
  assert.ok(PALETTE.length > 6);
  assert.equal(new Set(PALETTE.map((c) => c.key)).size, PALETTE.length);
});
