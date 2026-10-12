import test from "node:test";
import assert from "node:assert/strict";
import * as L from "./soundcloudLibrary.js";

const rows = [{ id: 1, visibility: "private" }, { id: 2, visibility: "public" }, { id: 3, visibility: "private" }];

test("selection math", () => {
  let s = L.selectPage(new Set(), rows);
  assert.equal(s.size, 3);
  assert.ok(L.pageFullySelected(s, rows));
  s = L.toggleId(s, 2);
  assert.ok(!L.pageFullySelected(s, rows));
  assert.deepEqual(L.orderedIds(s, [3, 2, 1]), [3, 1]);
  assert.equal(L.unselectPage(s, rows).size, 0);
  assert.equal(L.alreadyAt(rows, new Set([1, 2]), "public"), 1);
});

test("chunk", () => {
  assert.deepEqual(L.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(L.chunk([], 3), []);
});

test("preview text is the server's, apply needs a matching preview", () => {
  assert.equal(L.previewText(null), "");
  assert.equal(L.previewText({ detail: "Setting 2 to public costs nothing." }), "Setting 2 to public costs nothing.");
  assert.ok(L.canApply({ visibility: "public", would_change: 2 }, "public", 2));
  assert.ok(!L.canApply({ visibility: "public", would_change: 2 }, "private", 2));
  assert.ok(!L.canApply({ visibility: "public", would_change: 0 }, "public", 2));
  assert.ok(!L.canApply(null, "public", 2));
});

test("merge results and say 'published' only when the server did", () => {
  const m = L.mergeResults([
    { results: [{ id: 1 }], published: 1, changed: 1, skipped: 0, not_attempted: 0, charged: { amount: 5 } },
    { results: [{ id: 2 }], published: 0, changed: 1, skipped: 2, not_attempted: 1, charged: { amount: 0 }, stopped: "Stopped" },
    null,
  ]);
  assert.equal(m.charged, 5);
  assert.equal(m.stopped, "Stopped");
  assert.equal(L.resultLine(m), "1 published, 1 changed, 2 skipped, 1 not attempted");
  assert.equal(L.resultLine(L.mergeResults([])), "Nothing changed");
});

test("import scope comes from the server numbers", () => {
  assert.equal(L.importScope({ whole_catalogue: true, max_tracks: null }), "your whole SoundCloud library");
  assert.equal(L.importScope({ whole_catalogue: false, max_tracks: 5 }), "your newest 5 SoundCloud tracks");
  assert.equal(L.countsLine({ total: 3, public: 1, restricted: 0, private: 2 }), "3 imported: 1 public, 0 restricted, 2 private");
});
