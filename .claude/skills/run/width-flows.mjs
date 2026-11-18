// The screens width-audit.mjs cannot reach by tapping, because a real action makes them. Today: BodieZ's "Session
// ended" card for a ROUTINE session (vs last, the plan report, records, the routine's coach block — the card from the
// member's screenshot), then every BodieZ sub-tab, with that session ended.
//
//   node .claude/skills/run/width-flows.mjs                     # 320, 360 and 412 wide
//   WIDTHS=360 FONT=125 node .claude/skills/run/width-flows.mjs  # one size, text turned up
//
// It WRITES as `corey` (seed.py's account, local only): finishes any open session, makes a routine "Chest/Back/Abs"
// with eight lifts, logs and finishes one session of it, then logs a heavier one that the browser ends. Exit code 1
// when anything scrolls sideways.
import fs from "node:fs";
import path from "node:path";
import pw from "/opt/node22/lib/node_modules/playwright/index.js";

const API = (process.env.MCZ_API || "http://localhost:8000") + "/api";
const APP = process.env.MCZ_APP || "http://localhost:5174";
const USER = process.env.MCZ_USER || "corey", PASSWORD = process.env.MCZ_PASSWORD || "pw12345!";
const widths = (process.env.WIDTHS || "320,360,412").split(",").map(Number);
const FONT = Number(process.env.FONT || 100);

const call = async (p, { body, method, tok } = {}) => {
  const r = await fetch(API + p, { method: method || (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${p} → ${r.status} ${(await r.text()).slice(0, 200)}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};

/** A routine with one finished session behind it and a heavier one open, so the summary has everything to say. */
async function seedRoutineSession() {
  const tok = (await call("/auth/login/", { body: { identifier: USER, password: PASSWORD } })).access;
  for (const s of (await call("/economy/bodiez/sessions/", { tok })).sessions) {
    if (!s.ended_at) await call(`/economy/bodiez/sessions/${s.id}/`, { method: "PATCH", body: { finish: true }, tok });
  }
  const lifts = (await call("/economy/bodiez/exercises/", { tok })).exercises.filter((e) => e.accessible !== false).slice(0, 8);
  const r = await call("/economy/bodiez/routines/", { tok, body: { title: "Chest/Back/Abs",
    exercises: lifts.map((e) => ({ exercise_id: e.id, sets: 3, reps: 10, weight_kg: 20 })) } });
  const routineId = r.id ?? r.routine?.id;
  let open;
  for (const [round, reps] of [[1, 10], [2, 15]]) {
    open = await call("/economy/bodiez/sessions/", { tok, body: { routine_id: routineId } });
    for (const e of lifts) for (let n = 0; n < 3; n++) {
      await call(`/economy/bodiez/sessions/${open.id}/sets/`, { tok, body: { exercise_id: e.id, reps: reps + n, weight_kg: 16 + 2 * round } });
    }
    if (round === 1) await call(`/economy/bodiez/sessions/${open.id}/`, { tok, method: "PATCH", body: { finish: true } });
  }
  return open.id;
}

const measure = (page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const scrollsX = (el) => /(auto|scroll|hidden|clip)/.test(getComputedStyle(el).overflowX);
  const clipped = (el) => { for (let q = el.parentElement; q && q !== document.body; q = q.parentElement) if (scrollsX(q)) return true; return false; };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!el.checkVisibility?.()) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1) continue;
    const pr = el.parentElement?.getBoundingClientRect();
    if (pr && pr.right > vw + 1) continue;
    if (clipped(el) || getComputedStyle(el).position === "fixed") continue;
    out.push(`${Math.round(r.right)}px <${el.tagName.toLowerCase()} class="${String(el.className?.baseVal ?? el.className).slice(0, 110)}"> “${(el.innerText || "").replace(/\s+/g, " ").slice(0, 50)}”`);
  }
  return { vw, sw: document.documentElement.scrollWidth, out };
});

const root = "/opt/pw-browsers";
const dir = fs.readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
const executablePath = ["chrome-linux64", "chrome-linux"].map((d) => path.join(root, dir, d, "chrome")).find((p) => fs.existsSync(p));
const browser = await pw.chromium.launch({ executablePath });
let bad = 0;
const check = async (page, label) => {
  const m = await measure(page);
  const over = m.sw > m.vw + 1;
  if (over) bad++;
  console.log(`${over ? "✗" : "✓"} ${label.padEnd(40)} ${m.sw}/${m.vw}`);
  for (const o of m.out.slice(0, 6)) console.log(`     ${o}`);
};

for (const W of widths) {
  await seedRoutineSession();
  const page = await (await browser.newContext({ viewport: { width: W, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })).newPage();
  page.on("dialog", (d) => d.accept());
  if (FONT !== 100) await page.addInitScript((f) => document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style"); s.textContent = `html{font-size:${f}% !important}`; document.head.appendChild(s);
  }), FONT);
  await page.goto(`${APP}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder(/Username, email/).fill(USER);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /log ?in/i }).first().click();
  await page.waitForTimeout(3000);
  await page.goto(`${APP}/bodie`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const tag = `${W} text ${FONT}%`;
  await check(page, `${tag} bodiez live session`);
  await page.getByRole("button", { name: /End session/ }).first().click();
  await page.waitForTimeout(800);
  const confirm = page.getByRole("button", { name: /^(End|Finish|Yes)/ });
  if (await confirm.count() > 1) await confirm.last().click();
  await page.waitForTimeout(2500);
  if (!(await page.getByText("Session ended").count())) console.log("   (the Session ended card did not appear — the flow did not reach it)");
  await check(page, `${tag} bodiez session ended (routine)`);
  for (const t of ["SessionZ", "RoutineZ", "Scheduler", "BodyMap", "Insights", "Goals", "Recovery", "Progress", "StepZ", "AI coach"]) {
    const b = page.getByRole("button", { name: new RegExp(`^${t}$`) }).first();
    if (!(await b.count())) continue;
    await b.click();
    await page.waitForTimeout(1500);
    await check(page, `${tag} bodiez ${t}`);
  }
  await page.context().close();
}
await browser.close();
console.log(`== flows: ${bad} screen(s) scroll sideways`);
process.exit(bad ? 1 : 0);
