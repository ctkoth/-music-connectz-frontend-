import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reelStrips, rewardText, stopAt, STRIP_LENGTH } from "./reelReveal.js";

test("the reels read exactly the amount that was paid", () => {
  for (const [res, amt] of [["spinaz", 1250], ["energy", 7], ["money", 1250], ["xp", 40], ["promptz", 3]]) {
    const read = reelStrips(res, amt).filter((s) => s.kind !== "resource").map((s) => s.final).join("");
    assert.equal(read, rewardText(res, amt));
  }
  assert.equal(rewardText("money", 1250), "$12.50");
  assert.equal(rewardText("spinaz", 1250), "1,250");
});

test("every spinning strip ENDS on its true symbol, and the resource reel on the true resource", () => {
  for (const s of reelStrips("spinaz", 90817)) {
    if (s.kind === "fixed") continue;
    assert.equal(s.symbols.length, STRIP_LENGTH);
    assert.equal(s.symbols[s.symbols.length - 1], s.final);
  }
});

test("the same reward always spins the same way", () => {
  assert.deepEqual(reelStrips("energy", 55), reelStrips("energy", 55));
});

test("nothing to show means no reels", () => {
  assert.deepEqual(reelStrips("spinaz", 0), []);
  assert.deepEqual(reelStrips("spinaz", undefined), []);
});

test("reels stop one after another, left to right", () => {
  assert.ok(stopAt(1) > stopAt(0) && stopAt(4) > stopAt(3));
});

test("no random source and no stake or second-spin control in the reveal", () => {
  for (const f of ["./reelReveal.js", "./components/RewardReels.jsx"]) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    assert.ok(!/Math\.random|getRandomValues/.test(src), f);
    assert.ok(!/onClick|<button/i.test(src), f);
  }
});
