import test from "node:test";
import assert from "node:assert/strict";
import { shareUrl, commentPrice, rateState, whyOff } from "./socialBar.js";

test("a share link is the origin plus the server's path, and blank when there is none", () => {
  assert.equal(shareUrl("https://musicconnectz.net/", { path: "/s/abc" }), "https://musicconnectz.net/s/abc");
  assert.equal(shareUrl("https://x.net", { path: "" }), "");
  assert.equal(shareUrl("https://x.net", null), "");
});

test("comment price: free with the count left, or the energy it costs", () => {
  assert.deepEqual(commentPrice({ comment_cost_energy: 0, comment_free_left: 3 }), { kind: "free", cost: 0, text: "free (3 left today)" });
  assert.deepEqual(commentPrice({ comment_cost_energy: 2, comment_free_left: 0 }), { kind: "cost", cost: 2, text: "" });
});

test("rate shows the gain only until the member has rated", () => {
  assert.equal(rateState({ rating: null, rating_count: 0, my_rating: null, rating_reward_energy: 1 }).gain, 1);
  assert.equal(rateState({ rating: 7, rating_count: 4, my_rating: 8, rating_reward_energy: 1 }).gain, 0);
  assert.equal(rateState({ rating: null, rating_count: 0, my_rating: null, rating_reward_energy: 1 }).text, "not rated yet");
  assert.equal(rateState({ rating: 7.5, rating_count: 4 }).text, "7.5/10 · 4");
});

test("every disabled control says why", () => {
  assert.match(whyOff("rate", { canRate: false }), /your own work/);
  assert.match(whyOff("share", { share: { path: "", who: "Private — only its author can open it" } }), /Private/);
  assert.match(whyOff("share", { share: null }), /no page/);
  assert.match(whyOff("open", { opens: [] }), /Nothing else/);
  assert.equal(whyOff("open", { opens: [{ label: "x" }] }), "");
  assert.equal(whyOff("rate", { canRate: true }), "");
});

import { moodRows, shownMoods, nextMood } from "./socialBar.js";

const M = {
  list: [{ key: "love", emoji: "❤️", label: "Love" }, { key: "shocked", emoji: "😲", label: "Shocked" }, { key: "hate", emoji: "😡", label: "Hate" }],
  counts: { love: 3, shocked: 5, hate: 0 },
  mine: "love",
};

test("moods join the server's list with its counts and mine", () => {
  const rows = moodRows(M);
  assert.equal(rows.length, 3);
  assert.equal(rows.find((r) => r.key === "love").mine, true);
  assert.equal(rows.find((r) => r.key === "shocked").mine, false);
  assert.equal(rows.find((r) => r.key === "hate").count, 0);
});

test("the row shows only moods somebody chose, most first; the picker keeps all", () => {
  assert.deepEqual(shownMoods(M).map((m) => m.key), ["shocked", "love"]);
  assert.deepEqual(shownMoods({ list: M.list, counts: {}, mine: "" }), []);
});

test("pressing your own mood clears it, any other sets it", () => {
  assert.equal(nextMood(M, "love"), "");
  assert.equal(nextMood(M, "shocked"), "shocked");
  assert.equal(nextMood(null, "love"), "love");
});

test("a failed or older response draws nothing rather than guessing", () => {
  assert.deepEqual(moodRows(undefined), []);
  assert.deepEqual(shownMoods(null), []);
});
