const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });

        const html = await page.evaluate(() => document.body.innerHTML);
        console.log('--- BODY HTML ---');
        console.log(html.substring(0, 1000));

        await page.screenshot({ path: 'frontend_screenshot.png' });
        console.log('Saved frontend_screenshot.png');

        await browser.close();
    } catch (e) {
        console.error('Script Error:', e);
    }
})();
