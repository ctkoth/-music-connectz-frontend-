import test from "node:test";
import assert from "node:assert/strict";
import { androidPackage, launchHref, onAndroid, bars, dayLabel } from "./healthSteps.js";

test("the BodieZ shell opens the BodieZ app, everything else the main one", () => {
  assert.equal(androidPackage("bodiez"), "net.musicconnectz.bodiez");
  assert.equal(androidPackage(""), "net.musicconnectz.app");
  assert.match(launchHref("bodiez"), /^intent:\/\/link#Intent;scheme=mczhealth;package=net\.musicconnectz\.bodiez;end$/);
});

test("only Android gets the open-the-app button", () => {
  assert.equal(onAndroid("Mozilla/5.0 (Linux; Android 14)"), true);
  assert.equal(onAndroid("Mozilla/5.0 (Windows NT 10.0)"), false);
  assert.equal(onAndroid(undefined), false);
});

test("bars scale to the biggest day and a recorded zero is still visible", () => {
  const b = bars([{ day: "2026-11-20", steps: 10000 }, { day: "2026-11-19", steps: 5000 }, { day: "2026-11-18", steps: 0 }]);
  assert.deepEqual(b.map((x) => x.pct), [100, 50, 2]);
  assert.deepEqual(bars(null), []);
  assert.deepEqual(bars([{ day: "x", steps: "nope" }, null]), []);
});

test("a day label does not slip across midnight", () => {
  assert.match(dayLabel("2026-11-20"), /20/);
  assert.equal(dayLabel("junk"), "junk");
});
