// node --test src/widgets.test.mjs
//
// Two pure decisions worth pinning, both of which are wrong in a way nobody
// would notice from a screenshot:
//
//   How many lanes a screen gets. A breakpoint knows the width and nothing
//   else, and this feature's whole claim is that it fits the screen it is on —
//   a landscape phone and a laptop window can be the same width and want
//   different boards.
//
//   What a link's button says before it is pressed. The server decides what
//   actually loads; this only decides the label, and a label that promises a
//   widget where a tab is coming is the cost/gain rule broken in miniature.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { shapeOf, MIN_LANE_PX } from "./useScreenShape.js";
import { widgetHint, hostOf } from "./widgetz.js";

const phone = { w: 390, h: 844, coarse: true };
const phoneWide = { w: 844, h: 390, coarse: true };
const tablet = { w: 1024, h: 1366, coarse: true };
const laptop = { w: 1280, h: 800, coarse: false };
const wide = { w: 2560, h: 1440, coarse: false };
const narrowWindow = { w: 520, h: 900, coarse: false };

test("a phone gets one lane and a laptop gets several", () => {
  assert.equal(shapeOf(phone).lanes, 1);
  assert.ok(shapeOf(laptop).lanes >= 3);
});

test("same width, different screen: a landscape phone is not a laptop window", () => {
  // 844px fits two lanes either way, but one of them is being pointed at with
  // a thumb and has 390px of height to spend.
  const p = shapeOf(phoneWide);
  const l = shapeOf({ w: 844, h: 800, coarse: false });
  assert.equal(p.lanes, 2);
  assert.equal(p.canFloat, false);
  assert.equal(l.canFloat, true);
  assert.ok(p.maxTile < l.maxTile, "a short screen gets shorter tiles");
});

test("a portrait tablet stays on one lane however wide it is", () => {
  // 1024px fits three by arithmetic. A finger does not.
  assert.equal(shapeOf(tablet).lanes, 1);
  assert.equal(shapeOf(tablet).stacked, true);
});

test("lanes stop at four, however much screen there is", () => {
  assert.equal(shapeOf(wide).lanes, 4);
});

test("no screen ever gets a lane narrower than a widget can use", () => {
  for (let w = 240; w <= 3000; w += 7) {
    const s = shapeOf({ w, h: 900, coarse: false });
    assert.ok(s.lanes >= 1, `${w} gave ${s.lanes} lanes`);
    // One lane is allowed to be narrower than the minimum — a 300px phone has
    // no better answer than one column. Beyond that, every lane earns its width.
    if (s.lanes > 1) {
      assert.ok(w / s.lanes >= MIN_LANE_PX * 0.9, `${w} split into ${s.lanes}`);
    }
  }
});

test("a narrow desktop window is a stack, not a squeeze", () => {
  assert.equal(shapeOf(narrowWindow).lanes, 1);
  assert.equal(shapeOf(narrowWindow).stacked, true);
});

test("hosts are read without www and without a scheme", () => {
  assert.equal(hostOf("https://www.youtube.com/watch?v=x"), "youtube.com");
  assert.equal(hostOf("musicconnectz.net/u/corey"), "musicconnectz.net");
  assert.equal(hostOf("not a url at all"), "");
});

test("a player is a player at every tier", () => {
  for (const url of [
    "https://youtu.be/abc", "https://open.spotify.com/track/x",
    "https://soundcloud.com/a/b", "https://m.youtube.com/watch?v=x",
  ]) {
    assert.equal(widgetHint(url, false).kind, "player", url);
  }
});

test("our own address opens here, never as a frame of ourselves", () => {
  assert.equal(widgetHint("https://musicconnectz.net/u/corey", false).kind, "internal");
});

test("an outside page says which it is before it is pressed", () => {
  // The tier is the only difference, and the label has to move with it —
  // otherwise a member presses a widget button and gets a tab.
  assert.equal(widgetHint("https://example.com/x", false).kind, "outside");
  assert.equal(widgetHint("https://example.com/x", true).kind, "page");
});

test("a link we cannot even read a host from is never called a widget", () => {
  assert.equal(widgetHint("javascript:alert(1)", true).kind, "outside");
});
