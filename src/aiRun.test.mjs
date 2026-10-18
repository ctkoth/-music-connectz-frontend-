import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RUN_TIMEOUT_MS, budgetOf, clock, money, priceView, runTimeoutMs, shellRoyaltyLine,
  splitCost, unknownOutcome, unknownOutcomeNote,
} from "./aiRun.js";

test("the wait outlasts the server's own budget, and has a fallback when none was served", () => {
  assert.equal(runTimeoutMs(60), 90_000);
  assert.equal(runTimeoutMs(90), 120_000);
  assert.equal(runTimeoutMs(undefined), DEFAULT_RUN_TIMEOUT_MS);
  assert.equal(runTimeoutMs(null), DEFAULT_RUN_TIMEOUT_MS);
  assert.equal(runTimeoutMs(0), DEFAULT_RUN_TIMEOUT_MS);
  assert.equal(runTimeoutMs(-5), DEFAULT_RUN_TIMEOUT_MS);
  assert.equal(runTimeoutMs("nope"), DEFAULT_RUN_TIMEOUT_MS);
  assert.equal(DEFAULT_RUN_TIMEOUT_MS, 120_000);
  // Always longer than api.js's own 30s default, which is the bug being fixed.
  assert.ok(runTimeoutMs(1) > 30_000);
});

test("a budget is only stated when the server stated one", () => {
  assert.equal(budgetOf({ budget_seconds: 60 }), 60);
  assert.equal(budgetOf({}), null);
  assert.equal(budgetOf(null), null);
  assert.equal(budgetOf({ budget_seconds: 0 }), null);
});

test("a clock reads m:ss and never goes negative", () => {
  assert.equal(clock(0), "0:00");
  assert.equal(clock(62), "1:02");
  assert.equal(clock(-3), "0:00");
  assert.equal(clock(undefined), "0:00");
});

test("silence is an unknown outcome; an HTTP answer is a verdict", () => {
  assert.equal(unknownOutcome({ timedOut: true, status: 0 }), true);
  assert.equal(unknownOutcome(new TypeError("Failed to fetch")), true);   // no status at all
  assert.equal(unknownOutcome({ status: 0 }), true);
  assert.equal(unknownOutcome({ status: 402 }), false);
  assert.equal(unknownOutcome({ status: 502, data: { detail: "x" } }), false);
  assert.equal(unknownOutcome(null), false);
});

test("our own 504 is a verdict; a proxy's 504 is silence", () => {
  // The view's deadline answer: JSON, timed_out, and nothing was charged.
  assert.equal(unknownOutcome({ status: 504, data: { detail: "…Nothing was charged.", timed_out: true, waited_seconds: 55 } }), false);
  // A gateway/router error: HTML, so api.js carries no body — the server may still finish.
  assert.equal(unknownOutcome({ status: 504, data: null }), true);
  assert.equal(unknownOutcome({ status: 502, data: null }), true);
  assert.equal(unknownOutcome({ status: 503, data: null }), true);
  // Our view's own 502 ("couldn't reach the writer, nothing was charged") has a body.
  assert.equal(unknownOutcome({ status: 502, data: { detail: "Couldn't reach the writer. Nothing was charged — try again." } }), false);
  assert.equal(unknownOutcome({ status: 500, data: null }), false);
});

test("an unanswered run says where to look, not that nothing was charged", () => {
  const t = unknownOutcomeNote({ timedOut: true }, "Your recent pieces");
  assert.match(t, /^That took longer than we waited for\./);
  assert.match(t, /If it finished it will be under Your recent pieces/);
  assert.match(t, /check there before trying again/);
  assert.doesNotMatch(t, /Nothing was charged/i);
  const d = unknownOutcomeNote(new TypeError("Failed to fetch"), "Your loops");
  assert.match(d, /connection dropped/);
  assert.match(d, /Your loops/);
  assert.doesNotMatch(d, /Nothing was charged/i);
  const g = unknownOutcomeNote({ status: 504, data: null }, "Your videos");
  assert.match(g, /server stopped answering/);
  assert.match(g, /under Your videos/);
  assert.doesNotMatch(g, /Nothing was charged/i);
});

test("money is dollars from cents", () => {
  assert.equal(money(400), "$4.00");
  assert.equal(money(5), "$0.05");
  assert.equal(money(undefined), "$0.00");
  assert.equal(money(-10), "$0.00");
});

test("a price is split PromptZ first, then cash; unknown holdings give no split", () => {
  assert.deepEqual(splitCost(400, 1000), { promptz: 400, cents: 0 });
  assert.deepEqual(splitCost(400, 100), { promptz: 100, cents: 300 });
  assert.deepEqual(splitCost(400, 0), { promptz: 0, cents: 400 });
  assert.equal(splitCost(400, undefined), null);   // not served: the caller says a bare price
  assert.equal(splitCost(400, "100"), null);
  assert.equal(splitCost(undefined, 100), null);
  assert.deepEqual(splitCost(3, -5), { promptz: 0, cents: 3 });
});

const base = { configured: true, cost_cents: 3, free_today: false, daily_remaining: 0, daily_allowance: 3, can_run: false };

test("until GET has answered there is no price, and so no live button", () => {
  assert.deepEqual(priceView(null), { state: "loading", canRun: false });
  assert.deepEqual(priceView(undefined), { state: "loading", canRun: false });
});

test("a feature the server has not switched on is off, whatever else it says", () => {
  assert.equal(priceView({ ...base, configured: false, can_run: true, free_today: true }).state, "off");
  assert.equal(priceView({ ...base, configured: false }).canRun, false);
});

test("a run with no price served is not live", () => {
  assert.equal(priceView({ configured: true, can_run: true }).canRun, false);
});

test("a run the allowance covers is free prompts, never a 🏷️ price", () => {
  const v = priceView({ ...base, free_today: true, daily_remaining: 2, can_run: true });
  assert.equal(v.state, "free");
  assert.equal(v.left, 2);
  assert.equal(v.allowance, 3);
  assert.equal(v.canRun, true);
});

test("a paid run carries the split when the member's holdings were served", () => {
  const v = priceView({ ...base, can_run: true, promptz: 1, money_cents: 50 });
  assert.equal(v.state, "paid");
  assert.deepEqual(v.split, { promptz: 1, cents: 2 });
  assert.equal(v.freeLeft, false);
  const bare = priceView({ ...base, can_run: true });
  assert.equal(bare.state, "paid");
  assert.equal(bare.split, null);
  assert.equal(bare.cost, 3);
});

test("free prompts left that do not cover the run are a different reason from none left", () => {
  assert.equal(priceView({ ...base, can_run: true, daily_remaining: 2 }).freeLeft, true);
  assert.equal(priceView({ ...base, can_run: true, daily_remaining: 0 }).freeLeft, false);
});

test("a run that cannot be paid for is blocked, with what they hold when it was served", () => {
  const v = priceView({ ...base, promptz: 1, money_cents: 0 });
  assert.equal(v.state, "blocked");
  assert.equal(v.canRun, false);
  assert.deepEqual(v.holds, { promptz: 1, cents: 0 });
  assert.equal(v.cost, 3);
  assert.equal(priceView(base).holds, null);          // not served: say so without inventing numbers
});

test("the shell royalty is the one-line form, or nothing when there is no rule", () => {
  assert.equal(shellRoyaltyLine("lyric", "Using a piece pays K-Oth 10%."),
    "If you later take this lyric to Music ConnectZ: Using a piece pays K-Oth 10%.");
  assert.equal(shellRoyaltyLine("loop", ""), "");
  assert.equal(shellRoyaltyLine("loop", undefined), "");
});
