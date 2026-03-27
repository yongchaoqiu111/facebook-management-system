import { chromium, Page, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import random from 'random';

// 使用process.cwd()获取当前工作目录
const currentDir = process.cwd();

interface JoinGroupResult {
  ok: boolean;
  code: number;
  message: string;
  data?: {
    joinedGroups: string[];
  };
  traceId?: string;
  durationMs?: number;
}

interface JoinGroupInput {
  email?: string;
  password?: string;
  maxGroups?: number;
  traceId?: string;
  taskId?: string;
  accountId?: string;
}

class FacebookJoinGroups {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private keywords: string[] = [];
  private joinedGroups: string[] = [];
  private cookiePath = path.join(currentDir, 'cookie', 'facebook.txt');
  private keywordsPath = path.join(currentDir, 'skills', 'facebook_group_keywords.txt');

  constructor() {
    this.loadKeywords();
  }

  private loadKeywords(): void {
    try {
      if (fs.existsSync(this.keywordsPath)) {
        const content = fs.readFileSync(this.keywordsPath, 'utf-8');
        this.keywords = content
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line && !line.startsWith('#'));
      } else {
        // 默认关键词
        const defaultKeywords = ["AI 运用", "openclaw", "notebook", "人工智能", "机器学习", "数据科学", "编程", "技术交流", "创业", "科技"];
        fs.writeFileSync(this.keywordsPath, defaultKeywords.join('\n'));
        this.keywords = defaultKeywords;
      }
    } catch (error) {
      console.error('加载关键词失败:', error);
      this.keywords = ["AI 运用", "openclaw", "notebook"];
    }
  }

  private async startBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: false, // 开发时使用有头模式
      args: ['--disable-notifications']
    });
    this.page = await this.browser.newPage();

    // 尝试加载cookie
    if (fs.existsSync(this.cookiePath)) {
      try {
        const cookieContent = fs.readFileSync(this.cookiePath, 'utf-8');
        // 检查是否是JSON格式
        if (cookieContent.trim().startsWith('[')) {
          // JSON格式
          const cookies = JSON.parse(cookieContent);
          await this.page.context().addCookies(cookies);
          console.log('成功加载JSON格式cookie');
        } else {
          // 文本格式（之前成功的格式）
          const cookies = this.parseTextCookies(cookieContent);
          if (cookies.length > 0) {
            await this.page.context().addCookies(cookies);
            console.log(`成功加载文本格式cookie，共${cookies.length}个`);
          }
        }
      } catch (error) {
        console.error('加载cookie失败:', error);
      }
    }
  }

  private parseTextCookies(text: string): Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }> {
    const cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      expires?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'Strict' | 'Lax' | 'None';
    }> = [];

    const lines = text.trim().split('\n');
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 7) {
        const [name, value, domain, path, expiresStr, httpOnlyStr, secureStr] = parts;
        
        let expires: number | undefined;
        if (expiresStr !== '会话') {
          const expiresDate = new Date(expiresStr);
          if (!isNaN(expiresDate.getTime())) {
            expires = Math.floor(expiresDate.getTime() / 1000);
          }
        }

        cookies.push({
          name,
          value,
          domain,
          path,
          expires,
          httpOnly: httpOnlyStr === '✓',
          secure: secureStr === '✓',
          sameSite: 'Lax' // 默认值
        });
      }
    }

    return cookies;
  }

  private async saveCookies(): Promise<void> {
    if (this.page) {
      try {
        const cookies = await this.page.context().cookies();
        // 保存为文本格式（与之前成功的格式保持一致）
        const cookieContent = cookies.map(cookie => {
          return [
            cookie.name,
            cookie.value,
            cookie.domain,
            cookie.path,
            cookie.expires ? new Date(cookie.expires * 1000).toISOString() : '会话',
            cookie.httpOnly ? '✓' : '',
            cookie.secure ? '✓' : '',
            cookie.sameSite || ''
          ].join('\t');
        }).join('\n');
        fs.writeFileSync(this.cookiePath, cookieContent);
      } catch (error) {
        console.error('保存cookie失败:', error);
      }
    }
  }

  private async login(email: string, password: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      await this.page.goto('https://www.facebook.com');
      // 等待页面加载
      await this.page.waitForLoadState('networkidle');
      
      // 尝试所有可能的选择器
      const emailSelectors = [
        '#email',
        'input[type="email"]',
        'input[placeholder*="邮箱"]',
        'input[placeholder*="email"]',
        'input[name="email"]',
        'input[id="email"]',
        'input[data-testid*="email"]',
        'input[aria-label*="邮箱"]',
        'input[aria-label*="email"]',
        'input[id*="email"]',
        'input[name*="email"]'
      ];
      
      const passwordSelectors = [
        '#pass',
        'input[type="password"]',
        'input[placeholder*="密码"]',
        'input[placeholder*="password"]',
        'input[name="pass"]',
        'input[id="pass"]',
        'input[data-testid*="password"]',
        'input[aria-label*="密码"]',
        'input[aria-label*="password"]',
        'input[id*="pass"]',
        'input[name*="pass"]'
      ];
      
      const loginButtonSelectors = [
        'button[name="login"]',
        'button[type="submit"]',
        'button:has-text("登录")',
        'button:has-text("Log In")',
        'button[data-testid*="login"]',
        'button[aria-label*="登录"]',
        'button[aria-label*="Log In"]',
        'input[type="submit"]'
      ];
      
      // 尝试找到邮箱输入框
      let foundEmail = false;
      for (const selector of emailSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.fill(selector, email);
          console.log(`成功找到邮箱输入框: ${selector}`);
          foundEmail = true;
          break;
        } catch (error) {
          console.log(`尝试邮箱选择器失败: ${selector}`);
          continue;
        }
      }
      
      if (!foundEmail) {
        console.error('未能找到邮箱输入框');
        return false;
      }
      
      // 尝试找到密码输入框
      let foundPassword = false;
      for (const selector of passwordSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.fill(selector, password);
          console.log(`成功找到密码输入框: ${selector}`);
          foundPassword = true;
          
          // 在密码输入框中按回车键提交登录
          console.log('在密码输入框中按回车键提交登录...');
          await this.page.keyboard.press('Enter');
          break;
        } catch (error) {
          console.log(`尝试密码选择器失败: ${selector}`);
          continue;
        }
      }
      
      if (!foundPassword) {
        console.error('未能找到密码输入框');
        return false;
      }

      // 等待登录完成
      await this.page.waitForNavigation({ timeout: 30000 }).catch(() => {});
      
      // 等待页面稳定
      await this.page.waitForTimeout(2000);
      
      // 获取页面标题和URL
      const pageTitle = await this.page.title();
      const pageUrl = this.page.url();
      console.log(`登录后页面标题: ${pageTitle}`);
      console.log(`登录后页面URL: ${pageUrl}`);
      
      // 检查是否登录成功（借鉴发帖判断逻辑：发帖按钮出现，登录按钮消失）
      const loggedIn = await this.page.evaluate(() => {
        // 检查发帖按钮是否出现
        const hasPostButton = !!document.querySelector('[aria-label="发帖"]') || 
                            !!document.querySelector('[aria-label="Create Post"]') ||
                            !!document.querySelector('[data-testid="create-post-button"]') ||
                            !!document.querySelector('button[data-testid="create-post-button"]') ||
                            !!document.querySelector('div[role="button"]') ||
                            document.querySelectorAll('button').length > 5;
        
        // 检查登录按钮是否消失
        const loginButtonGone = !document.querySelector('button[name="login"]') && 
                              !document.querySelector('input[type="email"]') &&
                              !document.querySelector('input[type="password"]') &&
                              !document.querySelector('#email') &&
                              !document.querySelector('#pass');
        
        // 检查是否有导航栏
        const hasNavigation = !!document.querySelector('[role="navigation"]') ||
                           !!document.querySelector('[aria-label="主页"]') ||
                           !!document.querySelector('div[role="banner"]');
        
        return hasPostButton && loginButtonGone && hasNavigation;
      });

      if (loggedIn) {
        await this.saveCookies();
        console.log('登录成功！');
        return true;
      } else {
        // 检查是否有验证码页面
        const hasCaptcha = await this.page.evaluate(() => {
          return !!document.querySelector('[role="presentation"]') || 
                 !!document.querySelector('[data-testid="captcha"]') ||
                 !!document.querySelector('#captcha') ||
                 document.body.textContent?.includes('验证码') ||
                 document.body.textContent?.includes('验证') ||
                 document.body.textContent?.includes('security') ||
                 document.body.textContent?.includes('verification');
        });
        
        if (hasCaptcha) {
          console.log('登录失败：需要验证码');
        } else {
          console.log('登录失败：账号或密码错误');
        }
        return false;
      }
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  }

  private async goToGroups(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // 点击小组图标（使用用户提供的class选择器）
      await this.page.waitForSelector('span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6', { timeout: 15000 });
      await this.page.click('span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6');
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      return true;
    } catch (error) {
      console.error('进入小组页面失败:', error);
      return false;
    }
  }

  private async searchGroup(keyword: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      // 找到搜索框
      await this.page.waitForSelector('input[placeholder="搜索"]', { timeout: 10000 });
      await this.page.fill('input[placeholder="搜索"]', keyword);
      await this.page.press('input[placeholder="搜索"]', 'Enter');
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      return true;
    } catch (error) {
      console.error('搜索小组失败:', error);
      return false;
    }
  }

  private async selectGroup(): Promise<string | null> {
    if (!this.page) return null;

    try {
      // 找到所有小组卡片
      await this.page.waitForSelector('div[role="article"]', { timeout: 10000 });
      const groupCards = await this.page.$$('div[role="article"]');

      for (const card of groupCards) {
        try {
          // 检查是否可以加入
          const joinButtons = await card.$$('button');
          let joinButton: any = null;
          
          for (const button of joinButtons) {
            const text = await button.textContent();
            if (text && (text.includes('加入') || text.includes('Join'))) {
              joinButton = button;
              break;
            }
          }

          if (joinButton) {
            // 获取小组名称
            const nameElements = await card.$$('span[dir="auto"]');
            if (nameElements.length > 0) {
              const groupName = await nameElements[0].textContent();
              if (groupName && !this.joinedGroups.includes(groupName)) {
                await joinButton.click();
                await this.page.waitForTimeout(3000);
                return groupName;
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
      return null;
    } catch (error) {
      console.error('选择小组失败:', error);
      return null;
    }
  }

  private async handleQuestions(groupName: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      // 检查是否有问答对话框
      const questionDialog = await this.page.waitForSelector('div[aria-label*="加入小组"]', { timeout: 10000 }).catch(() => null);
      
      if (!questionDialog) {
        // 没有问答，直接加入成功
        return true;
      }

      // 找到所有问题输入框
      const questions = await questionDialog.$$('div[role="textbox"]');
      
      for (const question of questions) {
        try {
          // 生成回答
          const answer = this.generateAnswer(groupName);
          await question.fill(answer);
          await this.page.waitForTimeout(2000);
        } catch (error) {
          console.error('回答问题失败:', error);
        }
      }

      // 提交回答
      const submitButtons = await questionDialog.$$('button');
      for (const button of submitButtons) {
        const text = await button.textContent();
        if (text && (text.includes('提交') || text.includes('Submit'))) {
          await button.click();
          await this.page.waitForTimeout(5000);
          break;
        }
      }

      return true;
    } catch (error) {
      console.error('处理问答失败:', error);
      return false;
    }
  }

  private generateAnswer(groupName: string): string {
    const answers = [
      `我对${groupName}非常感兴趣，希望能加入小组与大家交流学习。`,
      `听说这个小组很活跃，想加入一起讨论相关话题。`,
      `我在相关领域有一些经验，希望能为小组贡献自己的知识。`,
      `一直在寻找相关的社区，希望能在这里找到志同道合的朋友。`,
      `对这个主题很感兴趣，想加入小组学习更多知识。`
    ];
    return answers[random.int(0, answers.length - 1)];
  }

  private async joinGroup(): Promise<boolean> {
    if (!this.page || this.keywords.length === 0) {
      return false;
    }

    // 随机选择一个关键词
    const keyword = this.keywords[random.int(0, this.keywords.length - 1)];
    console.log(`正在搜索关键词: ${keyword}`);

    if (!await this.searchGroup(keyword)) {
      return false;
    }

    const groupName = await this.selectGroup();
    if (!groupName) {
      console.log('没有找到可加入的小组');
      return false;
    }

    console.log(`正在加入小组: ${groupName}`);

    if (!await this.handleQuestions(groupName)) {
      console.log('处理问答失败');
      return false;
    }

    this.joinedGroups.push(groupName);
    console.log(`成功加入小组: ${groupName}`);
    return true;
  }

  async run(input: JoinGroupInput): Promise<JoinGroupResult> {
    const startTime = Date.now();
    const traceId = input.traceId || `trace-${Date.now()}`;

    try {
      await this.startBrowser();

      if (!this.page) {
        return {
          ok: false,
          code: 500,
          message: '浏览器启动失败',
          traceId,
          durationMs: Date.now() - startTime
        };
      }

      // 先检查是否已经登录（可能是手动登录的）
      await this.page.goto('https://www.facebook.com');
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });

      // 使用发帖判断逻辑：发帖按钮出现，登录按钮消失
      const isAlreadyLoggedIn = await this.page.evaluate(() => {
        // 检查发帖按钮是否出现
        const hasPostButton = !!document.querySelector('[aria-label="发帖"]') || 
                            !!document.querySelector('[aria-label="Create Post"]') ||
                            !!document.querySelector('[data-testid="create-post-button"]') ||
                            !!document.querySelector('button[data-testid="create-post-button"]') ||
                            !!document.querySelector('div[role="button"]') ||
                            document.querySelectorAll('button').length > 5;
        
        // 检查登录按钮是否消失
        const loginButtonGone = !document.querySelector('button[name="login"]') && 
                              !document.querySelector('input[type="email"]') &&
                              !document.querySelector('input[type="password"]') &&
                              !document.querySelector('#email') &&
                              !document.querySelector('#pass');
        
        // 检查是否有导航栏
        const hasNavigation = !!document.querySelector('[role="navigation"]') ||
                           !!document.querySelector('[aria-label="主页"]') ||
                           !!document.querySelector('div[role="banner"]');
        
        return hasPostButton && loginButtonGone && hasNavigation;
      });

      if (isAlreadyLoggedIn) {
        console.log('检测到已经登录，保存当前cookie...');
        await this.saveCookies();
        console.log('Cookie已保存！');
      } else if (input.email && input.password) {
        // 如果未登录且提供了账号密码，尝试登录
        console.log('使用账号密码登录...');
        if (!await this.login(input.email, input.password)) {
          return {
            ok: false,
            code: 401,
            message: '登录失败',
            traceId,
            durationMs: Date.now() - startTime
          };
        }
      } else {
        return {
          ok: false,
          code: 401,
          message: '未提供登录信息且未找到有效cookie',
          traceId,
          durationMs: Date.now() - startTime
        };
      }

      if (!await this.goToGroups()) {
        return {
          ok: false,
          code: 500,
          message: '进入小组页面失败',
          traceId,
          durationMs: Date.now() - startTime
        };
      }

      const maxGroups = input.maxGroups || 1;
      let joinedCount = 0;

      while (joinedCount < maxGroups) {
        if (await this.joinGroup()) {
          joinedCount++;
          // 控制加入频率，避免账号被降权
          console.log(`已加入 ${joinedCount} 个小组，等待 60 秒再继续...`);
          await this.page.waitForTimeout(60000);
        } else {
          // 如果失败，等待 30 秒再重试
          console.log('加入失败，等待 30 秒再重试...');
          await this.page.waitForTimeout(30000);
        }
      }

      return {
        ok: true,
        code: 0,
        message: '加入小组成功',
        data: {
          joinedGroups: this.joinedGroups
        },
        traceId,
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      console.error('运行失败:', error);
      return {
        ok: false,
        code: 500,
        message: `运行失败: ${error instanceof Error ? error.message : String(error)}`,
        traceId,
        durationMs: Date.now() - startTime
      };
    } finally {
      // 不要关闭浏览器，让用户手动操作
      // if (this.browser) {
      //   await this.browser.close();
      // }
      console.log('浏览器窗口已保持打开状态，请手动操作...');
    }
  }

  // 健康检查
  healthCheck(): { ok: boolean; message: string } {
    return {
      ok: true,
      message: 'Facebook加入小组技能健康状态正常'
    };
  }
}

// 导出技能
export const skillId = 'mcp-weibo-facebook-join-groups';
export const name = 'facebook-join-groups';
export const version = '1.0.0';
export const description = '自动加入Facebook小组，支持关键词搜索和问答处理';
export const inputSchema = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      description: 'Facebook账号邮箱'
    },
    password: {
      type: 'string',
      description: 'Facebook账号密码'
    },
    maxGroups: {
      type: 'number',
      default: 1,
      description: '最多加入的小组数量'
    },
    traceId: {
      type: 'string',
      description: '追踪ID'
    },
    taskId: {
      type: 'string',
      description: '任务ID'
    },
    accountId: {
      type: 'string',
      description: '账号ID'
    }
  }
};
export const outputSchema = {
  type: 'object',
  properties: {
    joinedGroups: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: '成功加入的小组列表'
    }
  }
};
export const healthCheckUrl = '/health/facebook-join-groups';
export const communicationMode = 'local-function';
export const timeout = 300000; // 5分钟超时

// 创建技能实例
const facebookJoinGroups = new FacebookJoinGroups();

// 导出执行函数
export async function execute(input: JoinGroupInput): Promise<JoinGroupResult> {
  return await facebookJoinGroups.run(input);
}

// 导出健康检查函数
export function healthCheck(): { ok: boolean; message: string } {
  return facebookJoinGroups.healthCheck();
}
