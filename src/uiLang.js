// The pure half of the display-language feature: what is worth translating, how
// a string with numbers in it becomes ONE template, and the on-device cache.
// `autoTranslate.js` walks the page with these; the server (`/api/economy/uitext/`)
// holds the languages and the shared translations. Imports nothing, so it runs
// under plain node.

export const LANG_KEY = "mcz_ui_lang";       // { code, own, flag, rtl } of the chosen language
export const CACHE_KEY = "mcz_ui_text";      // { [code]: { [english template]: translated template } }
export const MAX_LEN = 240;
const CACHE_MAX = 6000;                        // strings kept per language on the device

const NUM = /\d+(?:[.,:]\d+)*/g;

/** Short, and with words in it. Numbers, emoji, money and single letters are not sent anywhere. */
export function worth(s) {
  const t = String(s || "").trim();
  return t.length >= 2 && t.length <= MAX_LEN && /\p{L}{2,}/u.test(t);
}

/**
 * "12 plays" and "13 plays" are one sentence. Numbers come out as {0}, {1}… so
 * the sentence is translated once however many values it is shown with — a
 * counter that ticks would otherwise be a new string every second.
 */
export function toTemplate(text) {
  const nums = [];
  const template = String(text).replace(NUM, (m) => { nums.push(m); return `{${nums.length - 1}}`; });
  return { template, nums };
}

/** Put the numbers back. Null when the translation dropped or invented a slot — then English stays. */
export function fromTemplate(translated, nums) {
  const seen = new Set();
  let bad = false;
  const out = String(translated).replace(/\{(\d+)\}/g, (_, i) => {
    const n = Number(i);
    if (n >= nums.length) { bad = true; return ""; }
    seen.add(n);
    return nums[n];
  });
  return bad || seen.size !== nums.length ? null : out;
}

/** The text of a node as: leading space, the part to translate, trailing space. */
export function splitSpace(text) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(String(text));
  return { lead: m[1], core: m[2], tail: m[3] };
}

/** Add translations to a language's cache, dropping the oldest past the cap. Returns a new object. */
export function addToCache(cache, code, pairs) {
  const merged = { ...(cache[code] || {}), ...pairs };
  const keys = Object.keys(merged);
  const trimmed = keys.length > CACHE_MAX ? Object.fromEntries(keys.slice(keys.length - CACHE_MAX).map((k) => [k, merged[k]])) : merged;
  return { ...cache, [code]: trimmed };
}

/** A stored language choice, or null for English / anything unreadable. */
export function cleanChoice(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.code !== "string" || !raw.code || raw.code === "en") return null;
  return { code: raw.code.slice(0, 12), own: String(raw.own || raw.code).slice(0, 60), flag: String(raw.flag || "🌐").slice(0, 16), rtl: !!raw.rtl };
}

/** Does the picker's search box match this language (English name, own name or code)? */
export function langMatches(lang, q) {
  const s = String(q || "").trim().toLowerCase();
  return !s || [lang.name, lang.own, lang.code].some((v) => String(v || "").toLowerCase().includes(s));
}
