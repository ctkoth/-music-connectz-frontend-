import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GLOSSARY, byKey } from "./glossary.js";

test("every entry has a word and a real definition, and escrow comes first", () => {
  assert.equal(GLOSSARY[0].key, "escrow");
  for (const g of GLOSSARY) assert.ok(g.word && g.means.length > 40, g.key);
  assert.equal(new Set(GLOSSARY.map((g) => g.key)).size, GLOSSARY.length);
});

test("every <Term k> in the source names a real entry", () => {
  const bad = [];
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (f.name !== "mcz2") walk(p); }
    else if (/\.jsx$/.test(f.name)) {
      for (const m of fs.readFileSync(p, "utf8").matchAll(/<Term k="([^"]+)"/g)) if (!byKey(m[1])) bad.push(`${p}: ${m[1]}`);
    } } };
  walk("src");
  assert.deepEqual(bad, []);
});
