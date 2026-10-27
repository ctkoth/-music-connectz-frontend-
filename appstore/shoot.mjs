// App Store screenshots from the REAL app against a REAL local API.
//
//   .claude/skills/run/up.sh                      # stack + seeded login
//   (backend) python manage.py shell < appstore/seed_shots.py
//   node appstore/shoot.mjs iphone|ipad
//
// An earlier version stubbed the API with fixtures; five of seven screens had
// drifted into "hit a snag" error cards within weeks. Live data cannot drift.
// CSS size x scale = the pixel size App Store Connect accepts without resampling.
import fs from "node:fs";
import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const DEVICES = {
  iphone: { w: 440,  h: 956,  dpr: 3, dir: "iphone-6.9", touch: true  },   // 1320x2868
  ipad:   { w: 1032, h: 1376, dpr: 2, dir: "ipad-13",    touch: true  },   // 2064x2752
};
const D = DEVICES[process.argv[2] || "iphone"];
const BASE = process.env.MCZ_APP || "http://localhost:5174";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, "screenshots", D.dir);
fs.mkdirSync(OUT, { recursive: true });

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: D.w, height: D.h }, deviceScaleFactor: D.dpr,
                                    isMobile: D.touch, hasTouch: D.touch });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder(/Username, email/).fill("corey");
await page.getByPlaceholder("Password").fill("pw12345!");
await page.getByRole("button", { name: /log ?in/i }).first().click();
await page.waitForTimeout(3500);

// [file, route slug (trailing z dropped), text to scroll into view]
const shots = [
  ["01-feed",       "post",       "Cover art for the EP"],
  ["02-collab",     "collab",     "Midnight — topline"],
  ["03-battle",     "battle",     "Best 16 bars"],
  ["04-occ",        "occ",        null],
  ["05-profile",    "profile",    null],
  ["06-membership", "membership", null],
];
for (const [name, slug, anchor] of shots) {
  await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  if (anchor) {
    const el = page.getByText(anchor).first();
    await el.evaluate((n) => { n.scrollIntoView({ block: "start" }); window.scrollBy(0, -230); }, null, { timeout: 3000 }).catch(() => {});
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  const snag = await page.getByText(/hit a snag/i).count();
  console.log(`${name}.png  ${page.url().replace(BASE, "")}${snag ? "   <-- ERROR CARD" : ""}`);
}
if (errors.length) console.log("page errors:", [...new Set(errors)].join(" | "));
await browser.close();
