/**
 * Does Intuition work end to end? Opens it signed in, changes the key and stack,
 * plays it, taps a tempo, sends it to a track and checks it landed, then reads the DawZ card.
 *
 *   node tools/intuition-audit.mjs [baseUrl]     (session in /tmp/mczlog/tok.txt)
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const BASE = process.argv[2] || 'http://localhost:5173';
const [access, refresh] = readFileSync('/tmp/mczlog/tok.txt', 'utf8').trim().split('\n');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 950 } });
await ctx.addInitScript(([a, r]) => { try { localStorage.setItem('mcz_access', a); localStorage.setItem('mcz_refresh', r); } catch { /* blocked */ } }, [access, refresh]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
const rows = [];
const say = (what, ok, extra = '') => { rows.push({ ok }); console.log(`${ok ? '✓' : '✗'} ${what}${extra ? ` — ${extra}` : ''}`); };
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => window.dispatchEvent(new CustomEvent('mcz-goto-tab', { detail: 'intuition' })));
await page.waitForTimeout(2500);
const sw = page.getByRole('region', { name: 'Songwriter' });
say('Intuition opens on the Songwriter', (await sw.count()) === 1, page.url());
const chordsText = () => sw.getByRole('list', { name: /chords in order/i }).innerText();
say('C major pop is C G Am F', /C\s+I\s+G\s+V\s+Am\s+vi\s+F\s+IV/.test(await chordsText()), (await chordsText()).replace(/\s+/g, ' '));
await sw.getByLabel('Key').selectOption({ label: 'G' });
say('changing the key moves the chords', /^G\s/.test(await chordsText()), (await chordsText()).replace(/\s+/g, ' '));
await sw.getByRole('button', { name: 'Arp' }).click();
say('an instrument joins the stack', (await sw.getByRole('button', { name: 'Arp' }).getAttribute('aria-pressed')) === 'true');
await sw.getByRole('button', { name: /hear the chords/i }).click();
await page.waitForTimeout(1200);
say('the chords play', (await sw.getByRole('button', { name: /^stop$/i }).count()) === 1);
await sw.getByRole('button', { name: /^stop$/i }).click();
for (let i = 0; i < 4; i++) { await sw.getByRole('button', { name: /smart tempo/i }).click(); await page.waitForTimeout(600); }
const bpm = Number(await page.getByRole('spinbutton').first().inputValue());
say('four taps 0.6s apart set the session near 100 BPM', bpm >= 85 && bpm <= 110, `${bpm} BPM`);
await sw.getByRole('button', { name: /send to tracks/i }).click();
await page.waitForTimeout(3500);
const main = () => page.locator('main').innerText();
say('Send to Tracks reports where it went', /is on its own track/.test(await main()));
await page.getByRole('tab', { name: 'Tracks' }).click();
await page.waitForTimeout(800);
say('Tracks shows the progression as a region', /G major Pop anthem ×2/.test(await main()));
say('the timeline has length', !/ \/ 0:00\.00/.test(await main()));
if (process.env.SHOT) { await page.getByRole('tab', { name: 'Songwriter' }).click(); await page.waitForTimeout(400); await page.screenshot({ path: process.env.SHOT }); }
await page.evaluate(() => window.dispatchEvent(new CustomEvent('mcz-goto-tab', { detail: 'dawz' })));
await page.waitForTimeout(2000);
say('DawZ lists it as built', /Intuition[\s\S]{0,400}built · free/.test(await main()));
if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 5));
const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - failed}/${rows.length} checks passed${errors.length ? ', with page errors' : ''}.`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
