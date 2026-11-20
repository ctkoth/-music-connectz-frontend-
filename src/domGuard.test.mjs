import test from "node:test";
import assert from "node:assert/strict";

// A tiny DOM stand-in: enough Node behaviour to show the guard picks the wrapper, not a crash.
class N {
  constructor(name) { this.name = name; this.children = []; this.parentNode = null; }
  insertBefore(n, ref) { if (ref && ref.parentNode !== this) throw new Error("insertBefore: not a child"); if (n.parentNode) n.parentNode.children.splice(n.parentNode.children.indexOf(n), 1); const i = ref ? this.children.indexOf(ref) : this.children.length; this.children.splice(i, 0, n); n.parentNode = this; return n; }
  removeChild(c) { if (c.parentNode !== this) throw new Error("removeChild: not a child"); this.children.splice(this.children.indexOf(c), 1); c.parentNode = null; return c; }
  appendChild(c) { return this.insertBefore(c, null); }
}

test("an insert beside translated text lands in front of the translator's wrapper instead of crashing", async () => {
  globalThis.Node = N;
  const { guardDomForTranslators } = await import("./domGuard.js");
  guardDomForTranslators();
  const div = new N("div"), text = new N("text"), font = new N("font");
  div.appendChild(font); font.appendChild(text);           // the translator wrapped React's text
  const span = new N("span");
  div.insertBefore(span, text);
  assert.deepEqual(div.children.map((c) => c.name), ["span", "font"]);
  div.removeChild(text);                                    // React removing its text removes the wrapper
  assert.deepEqual(div.children.map((c) => c.name), ["span"]);
  assert.equal(div.removeChild(new N("gone")).name, "gone", "a node already gone is a no-op");
});
