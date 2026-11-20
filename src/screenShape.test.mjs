import test from "node:test";
import assert from "node:assert/strict";

import { splitLayout } from "./useScreenShape.js";

test("a split sits side by side wherever each pane keeps its width, and stacks where it would not", () => {
  assert.equal(splitLayout({ w: 390, h: 844 }).side, false);   // phone portrait
  assert.equal(splitLayout({ w: 768, h: 1024 }).side, true);   // tablet portrait: the old 1024px breakpoint stacked this
  assert.equal(splitLayout({ w: 844, h: 390 }).side, true);    // phone landscape
  assert.equal(splitLayout({ w: 1280, h: 800 }).side, true);
  assert.equal(splitLayout({ w: 700, h: 900 }).side, false);   // each pane would be under 340px
});

test("a split pane never gets a height below something usable, and a short screen stacks", () => {
  assert.equal(splitLayout({ w: 900, h: 300 }).side, false);
  for (const [w, h] of [[320, 568], [390, 844], [844, 390], [768, 1024], [1280, 800]]) {
    assert.ok(splitLayout({ w, h }).paneMax >= 260, `${w}x${h}`);
  }
});
