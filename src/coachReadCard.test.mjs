// The coach-read components, rendered for real.
//
// coachVis.test.mjs holds the sentences. This holds what the SCREENS do with the
// server's answer, and it exists for the failure this repo has shipped before: a
// component that calls something it never imported is a bundle esbuild accepts
// and a screen that throws. Rendering each state once catches that, and also
// holds the one property that matters most — a viewer the server locked out gets
// a card with no read content in it, even if the response somehow carried some.
//
// The components import api.js, which reads `import.meta.env`, so they are
// bundled with that defined and rendered with react-dom/server.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;
const CACHE = join(ROOT, "node_modules", ".cache");
const OUT = join(CACHE, `coachread-smoke-${process.pid}.mjs`);
const ENTRY = join(CACHE, `coachread-smoke-entry-${process.pid}.jsx`);

let r;   // the rendered strings
before(async () => {
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(ENTRY, `
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import CoachReadCard, { CoachReadSetting } from ${JSON.stringify(join(ROOT, "src/components/CoachReadCard.jsx"))};
import PostWithRead from ${JSON.stringify(join(ROOT, "src/components/PostWithRead.jsx"))};

const READ = { app_key: "singz", label: "SingZ", score: 9, scores: { pitch: 8, ghost: 4 }, labels: { pitch: "Pitch" },
  verdict: "Quartz-bright hook that lands. Breath runs out.", strengths: ["Zinnia entry"], fixes: ["Mulberry breath"],
  next_drill: "Saffron drill", caveat: "Pitch is what one take can show. Consistency comes from history.",
  coached_by: "kay", coached_at: "2026-10-03T12:00:00+00:00", open_in: "singz", target: "singz-progress" };
const YOURS = { path: "/try/singz?ref=kay", label: "SingZ", app_key: "singz" };
const w = (el) => renderToString(React.createElement(MemoryRouter, null, el));
const h = React.createElement;
export const out = {
  shown: w(h(CoachReadCard, { coach: { state: "shown", public: true, read: READ, get_yours: YOURS }, author: "kay" })),
  compact: w(h(CoachReadCard, { compact: true, signedIn: true, coach: { state: "shown", read: READ }, onOpen() {} })),
  locked: w(h(CoachReadCard, { author: "kay", coach: { state: "locked", reason: "The coach's read on this song is for members. It's free to join.", label: "SingZ", get_yours: YOURS } })),
  // A locked answer that somehow carried the read: the card must still not show it.
  lockedWithLeak: w(h(CoachReadCard, { coach: { state: "locked", reason: "Members only.", read: READ, score: 9 } })),
  none: w(h(CoachReadCard, { coach: { state: "none" } })),
  absent: w(h(CoachReadCard, {})),
  settingAuthor: w(h(CoachReadSetting, { post: { id: 1, visibility: "public", coach: { state: "shown", visibility: "", read: READ } }, onChanged() {}, onFlash() {} })),
  settingOther: w(h(CoachReadSetting, { post: { id: 1, visibility: "public", coach: { state: "shown", read: READ } }, onChanged() {}, onFlash() {} })),
  trial: w(h(PostWithRead, { trial: true, result: { score: 7, share_url: "/s/abcdefghij" }, blob: new Blob(["x"]) })),
  noToken: w(h(PostWithRead, { result: { score: 7, share_url: "" }, blob: new Blob(["x"]) })),
  unscorable: w(h(PostWithRead, { result: { score: null, unscorable: "silence", share_url: "/s/abcdefghij" }, blob: new Blob(["x"]) })),
  noFile: w(h(PostWithRead, { result: { score: 7, share_url: "/s/abcdefghij" } })),
  offered: w(h(PostWithRead, { result: { score: 7, share_url: "/s/abcdefghij" }, blob: new Blob(["xx"]), appKey: "singz", genre: "Trap", takeName: "take.webm" })),
};
`);
  const { build } = await import("esbuild");
  await build({
    entryPoints: [ENTRY], outfile: OUT, bundle: true, platform: "node", format: "esm",
    jsx: "automatic", logLevel: "silent",
    define: { "import.meta.env": "{}" },
    external: ["react", "react-dom", "react/jsx-runtime", "react-router-dom", "lucide-react"],
  });
  const orig = console.error;
  console.error = () => {};            // React's useLayoutEffect-on-server notice, not ours
  try { r = (await import(pathToFileURL(OUT).href)).out; } finally { console.error = orig; }
});
after(() => { rmSync(OUT, { force: true }); rmSync(ENTRY, { force: true }); });

