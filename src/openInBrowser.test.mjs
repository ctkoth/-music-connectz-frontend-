import test from "node:test";
import assert from "node:assert/strict";
import { chromeIntent, browserExit, isAndroid } from "./openInBrowser.js";

const AND = "Mozilla/5.0 (Linux; Android 14) Instagram 300.0";
const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Instagram 300.0";

test("android gets an intent that keeps the path, the query and a fallback", () => {
  const i = chromeIntent("https://musicconnectz.net/try/singz?src=ig-bio", AND);
  assert.ok(i.startsWith("intent://musicconnectz.net/try/singz?src=ig-bio#Intent;scheme=https;"));
  assert.ok(i.includes("package=com.android.chrome"));
  assert.ok(i.includes("S.browser_fallback_url=" + encodeURIComponent("https://musicconnectz.net/try/singz?src=ig-bio")));
  assert.ok(i.endsWith(";end"));
});

test("iOS and desktop get no button that might do nothing", () => {
  assert.equal(chromeIntent("https://musicconnectz.net/try", IOS), "");
  assert.equal(browserExit("https://musicconnectz.net/try", IOS).kind, "copy");
  assert.equal(isAndroid(""), false);
});

test("anything that is not an http(s) address builds nothing", () => {
  assert.equal(chromeIntent("javascript:alert(1)", AND), "");
  assert.equal(chromeIntent("not a url", AND), "");
});

test("android's choice says what it does", () => {
  const e = browserExit("https://musicconnectz.net/try", AND);
  assert.equal(e.kind, "intent");
  assert.equal(e.label, "Open in Chrome");
});
