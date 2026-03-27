const MODULE = 'HeadedSimulator';

interface SimulationOptions {
  taskId: string;
  accountId: string;
  keepOpenSeconds: number;
}

interface SimulationResult {
  ok: boolean;
  message: string;
}

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSteps(accountId: string): string[] {
  return [
    `账号确认：${accountId}`,
    '打开微博页面（模拟）',
    '搜索 AI 相关新闻（公开来源）',
    '整理新闻摘要（不复制原文）',
    '按人设生成微博文案',
    '可选配图步骤（可跳过）',
    '发布微博（模拟提交，不真实发送）'
  ];
}

export async function runHeadedWeiboSimulation(options: SimulationOptions): Promise<SimulationResult> {
  let browserRef: { close: () => Promise<void> } | null = null;

  try {
    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({
      headless: false,
      slowMo: 250
    });
    browserRef = browser;

    const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
    const steps = getSteps(options.accountId);

    await page.setContent(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Weibo Flow Simulator</title>
          <style>
            body { font-family: Segoe UI, PingFang SC, Arial, sans-serif; margin: 0; background: #0b1220; color: #e5e7eb; }
            .wrap { max-width: 900px; margin: 0 auto; padding: 24px; }
            h1 { margin: 0 0 8px; font-size: 26px; }
            .sub { color: #93c5fd; margin-bottom: 18px; }
            .hint { color: #9ca3af; margin-bottom: 18px; }
            ul { list-style: none; padding: 0; margin: 0; }
            li { border: 1px solid #1f2937; background: #111827; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
            .todo { color: #9ca3af; }
            .running { color: #fbbf24; border-color: #f59e0b; }
            .done { color: #34d399; border-color: #10b981; }
            .footer { margin-top: 16px; color: #93c5fd; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <h1>微博自动流程（有头模拟）</h1>
            <div class="sub">Task: ${options.taskId}</div>
            <div class="hint">该窗口为演示流程，不会真实发送微博。</div>
            <ul id="steps"></ul>
            <div class="footer" id="status">准备开始...</div>
          </div>
        </body>
      </html>
    `);

    await page.evaluate((items: string[]) => {
      const ul = document.getElementById('steps');
      if (!ul) {
        return;
      }
      ul.innerHTML = '';
      items.forEach((item, i) => {
        const li = document.createElement('li');
        li.id = `step-${i}`;
        li.className = 'todo';
        li.textContent = `⏳ ${item}`;
        ul.appendChild(li);
      });
    }, steps);

    for (let i = 0; i < steps.length; i += 1) {
      await page.evaluate(({ idx, text }: { idx: number; text: string }) => {
        const status = document.getElementById('status');
        const li = document.getElementById(`step-${idx}`);
        if (status) {
          status.textContent = `执行中：${text}`;
        }
        if (li) {
          li.className = 'running';
          li.textContent = `🔄 ${text}`;
        }
      }, { idx: i, text: steps[i] });
      await sleep(900);
      await page.evaluate(({ idx, text }: { idx: number; text: string }) => {
        const li = document.getElementById(`step-${idx}`);
        if (li) {
          li.className = 'done';
          li.textContent = `✅ ${text}`;
        }
      }, { idx: i, text: steps[i] });
    }

    await page.evaluate((seconds: number) => {
      const status = document.getElementById('status');
      if (status) {
        status.textContent = `模拟完成。窗口将在 ${seconds} 秒后自动关闭。`;
      }
    }, options.keepOpenSeconds);

    log(`simulation complete task=${options.taskId}; keepOpenSeconds=${options.keepOpenSeconds}`);
    await sleep(Math.max(1, options.keepOpenSeconds) * 1000);
    await browser.close();

    return {
      ok: true,
      message: '有头模拟已完成。'
    };
  } catch (error: unknown) {
    if (browserRef) {
      await browserRef.close().catch(() => undefined);
    }

    const msg = error instanceof Error ? error.message : String(error);
    log(`simulation failed: ${msg}`);
    return {
      ok: false,
      message: `有头模拟失败：${msg}`
    };
  }
}
