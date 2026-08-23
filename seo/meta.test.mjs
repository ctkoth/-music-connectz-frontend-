// node --test seo/
//
// The two properties worth holding this file to:
//
//   Member text never becomes markup. A post title is written by a member and
//   lands inside an HTML attribute. If escaping slips, a title is a script tag.
//
//   Nothing ever breaks the page. Every failure path returns the shell as it
//   arrived — a missing preview is a disappointment, a blank page is an outage.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  MARK_END, MARK_START, absolute, clamp, escapeHtml, htmlFor, injectMeta,
  metaFor, routeFor,
} from "./meta.mjs";

const SHELL = `<!doctype html><html><head>${MARK_START}<title>Music ConnectZ</title>${MARK_END}</head><body><div id="root"></div></body></html>`;
const shell = async () => SHELL;

test("the three public routes are recognised, and nothing else is", () => {
  assert.equal(routeFor("/p/412").kind, "post");
  assert.equal(routeFor("/u/corey").kind, "profile");
  assert.equal(routeFor("/pl/9").kind, "playlist");
  assert.equal(routeFor("/p/412/").kind, "post");
  for (const p of ["/", "/singz", "/login", "/p/", "/p/abc", "/u/", "/pl/x",
                   "/p/1/extra", "/privacy.html"]) {
    assert.equal(routeFor(p), null, p);
  }
});

test("a username with a path separator cannot escape its route", () => {
  assert.equal(routeFor("/u/../../etc/passwd"), null);
  assert.equal(routeFor("/u/a%2Fb"), null);
});

test("member text is escaped, not rendered", () => {
  const nasty = `</title><script>alert(1)</script>`;
  const m = metaFor("post", { title: nasty, author: "x", description: nasty },
                    { path: "/p/1" });
  const html = injectMeta(SHELL, m);
  assert.ok(!html.includes("<script>alert(1)"), "a script tag survived escaping");
  assert.ok(!html.includes("</title><script"), "a title was closed early");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("a quote in a title cannot open a new attribute", () => {
  const m = metaFor("post", { title: `" onload="steal()`, author: "x" }, { path: "/p/1" });
  const html = injectMeta(SHELL, m);
  assert.ok(!/content="[^"]*"\s+onload=/.test(html), "an attribute was injected");
  assert.ok(html.includes("&quot;"));
});

test("JSON-LD cannot close its own script element", () => {
  const m = metaFor("post", { title: "</script><script>x()</script>", author: "a" },
                    { path: "/p/1" });
  const html = injectMeta(SHELL, m);
  const block = html.slice(html.indexOf("application/ld+json"));
  assert.ok(!block.includes("</script><script>"), "the JSON-LD block was broken out of");
});

test("escapeHtml covers every character that changes parsing", () => {
  assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
  assert.equal(escapeHtml(null), "");
});

test("a post quotes the member before it describes the post", () => {
  const said = metaFor("post", { title: "T", author: "a", description: "my own words" },
                       { path: "/p/1" });
  assert.equal(said.description, "my own words");
  const silent = metaFor("post", { title: "T", author: "a", media_type: "audio", rating: 8 },
                         { path: "/p/1" });
  assert.ok(silent.description.includes("Track by a"));
  assert.ok(silent.description.includes("8/10"));
});

test("each kind gets a title that says whose it is", () => {
  assert.ok(metaFor("post", { title: "Song", author: "kay" }, { path: "/p/1" })
    .title.includes("by kay"));
  assert.ok(metaFor("profile", { username: "kay", display_name: "Kay" }, { path: "/u/kay" })
    .title.includes("@kay"));
  assert.ok(metaFor("playlist", { title: "Set", owner: "kay", count: 3 }, { path: "/pl/1" })
    .title.includes("by kay"));
});

test("og:image is always absolute, and falls back to the site card", () => {
  const o = "https://musicconnectz.net";
  assert.equal(absolute("/a.png", o), o + "/a.png");
  assert.equal(absolute("https://cdn/x.png", o), "https://cdn/x.png");
  assert.equal(absolute("javascript:alert(1)", o), "");
  const m = metaFor("post", { title: "T", author: "a", media_type: "audio" }, { path: "/p/1" });
  assert.ok(m.image.startsWith("https://"));
});

test("long text is cut on a word boundary", () => {
  const out = clamp("word ".repeat(80), 40);
  assert.ok(out.length <= 40);
  assert.ok(out.endsWith("…"));
  assert.equal(clamp("short", 40), "short");
});

test("a shell with no markers comes back untouched", () => {
  const plain = "<html><head><title>x</title></head></html>";
  const m = metaFor("post", { title: "T", author: "a" }, { path: "/p/1" });
  assert.equal(injectMeta(plain, m), plain);
});

test("a route we don't handle is served the shell without a fetch", async () => {
  let called = false;
  const out = await htmlFor("/singz", {
    getShell: shell,
    fetchImpl: async () => { called = true; throw new Error("should not run"); },
  });
  assert.equal(out, SHELL);
  assert.equal(called, false);
});

test("a private post — 404 from the API — is given nothing extra", async () => {
  const out = await htmlFor("/p/7", {
    getShell: shell,
    fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) }),
  });
  assert.equal(out, SHELL);
});

test("an API that is down, slow or lying never breaks the page", async () => {
  for (const bad of [
    async () => { throw new Error("network"); },
    async () => ({ ok: true, json: async () => { throw new Error("not json"); } }),
    async () => ({ ok: true, json: async () => null }),
    async () => ({ ok: true, json: async () => ({}) }),          // no title, no author
    async () => ({ ok: true, json: async () => "a string" }),
  ]) {
    assert.equal(await htmlFor("/p/7", { getShell: shell, fetchImpl: bad }), SHELL);
  }
});

test("a real post is injected end to end", async () => {
  const out = await htmlFor("/p/412", {
    getShell: shell,
    fetchImpl: async (url) => {
      assert.ok(url.endsWith("/api/postz/412/"), url);
      return { ok: true, json: async () => ({
        id: 412, title: "Midnight Take", author: "kay", media_type: "audio",
        description: "One take, no punch-ins.", rating: 8,
      }) };
    },
  });
  assert.ok(out.includes("<title>Midnight Take by kay — Music ConnectZ</title>"));
  assert.ok(out.includes('content="One take, no punch-ins."'));
  assert.ok(out.includes('property="og:type" content="music.song"'));
  assert.ok(out.includes('"@type":"MusicRecording"'));
  assert.ok(out.includes('href="https://musicconnectz.net/p/412"'));
  assert.ok(out.includes('<div id="root">'), "the app shell must still be there");
});
