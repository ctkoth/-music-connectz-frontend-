import { test } from "node:test";
import assert from "node:assert/strict";
import { lastWeightKg, lastWeightSource, byEntered, typedKey, boxValue } from "./lastWeight.js";
import { fromKg } from "./weightUnit.js";

const set = (id, w, side = "") => ({ id, weight_kg: w, one_sided: side });
const past = (...ws) => ({ sets: ws.map((w, i) => set(i + 1, w)) });

test("today's latest set beats last time and the plan", () => {
  const a = { sets: [set(1, 60), set(2, 65)], last: past(40), plannedKg: 100 };
  assert.equal(lastWeightKg(a), 65);
  assert.equal(lastWeightSource(a), "set");
});

test("no set today: the last set of the last finished session", () => {
  const a = { sets: [], last: past(40, 45, 50), plannedKg: 100 };
  assert.equal(lastWeightKg(a), 50);
  assert.equal(lastWeightSource(a), "history");
});

test("neither: the routine's target, and blank when there is none", () => {
  assert.equal(lastWeightKg({ plannedKg: 20 }), 20);
  assert.equal(lastWeightSource({ plannedKg: 20 }), "plan");
  assert.equal(lastWeightKg({}), null);
  assert.equal(lastWeightSource({}), "");
});

test("a one-arm set is not the two-arm set: sides never borrow each other's weight", () => {
  const sets = [set(1, 30, "arm")];
  assert.equal(lastWeightKg({ sets, side: "arm" }), 30);
  assert.equal(lastWeightKg({ sets, side: "" }), null);
  // ...so the two-arm box falls through to history rather than reading the one-arm set
  assert.equal(lastWeightKg({ sets, side: "", last: past(60) }), 60);
});

test("the latest set decides even with no weight — bodyweight after a loaded set stays bodyweight", () => {
  assert.equal(lastWeightKg({ sets: [set(1, 20), set(2, null)], last: past(40) }), null);
});

test("latest means newest entered, not last position after a drag", () => {
  const dragged = [set(9, 70), set(3, 50)];
  assert.equal(lastWeightKg({ sets: byEntered(dragged) }), 70);
});

test("a typed number holds only while nothing it was typed against changed", () => {
  const k1 = typedKey(5, "", 2), k2 = typedKey(5, "", 3);
  const typed = { key: k1, v: "62.5" };
  assert.deepEqual(boxValue(typed, k1, 60, fromKg, "kg"), { value: "62.5", auto: false });
  // a set was logged: the box goes back to the auto-fill
  assert.deepEqual(boxValue(typed, k2, 62.5, fromKg, "kg"), { value: "62.5", auto: true });
  // different lift, same count, still not the typed value
  assert.equal(boxValue(typed, typedKey(6, "", 2), null, fromKg, "kg").value, "");
});

test("the auto-fill follows the unit; a stored kg is never rewritten", () => {
  assert.equal(boxValue(null, "k", 100, fromKg, "kg").value, "100");
  assert.equal(boxValue(null, "k", 100, fromKg, "lb").value, "220.5");
  assert.equal(boxValue(null, "k", null, fromKg, "lb").value, "");
});

test("the loggers actually use it, in all three weight boxes", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
  assert.equal((src.match(/lastWeightKg\(/g) || []).length, 3);
  assert.ok(!/setWeight\(/.test(src), "a weight box is back to plain state with no auto-fill");
});
