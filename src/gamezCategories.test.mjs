import test from "node:test";
import assert from "node:assert/strict";
import { inCategory, tally } from "./gamezCategories.js";

const G = (id, genre, subgenre = "") => ({ id, genre, subgenre });
const games = [G(1, "action", "Platformer"), G(2, "action", "Roguelike / Roguelite"), G(3, "puzzle"), G(4, ""), G(5, "action", "Platformer")];

test("counts per genre and subgenre, and the uncategorised", () => {
  const t = tally(games);
  assert.deepEqual(t.genre, { action: 3, puzzle: 1 });
  assert.deepEqual(t.sub, { Platformer: 2, "Roguelike / Roguelite": 1 });
  assert.equal(t.none, 1);
});

test("filtering by genre, by subgenre, uncategorised, and all", () => {
  assert.deepEqual(inCategory(games, "", "").map((g) => g.id), [1, 2, 3, 4, 5]);
  assert.deepEqual(inCategory(games, "action", "").map((g) => g.id), [1, 2, 5]);
  assert.deepEqual(inCategory(games, "action", "Platformer").map((g) => g.id), [1, 5]);
  assert.deepEqual(inCategory(games, "none", "").map((g) => g.id), [4]);
  assert.deepEqual(inCategory(games, "puzzle", "Logic Puzzle"), []);
});
