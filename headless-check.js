(async ()=>{
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const logs = [];
    page.on('console', msg => logs.push(msg.type() + ': ' + msg.text()));
    page.on('pageerror', err => logs.push('pageerror: ' + err.message));

    console.log('Loading https://musicconnectz.net/ ...');
    await page.goto('https://musicconnectz.net/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    const hasGoogleMaps = await page.evaluate(() => !!(window.google && window.google.maps));
    console.log('HAS_GOOGLE_MAPS=' + hasGoogleMaps);

    console.log('---PAGE CONSOLE LOGS---');
    if (logs.length === 0) console.log('<no console logs>');
    else console.log(logs.join('\n'));

    await page.screenshot({ path: 'musicconnectz_headless.png', fullPage: true });
    console.log('Saved screenshot: musicconnectz_headless.png');

    await browser.close();
  } catch (e) {
    console.error('ERROR:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
