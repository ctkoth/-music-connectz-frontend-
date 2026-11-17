import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

// A feature tile that names a file nobody drew falls back to an emoji silently, which is
// exactly how a missing icon goes unnoticed. Every tile the component knows must be on
// disk, drawn by the generator, and registered for IconZ.
test("every feature tile is drawn, generated and registered", () => {
  const src = readFileSync("src/components/FeatureIcon.jsx", "utf8");
  const names = [...src.slice(src.indexOf("const EMOJI"), src.indexOf("};", src.indexOf("const EMOJI"))).matchAll(/(\w+):\s*"/g)].map((m) => m[1]);
  assert.ok(names.length >= 10);
  const gen = readFileSync("tools/make-neon-icons.mjs", "utf8");
  const app = readFileSync("src/App.jsx", "utf8");
  for (const n of names) {
    assert.ok(existsSync(`public/icons/${n}-neon.svg`), `${n}-neon.svg is not committed`);
    assert.ok(gen.includes(`["${n}",`), `${n} is not in the generator's list`);
    assert.ok(app.includes(`"feature_${n}.png": "/icons/${n}-neon.svg"`), `${n} is not registered`);
  }
});
