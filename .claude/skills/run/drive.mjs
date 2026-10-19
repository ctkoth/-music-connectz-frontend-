// Log in, land on a tab, screenshot it, and report what the console said.
//
//   node .claude/skills/run/drive.mjs <user> <tab-slug> [out.png]
//   node .claude/skills/run/drive.mjs corey venue
//
// Copy and edit this to drive a flow. The login dance and the browser wiring
// are the parts worth not rewriting: Playwright is global and CommonJS, so it
// needs a default import from an absolute path, and the chromium binary is not
// where PLAYWRIGHT_BROWSERS_PATH suggests.
import fs from "node:fs";
import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const { chromium } = pw;
const [user = "corey", slug = "venue", out = `${slug}.png`] = process.argv.slice(2);
const BASE = process.env.MCZ_APP || "http://localhost:5174";
const PASSWORD = process.env.MCZ_PASSWORD || "pw12345!";

// /opt/pw-browsers/chromium is a DIRECTORY, not the binary, and the version in
// the path moves — so find it rather than hardcoding a number.
const root = "/opt/pw-browsers";
const dir = fs.readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
const executablePath = path.join(root, dir, "chrome-linux", "chrome");

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 900, height: 1600 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

// Straight to /login: "/" is a marketing page logged out, and OnboardZ once a
// new account is in. Neither is the app.
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder(/Username, email/).fill(user);   // field is `identifier`
await page.getByPlaceholder("Password").fill(PASSWORD);
await page.getByRole("button", { name: /log ?in/i }).first().click();
await page.waitForTimeout(3500);

// Tab slugs drop the trailing z — venuez lives at /venue. A wrong slug
// redirects to / and lands on the account's default tab, which looks like the
// route is missing.
await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: out, fullPage: true });

console.log(`url    ${page.url()}`);
console.log(`shot   ${out}   <- open it; a blank frame is a failure to launch`);
console.log(`---\n${(await page.innerText("body")).slice(0, 1200)}`);
// Connection resets are the dev server being noisy, not the app being wrong.
const real = errors.filter((e) => !e.includes("ERR_CONNECTION_RESET"));
console.log(`---\nconsole errors: ${real.length ? `\n  ${real.join("\n  ")}` : "none"}`);

await browser.close();
process.exit(real.length ? 1 : 0);
