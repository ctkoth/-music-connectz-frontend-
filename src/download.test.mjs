import test from "node:test";
import assert from "node:assert/strict";
import { BOM, blobParts, safeName } from "./download.js";

test("a CSV gets a byte-order mark so Excel reads the emoji headers, and text does not", () => {
  assert.deepEqual(blobParts("a,b", "text/csv"), [BOM + "a,b"]);
  assert.deepEqual(blobParts("hello", "text/plain"), ["hello"]);
  assert.deepEqual(blobParts("{}", "application/json"), ["{}"]);
});

test("a filename the server sent cannot carry a path or odd characters", () => {
  assert.equal(safeName("rapz-takes-2026-10-18.csv"), "rapz-takes-2026-10-18.csv");
  assert.ok(!safeName("../../etc/passwd").includes("/"));
  assert.equal(safeName("", "x.txt"), "x.txt");
  assert.equal(safeName(null), "download.txt");
});
