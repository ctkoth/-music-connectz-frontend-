import test from "node:test";
import assert from "node:assert/strict";
import { gatesQuery } from "./gatesQuery.js";

test("an empty or missing gate set asks nothing", () => {
  assert.deepEqual(gatesQuery({}), []);
  assert.deepEqual(gatesQuery(undefined), []);
});

test("each range becomes the member search's own params, min and max apart", () => {
  assert.deepEqual(gatesQuery({ attract: [7, null], rating: [null, 9] }), ["rating_max=9", "attr_min=7"]);
});

test("price stays in cents and km is a max only", () => {
  assert.deepEqual(gatesQuery({ price: [500, 2000], km: [null, 30] }), ["price_min=500", "price_max=2000", "max_km=30"]);
});

test("junk never becomes a param", () => {
  assert.deepEqual(gatesQuery({ attract: [NaN, null], age: "x", km: [null, null] }), []);
});

test("the classes ride the query as flags, and off leaves no trace", async () => {
  const { gatesQuery, gatesSet, toggleClass } = await import("./gatesQuery.js");
  let g = toggleClass({}, "thuro");
  assert.deepEqual(g, { thuro: true });
  assert.deepEqual(gatesQuery(g), ["thuro=1"]);
  g = toggleClass({ ...g, rating: [5, null] }, "sexi");
  assert.deepEqual(gatesQuery(g).sort(), ["rating_min=5", "sexi=1", "thuro=1"]);
  assert.equal(gatesSet(g), 3);
  assert.deepEqual(toggleClass({ thuro: true }, "thuro"), {});
  assert.deepEqual(gatesQuery({ thuro: false, sexi: "yes" }), []);
});
