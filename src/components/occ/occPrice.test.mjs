import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NOT_CHARGED_IF_FAILS, chatFailure, chatTimeoutMs, freeAlternative, historyFor,
  lockedNote, perSecondText, runFailure, runLimit, runTimeoutMs, sendPrice, titleFromPrompt,
} from "./occPrice.js";
import { ENERGY, PROMPTZ } from "../../resources.js";

const haiku = { key: "haiku", name: "Haiku", cost_cents: 2, allowed: true, free_today: true, affordable: true };
const opus = { key: "opus", name: "Opus", cost_cents: 8, allowed: true, free_today: false, affordable: true, tier: "premium" };
const state = { daily_prompts: 3, daily_prompts_left: 2, daily_prompt_max_cents: 3, promptz: 20, money_cents: 0 };

// ---- the price beside Send ---------------------------------------------------

test("an engine the allowance covers says Free today, and which allowance", () => {
  const p = sendPrice(haiku, state);
  assert.equal(p.kind, "free");
  assert.equal(p.canSend, true);
  assert.equal(p.text, "Free today — uses 1 of your 3 free prompts");
  assert.match(p.note, /2 left today/);
});

test("a free message never wears the 🏷️ — the paid credit is not what it spends", () => {
  assert.ok(!sendPrice(haiku, state).text.includes(PROMPTZ));
});

test("a paid message states −N 🏷️ using the shared mark, not a typed one", () => {
  const p = sendPrice(opus, state);
  assert.equal(p.kind, "paid");
  assert.equal(p.text, `−8 ${PROMPTZ}`);
  assert.equal(p.canSend, true);
});

test("why a dear engine is not covered is said while there is time to switch", () => {
  assert.match(sendPrice(opus, state).note, /free prompt covers engines up to 3/);
  const spent = sendPrice({ ...haiku, free_today: false }, { ...state, daily_prompts_left: 0 });
  assert.equal(spent.kind, "paid");
  assert.match(spent.note, /free prompts are spent/);
});

test("a wallet that cannot cover it turns Send off and says by how much", () => {
  const p = sendPrice({ ...opus, affordable: false }, { ...state, promptz: 3, money_cents: 2 });
  assert.equal(p.kind, "short");
  assert.equal(p.canSend, false);
  assert.equal(p.short, 3);
  assert.match(p.note, /You have 5/);
  assert.match(p.note, /needs 8/);
});

test("a locked engine cannot be sent to and names the tier", () => {
  const p = sendPrice({ ...opus, allowed: false, required_tier: "premium" }, state);
  assert.equal(p.kind, "locked");
  assert.equal(p.canSend, false);
  assert.match(p.note, /needs premium/);
});

test("a payload without free_today reads as not free — a price is the safe way to be wrong", () => {
  const { free_today: _drop, ...old } = haiku;
  assert.equal(sendPrice(old, state).kind, "paid");
});

test("no engine selected yet is not a live button", () => {
  assert.equal(sendPrice(null, state).canSend, false);
});

test("the free alternative is an allowed engine the allowance covers", () => {
  const models = [haiku, opus, { ...haiku, key: "x", allowed: false }];
  assert.equal(freeAlternative(models, "opus").key, "haiku");
  assert.equal(freeAlternative(models, "haiku"), null);
});

test("inside a shell a locked engine never grows an upgrade", () => {
  const row = { required_tier: "premium" };
  assert.equal(lockedNote(row, { inShell: true }), "Needs premium.");
  assert.match(lockedNote(row), /upgrade in MembershipZ/);
  assert.ok(!/upgrade|MembershipZ|buy|\$/.test(lockedNote(row, { inShell: true })));
});

// ---- how long to wait --------------------------------------------------------

test("the chat waits longer than the server's budget, so the server decides", () => {
  assert.ok(chatTimeoutMs(100) > 100 * 1000);
  assert.equal(chatTimeoutMs(100), 120_000);
});

test("with no stated budget the chat still outwaits the longest the server has shipped", () => {
  for (const bad of [undefined, null, 0, "x", NaN, -5]) assert.ok(chatTimeoutMs(bad) >= 120_000, String(bad));
  // and is nowhere near api.js's 30s default, which aborted healthy replies.
  assert.ok(chatTimeoutMs(undefined) > 30_000);
});

test("a run waits for its ceiling AND the container starting", () => {
  assert.equal(runTimeoutMs(120), 180_000);
  assert.ok(runTimeoutMs(120) > 120_000);
  assert.ok(runTimeoutMs(undefined) > 120_000);
});

// ---- the Run button ----------------------------------------------------------

const execute = {
  cost: { per_second: 1 }, per_run_seconds: 120, seconds_left_today: 1800, energy: 500,
  max_seconds_now: 120, max_cost_now: 120,
};

test("the Run button states the run that will be made, not the tier's ceiling", () => {
  assert.deepEqual(
    { s: runLimit({ ...execute, energy: 45, max_seconds_now: 45, max_cost_now: 45 }).seconds,
      p: runLimit({ ...execute, energy: 45, max_seconds_now: 45, max_cost_now: 45 }).price },
    { s: 45, p: 45 });
});

