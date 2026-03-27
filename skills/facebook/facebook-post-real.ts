import { chromium, Page, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// 使用process.cwd()获取当前工作目录
const currentDir = process.cwd();

interface FacebookPostInput {
  text: string;
  imagePaths?: string[];
  videoPath?: string;
  publish?: boolean;
  loginTimeoutSeconds?: number;
}

interface FacebookPostOutput {
  code: number;
  data: { postId: string; status: 'success' | 'draft' };
}

class FacebookPostReal {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cookiePath = path.join(currentDir, 'user-config', 'accounts', 'facebook.txt');

  private async startBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: false, // 开发时使用有头模式
      args: ['--disable-notifications']
    });
    this.page = await this.browser.newPage();

    // 尝试加载cookie
    const cookiePath = path.join(currentDir, 'user-config', 'accounts', 'facebook.txt');
    if (fs.existsSync(cookiePath)) {
      try {
        const cookieContent = fs.readFileSync(cookiePath, 'utf-8');
        // 检查是否是JSON格式
        if (cookieContent.trim().startsWith('[')) {
          // JSON格式
          const cookies = JSON.parse(cookieContent);
          await this.page.context().addCookies(cookies);
          console.log('成功加载JSON格式cookie');
        } else {
          // 文本格式
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
        // 保存为文本格式
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

  private async login(): Promise<boolean> {
    if (!this.page) return false;

    try {
      await this.page.goto('https://www.facebook.com');
      await this.page.waitForLoadState('networkidle', { timeout: 30000 });

      // 检查是否需要登录
      const loginForm = await this.page.waitForSelector('#login_form', { timeout: 10000 }).catch(() => null);
      if (loginForm) {
        console.error('需要登录，但未提供登录信息');
        return false;
      }

      // 检查是否登录成功
      const loggedIn = await this.page.evaluate(() => {
        return !!document.querySelector('[aria-label="主页"]');
      });

      if (loggedIn) {
        await this.saveCookies();
        return true;
      }
      return false;
    } catch (error) {
      console.error('登录检查失败:', error);
      return false;
    }
  }

  private async goToPostPage(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // 点击发帖按钮
      await this.page.waitForSelector('[aria-label="创建帖子"]', { timeout: 15000 });
      await this.page.click('[aria-label="创建帖子"]');
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      return true;
    } catch (error) {
      console.error('进入发帖页面失败:', error);
      return false;
    }
  }

  private async addContent(text: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      // 找到文本输入框
      await this.page.waitForSelector('[aria-label="你在想什么？"]', { timeout: 10000 });
      await this.page.fill('[aria-label="你在想什么？"]', text);
      await this.page.waitForTimeout(2000);
      return true;
    } catch (error) {
      console.error('添加内容失败:', error);
      return false;
    }
  }

  private async addImages(imagePaths: string[]): Promise<boolean> {
    if (!this.page) return false;

    try {
      // 找到图片上传按钮
      await this.page.waitForSelector('[aria-label="照片/视频"]', { timeout: 10000 });
      const uploadButton = await this.page.$('[aria-label="照片/视频"]');
      if (!uploadButton) {
        console.error('未找到图片上传按钮');
        return false;
      }

      // 点击上传按钮
      await uploadButton.click();
      await this.page.waitForSelector('input[type="file"]', { timeout: 10000 });
      const fileInput = await this.page.$('input[type="file"]');
      if (!fileInput) {
        console.error('未找到文件输入框');
        return false;
      }

      // 上传图片
      for (const imagePath of imagePaths) {
        const absolutePath = path.isAbsolute(imagePath) ? imagePath : path.join(currentDir, imagePath);
        if (fs.existsSync(absolutePath)) {
          await fileInput.setInputFiles(absolutePath);
          await this.page.waitForTimeout(3000);
        } else {
          console.error(`图片文件不存在: ${absolutePath}`);
        }
      }

      return true;
    } catch (error) {
      console.error('添加图片失败:', error);
      return false;
    }
  }

  private async publishPost(publish: boolean): Promise<boolean> {
    if (!this.page) return false;

    try {
      if (publish) {
        // 点击发布按钮
        await this.page.waitForSelector('[aria-label="发布"]', { timeout: 10000 });
        await this.page.click('[aria-label="发布"]');
        await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      } else {
        // 点击保存草稿按钮
        await this.page.waitForSelector('[aria-label="保存草稿"]', { timeout: 10000 });
        await this.page.click('[aria-label="保存草稿"]');
        await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      }
      return true;
    } catch (error) {
      console.error('发布帖子失败:', error);
      return false;
    }
  }

  async post(input: FacebookPostInput): Promise<FacebookPostOutput> {
    try {
      await this.startBrowser();

      if (!this.page) {
        return {
          code: 500,
          data: {
            postId: `fb_${Date.now()}`,
            status: 'draft'
          }
        };
      }

      // 检查登录状态
      if (!await this.login()) {
        return {
          code: 401,
          data: {
            postId: `fb_${Date.now()}`,
            status: 'draft'
          }
        };
      }

      // 进入发帖页面
      if (!await this.goToPostPage()) {
        return {
          code: 500,
          data: {
            postId: `fb_${Date.now()}`,
            status: 'draft'
          }
        };
      }

      // 添加内容
      if (!await this.addContent(input.text)) {
        return {
          code: 500,
          data: {
            postId: `fb_${Date.now()}`,
            status: 'draft'
          }
        };
      }

      // 添加图片
      if (input.imagePaths && input.imagePaths.length > 0) {
        if (!await this.addImages(input.imagePaths)) {
          return {
            code: 500,
            data: {
              postId: `fb_${Date.now()}`,
              status: 'draft'
            }
          };
        }
      }

      // 发布帖子
      if (!await this.publishPost(input.publish ?? false)) {
        return {
          code: 500,
          data: {
            postId: `fb_${Date.now()}`,
            status: 'draft'
          }
        };
      }

      return {
        code: 0,
        data: {
          postId: `fb_${Date.now()}`,
          status: input.publish ?? false ? 'success' : 'draft'
        }
      };
    } catch (error) {
      console.error('发帖失败:', error);
      return {
        code: 500,
        data: {
          postId: `fb_${Date.now()}`,
          status: 'draft'
        }
      };
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// 导出真实的发帖函数
export async function postToFacebookReal(input: FacebookPostInput): Promise<FacebookPostOutput> {
  const facebookPostReal = new FacebookPostReal();
  return await facebookPostReal.post(input);
}