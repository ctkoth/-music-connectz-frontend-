import test from "node:test";
import assert from "node:assert/strict";
import { listenersLine, heardRows, thinkLine, safeHref, payParts, marketsLine, NOT_USED } from "./coachUpgrades.js";

test("listeners and coach sit side by side, and nothing is shown without real ratings", () => {
  assert.equal(listenersLine({ median: 9.2, count: 14 }, 7), "Listeners 9.2 (14 ratings) · Coach 7");
  assert.equal(listenersLine(null, 7), "");
  assert.equal(listenersLine({ median: null, count: 0 }, 7), "");
});

test("low-confidence observations are possible, not dropped", () => {
  const rows = heardRows([{ t: "0:24", what: "sag", dim: "pitch", confidence: 3 },
    { t: "", what: "maybe", dim: "other", confidence: 1 }, { what: "" }], { pitch: "Pitch 🎯" });
  assert.equal(rows.length, 2);
  assert.deepEqual([rows[0].possible, rows[0].dim, rows[0].time], [false, "Pitch 🎯", "0:24"]);
  assert.deepEqual([rows[1].possible, rows[1].dim], [true, ""]);
});

test("the logic-check line says which it was", () => {
  assert.equal(thinkLine({ used: true }), "Checked by the coach's second pass");
  assert.equal(thinkLine({ used: false }), NOT_USED);
  assert.equal(thinkLine({ used: false, reason: "x" }), "x");
});

test("links are http(s) only", () => {
  assert.equal(safeHref("javascript:alert(1)"), "");
  assert.ok(safeHref("https://www.amazon.com/s?k=a+b").startsWith("https://"));
});

test("price parts come from the server quote", () => {
  assert.deepEqual(payParts({ cost_cents: 19, pay_promptz: 10, pay_cash_cents: 9, affordable: true }),
    { cost: 19, promptz: 10, cash: 9, affordable: true });
  assert.equal(payParts(null), null);
  assert.equal(marketsLine([{ label: "Amazon US" }, { label: "eBay US" }]), "Links go to: Amazon US, eBay US");
});
