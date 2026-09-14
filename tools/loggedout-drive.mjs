/**
 * Every logged-out door, USED rather than opened.
 *
 * The sweep next door proves a page renders. That is not the same claim: the
 * Record button rendered perfectly for four days while throwing before the
 * mic prompt, and the trial recorder attached empty takes for longer. A door
 * that loads and cannot be walked through is still a wall.
 *
 * So this presses the controls a stranger would press and reports what
 * happened. It is deliberately noisy about WHAT it did, because a green line
 * that does not say what it exercised is a green line nobody can check.
 *
 *   node tools/loggedout-drive.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:5173';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const INSTRUMENTS = ['singz', 'rapz', 'guitarz', 'bassz', 'keyz', 'drumz', 'violinz'];

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
         '--autoplay-policy=no-user-gesture-required'],
});

const results = [];
async function door(name, fn) {
  const ctx = await browser.newContext({ permissions: ['microphone', 'camera'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.split('\n')[0].slice(0, 200)));
  page.on('console', m => {
    // "Failed to load resource" for a 4xx/5xx the app HANDLED is not a fault
    // — the coach answering 502 with a reason is the failure card working.
    // Counting it made a passing flow read FAIL, which is the same crying
    // wolf this file exists to avoid.
    const t = m.text();
    if (m.type() === 'error' && !/net::ERR_|Failed to load resource/.test(t)) {
      errors.push(t.slice(0, 200));
    }
  });
  let note = '';
  try { note = await fn(page); } catch (e) { errors.push('drive: ' + e.message.split('\n')[0].slice(0, 200)); }
  await ctx.close();
  const ok = !errors.length && !/^!/.test(note);
  results.push([ok, name, note, errors]);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(22)} ${note}`);
  for (const e of [...new Set(errors)].slice(0, 3)) console.log(`       ↳ ${e}`);
}

const txt = (p) => p.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n'));

for (const key of INSTRUMENTS) {
  await door(`/try/${key} record`, async (page) => {
    await page.goto(`${BASE}/try/${key}`, { waitUntil: 'networkidle' });
    const rec = page.getByRole('button', { name: /record one now/i });
    if (!await rec.count()) return '! no record button (blocked or not rendered)';
    await rec.click();
    await page.waitForTimeout(3200);
    const during = await txt(page);
    if (!/Recording —/.test(during)) return '! pressing record did not start a recording';
    const live = /input live/.test(during);
    await page.getByRole('button', { name: /^stop/i }).click();
    await page.waitForTimeout(2200);
    const after = await txt(page);
    if (!/Send it to the coach/i.test(after)) return '! no take to send after stopping';
    const size = (after.match(/\d+KB|\d+\.\d+MB/) || ['?'])[0];
    return `recorded ${size}, meter ${live ? 'live' : 'FLAT'}, send button present`;
  });
}

await door('/try/singz send', async (page) => {
  await page.goto(`${BASE}/try/singz`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /record one now/i }).click();
  await page.waitForTimeout(3200);
  await page.getByRole('button', { name: /^stop/i }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /send it to the coach/i }).click();
  await page.waitForTimeout(12000);
  const after = await txt(page);
  // A score is NOT the pass condition — a dev box has no model key, and a
  // check that only passes with one is a check nobody can run. What is being
  // pinned is that the send reached the server and the answer on screen is
  // the SERVER'S sentence: the failure card leading with a generic line was
  // its own bug once (every 5xx read "the coach is down at our end", which is
  // wrong advice for "the audio was silent" and flatly contradicts "free
  // takes are all spoken for today").
  if (/Scoring|Listening/i.test(after) && !/couldn|isn't|can't|wasn't|failed/i.test(after)) {
    return '! still scoring after 12s — the spinner may never end';
  }
  // The failure card is checked FIRST. "Pitch" and "Tone" are on this page
  // whatever happens — they are the score chip labels and the range picker —
  // so testing for them found a score on a take that had just 502'd.
  const said = after.split('\n').find(l => /^The coach|couldn't|wasn't accepted|spoken for|all spoken/i.test(l.trim()));
  if (said) return `server's own sentence shown: "${said.trim().slice(0, 90)}"`;
  if (/out of 10|\/ ?10\b|Your take scored/i.test(after)) return 'scored';
  return '! neither a score nor the server\'s reason reached the screen';
});

await door('/test/basic answer', async (page) => {
  await page.goto(`${BASE}/test/basic`, { waitUntil: 'networkidle' });
  // Every statement is on ONE page, five buttons each. An earlier version of
  // this clicked the first matching button sixty times, hit the same
  // statement over and over, and reported the test as broken — a false alarm
  // about a door that works, which is worse than no check at all.
  //
  // It also answers the SAME way on every statement on purpose: the bank is
  // balanced (half the statements on each axis are keyed the other way), so
  // that must come back as "down the middle on every axis" rather than a
  // strong reading. A test that agreed with everything and got a decisive
  // type would be one that does not read the keying.
  const answered = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter(b => /Sounds like me/i.test(b.innerText))
      .map(b => (b.click(), 1)).length);
  await page.waitForTimeout(600);
  const submit = page.getByRole('button', { name: /see my letters|see my result/i }).first();
  if (!await submit.count()) return `! answered ${answered}, no submit control`;
  await submit.click();
  await page.waitForTimeout(3500);
  const end = await txt(page);
  if (!/PERSONALITIEZ|your letters/i.test(end)) return `! answered ${answered}, no result reached`;
  const acquiescence = /down the middle on every axis/i.test(end);
  return `answered ${answered}, result shown${acquiescence ? ', keying holds (all-agree reads as middle)' : ''}`;
});

await door('/tool/metz start', async (page) => {
  await page.goto(`${BASE}/tool/metz`, { waitUntil: 'networkidle' });
  const b = page.getByRole('button', { name: /start|play/i }).first();
  if (!await b.count()) return '! no start control';
  await b.click();
  await page.waitForTimeout(2000);
  const t = await txt(page);
  return /stop|pause/i.test(t) ? 'started (control flipped to stop)' : '! start did not flip to stop';
});

await door('/tool/chordz pick', async (page) => {
  await page.goto(`${BASE}/tool/chordz`, { waitUntil: 'networkidle' });
  // Root note and chord type are grids of buttons, not selects. Looking for
  // a "Gm" button found nothing and reported the tool broken; it is not.
  const before = await txt(page);
  await page.getByRole('button', { name: 'G', exact: true }).first().click();
  await page.waitForTimeout(400);
  const mid = await txt(page);
  await page.getByRole('button', { name: /^Minor$/i }).first().click();
  await page.waitForTimeout(400);
  const after = await txt(page);
  if (mid === before || after === mid) return '! changing root or type changed nothing';
  // Play Chord must actually reach WebAudio — a silent tool that looks fine is
  // this app's worst failure shape.
  await page.evaluate(() => {
    window.__n = 0;
    const O = window.AudioContext || window.webkitAudioContext;
    window.AudioContext = class extends O { constructor(...a) { super(...a); window.__n++; } };
  });
  await page.getByRole('button', { name: /play chord/i }).click();
  await page.waitForTimeout(1200);
  const made = await page.evaluate(() => window.__n);
  if (!made) return '! Play Chord never opened an audio context';
  return `Gm renders and Play Chord reaches WebAudio`;
});

await browser.close();
const bad = results.filter(r => !r[0]).length;
console.log(`\n${bad} of ${results.length} flows failed.`);
process.exit(bad ? 1 : 0);
