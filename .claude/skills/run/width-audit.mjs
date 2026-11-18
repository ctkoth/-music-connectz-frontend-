// Does any tab make a phone scroll sideways? Opens every tab in App.jsx's TABS at each screen size and names the
// element that ESCAPES its parent past the right edge (not every descendant of it), skipping anything inside its own
// sideways scroller (a tab strip, a timeline) because that does not move the page.
//
//   node .claude/skills/run/width-audit.mjs                       # every tab at 320, 360, 412, 740 (landscape), 768
//   WIDTHS=320 FONT=125 node .claude/skills/run/width-audit.mjs  # one size, text turned up to 125%
//   TABS=bodiez,viewz node .claude/skills/run/width-audit.mjs     # just these tabs
//
//   TAPS=0 node .claude/skills/run/width-audit.mjs               # first screens only (faster)
//
// Exit code 1 when any tab scrolls sideways. Each tab is measured on its first screen as `corey` (seed.py), then
// again after every tap that only REVEALS something: each closed <details> opened, and each disclosure
// (`aria-expanded="false"`) and tab (`role="tab"`) pressed, up to TAP_MAX per tab. Nothing that could change data
// is ever pressed. Plain buttons count only when their words start like a reveal (REVEAL). A control whose words read like delete, send, pay, post, log, save, buy, start or end is
// skipped (DANGER below), and a tap that navigates is undone. A card that only appears after a real action
// (BodieZ's "Session ended") needs its own flow: `width-flows.mjs`.
import fs from "node:fs";
import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const SIZES = { 320: 640, 360: 800, 390: 844, 412: 915, 740: 360, 768: 1024, 1280: 900 };
const widths = (process.env.WIDTHS || "320,360,412,740,768").split(",").map(Number);
const only = (process.env.TABS || "").split(",").filter(Boolean);
const FONT = Number(process.env.FONT || 100);
const TAPS = process.env.TAPS !== "0";
const TAP_MAX = Number(process.env.TAP_MAX || 25);
// Most of this app's expanders are plain buttons, not aria-expanded ones, so a button whose words START like a
// reveal counts too ("More", "Show the detail", "What is this, and why?", "Details", "Filter by date"…).
const REVEAL = /^(more|show|see|what|why|how|details|view|filter|options|help|info|expand|all |everything|\+ more|▸|▾|ⓘ)/i;
const DANGER = /delete|remove|trash|send|pay|buy|fund|post|publish|log |log$|save|start|end |finish|submit|upgrade|report|block|leave|cancel|sign out|log out|accept|decline|claim|redeem|share|invite|follow|rate|vote|apply|update|replace/i;
const BASE = process.env.MCZ_APP || "http://localhost:5174";
const root = "/opt/pw-browsers";
const dir = fs.readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
const executablePath = ["chrome-linux64", "chrome-linux"].map((d) => path.join(root, dir, d, "chrome")).find((p) => fs.existsSync(p));

const browser = await pw.chromium.launch({ executablePath });
async function signedIn(W, H) {
  const phone = W < 1000;
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1 })).newPage();
  // Text scaling: every rem grows, which is what a narrower screen does too.
  if (FONT !== 100) await page.addInitScript((f) => document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style"); s.textContent = `html{font-size:${f}% !important}`; document.head.appendChild(s);
  }), FONT);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder(/Username, email/).fill(process.env.MCZ_USER || "corey");
  await page.getByPlaceholder("Password").fill(process.env.MCZ_PASSWORD || "pw12345!");
  await page.getByRole("button", { name: /log ?in/i }).first().click();
  await page.waitForTimeout(3000);
  return page;
}

