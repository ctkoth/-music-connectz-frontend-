import test from "node:test";
import assert from "node:assert/strict";
import { MAX_FILE_MB, fitsVault, planEviction, vaultKey } from "./deviceVault.js";

const MB = 1024 * 1024;
test("the vault drops the OLDEST copies first, only as many as needed, and never an alias", () => {
  const e = [{ key: "upload:1", size: 300 * MB, savedAt: 1 }, { key: "upload:2", size: 300 * MB, savedAt: 2 }, { key: "upload:3", size: 150 * MB, savedAt: 3 },
    { key: "mixz:9", ref: "upload:2", savedAt: 4 }];
  assert.deepEqual(planEviction(e, 100 * MB, 800 * MB), ["upload:1"]);             // 750 held + 100 coming = 850 > 800: the oldest goes
  assert.deepEqual(planEviction(e, 40 * MB, 800 * MB), []);                        // 790 fits; and "mixz:9" (an alias) is never a candidate
});
test("over the cap it makes room from the oldest", () => {
  const e = [{ key: "a", size: 300 * MB, savedAt: 1 }, { key: "b", size: 300 * MB, savedAt: 2 }, { key: "c", size: 200 * MB, savedAt: 3 }];
  assert.deepEqual(planEviction(e, 100 * MB, 800 * MB), ["a"]);
  assert.deepEqual(planEviction(e, 500 * MB, 800 * MB), ["a", "b"]);
  assert.deepEqual(planEviction([], 10 * MB, 800 * MB), []);
});
test("one file is never kept if it is bigger than the per-file ceiling, and junk sizes are refused", () => {
  assert.equal(fitsVault(10 * MB), true);
  assert.equal(fitsVault((MAX_FILE_MB + 1) * MB), false);
  assert.equal(fitsVault(0), false);
  assert.equal(fitsVault(NaN), false);
  assert.equal(vaultKey("mixz", 12), "mixz:12");
});
