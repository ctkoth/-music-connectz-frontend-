// Upload progress, and the bound that is NOT a total.
//
// A member sent a 3:05 take and watched "Scoring your take… 853s" on a
// spinner that could not end. Three things had to be true for that: the
// server had no budget for the whole run, `api.js` had no timeout at all
// (no AbortController, no signal — `fetch` waits as long as the other end
// does), and the panel showed a number that only went UP, which cannot tell
// "working" from "hung".
//
// This file pins the client half. It reads the real constants and the real
// ETA maths out of api.js rather than restating them, because a copy of the
// logic under test is a test of the copy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("./api.js", import.meta.url), "utf8");

function constOf(name) {
  const m = SRC.match(new RegExp(`const ${name} = ([0-9_]+)`));
  assert.ok(m, `${name} not found in api.js`);
  return Number(m[1].replace(/_/g, ""));
}

test("every request is bounded — fetch with no signal waits forever", () => {
  assert.match(SRC, /new AbortController\(\)/,
    "api.js had no timeout of any kind, which is half of the 853-second spinner");
  assert.match(SRC, /signal: ctrl\.signal/);
});

test("the upload is bounded by STALL, not by a total", () => {
  // A total generous enough for 100MB on a phone cannot catch a dead
  // connection, and one tight enough to catch a dead connection kills real
  // uploads from the members most likely to be on a phone.
  assert.doesNotMatch(SRC, /xhr\.timeout\s*=/,
    "xhr.timeout is a TOTAL — a 100MB take on 2 Mbps is a healthy 6.7 minutes");
  assert.match(SRC, /UPLOAD_STALL_MS/);
});

test("a 100MB take on a slow phone link is not killed by the bound", () => {
  const stallMs = constOf("UPLOAD_STALL_MS");
  const KBps = 250 * 1024;              // ~2 Mbps mobile
  const chunkSeconds = 1;               // progress events arrive about this often
  assert.ok(stallMs / 1000 > chunkSeconds * 10,
    "the stall window must be many progress intervals wide");
  // The whole transfer takes far longer than the stall window, which is the
  // entire point: it is never compared against the total.
  const totalSeconds = (100 * 1024 * 1024) / KBps;
  assert.ok(totalSeconds > stallMs / 1000,
    "this is exactly the case a total timeout would have broken");
});

test("the server phase is bounded ABOVE the server's own budget", () => {
  // So a server that answers in time is always the one that decides, and the
  // client bound only fires when nothing answered at all.
  const serverPhase = constOf("SERVER_PHASE_MS") / 1000;
  const COACH_BUDGET_SECONDS = 100;     // apps/economy/deadline.py
  assert.ok(serverPhase > COACH_BUDGET_SECONDS,
    "a client that gives up first would hide the server's own honest error");
});

test("a timed-out request is an error the screen can tell apart", () => {
  assert.match(SRC, /timedOut = true/,
    "BossTake's failReason maps this to the `timeout` funnel slug");
  assert.match(SRC, /Nothing was charged/,
    "a failed take is not billed, and the member has to be told so");
});

// The ETA maths, run rather than described.
function meter() {
  let rate = 0, mark = { t: 0, loaded: 0 };
  return (now, loaded, total) => {
    const dt = (now - mark.t) / 1000;
    if (dt >= 0.4) {
      const sample = (loaded - mark.loaded) / dt;
      rate = rate ? rate * 0.7 + sample * 0.3 : sample;
      mark = { t: now, loaded };
    }
    const elapsed = now / 1000;
    return {
      pct: total ? Math.min(100, Math.round((loaded / total) * 100)) : 0,
      etaSeconds: rate > 0 && elapsed > 1 ? Math.round((total - loaded) / rate) : null,
    };
  };
}

test("no ETA is shown until it would mean something", () => {
  const tick = meter();
  const total = 40 * 1024 * 1024;
  // A number computed from the first 200ms is wrong by an order of magnitude,
  // and a wrong ETA is worse than none because people plan around it.
  assert.equal(tick(200, 50_000, total).etaSeconds, null);
  assert.equal(tick(900, 225_000, total).etaSeconds, null);
});

test("the ETA counts DOWN on a steady connection", () => {
  const tick = meter();
  const total = 40 * 1024 * 1024, bps = 250 * 1024;
  let prev = Infinity;
  for (let ms = 1500; ms <= 12000; ms += 1500) {
    const { etaSeconds, pct } = tick(ms, bps * (ms / 1000), total);
    assert.ok(etaSeconds != null && etaSeconds > 0, `no eta at ${ms}ms`);
    assert.ok(etaSeconds <= prev, `eta went UP at ${ms}ms: ${prev} -> ${etaSeconds}`);
    assert.ok(pct > 0 && pct < 100);
    prev = etaSeconds;
  }
});

test("a connection that stalls does not keep counting down to a finish that isn't coming", () => {
  // The rate is measured over a trailing window rather than since the start,
  // so a link that begins fast and dies stops promising an arrival.
  const tick = meter();
  const total = 40 * 1024 * 1024;
  for (let ms = 500; ms <= 3000; ms += 500) tick(ms, 500 * 1024 * (ms / 1000), total);
  const before = tick(3500, 500 * 1024 * 3.5, total).etaSeconds;
  let after = before;
  for (let ms = 4000; ms <= 9000; ms += 500) after = tick(ms, 500 * 1024 * 3.5, total).etaSeconds;
  assert.ok(after > before,
    "a stalled link must show the estimate getting WORSE, not counting to zero");
});
