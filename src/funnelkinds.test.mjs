// Every funnel kind this app fires must be one the server accepts.
//
// THIS HAS NOW HAPPENED TWICE, and silently both times.
//
// `/api/auth/funnel/` checks the kind against a closed set and answers 400 to
// anything else. That is the right design — it means a client typo measures
// ZERO rather than measuring the wrong thing — but `track()` is
// fire-and-forget with a `.catch(() => {})`, so a rejected kind looks exactly
// like a recorded one from in here. Nothing goes red, nothing appears in a
// console, and the number the owner reads is a confident zero.
//
// The first time, four recorder events shipped under names the endpoint
// rejected, and the funnel showed one person getting a score while the real
// story was that the Record button was throwing.
//
// The second time was found by auditing this list by hand: ELEVEN kinds were
// being fired and refused — three notification events, three SoundZ events,
// three onboarding events, and two OAuth-link events added the same day as
// this test. The onboarding and OAuth ones were genuinely wanted and were
// added to FUNNEL_KINDS; the other six were engagement telemetry with no home
// on this endpoint, costing a 400 per press and measuring nothing, and were
// removed.
//
// So the list below is a MIRROR of the backend's FUNNEL_KINDS, and this file
// is the thing that makes the mirror load-bearing. Adding a kind means adding
// it in both places, deliberately, which is the point — the two repos deploy
// independently and the server is the one that decides.
//
// The names are TERSE because `FunnelEvent.kind` is varchar(20) and four
// of the five arrived longer than that — onboarding_preferences_confirmed
// is 32. Django's system check refuses the model outright, so that one
// would have failed the build rather than shipped quietly; it is mentioned
// here so nobody renames one back to something readable-and-too-long.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

/** apps/economy/models.py FUNNEL_KINDS, mirrored. Keep sorted. */
const SERVER_KINDS = new Set([
  "landing_view",
  "login_success",
  "oauth_link_fail",
  "oauth_linked",
  "onboard_habit",
  "onboard_prefs",
  "onboard_skip",
  "quiz_done",
  "quiz_view",
  "register_success",
  "register_view",
  "try_attach",
  "try_blocked",
  "try_failed",
  "try_mic_denied",
  "try_record",
  "try_scored",
  "try_send",
  "try_shared",
  "try_view",
]);

/** Every .jsx/.js under src/, except the unmounted 2.2 reference app. */
function sources(dir = join(ROOT, "src"), out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "mcz2") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sources(full, out);
    else if (/\.(jsx?|mjs)$/.test(name) && !name.endsWith(".test.mjs")) out.push(full);
  }
  return out;
}

/** `track("x")` and `step("x")` calls, with the file they came from. */
function fired() {
  const found = new Map();
  for (const file of sources()) {
    const src = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of src.matchAll(/\b(?:track|step)\(\s*"([a-z_]+)"/g)) {
      if (!found.has(m[1])) found.set(m[1], []);
      found.get(m[1]).push(file.replace(ROOT, ""));
    }
  }
  return found;
}

test("every kind this app fires is one the server accepts", () => {
  const bad = [...fired()].filter(([kind]) => !SERVER_KINDS.has(kind));
  assert.deepEqual(bad.map(([k]) => k), [],
    "\nThese are POSTed and answered 400 — they measure nothing:\n" +
    bad.map(([k, files]) => `  ${k}  (${files.join(", ")})`).join("\n") +
    "\nAdd them to FUNNEL_KINDS in the backend AND to SERVER_KINDS here, or " +
    "stop firing them.\n");
});

test("the mirror does not rot in the other direction either", () => {
  // A kind listed here and fired by nobody is a stale line — either the
  // server dropped it, or a screen that used to fire it was rewritten. Today
  // all twenty are live. If a future kind is genuinely server-recorded only,
  // name it here rather than deleting this check.
  const kinds = fired();
  const SERVER_SIDE = new Set([]);
  const stale = [...SERVER_KINDS].filter((k) => !kinds.has(k) && !SERVER_SIDE.has(k));
  assert.deepEqual(stale, [], `\nListed here, fired by nothing:\n  ${stale.join("\n  ")}\n`);
});

// A kind is not the only closed list on this endpoint. `try_failed` and
// `try_mic_denied` each carry a `why`, coerced server-side against a list of
// slugs, and a slug outside it is DROPPED — quietly, leaving a row that says
// a take failed and cannot say why. Same silent failure as a rejected kind,
// one level down, and the client builds these ones in a helper rather than at
// the call site, so they are easy to change without anybody looking at the
// server.
const SERVER_WHY = {
  // views.py FunnelEventView._WHY
  try_failed: new Set(["too_big", "refused", "network", "empty", "server"]),
  // views.py FunnelEventView._MIC
  try_mic_denied: new Set(["denied", "notfound", "inuse", "constrained",
                           "insecure", "other"]),
  // views.py FunnelEventView._BLOCKED
  try_blocked: new Set(["already_used", "cap_reached", "not_configured"]),
};

/** Every slug the recorder can put in a `why`.
 *
 * Two places write them and the test has to read both: most are `why: "slug"`
 * at the call site, but a send failure goes through `failReason()`, which
 * returns a bare string — so its body is read separately. Reading only the
 * first form would have this test pass while three of the eight were
 * unchecked, which is the same shape of hole it exists to close. */
function whySlugs() {
  const src = readFileSync(join(ROOT, "src/apps/BossTake.jsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const found = new Set([...src.matchAll(/\bwhy:\s*"([a-z_]+)"/g)].map((m) => m[1]));

  const body = src.match(/const failReason = \(e\) => \{([\s\S]*?)\n\};/);
  assert.ok(body, "failReason() moved or was renamed — this test is now reading nothing");
  for (const m of body[1].matchAll(/return\s+"([a-z_]+)"/g)) found.add(m[1]);
  return found;
}

test("every failure reason the recorder sends is one the server keeps", () => {
  const known = new Set(Object.values(SERVER_WHY).flatMap((s) => [...s]));
  const unknown = [...whySlugs()].filter((w) => !known.has(w));
  assert.deepEqual(unknown, [],
    "\nThese are sent as a `why` and dropped on arrival, leaving a row that " +
    "says something failed and cannot say what:\n  " + unknown.join("\n  ") + "\n");
});
