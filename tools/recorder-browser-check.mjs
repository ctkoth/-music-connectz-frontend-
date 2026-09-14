import { chromium } from 'playwright';
// Playwright finds its own browser. `PW_CHROME` is only for a machine that
// pins one (this repo's container sets PLAYWRIGHT_BROWSERS_PATH), and
// hardcoding that path made every tool in here fail anywhere else.
const LAUNCH = process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {};


const URL = 'http://localhost:5173/try/singz';

async function run(label, args, drive) {
  const browser = await chromium.launch({ args, ...LAUNCH });
  const ctx = await browser.newContext({ permissions: ['microphone', 'camera'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  const out = await drive(page);
  await browser.close();
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(out, null, 2));
  if (errs.length) console.log('ERRORS:', errs.slice(0, 5));
  return out;
}

const FAKE = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];

async function pressRecord(page) {
  const btn = page.getByRole('button', { name: /record one now/i });
  await btn.waitFor({ timeout: 15000 });
  await btn.click();
}

async function snapshot(page) {
  return page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));
}

// 1. Normal take: fake device emits a tone. Meter must go live.
await run('tone, 5s take', FAKE, async (page) => {
  await pressRecord(page);
  await page.waitForTimeout(3500);
  const mid = await snapshot(page);
  const liveSeen = /input live/.test(mid);
  const noSound = /no sound yet/.test(mid);
  await page.getByRole('button', { name: /^stop/i }).click();
  await page.waitForTimeout(2500);
  const after = await snapshot(page);
  return { liveSeen, noSound, midSample: mid.split('\n').filter(l => /Recording|input|sound/i.test(l)),
           after: after.split('\n').filter(l => /captured|silence|short|MB|·|Send/i.test(l)).slice(0, 6) };
});

// 2. Silent input: a wav of pure silence fed as the fake capture device.
await run('silent input, 5s take', [...FAKE, '--use-file-for-fake-audio-capture=/tmp/claude-0/-home-user/55bfbb60-c7dc-580c-8467-3570518ef2d1/scratchpad/silence.wav'], async (page) => {
  await pressRecord(page);
  await page.waitForTimeout(4200);
  const mid = await snapshot(page);
  await page.getByRole('button', { name: /^stop/i }).click();
  await page.waitForTimeout(2500);
  const after = await snapshot(page);
  return { warnedDuring: /no sound yet|Nothing has reached/.test(mid),
           midSample: mid.split('\n').filter(l => /Nothing has reached|sound|input/i.test(l)),
           after: after.split('\n').filter(l => /silence|never rose|captured|Send/i.test(l)).slice(0, 6) };
});

// 3. A take stopped almost immediately.
await run('stopped after ~300ms', FAKE, async (page) => {
  await pressRecord(page);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^stop/i }).click();
  await page.waitForTimeout(2000);
  const after = await snapshot(page);
  return { after: after.split('\n').filter(l => /too short|captured|silence|Send/i.test(l)).slice(0, 6) };
});
