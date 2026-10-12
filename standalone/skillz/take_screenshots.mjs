// Takes the SkillZ Play screenshots from the real shell build.
//
//   # API (placeholder AI keys so the screens show their ready state) and the shell:
//   cd $MCZ_BACKEND && GEMINI_API_KEY=local-fake ANTHROPIC_API_KEY=local-fake \
//     python manage.py shell < $FRONTEND/standalone/skillz/seed_screenshots.py
//   cd $MCZ_BACKEND && GEMINI_API_KEY=local-fake ANTHROPIC_API_KEY=local-fake python manage.py runserver 8010 --noreload &
//   cd $FRONTEND && MCZ_API=http://localhost:8010 VITE_API_BASE=http://localhost:5178 npm run dev:skillz &
//   node standalone/skillz/take_screenshots.mjs
//
// 360x640 CSS px at device scale 3 is 1080x1920: a phone, in portrait, the size Play
// wants. The browser is launched with Chromium's FAKE capture device
// (--use-fake-device-for-media-stream: a synthetic beep and a test-pattern camera) and
// the permission prompt pre-accepted, so Record a take is the real recorder talking to
// a pretend microphone — the screens, prices, buttons and disclosures are the real app
// and nothing about the recorder is mocked.
//
// What IS stand-in, and why (play/skillz/README.md says the same in the open):
//   * The member's history is seeded rows (seed_screenshots.py).
//   * 05-scored-take: with no Gemini key nothing can score a take. By default the real
//     POST /api/singz/coach/ is answered in the browser with a hand-written reply of the
//     real response's shape, for a fictional take, so the real result screen has
//     something to render. LIVE=1 skips that and runs the take for real — use it on a
//     box with GEMINI_API_KEY set, and THAT is the screenshot to ship.
import fs from "node:fs";
import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const { chromium } = pw;
const BASE = process.env.MCZ_APP || "http://localhost:5178";
const OUT = process.env.OUT || path.resolve("play/skillz/screenshots");
const LIVE = !!process.env.LIVE;
fs.mkdirSync(OUT, { recursive: true });

// /opt/pw-browsers/chromium is a DIRECTORY and the version in the path moves.
const root = "/opt/pw-browsers";
const dir = fs.readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
const executablePath = path.join(root, dir, "chrome-linux", "chrome");

