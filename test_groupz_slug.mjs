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
console.log("Logging in...");
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByPlaceholder(/Username, email/).fill("corey");
await page.getByPlaceholder("Password").fill(PASSWORD);
await page.getByRole("button", { name: /log ?in/i }).first().click();
await page.waitForTimeout(2000);

// Navigate to GroupZ using correct slug (without the z)
console.log("Navigating to /group (GroupZ tab)...");
await page.goto(`${BASE}/group`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: "groupz_test.png", fullPage: true });

const url = page.url();
const text = await page.innerText("body").catch(() => "");

console.log(`url    ${url}`);
console.log(`shot   groupz_test.png`);
console.log(`---\n${text.slice(0, 3000)}`);

const real = errors.filter((e) => !e.includes("ERR_CONNECTION_RESET"));
console.log(`---\nconsole errors: ${real.length ? `\n  ${real.join("\n  ")}` : "none"}`);

await browser.close();
process.exit(real.length ? 1 : 0);
