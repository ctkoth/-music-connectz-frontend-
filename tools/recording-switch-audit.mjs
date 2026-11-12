/**
 * Does a recording survive the member opening another app?
 *
 * A take is the one thing in this app that cannot be redone on the spot — a
 * performance — and the coach tabs are ordinary tabs: opening MetZ to set a
 * tempo, or a tuner, or the lyric writer, swaps the screen. This drives the
 * real thing: record a take with a fake microphone, open other apps in the
 * middle of it, and report what the recorder and the microphone did. It reports
 * FACTS (recorder state, live tracks, what the screen offers), not opinions.
 *
 *   node tools/recording-switch-audit.mjs [baseUrl]
 *
 * Needs a signed-in session in /tmp/mczlog/tok.txt (access token, newline,
 * refresh token), the same as tab-audit.mjs.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const LAUNCH = process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {};
const BASE = process.argv[2] || 'http://localhost:5173';
const [access, refresh] = readFileSync('/tmp/mczlog/tok.txt', 'utf8').trim().split('\n');

const browser = await chromium.launch({
  ...LAUNCH,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ctx = await browser.newContext({ permissions: ['microphone', 'camera'], viewport: { width: 1100, height: 900 } });
await ctx.addInitScript(([a, r]) => {
  try { localStorage.setItem('mcz_access', a); localStorage.setItem('mcz_refresh', r); } catch { /* blocked */ }
}, [access, refresh]);

// Watch every recorder and every microphone track the page opens, so the answer is measured, not inferred.
await ctx.addInitScript(() => {
  window.__recorders = [];
  window.__streams = [];
  const Orig = window.MediaRecorder;
  if (Orig) {
    const Wrapped = function (stream, opts) { const r = new Orig(stream, opts); window.__recorders.push(r); return r; };
    Wrapped.prototype = Orig.prototype;
    Wrapped.isTypeSupported = Orig.isTypeSupported.bind(Orig);
    window.MediaRecorder = Wrapped;
  }
  const md = navigator.mediaDevices;
  if (md?.getUserMedia) {
    const gum = md.getUserMedia.bind(md);
    md.getUserMedia = async (c) => { const s = await gum(c); window.__streams.push(s); return s; };
  }
});

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.split('\n')[0].slice(0, 160)));

const facts = () => page.evaluate(() => ({
  recorders: window.__recorders.map((r) => r.state),
  liveTracks: window.__streams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length,
}));
const rows = [];
const say = (name, ok, detail) => { rows.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

await page.goto(`${BASE}/sing`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const record = page.getByRole('button', { name: /record a take/i });
if (!(await record.count())) {
  console.log('No "Record a take" button on /sing — is the session signed in and the coach open?');
  console.log((await page.locator('main').innerText()).slice(0, 300));
  await browser.close();
  process.exit(2);
}
await record.first().click();
await page.waitForTimeout(2500);
let f = await facts();
say('recording starts', f.recorders.includes('recording') && f.liveTracks > 0, JSON.stringify(f));
say('screen shows Stop · timer', (await page.getByRole('button', { name: /^stop ·/i }).count()) > 0);

// Open another app in the middle of the take, the way a member does: the shell's own tab event.
const open = (key) => page.evaluate((k) => window.dispatchEvent(new CustomEvent('mcz-goto-tab', { detail: k })), key);
await open('metz');
await page.waitForTimeout(1500);
say('MetZ opened', (await page.locator('main').innerText()).includes('MetZ'));
f = await facts();
say('recording still running after opening MetZ', f.recorders.includes('recording'), JSON.stringify(f));
say('microphone not orphaned (a live track has a recorder holding it)', f.liveTracks === 0 || f.recorders.includes('recording'), JSON.stringify(f));

// The bar that tells the member a take is running, wherever they are.
say('a recording bar is on screen away from the coach', (await page.getByRole('status', { name: /recording/i }).count()) > 0
  || (await page.getByText(/recording/i).filter({ hasText: /stop/i }).count()) > 0);

await open('tunerz');
await page.waitForTimeout(1200);
f = await facts();
say('recording still running after a second app (TunerZ)', f.recorders.includes('recording'), JSON.stringify(f));

// Back to the coach: the take must still be there, not a fresh recorder.
await open('singz');
await page.waitForTimeout(1500);
say('back on the coach, the take is still recording', (await page.getByRole('button', { name: /^stop ·/i }).count()) > 0);
await page.getByRole('button', { name: /^stop ·/i }).first().click().catch(() => {});
await page.waitForTimeout(1500);
f = await facts();
say('stopping ends the recorder and releases the microphone', !f.recorders.includes('recording') && f.liveTracks === 0, JSON.stringify(f));

// Second take: stop it from the bar while another app is open. The finished
// take must be waiting on the coach, and the microphone must be closed.
await page.getByRole('button', { name: /record (a take|again|another)/i }).first().click().catch(() => {});
await page.waitForTimeout(2500);
f = await facts();
say('a second take starts', f.recorders.includes('recording'), JSON.stringify(f));
await open('metz');
await page.waitForTimeout(1200);
const bar = page.getByRole('status', { name: /recording in/i });
await bar.getByRole('button', { name: /^stop$/i }).click().catch(() => {});
await page.waitForTimeout(1500);
f = await facts();
say('Stop on the bar ends the recorder and closes the microphone', !f.recorders.includes('recording') && f.liveTracks === 0, JSON.stringify(f));
say('the bar says the take is ready', (await page.getByRole('status', { name: /recording finished/i }).count()) > 0);
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await page.getByRole('status', { name: /recording finished/i }).getByRole('button').click().catch(() => {});
await page.waitForTimeout(1500);
say('opening it lands on the coach with the take attached', (await page.locator('audio, video').count()) > 0
  && (await page.getByRole('status').count()) === 0);

// Third: a take running when the member signs out must not leave the microphone open.
await page.getByRole('button', { name: /record (a take|again|another)/i }).first().click().catch(() => {});
await page.waitForTimeout(2000);
await open('metz');
await page.waitForTimeout(800);
await page.getByTitle('Log out').click().catch(() => {});
await page.waitForTimeout(1500);
f = await facts();
say('signing out mid-take closes the microphone', !f.recorders.includes('recording') && f.liveTracks === 0, JSON.stringify(f));

if (errors.length) console.log('\npage errors:', [...new Set(errors)].slice(0, 5));
const bad = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - bad.length}/${rows.length} checks passed.`);
await browser.close();
process.exit(bad.length ? 1 : 0);
