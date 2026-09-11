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

// Close onboard modal if present
const closeBtn = page.locator("button:has-text('✕')").first();
if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
  await closeBtn.click();
  await page.waitForTimeout(500);
}

// Now look for tabs - they might be in a different area
const buttons = await page.locator("button").all();
console.log("Available buttons:");
for (let i = 0; i < Math.min(20, buttons.length); i++) {
  const text = await buttons[i].textContent();
  console.log(`  ${i}: ${text.trim().slice(0, 40)}`);
}

// Try keyboard navigation to GroupZ
await page.keyboard.press("g");
await page.waitForTimeout(1000);
await page.screenshot({ path: "groupz_test.png", fullPage: true });
console.log(`url after keyboard: ${page.url()}`);

const real = errors.filter((e) => !e.includes("ERR_CONNECTION_RESET"));
console.log(`---\nconsole errors: ${real.length ? `\n  ${real.join("\n  ")}` : "none"}`);

await browser.close();
