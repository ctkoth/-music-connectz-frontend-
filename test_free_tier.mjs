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

// Login as free user
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder(/Username, email/).fill("freeuser");
await page.getByPlaceholder("Password").fill(PASSWORD);
await page.getByRole("button", { name: /log ?in/i }).first().click();
await page.waitForTimeout(2000);

// Navigate to GroupZ
await page.goto(`${BASE}/group`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// Check for tier limit display (should be 0/1 initially for free user)
const text = await page.innerText("body").catch(() => "");
console.log("Free tier user - checking tier limit display:");
console.log(text.match(/\d+\/\d+ custom groups/)?.[0] || "Not found");

// Try to create a custom group
const nameInput = page.locator('input[placeholder*="custom group name"]');
await nameInput.fill("🎶 My Music Group");

const iconInput = page.locator('input[placeholder*="Icon"]');
await iconInput.fill("🎶");

const createBtn = page.getByRole("button", { name: "Create" }).last();
await createBtn.click();
await page.waitForTimeout(2000);

await page.screenshot({ path: "groupz_free.png", fullPage: true });
const textAfter = await page.innerText("body").catch(() => "");

console.log("\nAfter creating first group:");
console.log(textAfter.match(/\d+\/\d+ custom groups/)?.[0] || "Not found");

// Try to create another (should fail or be disabled)
const nameInput2 = page.locator('input[placeholder*="custom group name"]');
await nameInput2.fill("🎵 Another Group");
await page.waitForTimeout(500);

const createBtn2 = page.getByRole("button", { name: "Create" }).last();
const isDisabled = await createBtn2.isDisabled();
console.log(`\nCreate button for second group is disabled: ${isDisabled}`);

const real = errors.filter((e) => !e.includes("ERR_CONNECTION_RESET"));
console.log(`\nconsole errors: ${real.length ? real.join("\n  ") : "none"}`);

await browser.close();
