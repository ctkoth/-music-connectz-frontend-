import test from "node:test";
import assert from "node:assert/strict";
import { readOptsOpen, scoringSummary, writeOptsOpen } from "./coachOptions.js";

test("the line says what the take is judged on, and only what is switched on", () => {
  assert.equal(scoringSummary({ genre: "Trap", style: "Boom Bap", difficulty: "Performer", lyrics: true, extras: 3, mix: true }),
    "Trap · Boom Bap · Performer · lyrics rated · 3 extra scores · mix rated");
  assert.equal(scoringSummary({ genre: "R&B", difficulty: "Builder", extras: 1 }), "R&B · Builder · 1 extra score");
  assert.equal(scoringSummary({ genre: "R&B" }), "R&B");
  assert.equal(scoringSummary({}), "the defaults");
});

test("open is remembered; storage that throws means closed, never a crash", () => {
  const mem = { v: null, getItem() { return this.v; }, setItem(_k, v) { this.v = v; } };
  assert.equal(readOptsOpen(mem), false);
  writeOptsOpen(true, mem);
  assert.equal(readOptsOpen(mem), true);
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(readOptsOpen(broken), false);
  writeOptsOpen(true, broken);
});
