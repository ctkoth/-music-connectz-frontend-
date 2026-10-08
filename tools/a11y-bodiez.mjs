// Accessibility audit of the standalone BodieZ app, on a phone-sized touch
// screen — the nearest thing to TalkBack that runs without a device.
//
//   MCZ_API=http://localhost:8000 VITE_API_BASE=http://localhost:5175 npm run dev:bodiez   (one terminal)
//   node tools/a11y-bodiez.mjs [user] [password]                                          (another)
//
// What it IS: axe-core (WCAG 2.1 A/AA + best practice) on every screen a member
// uses, plus three checks axe does not make — tap-target size against Android's
// 48dp guidance, buttons and inputs a screen reader would read out with no
// name, and images with no alt.
// What it is NOT: TalkBack. Reading order, what a swipe lands on and how it
// sounds still need a person with TalkBack on a phone — see
// standalone/bodiez/ACCESSIBILITY.md for that checklist.
//
// Exits 1 on any serious/critical axe violation, any unnamed control or any
// tap target under the floor, so it can gate a Play submission.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const [user = "corey", password = "pw12345!"] = process.argv.slice(2);
const BASE = process.env.MCZ_BODIEZ || "http://localhost:5175";
const MIN_TAP = 44;   // CSS px; Android's 48dp is ~48px, 44 is the WCAG-friendly floor we hold

const root = "/opt/pw-browsers";
const dir = fs.readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
const browser = await pw.chromium.launch({ executablePath: path.join(root, dir, "chrome-linux", "chrome") });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());

async function audit(label) {
  // The app paints its background as a gradient, which axe cannot read, so it
  // assumes WHITE under translucent chips and reports contrast failures that
  // are not real (and misses ones that are). A solid stand-in of the gradient's
  // base colour makes its arithmetic about what a person actually sees.
  await page.addStyleTag({ content: "html,body{background-image:none !important;background:#07060d !important}" });
  await page.addScriptTag({ content: AXE }).catch(() => {});
  const res = await page.evaluate(async (floor) => {
    const axeRes = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    });
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
    const nameOf = (el) => (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") && "labelled"
      || el.getAttribute("title") || el.innerText || el.value || "").trim()
      || (el.querySelector("img[alt]:not([alt=''])") ? "img" : "");
    const small = [], unnamed = [];
    for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab]")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      const tag = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${(nameOf(el) || el.placeholder || "").slice(0, 28)}" <${(el.outerHTML.match(/class="([^"]{0,60})/) || [])[1] || ""}>`;
      // A checkbox/radio is tapped through its <label>; judge the label.
      const hit = el.type === "checkbox" || el.type === "radio" ? (el.closest("label") || el).getBoundingClientRect() : r;
      if (hit.height < floor || hit.width < floor) small.push(`${tag} ${Math.round(hit.width)}×${Math.round(hit.height)}`);
      const hasLabel = nameOf(el) || (el.labels && el.labels.length) || el.getAttribute("aria-label");
      if (!hasLabel) unnamed.push(tag);
    }
    return {
      violations: axeRes.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length,
        sample: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) })),
      small, unnamed,
      noAlt: [...document.images].filter((i) => visible(i) && !i.hasAttribute("alt")).map((i) => i.src.split("/").pop()),
      lang: document.documentElement.lang || "(none)", title: document.title,
    };
  }, MIN_TAP);
  return { label, ...res };
}

const results = [];
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
results.push(await audit("Sign in"));

await page.getByPlaceholder(/Username, email/).fill(user);
await page.getByPlaceholder("Password").fill(password);
await page.getByRole("button", { name: /log ?in/i }).first().click();
await page.waitForTimeout(3500);

for (const tab of ["Today", "Scheduler", "BodyMap", "Coach", "Goals", "Recovery", "Progress", "StepZ"]) {
  await page.getByRole("button", { name: tab, exact: true }).click().catch(() => {});
  await page.waitForTimeout(900);
  if (tab === "Today") {
    await page.getByText("What I can do").click().catch(() => {});
    await page.getByRole("button", { name: /Log a past workout/ }).click().catch(() => {});
    await page.waitForTimeout(400);
  }
  results.push(await audit(tab));
  if (tab === "Today") {
    // The exercise picker is a combobox; audit it open, and its create form.
    const box = page.getByRole("combobox", { name: "Exercise" });
    if (await box.count()) {
      await box.fill("zzz custom");
      await page.waitForTimeout(300);
      results.push(await audit("Today — picker open"));
      await page.getByRole("listbox").getByRole("option", { name: /Create/ }).click().catch(() => {});
      await page.waitForTimeout(300);
      results.push(await audit("Today — new custom exercise"));
      await box.fill("").catch(() => {});
    }
  }
}

let bad = 0;
for (const r of results) {
  const hard = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const soft = r.violations.filter((v) => !(v.impact === "serious" || v.impact === "critical"));
  bad += hard.length + r.unnamed.length + r.small.length + r.noAlt.length;
  console.log(`\n── ${r.label}  (lang ${r.lang})`);
  for (const v of hard) console.log(`  ✖ ${v.impact} ${v.id} ×${v.n}: ${v.help}  e.g. ${v.sample.join(" | ")}`);
  for (const v of soft) console.log(`  · ${v.impact || "minor"} ${v.id} ×${v.n}: ${v.help}`);
  if (r.unnamed.length) console.log(`  ✖ no accessible name (${r.unnamed.length}): ${r.unnamed.slice(0, 6).join(" ; ")}`);
  if (r.small.length) console.log(`  ✖ tap target under ${MIN_TAP}px (${r.small.length}): ${r.small.slice(0, 6).join(" ; ")}`);
  if (r.noAlt.length) console.log(`  ✖ image with no alt: ${r.noAlt.join(", ")}`);
  if (!hard.length && !r.unnamed.length && !r.small.length && !r.noAlt.length) console.log("  ✓ clean");
}
console.log(`\n${bad ? `✖ ${bad} blocking finding(s)` : "✓ no blocking findings"} — TalkBack on a real phone is still required (standalone/bodiez/ACCESSIBILITY.md).`);
await browser.close();
process.exit(bad ? 1 : 0);
