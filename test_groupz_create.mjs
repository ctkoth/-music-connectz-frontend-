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
await page.waitForTimeout(2000);

// Navigate to GroupZ
await page.goto(`${BASE}/group`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// Find Custom section and fill in name
const inputs = await page.locator("input").all();
console.log("Found inputs, filling name field...");

// Find the name input (placeholder "New custom group name")
const nameInput = page.locator('input[placeholder*="custom group name"]');
await nameInput.fill("🎸 Guitar Gang");

// Find the icon input (placeholder "Icon (emoji)")
const iconInput = page.locator('input[placeholder*="Icon"]');
await iconInput.fill("🎸");

// Click Create button
const createBtn = page.getByRole("button", { name: "Create" }).last();
await createBtn.click();
await page.waitForTimeout(2000);

await page.screenshot({ path: "groupz_created.png", fullPage: true });
const text = await page.innerText("body").catch(() => "");

console.log(`---\n${text.slice(0, 2500)}`);

const real = errors.filter((e) => !e.includes("ERR_CONNECTION_RESET"));
console.log(`---\nconsole errors: ${real.length ? `\n  ${real.join("\n  ")}` : "none"}`);

await browser.close();
