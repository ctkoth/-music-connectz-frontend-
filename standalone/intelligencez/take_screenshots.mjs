// Takes the IntelligenceZ Play screenshots from the real shell build.
//
//   # API (placeholder AI keys so the screens show their ready state) and the shell:
//   cd $MCZ_BACKEND && GEMINI_API_KEY=local-fake ANTHROPIC_API_KEY=local-fake \
//     python manage.py shell < standalone/intelligencez/seed_screenshots.py   # (path in the frontend repo)
//   cd $MCZ_BACKEND && GEMINI_API_KEY=local-fake ANTHROPIC_API_KEY=local-fake python manage.py runserver 8010 --noreload &
//   cd $FRONTEND && MCZ_API=http://localhost:8010 VITE_API_BASE=http://localhost:5177 npm run dev:intelligencez &
//   python standalone/intelligencez/make_demo_song.py /tmp/song/"Larimer Nights (rough mix).wav"
//   SONG="/tmp/song/Larimer Nights (rough mix).wav" node standalone/intelligencez/take_screenshots.mjs
//
// 360x640 CSS px at device scale 3 is 1080x1920: a phone, in portrait, the size
// Play wants. Nothing here clicks Write it, Compose it or Send — there is no AI key,
// and the pieces on screen are the seeded rows (see seed_screenshots.py and
// play/intelligencez/README.md). The Master screens are a REAL run: the file goes in
// through the real file input and the engine masters it in a Worker.
import fs from "node:fs";
import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const { chromium } = pw;
const BASE = process.env.MCZ_APP || "http://localhost:5177";
const OUT = process.env.OUT || path.resolve("play/intelligencez/screenshots");
const SONG = process.env.SONG;
if (!SONG || !fs.existsSync(SONG)) throw new Error("SONG=<path to the demo WAV> is required");
fs.mkdirSync(OUT, { recursive: true });

// /opt/pw-browsers/chromium is a DIRECTORY and the version in the path moves.
const root = "/opt/pw-browsers";
const dir = fs.readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
const executablePath = path.join(root, dir, "chrome-linux", "chrome");

const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({
  viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => {
  await wait(700);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("shot", name);
};
// Put an element where it reads well: `at` is its top, as a fraction of the visible
// height above the tab bar (56px), so nothing sits under the fixed bar.
const place = async (locator, at = 0.12) => {
  await locator.first().evaluate((el, at) => {
    const bar = 56;
    const r = el.getBoundingClientRect();
    window.scrollBy(0, r.top - at * (window.innerHeight - bar));
  }, at);
  await wait(400);
};

// 01 — signed out
await page.goto(`${BASE}/#/login`, { waitUntil: "networkidle" });
await wait(600);
await shot("01-sign-in");

await page.getByPlaceholder(/Username, email/).fill("izreview");
await page.getByPlaceholder("Password").fill("pw12345!");
await page.getByRole("button", { name: /log ?in/i }).first().click();
await page.waitForSelector("text=Signed in as izreview", { timeout: 20000 });
await wait(2500);

// 02 — Home: what each app is and costs, before it is opened
await page.goto(`${BASE}/#/`);
await page.waitForSelector("text=free prompts left today", { timeout: 15000 });
await wait(800);
await shot("02-home");

// 03 — Write: a resume, the voice note, the brief typed, the price beside the button
await page.goto(`${BASE}/#/write`);
await page.waitForSelector('textarea[aria-label="What to write about"]', { timeout: 15000 });
await page.getByRole("button", { name: /Resume/ }).first().click();
const brief = page.locator('textarea[aria-label="What to write about"]');
await brief.fill(
  "Dana Whitfield, Denver, CO. Applying for: Studio Manager.\n" +
  "Larimer Street Studios, front-of-house and booking, 2021 to now. I book four rooms, run the weekly " +
  "session calendar and handle the invoices.\n" +
  "Brightline Recording, assistant engineer, 2018 to 2021. I set up sessions, tracked drums and vocals, " +
  "and kept the gear log.\n" +
  "B.A. Music Business, Metropolitan State University of Denver, 2018.\n" +
  "Skills: Pro Tools, Ableton Live, scheduling, invoicing, client communication.");
await brief.evaluate((el) => { el.scrollTop = 0; });   // fill() leaves a textarea scrolled to its end
await page.getByPlaceholder("Role you're applying for (optional)").fill("Studio Manager");
await page.getByRole("button", { name: /Write it/ }).waitFor();
await place(page.getByRole("group", { name: "What to write" }), 0.015);
await shot("03-write-resume");

// 04 — a written piece: the AI note, the [BRACKETED] blanks note, edit, copy, report
await page.goto(`${BASE}/#/write`);
await page.getByRole("button", { name: /^Resume —/ }).first().click();
await page.waitForSelector("text=Written by AI", { timeout: 10000 });
await place(page.getByRole("heading", { name: /^Resume$/ }), 0.035);
await shot("04-written-piece");

// 05 — Chat: the engines with their prices, and the price beside Send
await page.goto(`${BASE}/#/chat`);
await page.waitForSelector('textarea[aria-label="Message to OCC"]', { timeout: 15000 });
await page.locator('textarea[aria-label="Message to OCC"]').fill(
  "How should I split the six weeks before my EP release between recording, mixing and promo?");
// Just above the label, so the price under Send clears the tab bar (Haiku, the
// selected engine, is still fully on screen; only the top edge of its card is not).
await place(page.getByText("Ask OCC", { exact: true }), -0.064);
await shot("05-chat");

// 06 — Compose: a loop, previewable, downloadable
await page.goto(`${BASE}/#/compose`);
await page.getByRole("button", { name: /Lo-fi boom bap/ }).first().click();
await page.waitForSelector("text=Download .mid", { timeout: 10000 });
await place(page.getByRole("heading", { name: /Lo-fi boom bap · A minor/ }), 0.035);
await shot("06-compose-loop");

// 07–09 — Master: a REAL run
await page.goto(`${BASE}/#/master`);
await page.waitForSelector("text=Pick your song", { timeout: 15000 });
// Scoped: every screen the member has opened stays mounted, and Chat has file inputs of its own.
await page.setInputFiles('section[aria-label="Master"] input[type=file]', SONG);
await page.waitForSelector("text=Your mix, measured", { timeout: 90000 });
await wait(600);
await place(page.getByText("Larimer Nights (rough mix).wav"), 0.02);
await shot("07-master-measured");

await page.getByRole("button", { name: /Master it/ }).click();
await page.waitForSelector("text=What the master did, and why", { timeout: 180000 });
await wait(1500);
// The shot that matters most: what changed, drawn, with the reason beside it.
await place(page.getByText("Grey is your mix"), 0.52);
await shot("08-master-result");
// Spares (Play takes eight): the whole before/after, the full list of moves, export.
await place(page.getByRole("button", { name: /Play/ }), 0.02);
await shot("09-master-before-after");
await place(page.getByText("What the master did, and why"), 0.02);
await shot("10-master-why");
await place(page.getByRole("heading", { name: "Export" }), 0.02);
await shot("11-master-export");

// The privacy panel — a spare, and the one a reviewer asks about.
await page.goto(`${BASE}/#/`);
await page.waitForSelector("text=What leaves your device");
await place(page.getByRole("heading", { name: "What leaves your device" }), 0.02);
await shot("12-what-leaves-your-device");

const real = errors.filter((e) => !e.includes("ERR_CONNECTION_RESET"));
console.log(real.length ? `CONSOLE ERRORS:\n  ${real.join("\n  ")}` : "console errors: none");
await browser.close();
process.exit(real.length ? 1 : 0);
