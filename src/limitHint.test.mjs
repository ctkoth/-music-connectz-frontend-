import test from "node:test";
import assert from "node:assert/strict";
import { isLimitMessage } from "./limitHint.js";

test("the limit messages the app writes are recognised, ordinary ones are not", () => {
  assert.equal(isLimitMessage("Couldn't add a track: 3 tracks is your plan's limit — Premium has 6, StatZ has no limit."), true);
  assert.equal(isLimitMessage("Your tier moves a stem up to ±6 semitones — Premium ±6, StatZ a full octave."), true);
  assert.equal(isLimitMessage("Your plan keeps 3 per plugin — update or delete one, or Premium keeps 6, StatZ unlimited."), true);
  assert.equal(isLimitMessage("Recorded 0:08 onto Audio 2."), false);
  assert.equal(isLimitMessage("The microphone was blocked."), false);
  assert.equal(isLimitMessage(""), false);
  assert.equal(isLimitMessage(undefined), false);
});