const app = fs.readFileSync(new URL("../../../src/App.jsx", import.meta.url), "utf8");
let keys = [...app.matchAll(/^\s+\{ key: "([a-z0-9_]+)"/gm)].map((m) => m[1]);
if (only.length) keys = keys.filter((k) => only.includes(k));
const slug = (k) => (k === "toolz" ? "" : k.endsWith("z") && k.length > 2 ? k.slice(0, -1) : k);

const measure = (p) => p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const scrollsX = (el) => /(auto|scroll|hidden|clip)/.test(getComputedStyle(el).overflowX);
  const clipped = (el) => { for (let q = el.parentElement; q && q !== document.body; q = q.parentElement) if (scrollsX(q)) return true; return false; };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!el.checkVisibility?.()) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1) continue;
    const pr = el.parentElement?.getBoundingClientRect();
    if (pr && pr.right > vw + 1) continue;
    if (clipped(el) || getComputedStyle(el).position === "fixed") continue;
    out.push(`${Math.round(r.right)}px <${el.tagName.toLowerCase()} class="${String(el.className?.baseVal ?? el.className).slice(0, 120)}">`
      + `${el.closest("[data-tour]") ? ` [${el.closest("[data-tour]").getAttribute("data-tour")}]` : ""} “${(el.innerText || "").replace(/\s+/g, " ").slice(0, 50)}”`);
  }
  return { vw, sw: document.documentElement.scrollWidth, out };
});

let bad = 0;
for (const W of widths) {
  const H = SIZES[W] || 800;
  const page = await signedIn(W, H);
  let here = 0;
  for (const k of keys) {
    try { await page.goto(`${BASE}/${slug(k)}`, { waitUntil: "networkidle", timeout: 20000 }); } catch { /* a polling page: measure anyway */ }
    await page.waitForTimeout(1000);
    const m = await measure(page);
    let over = m.sw > m.vw + 1;
    const lines = [];
    let tapped = 0;
    for (const o of m.out.slice(0, 6)) lines.push(`     ${o}`);
    if (TAPS && !over) {
      const home = page.url();
      // Every closed <details>, opened at once — opening reveals and changes nothing.
      const opened = await page.evaluate(() => {
        let n = 0;
        for (const d of document.querySelectorAll("details:not([open])")) if (d.checkVisibility?.()) { d.open = true; n++; }
        return n;
      });
      tapped += opened;
      if (opened) {
        await page.waitForTimeout(400);
        const t = await measure(page);
        if (t.sw > t.vw + 1) { over = true; lines.push(`   after opening ${opened} <details>:`, ...t.out.slice(0, 4).map((o) => `     ${o}`)); }
      }
      // Each disclosure and tab, one at a time, found afresh each round (a panel that opens can add more).
      for (let i = 0; i < TAP_MAX && !over; i++) {
        const label = await page.evaluate(([i, danger, reveal]) => {
          const re = new RegExp(danger, "i"), rv = new RegExp(reveal, "i");
          const words = (el) => (el.innerText || el.getAttribute("aria-label") || "").trim();
          const cands = [...document.querySelectorAll('[aria-expanded="false"], [role="tab"][aria-selected="false"], button')]
            .filter((el) => el.checkVisibility?.() && !el.disabled && !re.test(words(el))
              && (el.tagName !== "BUTTON" || el.hasAttribute("aria-expanded") || el.getAttribute("role") === "tab" || rv.test(words(el))));
          const el = cands[i];
          if (!el) return null;
          el.click();
          return (el.innerText || el.getAttribute("aria-label") || el.tagName).replace(/\s+/g, " ").slice(0, 40);
        }, [i, DANGER.source, REVEAL.source]);
        if (label == null) break;
        tapped++;
        await page.waitForTimeout(500);
        if (page.url() !== home) { await page.goto(home, { waitUntil: "networkidle" }).catch(() => {}); await page.waitForTimeout(600); continue; }
        const t = await measure(page);
        if (t.sw > t.vw + 1) { over = true; lines.push(`   after tapping “${label}”:`, ...t.out.slice(0, 4).map((o) => `     ${o}`)); }
      }
    }
    if (over) here++;
    console.log(`${over ? "✗" : "✓"} ${W} ${k.padEnd(24)} ${m.sw}/${m.vw}${TAPS ? `  · ${tapped} revealed` : ""}`);
    for (const l of lines) console.log(l);
  }
  console.log(`== ${W}x${H} text ${FONT}%: ${here} of ${keys.length} tabs scroll sideways`);
  bad += here;
  await page.context().close();
}
await browser.close();
process.exit(bad ? 1 : 0);
