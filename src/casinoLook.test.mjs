import test from "node:test";
import assert from "node:assert/strict";
import { coinCount, coinSpec } from "./casinoLook.js";

test("only a big moment throws coins, and the casino look throws more", () => {
  assert.equal(coinCount({ big: false, casino: true }), 0);
  assert.ok(coinCount({ big: true, casino: true }) > coinCount({ big: true, casino: false }));
  assert.ok(coinCount({ big: true, casino: false }) > 0);
});

test("the coin spread is deterministic and stays on screen", () => {
  for (let i = 0; i < 28; i++) {
    const a = coinSpec(i, 28), b = coinSpec(i, 28);
    assert.deepEqual(a, b);
    assert.ok(a.left >= 0 && a.left <= 100 && a.fall > 1 && a.delay >= 0 && Math.abs(a.drift) <= 40);
  }
});

test("no random source in the file", async () => {
  const src = (await import("node:fs")).readFileSync(new URL("./casinoLook.js", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.ok(!/Math\.random/.test(src));
});
