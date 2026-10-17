import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// PromoPost.jsx imports JSX, so the pure helper is read out of the source rather
// than imported.
const src = readFileSync(new URL("./components/PromoPost.jsx", import.meta.url), "utf8");

test("the rows state the price beside the control and never offer the paid run in a shell", () => {
  const row = readFileSync(new URL("./components/RecentTakes.jsx", import.meta.url), "utf8");
  assert.match(row, /<Cost cost=\{e\.cost\} \/>/);
  assert.match(row, /!\(IN_SHELL && e\.kind === "promo"\)/);
  assert.match(row, /Nothing was charged\./);
});

test("copy tells the member when the browser refused rather than saying copied", async () => {
  const body = src.match(/export async function copyText[\s\S]*?\n}\n/)[0];
  const copyText = new Function(`${body.replace("export async function", "return async function")}`)();
  assert.equal(await copyText("x", { clipboard: { writeText: async () => {} } }), true);
  assert.equal(await copyText("x", { clipboard: { writeText: async () => { throw new Error("no"); } } }), false);
  assert.equal(await copyText("x", null), false);
});
