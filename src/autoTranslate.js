// The app's own screens in the member's language.
//
// Like autoMemo.js this is one document-level module, not something wired into
// 248 screens: when the display language is not English it walks the rendered
// page, asks the server for the strings it has not seen (`/api/economy/uitext/`,
// one shared table — a string is translated once for everybody, free to the
// member), and swaps the text in place. React re-rendering a node back to English
// is just a mutation it sees and re-applies from the cache.
//
// What it leaves alone, on purpose:
//   * anything a member wrote — `[data-ugc]`, a name link, long text drawn with
//     `whitespace-pre-wrap` (posts, bios, coach prose), and @handles. Other
//     people's words are theirs, and they are never sent to a translator here;
//   * what is typed into a field, code, and anything marked `data-notranslate`.
// It is machine translation and it says so on the picker (the server's note).
import { api } from "./api.js";
import { CACHE_KEY, LANG_KEY, addToCache, cleanChoice, fromTemplate, pruneStale, splitSpace, toTemplate, worth } from "./uiLang.js";

const SKIP_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "CODE", "PRE", "SCRIPT", "STYLE", "NOSCRIPT", "svg", "SVG"]);
const SKIP_SEL = "[data-ugc],[data-notranslate],[contenteditable='true'],.whitespace-pre-wrap";
const BATCH = 60;        // strings the model is asked for at a time
const LOOKUP = 400;      // strings looked up at a time (already translated: instant)

const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked: this session only */ } };

let choice = null;                  // { code, own, flag, rtl } or null for English
let cache = {};
let observer = null;
let timer = 0;
let busy = false;
let capped = false;
let cappedAt = 0;
let backoffUntil = 0;
const RETRY_MS = 60_000;            // a string the model did not answer is asked again after this
const MAX_TRIES = 3;                // ...this many times a session, then it stays English
const CAP_RETRY_MS = 10 * 60_000;   // the daily cap is asked about again after this
const ATTRS = ["placeholder", "title", "aria-label"];
const originals = new WeakMap();    // text node → the English it held
const attrOriginals = new WeakMap(); // element → { attr: {english, shown} }
// Templates sent to the model: template → {tries, at}. A string asked once and not answered
// used to be skipped for the whole session, which is what left screens half translated: one
// failed batch, or the daily cap, and those 60 strings stayed English until a reload.
const asked = new Map();
const looked = new Set();           // templates already looked up this session
const listeners = new Set();
const names = new Set();            // the signed-in member's own name: never sent, wherever a screen prints it

/** Words that are somebody's name, not the app's text. The shell passes the signed-in member's. */
export function protectNames(list) {
  for (const n of list || []) if (n) names.add(String(n).trim().toLowerCase());
}

export const currentLang = () => choice;
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function skip(node) {
  const el = node.parentElement;
  if (!el) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  return !!el.closest(SKIP_SEL);
}

function textNodes() {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const out = [];
  let n;
  while ((n = w.nextNode())) out.push(n);
  return out;
}

function textAttrs() {
  const out = [];
  for (const el of document.body.querySelectorAll("[placeholder],[title],[aria-label]")) {
    if (el.closest(SKIP_SEL)) continue;
    for (const a of ATTRS) if (el.hasAttribute(a)) out.push([el, a]);
  }
  return out;
}

function setAttr(el, a, text) {
  if (el.getAttribute(a) === text) return;
  observer?.disconnect();
  el.setAttribute(a, text);
  observe();
}

function mayAsk(key) {
  const t = asked.get(key);
  return !t || (t.tries < MAX_TRIES && Date.now() - t.at > RETRY_MS);
}

function setText(node, text) {
  if (node.nodeValue === text) return;
  observer?.disconnect();
  node.nodeValue = text;
  observe();
}

