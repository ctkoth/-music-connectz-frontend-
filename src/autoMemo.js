// The remembered-choice paradigm, applied to every <select> in the app.
//
// A dropdown opens on what the member last picked there, and says so when one
// other value is their habit (>= 65% of >= 5 uses). It is a DOCUMENT-level
// behaviour on purpose: a rule that has to be wired into each form is a rule
// the next form forgets, which is how this app ended up with selects that
// defaulted to R&B for somebody who has sent twenty Drill takes.
//
// What it will NOT touch — each of these is a way an autofill does harm:
//   • a select with an empty-value option ("All skillz", "Pick a post…",
//     "Any"): that is a FILTER or an item picker, and silently pre-filtering a
//     list to last week's choice hides things; ids don't carry across lists.
//   • who-can-see-this / privacy selects: defaulting to Public because the last
//     post was public is an accident, not a convenience.
//   • selects that save on change (settings, report reasons): an autofill would
//     fire the save. These carry data-nomemo.
//   • selects a screen already wires itself (data-memo="own"): one writer.
//
// Per device, localStorage, every access guarded — a convenience only.
import { recall, remember, suggest } from "./remember.js";

const SKIP_LABEL = /who can|visib|privacy|audience|see this|open this|report|reason/i;

// Pure: may a select with these option values be autofilled at all?
export function eligible(values) {
  return values.length > 1 && !values.includes("");
}

const textOf = (el) => (el || "").replace(/\s+/g, " ").trim();

function labelFor(sel) {
  const aria = sel.getAttribute("aria-label");
  if (aria) return textOf(aria);
  if (sel.id) {
    const l = document.querySelector(`label[for="${CSS.escape(sel.id)}"]`);
    if (l) return textOf(l.textContent);
  }
  const wrap = sel.closest("label");
  if (wrap) {
    const c = wrap.cloneNode(true);
    c.querySelectorAll("select,option,button").forEach((n) => n.remove());
    return textOf(c.textContent);
  }
  return "";
}

function keyOf(sel) {
  const label = labelFor(sel);
  if (!label || SKIP_LABEL.test(label)) return null;
  const sig = [...sel.options].map((o) => o.value).join("|");
  let h = 0;
  for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
  return `auto:${label.slice(0, 40)}:${(h >>> 0).toString(36)}`;
}

function usable(sel) {
  if (sel.disabled || sel.multiple || sel.closest("[data-nomemo],[data-memo]") || sel.dataset.nomemo != null) return false;
  if (!eligible([...sel.options].map((o) => o.value))) return false;
  return keyOf(sel) !== null;
}

let setting = false;
function setValue(sel, v) {
  const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  setting = true;
  try {
    desc.set.call(sel, v);
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  } finally { setting = false; }
}

const state = new WeakMap();   // select -> { touched, initial }
const hints = new WeakMap();   // select -> button

function refreshHint(sel) {
  const key = keyOf(sel);
  const s = key && suggest(key, sel.value, [...sel.options].map((o) => o.value));
  let btn = hints.get(sel);
  if (!s) { if (btn) btn.hidden = true; return; }
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "re-link mt-0.5 block text-left text-[10px] text-mcz-cyan/80";
    btn.addEventListener("click", () => { const v = btn.dataset.v; remember(keyOf(sel) || "", v); setValue(sel, v); refreshHint(sel); });
    sel.insertAdjacentElement("afterend", btn);
    hints.set(sel, btn);
  }
  const opt = [...sel.options].find((o) => o.value === s.value);
  btn.dataset.v = s.value;
  btn.textContent = `You usually pick ${textOf(opt?.textContent) || s.value} (${Math.round(s.share * 100)}% of ${s.n}) — use it`;
  btn.hidden = false;
}

function scan(root = document) {
  root.querySelectorAll("select").forEach((sel) => {
    if (!usable(sel)) return;
    let st = state.get(sel);
    if (!st) { st = { touched: false, initial: sel.value }; state.set(sel, st); }
    if (!st.touched && sel.value === st.initial) {
      const key = keyOf(sel);
      const want = recall(key, [...sel.options].map((o) => o.value));
      if (want != null && want !== sel.value) { setValue(sel, want); st.initial = sel.value; }
    }
    refreshHint(sel);
  });
}

let queued = false;
const queue = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; try { scan(); } catch { /* never break the page */ } });
};

export function startAutoMemo() {
  if (typeof document === "undefined" || window.__mczAutoMemo) return;
  window.__mczAutoMemo = true;
  document.addEventListener("change", (e) => {
    const sel = e.target;
    if (setting || !(sel instanceof HTMLSelectElement) || !usable(sel)) return;
    const st = state.get(sel) || { initial: sel.value };
    st.touched = true;
    state.set(sel, st);
    remember(keyOf(sel), sel.value);
    refreshHint(sel);
  }, true);
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
  queue();
}
