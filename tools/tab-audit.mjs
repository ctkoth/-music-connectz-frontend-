/**
 * Every tab in the signed-in app, opened and inspected.
 *
 * The trial doors got this treatment and it found five coaches nothing linked
 * to, a Record button that threw, and a recorder that attached empty takes.
 * The other 40 tabs have never had it. This is that sweep: open each one,
 * with a session, and report what a member would actually hit.
 *
 * It reports FACTS, not opinions — a page error, a 5xx, a blank screen, a
 * spinner that never resolves. Anything it cannot state as a fact it leaves
 * alone, because a sweep that cries wolf is one nobody reads (this file's
 * predecessor failed 14 doors on a blocked Google Fonts request).
 *
 *   node tools/tab-audit.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE = process.argv[2] || 'http://localhost:5173';
const [access, refresh] = readFileSync('/tmp/mczlog/tok.txt', 'utf8').trim().split('\n');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await browser.newContext({ permissions: ['microphone', 'camera'] });
await ctx.addInitScript(([a, r]) => {
  try { localStorage.setItem('mcz_access', a); localStorage.setItem('mcz_refresh', r); } catch {}
}, [access, refresh]);

const page = await ctx.newPage();
let errors = [], failed = [];
// External hosts are the network this ran on, not the app. A 401 is normal on
// anything that asks who you are before the token lands.
const mine = (u) => !/^https?:\/\/(fonts\.|www\.google|cdn|unpkg|ad-swap)/.test(u);
page.on('pageerror', e => errors.push(e.message.split('\n')[0].slice(0, 150)));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error' && !/net::ERR_|Failed to load resource/.test(t)) errors.push(t.slice(0, 150));
});
page.on('response', r => {
  if (r.status() >= 500 && mine(r.url())) failed.push(`${r.status()} ${r.url().replace(/.*\/api/, '/api')}`);
  if (r.status() === 404 && mine(r.url()) && r.url().includes('/api/')) failed.push(`404 ${r.url().replace(/.*\/api/, '/api')}`);
});

await page.goto(`${BASE}/home`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const rows = [];
const seen = [];
for (let i = 0; i < 50; i++) {
  errors = []; failed = [];
  await page.waitForTimeout(2200);
  const d = await page.evaluate(() => {
    const label = document.querySelector('[data-tour="tab-info"]')?.innerText?.split('\n')[0]?.replace(' ⓘ', '') || '?';
    const main = document.querySelector('main') || document.body;
    const text = (main.innerText || '').trim();
    return {
      label,
      chars: text.length,
      spinner: /Loading…|Loading\.\.\./.test(text) && text.length < 400,
      // A tab whose whole content is an error line.
      onlyError: /^(Couldn't|Could not|Something went wrong|That isn't available)/i.test(text),
      controls: document.querySelectorAll('main button, main a, main input, main select').length,
      firstLines: text.split('\n').filter(Boolean).slice(0, 2).join(' | ').slice(0, 90),
    };
  });
  if (seen.includes(d.label)) break;
  seen.push(d.label);

  const problems = [];
  if (errors.length) problems.push(`js:${[...new Set(errors)].slice(0, 2).join(' ~ ')}`);
  if (failed.length) problems.push(`api:${[...new Set(failed)].slice(0, 2).join(' ~ ')}`);
  if (d.chars < 60) problems.push(`BLANK (${d.chars} chars)`);
  if (d.spinner) problems.push('STUCK SPINNER');
  if (d.onlyError) problems.push(`ERROR-ONLY: ${d.firstLines}`);
  if (d.controls === 0) problems.push('no controls at all');

  rows.push({ label: d.label, problems, chars: d.chars, controls: d.controls });
  await page.locator('a[title="Next tab"]').click();
}

const bad = rows.filter(r => r.problems.length);
console.log(`\n${rows.length} tabs opened. ${bad.length} with something to report.\n`);
for (const r of bad) {
  console.log(`✗ ${r.label.padEnd(22)} ${r.problems.join('\n' + ' '.repeat(25))}`);
}
console.log(`\nClean: ${rows.filter(r => !r.problems.length).map(r => r.label).join(', ')}`);
await browser.close();
