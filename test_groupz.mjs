import fs from "node:fs";
import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const { chromium } = pw;
const BASE = "http://localhost:5174";
const PASSWORD = "pw12345!";

const root = "/opt/pw-browsers";
const dir = fs.readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
const executablePath = path.join(root, dir, "chrome-linux", "chrome");

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 900, height: 1600 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

// Login
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder(/Username, email/).fill("corey");
await page.getByPlaceholder("Password").fill(PASSWORD);
await page.getByRole("button", { name: /log ?in/i }).first().click();
await page.waitForTimeout(3500);

// Go to groupz tab
await page.goto(`${BASE}/groupz`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "groupz_test.png", fullPage: true });

console.log(`url    ${page.url()}`);
console.log(`shot   groupz_test.png   <- open it; a blank frame is a failure to launch`);
console.log(`---\n${(await page.innerText("body")).slice(0, 2000)}`);
const real = errors.filter((e) => !e.includes("ERR_CONNECTION_RESET"));
console.log(`---\nconsole errors: ${real.length ? `\n  ${real.join("\n  ")}` : "none"}`);

await browser.close();
process.exit(real.length ? 1 : 0);
