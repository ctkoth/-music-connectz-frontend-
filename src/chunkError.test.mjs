import assert from "node:assert/strict";
import { test } from "node:test";
import { isChunkError } from "./chunkError.js";

test("a stale deploy is recognised whether the missing file is the JS or its CSS", () => {
  assert.ok(isChunkError(new TypeError("Failed to fetch dynamically imported module: https://x/assets/A-1.js")));
  assert.ok(isChunkError(new Error("Importing a module script failed.")));
  // Vite's preloader, reported from a phone: the chunk's stylesheet was gone.
  assert.ok(isChunkError(new Error("Unable to preload CSS for /assets/ToolZMenu-CXHPUmcG.css")));
});

test("an ordinary error is not mistaken for one", () => {
  assert.ok(!isChunkError(new Error("Cannot read properties of undefined")));
  assert.ok(!isChunkError(null));
});
