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

// Wait for page to load
await page.waitForLoadState("networkidle");

// Find and click GroupZ tab button
const groupzButton = await page.getByRole("button", { name: /GroupZ/ });
if (await groupzButton.isVisible()) {
  await groupzButton.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "groupz_test.png", fullPage: true });
  console.log(`url    ${page.url()}`);
  console.log(`---\n${(await page.innerText("body")).slice(0, 3000)}`);
} else {
  console.log("GroupZ button not found!");
  await page.screenshot({ path: "groupz_test.png", fullPage: true });
}

const real = errors.filter((e) => !e.includes("ERR_CONNECTION_RESET"));
console.log(`---\nconsole errors: ${real.length ? `\n  ${real.join("\n  ")}` : "none"}`);

await browser.close();
process.exit(real.length ? 1 : 0);
