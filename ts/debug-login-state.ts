import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

(async () => {
  const statePath = path.resolve(process.cwd(), '.weibo-storage-state.json');
  if (!fs.existsSync(statePath)) {
    console.log(JSON.stringify({ ok: false, message: 'STATE_MISSING' }));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: statePath });
    const page = await context.newPage();
    await page.goto('https://m.weibo.cn/compose/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    const url = page.url();
    const body = ((await page.textContent('body').catch(() => '')) || '').slice(0, 400);
    const loggedIn = !/login|passport|newlogin/i.test(url) && !/登录|注册/.test(body);

    console.log(JSON.stringify({ ok: true, loggedIn, url }, null, 2));
  } finally {
    await browser.close();
  }
})();
