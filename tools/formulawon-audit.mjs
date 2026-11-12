/**
 * Does FormulaWon work end to end? Opens it signed in, changes the drummer,
 * plays it, sends it to a track and checks it landed, then reads the DawZ card.
 *
 *   node tools/formulawon-audit.mjs [baseUrl]     (session in /tmp/mczlog/tok.txt)
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
await page.evaluate(() => window.dispatchEvent(new CustomEvent('mcz-goto-tab', { detail: 'formulawon' })));
await page.waitForTimeout(2500);
const dr = page.getByRole('region', { name: 'Smart Drummer' });
say('FormulaWon opens on the Smart Drummer', (await dr.count()) === 1, page.url());
say('six styles to pick from', (await dr.getByRole('radio').count()) === 6);
await dr.getByRole('radio', { name: 'Trap' }).click();
say('picking a style selects it', (await dr.getByRole('radio', { name: 'Trap' }).getAttribute('aria-checked')) === 'true');
await dr.getByRole('button', { name: /hear the drummer/i }).click();
await page.waitForTimeout(1200);
say('the drummer plays', (await dr.getByRole('button', { name: /^stop$/i }).count()) === 1);
await dr.getByRole('slider', { name: /how busy/i }).fill('0.9');
await page.waitForTimeout(600);
say('moving a dial while it plays keeps it playing', (await dr.getByRole('button', { name: /^stop$/i }).count()) === 1);
await dr.getByRole('button', { name: /^stop$/i }).click();
await dr.getByRole('button', { name: /send to tracks/i }).click();
await page.waitForTimeout(3500);
const main = () => page.locator('main').innerText();
say('Send to Tracks reports where it went', /is on its own track/.test(await main()));
await page.getByRole('tab', { name: 'Tracks' }).click();
await page.waitForTimeout(800);
say('Tracks shows the drummer as a region', /Trap drummer ×8/.test(await main()));
say('the timeline has length', !/ \/ 0:00\.00/.test(await main()));
if (process.env.SHOT) { await page.getByRole('tab', { name: 'Drummer' }).click(); await page.waitForTimeout(400); await page.screenshot({ path: process.env.SHOT }); }
await page.evaluate(() => window.dispatchEvent(new CustomEvent('mcz-goto-tab', { detail: 'dawz' })));
await page.waitForTimeout(2000);
say('DawZ lists it as built', /FormulaWon[\s\S]{0,400}built · free/.test(await main()));
if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 5));
const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - failed}/${rows.length} checks passed${errors.length ? ', with page errors' : ''}.`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
