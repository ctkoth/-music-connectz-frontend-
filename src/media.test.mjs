import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { demoSrc, MEDIA_BASE } from "./media.js";

test("moved demos resolve to the media host; anything else passes through", () => {
  assert.equal(demoSrc("/exercise-demos/barbell-curl.mp4"), `${MEDIA_BASE}/exercise-demos/barbell-curl.mp4`);
  assert.equal(demoSrc("https://example.com/x.mp4"), "https://example.com/x.mp4");
  assert.equal(demoSrc(""), "");
});

test("the videos are not back in the repo", () => {
  assert.ok(!existsSync(new URL("../public/exercise-demos", import.meta.url)));
});

test("every demo link goes through demoSrc", () => {
  for (const f of ["apps/BodieZ.jsx", "apps/BodieZTrial.jsx"]) {
    const src = readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
    assert.ok(!/href=\{[^}]*demo_url\}/.test(src), `${f} links a demo_url without demoSrc`);
  }
});
