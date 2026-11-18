// Does any tab make a phone scroll sideways? Opens every tab in App.jsx's TABS at each screen size and names the
// element that ESCAPES its parent past the right edge (not every descendant of it), skipping anything inside its own
// sideways scroller (a tab strip, a timeline) because that does not move the page.
//
//   node .claude/skills/run/width-audit.mjs                       # every tab at 320, 360, 412, 740 (landscape), 768
//   WIDTHS=320 FONT=125 node .claude/skills/run/width-audit.mjs  # one size, text turned up to 125%
//   TABS=bodiez,viewz node .claude/skills/run/width-audit.mjs     # just these tabs
//
// Exit code 1 when any tab scrolls sideways. It only sees each tab's FIRST screen as `corey` (seed.py) — a card
// that appears after an action (BodieZ's "Session ended") needs a flow of its own; copy the measure() below.
import fs from "node:fs";
import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const SIZES = { 320: 640, 360: 800, 390: 844, 412: 915, 740: 360, 768: 1024, 1280: 900 };
const widths = (process.env.WIDTHS || "320,360,412,740,768").split(",").map(Number);
const only = (process.env.TABS || "").split(",").filter(Boolean);
const FONT = Number(process.env.FONT || 100);
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
    const over = m.sw > m.vw + 1;
    if (over) here++;
    console.log(`${over ? "✗" : "✓"} ${W} ${k.padEnd(24)} ${m.sw}/${m.vw}`);
    for (const o of m.out.slice(0, 6)) console.log(`     ${o}`);
  }
  console.log(`== ${W}x${H} text ${FONT}%: ${here} of ${keys.length} tabs scroll sideways`);
  bad += here;
  await page.context().close();
}
await browser.close();
process.exit(bad ? 1 : 0);
