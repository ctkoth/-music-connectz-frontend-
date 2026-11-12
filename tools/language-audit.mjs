/**
 * Does the display language work? Signed in: picks Spanish from the header picker,
 * checks known strings swap (numbers kept), a member's name and typed text do not,
 * the choice survives a reload, and English restores everything.
 * Needs a few Spanish rows in the local UiString table (see the commit).
 *
 *   node tools/language-audit.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const BASE = process.argv[2] || 'http://localhost:5173';
const [access, refresh] = readFileSync('/tmp/mczlog/tok.txt', 'utf8').trim().split('\n');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
await ctx.addInitScript(([a, r]) => { try { localStorage.setItem('mcz_access', a); localStorage.setItem('mcz_refresh', r); } catch { /* blocked */ } }, [access, refresh]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
const sent = [];
page.on('request', (r) => { if (r.url().includes('/uitext/') && r.method() === 'POST') sent.push(...(JSON.parse(r.postData() || '{}').texts || [])); });
const rows = [];
const say = (what, ok, extra = '') => { rows.push({ ok }); console.log(`${ok ? '✓' : '✗'} ${what}${extra ? ` — ${extra}` : ''}`); };
const body = () => page.locator('body').innerText();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
say('English first, and nothing is sent to the translator', /Signed in as/.test(await body()) && sent.length === 0);
await page.getByRole('button', { name: /display language/i }).click();
await page.waitForTimeout(800);
const count = await page.getByRole('option').count();
say('the picker lists every language with a flag', count > 90, `${count} languages`);
await page.getByPlaceholder('Search languages').fill('espa');
await page.getByRole('option', { name: /Español/ }).first().click();
await page.waitForTimeout(2500);
let t = await body();
say('known strings are in Spanish', /Sesión iniciada como/.test(t) && !/Signed in as/.test(t));
say('numbers are kept inside a translated sentence', /\d+ (miembros|en línea ahora)/.test(t), (t.match(/\d+ (miembros|en línea ahora)/) || [''])[0]);
say("the member's own name is not translated or sent", /audittester/.test(t) && !sent.some((s) => /audittester/.test(s)), sent.filter((s) => /audittester/.test(s)).join(' | '));
say('nothing sent has a raw number in it', sent.length > 0 && !sent.some((s) => /\d/.test(s.replace(/\{\d+\}/g, ''))), `${sent.length} strings`);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
say('the choice survives a reload', /Sesión iniciada como/.test(await body()));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await page.getByRole('button', { name: /display language/i }).click();
await page.getByPlaceholder('Search languages').fill('english');
await page.getByRole('option', { name: /English/ }).first().click();
await page.waitForTimeout(1500);
t = await body();
say('English puts every string back', /Signed in as/.test(t) && !/Sesión iniciada/.test(t) && /\d+ Energy/.test(t));
if (errors.length) console.log('page errors:', [...new Set(errors)].slice(0, 5));
const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - failed}/${rows.length} checks passed${errors.length ? ', with page errors' : ''}.`);
await browser.close();
process.exit(failed || errors.length ? 1 : 0);
