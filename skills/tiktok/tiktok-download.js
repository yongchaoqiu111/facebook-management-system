const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const MODULE = 'TikTokDownloadSkill';

// 全局会话
let globalBrowserSession = null;

function log(message) {
  console.log(`[${MODULE}] ${new Date().toLocaleString()}：${message}`);
}

// 保存 Cookie
async function saveCookies(page, cookiePath) {
  try {
    const cookies = await page.context().cookies();
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
    log('Cookie 已保存');
  } catch (e) {}
}

// 加载 Cookie
async function loadCookies(context, cookiePath) {
  try {
    if (fs.existsSync(cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiePath));
      await context.addCookies(cookies);
      log('Cookie 加载成功');
    }
  } catch (e) {}
}

// ==============================================
// 修复：智能等待登录/验证（带超时，不会无限循环）
// ==============================================
async function waitForLoginComplete(page, maxWaitSeconds = 180) {
  log(`等待登录/人机验证，最长等待 ${maxWaitSeconds} 秒...`);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    try {
      const loggedIn = await page.evaluate(() => {
        const isLoggedIn = !!document.querySelector('img[alt*="Avatar"], [data-e2e="profile-button"]');
        const isVideoPage = location.pathname.includes('/video/');
        const isUserPage = location.pathname.includes('@');
        return isLoggedIn || isVideoPage || isUserPage;
      });

      if (loggedIn) {
        log('✅ 验证/登录完成！开始下载...');
        return true;
      }
    } catch (e) {}

    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error('等待验证超时，请重试');
}

// ==============================================
// 修复：支持【用户主页】+【单视频页】提取无水印
// ==============================================
async function extractVideosFromDOM(page) {
  return await page.evaluate(() => {
    try {
      const ele = document.getElementById('__UNIVERSAL_DATA__');
      if (!ele) return [];
      const data = JSON.parse(ele.innerText);

      let items = [];

      // 1. 用户主页视频列表
      if (data?.__DEFAULT_SCOPE__?.webapp?.userDetail?.video?.itemModule) {
        const module = data.__DEFAULT_SCOPE__.webapp.userDetail.video.itemModule;
        items = Object.values(module);
      }

      // 2. 单个视频详情页
      else if (data?.__DEFAULT_SCOPE__?.webapp?.videoDetail?.itemModule) {
        const module = data.__DEFAULT_SCOPE__.webapp.videoDetail.itemModule;
        items = Object.values(module);
      }

      // 提取无水印
      return items.map(v => {
        const wmUrl = v.video?.playAddr;
        const rawUrl = v.video?.downloadAddr;
        return {
          id: v.id,
          desc: v.desc || '',
          url: rawUrl || (wmUrl ? wmUrl.replace('playwm', 'play') : null),
          cover: v.video?.cover
        };
      }).filter(v => v.url);
    } catch (e) {
      return [];
    }
  });
}

// 下载视频
async function downloadVideo(url, savePath) {
  try {
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const res = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      }
    });

    return new Promise((resolve) => {
      const writer = fs.createWriteStream(savePath);
      res.data.pipe(writer);
      writer.on('close', () => resolve(true));
      writer.on('error', () => resolve(false));
    });
  } catch {
    return false;
  }
}

// ==============================================
// 主函数：单按钮（支持用户名 + 视频链接）
// ==============================================
async function downloadTikTokMedia(input) {
  const { target, downloadLimit = 50 } = input;
  if (!target) return { code: 400, msg: '请输入用户名或视频链接' };

  const root = path.join(__dirname, '../../user-config');
  const cookiePath = path.join(root, 'accounts', 'tiktok.json');
  const downloadDir = path.join(root, 'assets', 'tiktok', 'download');

  try {
    // 打开浏览器
    if (!globalBrowserSession) {
      const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await context.newPage();
      globalBrowserSession = { browser, context, page };
    }

    const { page, context } = globalBrowserSession;
    await loadCookies(context, cookiePath);

    // 自动识别：用户名 / 视频链接
    let url;
    if (target.startsWith('http')) {
      url = target;
      log('打开视频链接：' + target);
    } else {
      url = `https://www.tiktok.com/@${target}`;
      log('打开用户主页：@' + target);
    }

    await page.goto(url, { timeout: 60000, waitUntil: 'networkidle' });

    // 等待验证完成（带超时，不会死循环）
    await waitForLoginComplete(page, 180);
    await saveCookies(page, cookiePath);

    // 滚动加载（仅主页需要）
    log('获取视频列表...');
    let videos = [];
    const isVideoPage = page.url().includes('/video/');

    if (isVideoPage) {
      videos = await extractVideosFromDOM(page);
    } else {
      for (let i = 0; i < 15; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
        videos = await extractVideosFromDOM(page);
        if (videos.length >= downloadLimit) break;
      }
    }

    // 下载
    const list = videos.slice(0, downloadLimit);
    let success = 0;

    for (const video of list) {
      const savePath = path.join(downloadDir, `${Date.now()}_${video.id}.mp4`);
      const ok = await downloadVideo(video.url, savePath);
      if (ok) success++;
      log(`下载 ${success}/${list.length}：${video.desc.slice(0, 20)}`);
    }

    // 关闭
    await globalBrowserSession.browser.close();
    globalBrowserSession = null;

    return {
      code: 0,
      msg: '下载完成',
      total: list.length,
      success,
      path: downloadDir
    };

  } catch (err) {
    log('错误：' + err.message);
    if (globalBrowserSession) {
      await globalBrowserSession.browser.close();
      globalBrowserSession = null;
    }
    return { code: 500, msg: err.message };
  }
}

module.exports = { downloadTikTokMedia };