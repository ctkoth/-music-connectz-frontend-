import { test } from "node:test";
import assert from "node:assert/strict";
import { nkey, rateChange, statusLook } from "./socialz.js";
import { ENERGY } from "./resources.js";

test("a bare domain and the https address the server stores are the same account", () => {
  assert.equal(nkey("instagram.com/koth"), nkey("https://instagram.com/koth/"));
  assert.equal(nkey("  HTTPS://Instagram.com/Koth  "), "instagram.com/koth");
});

test("a rise, a drop and no change are each said plainly", () => {
  assert.equal(rateChange(2, 120).tone, "up");
  assert.match(rateChange(2, 120).text, new RegExp(`2 to 120 \\${ENERGY[0]}|2 to 120 ${ENERGY}`));
  assert.equal(rateChange(120, 40).tone, "down");
  assert.match(rateChange(120, 40).text, /\(-80\)/);
  assert.equal(rateChange(5, 5).tone, "same");
});

test("with nothing to compare there is no claim of a gain", () => {
  assert.equal(rateChange(null, 10), null);
  assert.equal(rateChange(10, undefined), null);
});

test("only the server's word 'verified' looks like it counts", () => {
  assert.match(statusLook("verified").label, /Counts/);
  for (const s of ["pending", "rejected", "unverified", "something-new", undefined]) {
    assert.doesNotMatch(statusLook(s).label, /Counts/);
  }
});
