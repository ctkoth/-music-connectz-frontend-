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
