import { test } from "node:test";
import assert from "node:assert/strict";
import { desktopSiteOnPhone } from "./screenFit.js";

const phone = { screenWidth: 384, screenHeight: 854, coarse: true };

test("a phone laid out at desktop width is noticed (the screenshot: 384px screen, 980px layout)", () => {
  assert.equal(desktopSiteOnPhone({ ...phone, layoutWidth: 980 }), true);
});

test("a phone laid out at its own width is not", () => {
  assert.equal(desktopSiteOnPhone({ ...phone, layoutWidth: 384 }), false);
  assert.equal(desktopSiteOnPhone({ ...phone, layoutWidth: 400 }), false);   // a few px of scrollbar or rounding
});

test("a tablet showing the desktop layout is left alone", () => {
  assert.equal(desktopSiteOnPhone({ screenWidth: 800, screenHeight: 1280, coarse: true, layoutWidth: 1280 }), false);
});

test("a laptop or a mouse is never told to change anything", () => {
  assert.equal(desktopSiteOnPhone({ screenWidth: 1440, screenHeight: 900, coarse: false, layoutWidth: 1440 }), false);
  assert.equal(desktopSiteOnPhone({ ...phone, coarse: false, layoutWidth: 980 }), false);
});

test("a phone turned sideways keeps its short side, and a landscape desktop layout that roughly fits is not flagged", () => {
  assert.equal(desktopSiteOnPhone({ screenWidth: 854, screenHeight: 384, coarse: true, layoutWidth: 980 }), false);
  assert.equal(desktopSiteOnPhone({ screenWidth: 854, screenHeight: 384, coarse: true, layoutWidth: 1400 }), true);
});

test("nothing measurable means no notice", () => {
  assert.equal(desktopSiteOnPhone({ coarse: true }), false);
  assert.equal(desktopSiteOnPhone({ ...phone, layoutWidth: 0 }), false);
});
