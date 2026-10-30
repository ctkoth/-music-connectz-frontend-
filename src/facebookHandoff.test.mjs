import test from "node:test";
import assert from "node:assert/strict";
import { facebookStallNote } from "./facebookHandoff.js";

test("a phone with Spotify or Facebook on the screen is told before it goes", () => {
  for (const keys of [["spotify"], ["facebook"], ["google", "soundcloud", "spotify"]]) {
    const n = facebookStallNote({ keys, shape: "phone", shell: "web" });
    assert.ok(n, keys.join());
    assert.match(n.why, /Facebook's side/);
    assert.match(n.why, /account is fine/);
    assert.match(n.instead, /email, Google or Apple/);
    assert.match(n.stuck, /Close that tab/);
  }
});

test("it says nothing where there is no app to hand off to", () => {
  assert.equal(facebookStallNote({ keys: ["spotify"], shape: "desktop", shell: "web" }), null);
  assert.equal(facebookStallNote({ keys: ["spotify"], shape: "tablet", shell: "web" }), null);
});

test("it says nothing when neither provider is offered", () => {
  assert.equal(facebookStallNote({ keys: ["google", "github"], shape: "phone", shell: "web" }), null);
  assert.equal(facebookStallNote({ shape: "phone", shell: "web" }), null);
});

test("an in-app browser already has its refusal, so it gets no second note", () => {
  assert.equal(facebookStallNote({ keys: ["spotify"], shape: "phone", shell: "inapp" }), null);
});

test("nothing in it is a price, a number or an exclamation mark", () => {
  const n = facebookStallNote({ keys: ["spotify"], shape: "phone", shell: "web" });
  for (const s of Object.values(n)) assert.doesNotMatch(s, /[!\d]/);
});