const browser = await chromium.launch({
  executablePath,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({
  viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  permissions: ["microphone", "camera"],
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
// Every screen the member has opened stays mounted, so look inside the one being shown.
const sec = (name) => page.locator(`section[aria-label="${name}"]`);
const tab = (name) => page.locator("nav[aria-label=SkillZ]").getByRole("link", { name, exact: true });

// A fictional take, scored by hand. Same keys the real coach answers with
// (apps/economy/vocalcoach.py score_take), nothing the screen does not already render.
const FIXTURE = {
  score: 7, model_score: 7,
  score_rule: "Overall leans on your strongest parts — your best dimensions count most, your weakest counts least.",
  listeners: null,
  scores: { pitch: 7, tone: 8, breath: 6, range: 7, agility: 5, style_match: 7 },
  rated_lyrics: false, rated_mix: false, unscorable: "",
  verdict: "A warm, steady take — the tone is the strongest thing here, and the runs are where the work is.",
  now: "You sit comfortably in the middle of your range and hold long notes without wobbling. Fast passages smear a little.",
  goal: "R&B wants clean, relaxed runs. Slowing the run down until every note has its own edge is the next step.",
  range_profile: "Your take reads as Tenor, about G3 to A4.",
  style_fit: "The phrasing leans soul more than modern R&B — the late, behind-the-beat entries are right for it.",
  song_score: null, song_why: "",
  heard: [
    { t: "0:06", what: "Long note held steady with a gentle, even vibrato", dim: "tone", confidence: 3 },
    { t: "0:14", what: "The run on the second line lands a little flat on its way down", dim: "pitch", confidence: 2 },
    { t: "0:21", what: "Breath taken mid-phrase before the high note", dim: "breath", confidence: 2 },
  ],
  strengths: ["Tone is warm and even from the first note to the last.", "You enter phrases late and relaxed, which is exactly the feel the genre wants."],
  fixes: ["Slow the run on the second line to half speed and sing each note on its own — the speed is hiding a small pitch drift.", "Plan the breath before the high note so it isn't taken inside the phrase."],
  next_drill: "Five-note descending scale at half tempo, three times through, with a drone under it.",
  think: { used: true, model: "claude", reason: "" },
  cost_cents: 0, take_score_id: 9001, share_url: "/s/example",
};

// 01 — signed out
await page.goto(`${BASE}/#/login`, { waitUntil: "networkidle" });
await wait(600);
await shot("08-sign-in");

await page.getByPlaceholder(/Username, email/).fill("szreview");
await page.getByPlaceholder("Password").fill("pw12345!");
await page.getByRole("button", { name: /log ?in/i }).first().click();
await page.waitForSelector("text=Signed in as szreview", { timeout: 20000 });
await wait(2500);

// 02 — Home: what each coach is and costs, before it is opened
await page.goto(`${BASE}/#/`);
await page.waitForSelector("text=free prompts left today", { timeout: 15000 });
await wait(800);
await shot("01-home");

// 03 — Home, further down: the coaches with a history, recent takes
await place(page.getByRole("heading", { name: "Recent takes" }), 0.06);
await shot("09-recent-takes");

// 04 — SingZ: the recorder with a take on it, and the price beside Send
await tab("SingZ").click();
await sec("SingZ").getByText(/Boss Take — /).waitFor({ timeout: 15000 });
await sec("SingZ").getByRole("button", { name: /Record a take/ }).click();
await wait(3500);
await sec("SingZ").getByRole("button", { name: /Stop/ }).click();
await sec("SingZ").getByRole("button", { name: /Send it to the coach/ }).waitFor({ timeout: 10000 });
// The recorder, the take it just made, and the price under Send — all on one screen.
await place(sec("SingZ").getByRole("button", { name: /Send it to the coach/ }), 0.62);
await shot("02-record-and-price");

// 05 — a scored take
if (!LIVE) {
  await page.route("**/api/singz/coach/", (route) =>
    route.request().method() === "POST" ? route.fulfill({ json: FIXTURE }) : route.fallback());
}
await sec("SingZ").getByRole("button", { name: /Send it to the coach/ }).click();
await sec("SingZ").getByText("Fix this").waitFor({ timeout: LIVE ? 150000 : 20000 });
await wait(1800);
await place(sec("SingZ").locator(".mcz-reveal"), 0.02);
await shot("03-scored-take");
// The dimension chips, each with its name beside its number, and what worked.
await place(sec("SingZ").locator(".pill", { hasText: "Pitch" }), 0.02);
await shot("04-scores-and-notes");
await place(sec("SingZ").getByText("Fix this"), 0.02);
await shot("05-fix-this-and-report");
await sec("SingZ").getByRole("button", { name: /Report this output/ }).click();
await place(sec("SingZ").getByText("Reporting tells the owner"), 0.3);
await shot("10-report-form");

// 08 — progress: the coach's memory of the member's takes
await page.goto(`${BASE}/#/singz`);
await place(sec("SingZ").locator('[data-tour="singz-progress"]'), 0.02);
await shot("06-progress");

// 09 — DrumZ: the practice pad above the coach
await tab("DrumZ").click();
await sec("DrumZ").getByText(/Boss Take — /).waitFor({ timeout: 15000 });
await wait(800);
await page.evaluate(() => window.scrollTo(0, 0));
await shot("11-drumz");

// 10 — RapZ: its own picks, from the server
await tab("RapZ").click();
await sec("RapZ").getByText(/Boss Take — /).waitFor({ timeout: 15000 });
await place(sec("RapZ").getByText(/Boss Take — /), 0.02);
await shot("12-rapz");

// 11 — what leaves your device
await page.goto(`${BASE}/#/`);
await page.waitForSelector("text=What leaves your device");
await place(page.getByRole("heading", { name: "What leaves your device" }), 0.02);
await shot("07-what-leaves-your-device");

// 12 — in-app account deletion
await page.locator('summary:has-text("Delete my account")').click();
await place(page.getByText("What goes:"), 0.04);
await shot("13-delete-my-account");

const real = errors.filter((e) => !e.includes("ERR_CONNECTION_RESET"));
console.log(real.length ? `CONSOLE ERRORS:\n  ${real.join("\n  ")}` : "console errors: none");
await browser.close();
process.exit(real.length ? 1 : 0);
