import test from "node:test";
import assert from "node:assert/strict";
import { firstPollDelay, newestPending, pollIsHopeless } from "./videoz.js";

const w = (id, status, created_at) => ({ id, status, created_at });

test("on opening, the newest render still pending is the one picked back up", () => {
  const works = [
    w(3, "done", "2026-10-12T10:30:00Z"),
    w(2, "pending", "2026-10-12T10:20:00Z"),
    w(1, "pending", "2026-10-12T10:00:00Z"),
  ];
  assert.equal(newestPending(works).id, 2);
  assert.equal(newestPending([...works].reverse()).id, 2);   // not order-dependent
});

test("nothing pending, or no list, resumes nothing", () => {
  assert.equal(newestPending([w(1, "done", "2026-10-12T10:00:00Z"), w(2, "failed", "2026-10-12T10:05:00Z")]), null);
  assert.equal(newestPending([]), null);
  assert.equal(newestPending(undefined), null);
  assert.equal(newestPending(null), null);
});

test("a resumed render is asked after sooner than a fresh one", () => {
  const now = Date.parse("2026-10-12T10:10:00Z");
  assert.equal(firstPollDelay("2026-10-12T10:09:59Z", now, 8000), 8000);   // just started
  assert.equal(firstPollDelay("2026-10-12T10:00:00Z", now, 8000), 1500);   // has been going ten minutes
  assert.equal(firstPollDelay("garbage", now, 8000), 8000);
  assert.equal(firstPollDelay(undefined, now, 8000), 8000);
});

test("a poll that can never succeed ends the chain; a flaky one does not", () => {
  assert.equal(pollIsHopeless({ status: 404 }), true);
  assert.equal(pollIsHopeless({ status: 403 }), true);
  assert.equal(pollIsHopeless({ status: 401 }), true);
  assert.equal(pollIsHopeless({ status: 500 }), false);
  assert.equal(pollIsHopeless({ status: 0, timedOut: true }), false);
  assert.equal(pollIsHopeless(new TypeError("Failed to fetch")), false);
});