function observe() {
  observer?.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

function restore() {
  for (const node of textNodes()) {
    const o = originals.get(node);
    if (o != null && node.nodeValue !== o.shown) continue;      // React already replaced it
    if (o != null) setText(node, o.english);
  }
  for (const [el, a] of textAttrs()) {
    const o = attrOriginals.get(el)?.[a];
    if (o && el.getAttribute(a) === o.shown) setAttr(el, a, o.english);
  }
}

async function pass() {
  if (!choice) return;
  const dict = cache[choice.code] || {};
  const want = new Set();
  for (const node of textNodes()) {
    if (skip(node)) continue;
    const now = node.nodeValue || "";
    const known = originals.get(node);
    if (known && known.shown === now) continue;                // still showing our translation
    const { lead, core, tail } = splitSpace(now);
    if (!worth(core) || core.startsWith("@") || names.has(core.toLowerCase())) continue;
    const { template, nums } = toTemplate(core);
    const hit = dict[template];
    if (hit != null) {
      const done = fromTemplate(hit, nums);
      if (done != null) {
        const shown = lead + done + tail;
        originals.set(node, { english: now, shown });
        setText(node, shown);
      }
    } else if (mayAsk(`${choice.code}\n${template}`)) want.add(template);
  }
  // Placeholders, tooltips and screen-reader labels are the app's words too; leaving them
  // English is the "Search languages" box in the middle of a Portuguese screen.
  for (const [el, a] of textAttrs()) {
    const now = el.getAttribute(a) || "";
    const rec = attrOriginals.get(el) || {};
    if (rec[a] && rec[a].shown === now) continue;
    const core = now.trim();
    if (!worth(core) || core.startsWith("@") || names.has(core.toLowerCase())) continue;
    const { template, nums } = toTemplate(core);
    const hit = dict[template];
    if (hit != null) {
      const done = fromTemplate(hit, nums);
      if (done != null) { rec[a] = { english: now, shown: done }; attrOriginals.set(el, rec); setAttr(el, a, done); }
    } else if (mayAsk(`${choice.code}\n${template}`)) want.add(template);
  }
  if (busy || !want.size || Date.now() < backoffUntil) return;
  if (capped && Date.now() - cappedAt > CAP_RETRY_MS) capped = false;
  const code = choice.code;
  // What somebody already had translated comes first and comes at once; only
  // what nobody has seen yet waits on the model.
  const fresh = [...want].filter((t) => !looked.has(`${code}\n${t}`));
  const lookup = fresh.length > 0;
  if (!lookup && capped) return;
  const batch = lookup ? fresh.slice(0, LOOKUP) : [...want].slice(0, BATCH);
  busy = true;
  try {
    const r = await api("/api/economy/uitext/", { method: "POST", body: { lang: code, texts: batch, known_only: lookup } });
    const now = Date.now();
    batch.forEach((t) => {
      const k = `${code}\n${t}`;
      if (lookup) looked.add(k);
      else asked.set(k, { tries: (asked.get(k)?.tries || 0) + 1, at: now });
    });
    if (r?.capped) { capped = true; cappedAt = now; setTimeout(schedule, CAP_RETRY_MS + 500); }
    // A quiet screen makes no mutations, so nothing would wake the retry; book one.
    const got0 = r?.translations || {};
    if (!lookup && batch.some((t) => !(t in got0))) setTimeout(schedule, RETRY_MS + 500);
    const got = r?.translations && typeof r.translations === "object" ? r.translations : {};
    if (Object.keys(got).length) {
      cache = addToCache(cache, code, got);
      write(CACHE_KEY, cache);
    }
  } catch {
    // Offline or a server error: nothing is marked as asked, so the same strings are tried
    // again once the back-off passes instead of staying English for the session.
    backoffUntil = Date.now() + 30_000;
    setTimeout(schedule, 30_500);
  }
  busy = false;
  schedule();
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(pass, 300);
}

/** Choose a display language ({code, own, flag, rtl}) or null/English to go back. */
export function setUiLang(next) {
  const cleaned = cleanChoice(next);
  if (choice && (!cleaned || cleaned.code !== choice.code)) restore();
  choice = cleaned;
  capped = false;
  backoffUntil = 0;
  if (cleaned) write(LANG_KEY, cleaned); else { try { localStorage.removeItem(LANG_KEY); } catch { /* blocked */ } }
  document.documentElement.lang = cleaned ? cleaned.code : "en";
  listeners.forEach((fn) => fn(choice));
  if (!cleaned) { observer?.disconnect(); observer = null; return; }
  if (!observer) observer = new MutationObserver(schedule);
  observe();
  schedule();
}

/** Called once from main.jsx. English costs nothing: no observer, no walk. */
export function startAutoTranslate() {
  if (typeof document === "undefined") return;
  // Answers the server has since changed its mind about are dropped here, so they are asked again.
  cache = pruneStale(read(CACHE_KEY) || {});
  const saved = cleanChoice(read(LANG_KEY));
  if (saved) setUiLang(saved);
}
