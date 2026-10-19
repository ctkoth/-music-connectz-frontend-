/**
 * Every logged-out door, driven in a real browser.
 *
 * A trial door is the only screen a stranger ever sees, and every one of them
 * has now shipped broken at least once — five coaches nothing linked to, a
 * Record button that threw before the mic prompt, a recorder that attached an
 * empty blob. None of those were visible from the source and none failed a
 * test. They were visible from OPENING THE PAGE, which nobody was doing.
 *
 * So this opens every one, with no session, and reports what a stranger gets:
 * page errors, failed requests, and whether the door's own primary control is
 * actually on screen.
 *
 *   node tools/loggedout-sweep.mjs [baseUrl]
 */
import { chromium } from 'playwright';
// Playwright finds its own browser. `PW_CHROME` is only for a machine that
// pins one (this repo's container sets PLAYWRIGHT_BROWSERS_PATH), and
// hardcoding that path made every tool in here fail anywhere else.
const LAUNCH = process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {};


const BASE = process.argv[2] || 'http://localhost:5173';

// path → a control that must be reachable for the door to be a door.
const DOORS = [
  ['/',              /get a take scored|start|try/i],
  ['/try',           /upload a clip|record one now/i],
  ['/try/singz',     /upload a clip|record one now/i],
  ['/try/rapz',      /upload a clip|record one now/i],
  ['/try/guitarz',   /upload a clip|record one now/i],
  ['/try/bassz',     /upload a clip|record one now/i],
  ['/try/keyz',      /upload a clip|record one now/i],
  ['/try/drumz',     /upload a clip|record one now/i],
  ['/try/violinz',   /upload a clip|record one now/i],
  ['/test',          /start|begin|basic|advanced/i],
  ['/test/basic',    /next|answer|agree|start/i],
  ['/test/advanced', /next|answer|agree|start/i],
  ['/tool/metz',     /start|play|bpm|tap/i],
  ['/tool/chordz',   /chord|major|minor|search/i],
];

const browser = await chromium.launch({
  ...LAUNCH,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

let bad = 0;
for (const [path, wanted] of DOORS) {
  const ctx = await browser.newContext();          // no session, every time
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message.split('\n')[0].slice(0, 160)));
  // Only OUR requests. A blocked Google Fonts stylesheet is a fact about the
  // network this ran on, not about the door — and a sweep that reports it as
  // a failure is fourteen false alarms that teach you to stop reading the
  // output, which is worse than no sweep. Same rule the funnel follows: a
  // number nobody trusts changes nothing.
  const mine = (u) => !/^https?:\/\/(fonts\.|www\.google|cdn|unpkg)/.test(u);
  page.on('console', m => {
    if (m.type() === 'error' && !/net::ERR_/.test(m.text())) {
      errors.push('console: ' + m.text().slice(0, 160));
    }
  });
  page.on('requestfailed', r => {
    if (mine(r.url())) failed.push(`${r.failure()?.errorText} ${r.url().replace(BASE, '')}`);
  });
  page.on('response', r => {
    if (r.status() >= 400 && mine(r.url())) failed.push(`${r.status()} ${r.url().replace(BASE, '')}`);
  });

  let text = '', ok = false, blank = true;
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1800);
    text = await page.evaluate(() => document.body.innerText || '');
    blank = text.trim().length < 40;
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll('button, a, input, select')]
        .map(el => (el.innerText || el.value || el.getAttribute('aria-label') || '').trim())
        .filter(Boolean));
    ok = labels.some(l => wanted.test(l)) || wanted.test(text);
  } catch (e) {
    errors.push('navigation: ' + e.message.split('\n')[0].slice(0, 160));
  }

  const real = failed.filter(f => !f.startsWith('401'));
  const verdict = errors.length || real.length || blank || !ok ? 'FAIL' : 'ok';
  if (verdict === 'FAIL') bad++;
  console.log(`${verdict.padEnd(4)} ${path.padEnd(16)} ` +
    `${blank ? 'BLANK PAGE ' : ''}${ok ? '' : 'no primary control '}` +
    `${errors.length ? `errors=${errors.length} ` : ''}${real.length ? `requests=${real.length}` : ''}`);
  for (const e of [...new Set(errors)].slice(0, 4)) console.log(`       ↳ ${e}`);
  // A 401 on a logged-out door is normal for anything that asks who you are;
  // anything else is the door failing.
  for (const f of [...new Set(real)].slice(0, 4)) {
    console.log(`       ↳ request ${f}`);
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${bad} of ${DOORS.length} doors failed.`);
process.exit(bad ? 1 : 0);
