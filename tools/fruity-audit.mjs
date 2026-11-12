/**
 * Does Fruity Möbius work end to end? Opens it signed in, taps a step, plays the
 * pattern, sends it to the Playlist and checks a region landed there, then reads
 * the DawZ card. Reports facts.
 *
 *   node tools/fruity-audit.mjs [baseUrl]     (session in /tmp/mczlog/tok.txt)
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
await page.evaluate(() => window.dispatchEvent(new CustomEvent('mcz-goto-tab', { detail: 'fruitymobius' })));
await page.waitForTimeout(2500);
const rack = page.getByRole('region', { name: 'Channel Rack' });
say('Fruity Möbius opens on the Channel Rack', (await rack.count()) === 1, page.url());
const steps = rack.getByRole('group').first().getByRole('button');
say('a channel has sixteen steps', (await steps.count()) === 16);
const before = await steps.nth(2).getAttribute('aria-pressed');
await steps.nth(2).click();
say('tapping a step toggles it', (await steps.nth(2).getAttribute('aria-pressed')) !== before);
await rack.getByRole('button', { name: /play pattern/i }).click();
await page.waitForTimeout(1200);
say('Play starts the loop', (await rack.getByRole('button', { name: /^stop$/i }).count()) === 1 && (await rack.locator('.ring-2').count()) > 0);
await rack.getByRole('button', { name: /^stop$/i }).click();
await rack.getByRole('button', { name: /send to playlist/i }).click();
await page.waitForTimeout(3000);
const main = () => page.locator('main').innerText();
say('Send to Playlist reports where it went', /is on the Playlist/.test(await main()));
await page.getByRole('tab', { name: 'Playlist' }).click();
await page.waitForTimeout(800);
say('the Playlist shows the pattern as a region', /Pattern 1 ×4/.test(await main()));
say('the timeline has length', !/ \/ 0:00/.test(await main()));
await page.getByRole('tab', { name: 'Mixer' }).click();
await page.waitForTimeout(500);
say('the Mixer opens', /master/i.test(await main()));
if (process.env.SHOT) { await page.getByRole('tab', { name: 'Channel Rack' }).click(); await page.waitForTimeout(400); await page.screenshot({ path: process.env.SHOT }); }
await page.evaluate(() => window.dispatchEvent(new CustomEvent('mcz-goto-tab', { detail: 'dawz' })));
await page.waitForTimeout(2000);
say('DawZ lists it as built', /Fruity Möbius[\s\S]{0,400}built · free/.test(await main()));
if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 5));
const bad = rows.filter((r) => !r.ok).length + (errors.length ? 1 : 0);
console.log(`\n${rows.length - rows.filter((r) => !r.ok).length}/${rows.length} checks passed${errors.length ? ', with page errors' : ''}.`);
await browser.close();
process.exit(bad ? 1 : 0);
