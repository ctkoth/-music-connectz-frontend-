// Width audit: for each tab at each width, what sticks out past the screen (not clipped by a scroller).
import fs from "node:fs"; import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
const { chromium } = pw;
const root = "/opt/pw-browsers"; const dir = fs.readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
const executablePath = ["chrome-linux64", "chrome-linux"].map((d) => path.join(root, dir, d, "chrome")).find((p) => fs.existsSync(p));
const tabs = (process.env.TABS || "").split(",").filter(Boolean);
const widths = (process.env.WIDTHS || "360,390,412,768,1280,1920").split(",").map(Number);
const browser = await chromium.launch({ executablePath });
const measure = () => {
  const vw = document.documentElement.clientWidth;
  const clipped = (el) => {       // is the overflow hidden inside a scroller/clipper that itself fits?
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(hidden|auto|scroll|clip)/.test(cs.overflowX)) { const r = p.getBoundingClientRect(); if (r.right <= vw + 1 && r.left >= -1) return true; }
    }
    return false;
  };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    if ((b.right > vw + 1 || b.left < -1) && !clipped(el)) {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
      out.push(`${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? "").toString().split(" ").slice(0, 4).join(".")} L${Math.round(b.left)} R${Math.round(b.right)} "${(el.innerText || "").slice(0, 30).replace(/\n/g, " ")}"`);
    }
  }
  return { vw, scrollW: document.documentElement.scrollWidth, offenders: out.slice(0, 6), n: out.length };
};
for (const w of widths) {
  const phone = w < 700;
  const ctx = await browser.newContext({ viewport: { width: w, height: phone ? 800 : 900 }, isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5174/login", { waitUntil: "networkidle" });
  await page.getByPlaceholder(/Username, email/).fill("corey");
  await page.getByPlaceholder("Password").fill("pw12345!");
  await page.getByRole("button", { name: /log ?in/i }).first().click();
  await page.waitForTimeout(3000);
  for (const t of tabs) {
    await page.goto(`http://localhost:5174/${t}`, { waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(1500);
    const r = await page.evaluate(measure);
    const bad = r.scrollW > r.vw + 1 || r.n > 0;
    console.log(`${w} /${t} ${bad ? `OVERFLOW scrollW=${r.scrollW} n=${r.n}\n   ${r.offenders.join("\n   ")}` : "ok"}`);
    if (process.env.INFO) {
      // the app-info popup: the date/title button in the header
      const btn = page.locator("header button, [data-tour='app-info']").filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ }).first();
      if (await btn.count()) {
        await btn.click().catch(() => {}); await page.waitForTimeout(700);
        const m = await page.evaluate(measure);
        console.log(`${w} /${t} [info popup] ${m.n ? `OVERFLOW n=${m.n}\n   ${m.offenders.join("\n   ")}` : "ok"}`);
        if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-${w}.png` });
        await page.keyboard.press("Escape"); await page.mouse.click(5, 5).catch(() => {});
      } else console.log(`${w} /${t} [info popup] button not found`);
    }
  }
  await ctx.close();
}
await browser.close();
