import test from "node:test";
import assert from "node:assert/strict";

const load = async (platform) => {
  globalThis.window = platform ? { Capacitor: { getPlatform: () => platform } } : {};
  return import(`./platform.js?${Math.random()}`);
};

test("iOS hides ads, purchases and third-party sign-in", async () => {
  const p = await load("ios");
  assert.ok(p.isIOS() && p.HIDE_ADS() && p.HIDE_PURCHASES() && p.HIDE_SOCIAL_LOGIN());
});

test("Android, web and desktop hide nothing", async () => {
  for (const plat of ["android", "web", ""]) {
    const p = await load(plat);
    assert.ok(!p.isIOS() && !p.HIDE_ADS() && !p.HIDE_PURCHASES() && !p.HIDE_SOCIAL_LOGIN(), plat);
  }
});

test("a broken Capacitor object never hides anything", async () => {
  globalThis.window = { Capacitor: { getPlatform: () => { throw new Error("x"); } } };
  const p = await import(`./platform.js?${Math.random()}`);
  assert.equal(p.isIOS(), false);
});
