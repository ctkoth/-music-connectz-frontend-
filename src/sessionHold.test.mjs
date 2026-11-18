import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  setSessionHold, seedSessionHold, setRest, clearSessionHold, getSessionHold, subscribeSession, resetSessionHold,
  restNow, restLineText, clockText, floatPrice,
} from "./sessionHold.js";

beforeEach(() => resetSessionHold());

test("a session hold keeps its tab, and the rest clock survives an update to the same session", () => {
  setSessionHold({ tab: "bodiez", sessionId: 7, title: "Push day", since: 1000 });
  setRest({ startMs: 5000, target: 90, exercise: "Bench Press", next: "Fly" });
  setSessionHold({ tab: "bodiez", sessionId: 7, title: "Push day!", since: 1000 });
  assert.equal(getSessionHold().title, "Push day!");
  assert.equal(getSessionHold().rest.exercise, "Bench Press");
});

test("a rest published BEFORE the hold exists is not lost (the timer is a child, its effect runs first)", () => {
  setRest({ startMs: 1, target: 60, exercise: "Row", next: "Curl" });
  assert.equal(getSessionHold(), null);
  setSessionHold({ tab: "bodiez", sessionId: 7 });
  assert.equal(getSessionHold().rest.exercise, "Row");
});

test("the timer unmounting clears the rest, and the hold stays", () => {
  setSessionHold({ tab: "bodiez", sessionId: 7 });
  setRest({ startMs: 1, target: 60, exercise: "Row", next: "" });
  setRest(null);
  assert.equal(getSessionHold().rest, null);
  assert.equal(getSessionHold().sessionId, 7);
});

test("subscribers hear changes once, and an identical update is silent", () => {
  let n = 0;
  subscribeSession(() => { n++; });
  setSessionHold({ tab: "bodiez", sessionId: 1, title: "a", since: 1 });
  setSessionHold({ tab: "bodiez", sessionId: 1, title: "a", since: 1 });
  assert.equal(n, 1);
  clearSessionHold();
  clearSessionHold();
  assert.equal(n, 2);
});

test("a seed keeps the tab mounted, and BodieZ taking over replaces it", () => {
  seedSessionHold("bodiez", 3);
  assert.equal(getSessionHold().seeded, true);
  setSessionHold({ tab: "bodiez", sessionId: 3, title: "Legs", since: 9 });
  assert.equal(getSessionHold().seeded, false);
  assert.equal(getSessionHold().title, "Legs");
});

test("a seed never overrides a real hold, and nothing registers without a tab or a session", () => {
  setSessionHold({ tab: "bodiez", sessionId: 3, title: "Legs" });
  seedSessionHold("bodiez", 4);
  assert.equal(getSessionHold().sessionId, 3);
  resetSessionHold();
  setSessionHold({ tab: "", sessionId: 3 });
  setSessionHold({ tab: "bodiez", sessionId: 0 });
  assert.equal(getSessionHold(), null);
});

test("rest left counts down from the start the timer published, and reads done at zero", () => {
  const rest = { startMs: 10_000, target: 90 };
  assert.equal(restNow(rest, 10_000).left, 90);
  assert.equal(restNow(rest, 40_000).left, 60);
  const over = restNow(rest, 10_000 + 98_000);
  assert.equal(over.done, true);
  assert.equal(over.over, 8);
});

test("no rest, no number: the bar says only that it is running instead of inventing a clock", () => {
  assert.equal(restNow(null, 1), null);
  assert.equal(restNow({ startMs: NaN, target: 90 }, 1), null);
  assert.equal(restNow({ startMs: 1, target: 0 }, 1), null);
  assert.equal(restLineText(null), "Session running.");
});

test("the bar line names the next lift while resting and when rest is over", () => {
  const rest = { startMs: 0, target: 90 };
  assert.equal(restLineText(restNow(rest, 30_000), "Fly"), "1:00 rest left · Fly next");
  assert.equal(restLineText(restNow(rest, 95_000), "Fly"), "Rest over by 0:05 — Fly is next.");
  assert.equal(restLineText(restNow(rest, 90_000), ""), "Rest over — go.");
});

test("clockText never goes negative and adds hours only when needed", () => {
  assert.equal(clockText(-4), "0:00");
  assert.equal(clockText(65), "1:05");
  assert.equal(clockText(3725), "1:02:05");
});

test("the price states the cost and what is left BEFORE the press", () => {
  const p = floatPrice({ limit: 3, used: 1, left: 2, can: true, unlimited: false, already: false, window_hours: 24, next_limit: 6 });
  assert.equal(p.cost, "−1 of today's 3");
  assert.equal(p.after, 1);
  assert.match(p.free, /no ⚡ 🍥 🏷️/);
  assert.equal(p.blocked, null);
});

test("already counted, unlimited and a spent number each say their own thing", () => {
  assert.match(floatPrice({ already: true, can: true, limit: 3, used: 3, left: 0 }).text, /free/i);
  assert.equal(floatPrice({ already: true, can: true }).cost, null);
  const u = floatPrice({ unlimited: true, limit: null, can: true });
  assert.equal(u.cost, null);
  assert.match(u.text, /unlimited/i);
  const out = floatPrice({ limit: 3, used: 3, left: 0, can: false, unlimited: false, already: false, window_hours: 24, next_limit: 6 });
  assert.match(out.blocked, /3 of 3/);
  assert.match(out.blocked, /next plan up keeps 6/);
  assert.match(out.blocked, /still runs in BodieZ/);
  assert.equal(out.cost, null);
});

test("on the top plan a refusal does not point at a plan above it", () => {
  const out = floatPrice({ limit: 9, used: 9, left: 0, can: false, next_limit: false, window_hours: 24 });
  assert.doesNotMatch(out.blocked, /next plan/);
});

test("with no state there is no price, never an invented one", () => {
  assert.equal(floatPrice(null), null);
  assert.equal(floatPrice(undefined), null);
});
