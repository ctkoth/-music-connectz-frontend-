// Two tabs at one address means the second is unreachable by URL: tabForSlug takes the first match.
// `socialz` and `social` did exactly that (both slugged to /social) until SocialZ kept its z.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const start = app.indexOf("const TABS = [");
const keys = [...app.slice(start, app.indexOf("\n];", start)).matchAll(/^\s*\{ key: "([a-z_]+)"/gm)].map((m) => m[1]);
const keeps = JSON.parse(app.match(/const SLUG_KEEPS_Z = (\[[^\]]*\])/)[1]);
const slug = (k) => (k.endsWith("z") && k.length > 2 && !keeps.includes(k) ? k.slice(0, -1) : k);

test("no two tabs share an address", () => {
  const seen = {};
  for (const k of keys) (seen[slug(k)] ||= []).push(k);
  const clash = Object.entries(seen).filter(([, v]) => v.length > 1);
  assert.deepEqual(clash, [], "tabs sharing an address: " + JSON.stringify(clash));
});

test("SocialZ and SocialiZeZ are separate addresses", () => {
  assert.notEqual(slug("socialz"), slug("social"));
});
