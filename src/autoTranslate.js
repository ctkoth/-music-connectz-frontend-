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
import { CACHE_KEY, LANG_KEY, addToCache, cleanChoice, fromTemplate, splitSpace, toTemplate, worth } from "./uiLang.js";

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
const originals = new WeakMap();    // text node → the English it held
const asked = new Set();            // templates already sent to the model this session
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

function setText(node, text) {
  if (node.nodeValue === text) return;
  observer?.disconnect();
  node.nodeValue = text;
  observe();
}

function observe() {
  observer?.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function restore() {
  for (const node of textNodes()) {
    const o = originals.get(node);
    if (o != null && node.nodeValue !== o.shown) continue;      // React already replaced it
    if (o != null) setText(node, o.english);
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
    } else if (!asked.has(`${choice.code}\n${template}`)) want.add(template);
  }
  if (busy || !want.size) return;
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
    batch.forEach((t) => (lookup ? looked : asked).add(`${code}\n${t}`));
    if (r?.capped) capped = true;
    const got = r?.translations && typeof r.translations === "object" ? r.translations : {};
    if (Object.keys(got).length) {
      cache = addToCache(cache, code, got);
      write(CACHE_KEY, cache);
    }
  } catch { /* offline or signed out: the screen keeps its English */ }
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
  cache = read(CACHE_KEY) || {};
  const saved = cleanChoice(read(LANG_KEY));
  if (saved) setUiLang(saved);
}
