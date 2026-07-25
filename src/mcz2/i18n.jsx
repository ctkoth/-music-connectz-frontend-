// Whole-app runtime translator for LanguageZ. When the display language isn't
// English, this walks the rendered DOM under .mcz2-root, collects English chrome
// text, transcreates it via the backend (charged once per batch, then cached
// forever in localStorage), and swaps the text in place. It coexists with React
// by remembering each node's English source in a WeakMap and re-applying from
// cache whenever React re-renders a node back to English (no new charge).
//
// Honest tradeoffs: the first switch to a language flickers while batches load;
// user-generated content (posts/comments/usernames) is left to explicit per-item
// Translate buttons and excluded here via [data-notranslate].
import { useEffect, useRef } from "react";
import { translateApi } from "./economyApi";
import { langName } from "./languages";

const CACHE_KEY = "mcz2_i18n_cache";
const loadCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; } };
const saveCache = (c) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* quota */ } };

const SKIP_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT", "OPTION", "CODE", "PRE", "SCRIPT", "STYLE", "SVG", "PATH", "NOSCRIPT"]);
// Worth translating only if it has real words — skips pure numbers, emoji,
// single letters, money like "$4.00". Must contain a run of ≥2 latin letters.
const worth = (s) => { const t = (s || "").trim(); return t.length >= 2 && t.length <= 600 && /[A-Za-z]{2,}/.test(t); };

function skippable(node) {
  let el = node.parentElement;
  while (el) {
    if (el.nodeType === 1) {
      if (SKIP_TAGS.has(el.tagName)) return true;
      if (el.isContentEditable) return true;
      if (el.hasAttribute("data-notranslate")) return true;
      if (el.classList && el.classList.contains("mcz2-root")) break;
    }
    el = el.parentElement;
  }
  return false;
}

// Mounted (rendering nothing) inside .mcz2-root. Runs only when uiLang != "en".
export function AutoTranslate({ uiLang, serverOk, onCharge }) {
  const originals = useRef(new WeakMap()); // textNode -> English source
  const fetching = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    const lang = (uiLang || "en").toLowerCase();
    const root = document.querySelector(".mcz2-root");
    if (!root) return undefined;

    const textNodes = () => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const out = []; let n;
      while ((n = w.nextNode())) out.push(n);
      return out;
    };

    // Switching back to English: restore every node we changed.
    if (lang === "en") {
      textNodes().forEach((node) => {
        const o = originals.current.get(node);
        if (o != null && node.textContent !== o) node.textContent = o;
      });
      return undefined;
    }
    if (!serverOk) return undefined; // the translate endpoint needs auth

    const cache = loadCache();
    let observer = null;
    let cancelled = false;

    const apply = (pending) => {
      if (!pending.length || !observer) return;
      observer.disconnect();
      pending.forEach(({ node, tr }) => { if (node.isConnected && node.textContent !== tr) node.textContent = tr; });
      if (!cancelled) observer.observe(root, { childList: true, subtree: true, characterData: true });
    };

    const pass = async () => {
      const dict = cache[lang] || {};
      const pending = []; const toFetch = new Set();
      textNodes().forEach((node) => {
        if (skippable(node)) return;
        const cur = node.textContent;
        if (cur == null) return;
        const known = originals.current.get(node);
        if (known != null && dict[known] === cur) return; // already showing our translation
        const src = cur; // English: first sighting, or React reset it
        if (!worth(src)) return;
        originals.current.set(node, src);
        if (dict[src] != null) pending.push({ node, tr: dict[src] });
        else toFetch.add(src);
      });
      apply(pending);

      if (fetching.current || toFetch.size === 0) return;
      const batch = Array.from(toFetch).slice(0, 60);
      fetching.current = true;
      try {
        const r = await translateApi({ texts: batch, targetLang: lang, targetName: langName(lang) });
        if (!cancelled && Array.isArray(r?.translations) && r.translations.length === batch.length) {
          cache[lang] = cache[lang] || {};
          batch.forEach((src, i) => { cache[lang][src] = r.translations[i]; });
          saveCache(cache);
          onCharge?.();
          schedule(); // re-pass to apply the freshly cached batch
        }
      } catch { /* 402 short / 503 no key — keep English silently */ }
      finally { fetching.current = false; }
    };

    const schedule = () => { clearTimeout(timer.current); timer.current = setTimeout(pass, 350); };

    observer = new MutationObserver(() => schedule());
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    schedule();

    return () => { cancelled = true; clearTimeout(timer.current); if (observer) observer.disconnect(); };
  }, [uiLang, serverOk, onCharge]);

  return null;
}

// Translate a single piece of user content (post/comment) on demand. Returns the
// translated string, using and updating the same localStorage cache. Throws on
// 402/503 so callers can surface "add funds" / keep the original.
export async function translateOne(text, lang, onCharge) {
  const l = (lang || "en").toLowerCase();
  const s = (text || "").trim();
  if (!s || l === "en") return text;
  const cache = loadCache();
  if (cache[l] && cache[l][s] != null) return cache[l][s];
  const r = await translateApi({ texts: [s], targetLang: l, targetName: langName(l) });
  if (!Array.isArray(r?.translations) || r.translations[0] == null) throw new Error("Translation unavailable");
  cache[l] = cache[l] || {}; cache[l][s] = r.translations[0]; saveCache(cache);
  onCharge?.();
  return r.translations[0];
}
