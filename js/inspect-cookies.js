const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://m.weibo.cn/?lang=zh-Hans', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  const cookies = await context.cookies();
  console.log(JSON.stringify(cookies.map((c) => ({ name: c.name, domain: c.domain, valueLength: (c.value || '').length })), null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