const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();

test("a shown read has the number, every LABELLED dimension, the notes and the caveat on one card", () => {
  const t = text(r.shown);
  assert.match(t, /9 \/10/);
  assert.match(t, /8 Pitch/);   // the house rating layout: number, then label, then detail
  assert.match(t, /Quartz-bright hook that lands/);
  assert.match(t, /Zinnia entry/);
  assert.match(t, /Mulberry breath/);
  assert.match(t, /Saffron drill/);
  assert.match(t, /one take can show/);
});

test("a dimension the server sent no label for is not shown as a bare number", () => {
  assert.doesNotMatch(text(r.shown), /ghost/i);
  assert.doesNotMatch(text(r.shown), /\b4 \/10/);
});

test("a stranger is offered their own free take, with the author's handle as the referral", () => {
  assert.match(r.shown, /href="\/try\/singz\?ref=kay"/);
});

test("a member's compact card is a headline, keeps the scope, and folds the notes", () => {
  const t = text(r.compact);
  assert.match(t, /9 \/10/);
  assert.match(t, /Quartz-bright hook that lands\./);
  assert.match(t, /one take can show/);
  assert.doesNotMatch(t, /Zinnia/);
  assert.doesNotMatch(t, /Saffron/);
});

test("a locked card says why in the server's words and offers the way in", () => {
  const t = text(r.locked);
  assert.match(t, /The coach's read on this song is for members\. It's free to join\./);
  assert.match(r.locked, /href="\/register"/);
  assert.match(r.locked, /href="\/login"/);
  assert.match(r.locked, /href="\/try\/singz\?ref=kay"/);
  for (const secret of ["9", "Quartz", "Zinnia", "Mulberry", "Saffron"]) {
    assert.ok(!t.includes(secret), `${secret} on a locked card`);
  }
});

test("even a locked answer that carried the read shows none of it", () => {
  const t = text(r.lockedWithLeak);
  for (const secret of ["Quartz", "Zinnia", "Mulberry", "Saffron", "9/10", "9 /10"]) {
    assert.ok(!t.includes(secret), `${secret} leaked through a locked card`);
  }
});

test("no read, or no coach key at all, renders nothing — not a placeholder", () => {
  assert.equal(r.none, "");
  assert.equal(r.absent, "");
});

test("the author's control exists only when the server told us the setting", () => {
  assert.match(text(r.settingAuthor), /Coach read: Same as the post/);
  assert.equal(r.settingOther, "");
});

test("the post-with-read form offers itself only for a member's own scored take that has a file", () => {
  for (const k of ["trial", "noToken", "unscorable", "noFile"]) assert.equal(r[k], "", k);
  const t = text(r.offered);
  assert.match(t, /Post this take with the coach's read/);
  // The founder's sentence for a public post, beside the choice it describes.
  assert.match(t, /including people from Reddit or TikTok who aren't members/);
  // Cost and gain are on screen before the button.
  assert.match(t, /of your storage/);
  assert.match(t, /Free to post/);
  assert.match(t, /\+ a link anyone can open/);
  assert.match(t, /What a stranger will see/);
  assert.match(t, /What a member will see/);
  assert.match(t, /Nothing is charged if the upload or the post fails/);
});