test("with no ⚡ the run is blocked, with the reason", () => {
  const r = runLimit({ ...execute, energy: 0, max_seconds_now: 0, max_cost_now: 0 });
  assert.equal(r.blocked, true);
  assert.match(r.why, new RegExp(`at least 1 ${ENERGY}`));
});

test("with today's time gone the reason is the day, not the ⚡", () => {
  const r = runLimit({ ...execute, seconds_left_today: 0, max_seconds_now: 0, max_cost_now: 0 });
  assert.match(r.why, /sandbox time is used up/);
});

test("an older server without max_seconds_now still gets a sane limit", () => {
  const { max_seconds_now: _a, max_cost_now: _b, ...old } = execute;
  const r = runLimit(old);
  assert.equal(r.seconds, 120);
  assert.equal(r.price, 120);
});

test("the per-second rate is read from the server's number, with the shared mark", () => {
  assert.equal(perSecondText({ cost: { per_second: 1 } }), `−1 ${ENERGY} per second`);
  assert.equal(perSecondText({ cost: { per_second: 2 } }), `−2 ${ENERGY} per second`);
});

// ---- when it fails -----------------------------------------------------------

const answered = (status, data) => Object.assign(new Error(data?.detail || "x"), { status, data });

test("the server's sentence is shown unreworded when the server answered", () => {
  const e = answered(402, { detail: "Opus costs 8 🏷️ a message and today's free prompts are spent.",
    open_in: "occ", target: "occ-chat", buy_in: "membershipz", buy_target: "promptz-door" });
  const f = chatFailure(e);
  assert.equal(f.kind, "payment");
  assert.equal(f.text, e.data.detail);
  assert.deepEqual(f.buy, { tab: "membershipz", target: "promptz-door" });
});

test("503 not-configured reads as the one sentence the screen shows", () => {
  const f = chatFailure(answered(503, { detail: "OCC's chat isn't switched on yet.", code: "not_configured" }));
  assert.equal(f.text, "OCC's chat isn't switched on yet.");
  assert.equal(f.kind, "off");
});

test("an older server's 'LLM backend unavailable' reads the same", () => {
  assert.equal(chatFailure(answered(503, { detail: "LLM backend unavailable." })).kind, "off");
});

test("a 503 that is a bad minute is not called 'not switched on'", () => {
  const f = chatFailure(answered(503, { detail: "OCC couldn't get an answer from the model just now. You weren't charged — try again in a moment.", code: "backend_error" }));
  assert.equal(f.kind, "refused");
  assert.match(f.text, /weren't charged/);
});

test("silence is not 'nothing was charged' — the server may have finished", () => {
  for (const e of [Object.assign(new Error("took longer"), { timedOut: true, status: 0 }), new TypeError("Failed to fetch")]) {
    const f = chatFailure(e);
    assert.equal(f.kind, "silent");
    assert.ok(!/Nothing was charged/i.test(f.text));
    assert.match(f.text, /LogZ/);
    assert.ok(f.text.includes(NOT_CHARGED_IF_FAILS));
  }
});

test("a failed run has its own copy: it never says nothing was charged", () => {
  const t = runFailure(Object.assign(new Error("That took longer than 30 seconds. Nothing was charged"), { timedOut: true, status: 0 }));
  assert.ok(!/Nothing was charged/i.test(t));
  assert.match(t, /LogZ/);
  assert.match(t, /WorkZ/);
});

test("a run the server refused shows the server's sentence", () => {
  assert.equal(runFailure(answered(402, { detail: "A run of up to 120s can cost up to 120 ⚡ and you have 2 ⚡." })),
    "A run of up to 120s can cost up to 120 ⚡ and you have 2 ⚡.");
});

// ---- the conversation --------------------------------------------------------

test("history carries only the turns the server will read, newest last", () => {
  const msgs = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? "occ" : "user", text: `m${i}` }));
  const h = historyFor(msgs, { history_turns: 8, history_chars: 4000 });
  assert.equal(h.length, 8);
  assert.equal(h.at(-1).text, "m11");
  assert.equal(h[0].text, "m4");
  assert.deepEqual(Object.keys(h[0]).sort(), ["role", "text"]);
});

test("a failed or empty turn is not part of the conversation", () => {
  const h = historyFor([
    { role: "user", text: "hi" }, { role: "occ", text: "", failed: true },
    { role: "user", text: "again", failed: true }, { role: "occ", text: "  " },
    { role: "occ", text: "hello" },
  ]);
  assert.deepEqual(h.map((m) => m.text), ["hi", "hello"]);
});

test("a long turn is clipped to what the server reads", () => {
  assert.equal(historyFor([{ role: "user", text: "x".repeat(9000) }], { history_chars: 4000 })[0].text.length, 4000);
});

test("roles are the endpoint's: user and occ, nothing else", () => {
  const h = historyFor([{ role: "assistant", text: "a" }, { role: "occ", text: "b" }]);
  assert.deepEqual(h.map((m) => m.role), ["user", "occ"]);
});

test("a WorkZ title is the first line of the prompt, short", () => {
  assert.equal(titleFromPrompt("write me a hook\nabout rain"), "write me a hook");
  assert.equal(titleFromPrompt("x".repeat(500)).length, 160);
  assert.equal(titleFromPrompt("  "), "OCC reply");
});
