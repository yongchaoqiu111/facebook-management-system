# Cookie 存取标准说明书

## 1. 标准概述

为了统一项目中cookie的处理方式，确保所有技能能够正确共享和使用cookie，特制定本标准。本标准基于之前成功的cookie处理经验，确保代码的可靠性和一致性。

## 2. 存储规范

### 2.1 存储格式
- **格式类型**：文本格式（TXT）
- **存储结构**：每行一个cookie，字段用制表符（\t）分隔
- **编码方式**：UTF-8

### 2.2 存储位置
- **目录**：项目根目录下的 `cookie/` 文件夹
- **路径**：`{project_root}/cookie/`

### 2.3 文件命名
- **命名规则**：`{platform}.txt`
- **示例**：
  - Facebook: `facebook.txt`
  - TikTok: `tiktok.txt`
  - Weibo: `weibo.txt`

## 3. 数据结构

每个cookie包含以下字段（用制表符分隔）：

| 字段 | 描述 | 示例值 |
|------|------|--------|
| name | cookie名称 | c_user |
| value | cookie值 | 61586359747589 |
| domain | 域名 | .facebook.com |
| path | 路径 | / |
| expires | 过期时间 | 2027-03-17T14:48:54.996Z 或 "会话" |
| httpOnly | 是否仅HTTP | ✓ 或空 |
| secure | 是否安全 | ✓ 或空 |
| sameSite | 同源策略 | Lax 或空 |

## 4. 加载方法

### 4.1 核心代码

```typescript
import * as fs from 'fs';
import * as path from 'path';

// 加载cookie
async function loadCookies(page: Page, platform: string): Promise<void> {
  const cookiePath = path.join(process.cwd(), 'cookie', `${platform}.txt`);
  
  if (fs.existsSync(cookiePath)) {
    try {
      const cookieContent = fs.readFileSync(cookiePath, 'utf-8');
      const cookies = parseTextCookies(cookieContent);
      
      if (cookies.length > 0) {
        await page.context().addCookies(cookies);
        console.log(`成功加载${platform}的cookie，共${cookies.length}个`);
      }
    } catch (error) {
      console.error('加载cookie失败:', error);
    }
  }
}

// 解析文本格式cookie
function parseTextCookies(text: string): Array<{
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
        sameSite: parts[7] as 'Strict' | 'Lax' | 'None' || 'Lax'
      });
    }
  }

  return cookies;
}
```

### 4.2 使用示例

```typescript
// 在浏览器启动后调用
await loadCookies(page, 'facebook');

// 然后访问网站
await page.goto('https://www.facebook.com');
```

## 5. 保存方法

### 5.1 核心代码

```typescript
import * as fs from 'fs';
import * as path from 'path';

// 保存cookie
async function saveCookies(page: Page, platform: string): Promise<void> {
  const cookiePath = path.join(process.cwd(), 'cookie', `${platform}.txt`);
  
  try {
    const cookies = await page.context().cookies();
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
    
    fs.writeFileSync(cookiePath, cookieContent);
    console.log(`成功保存${platform}的cookie到 ${cookiePath}`);
  } catch (error) {
    console.error('保存cookie失败:', error);
  }
}
```

### 5.2 使用示例

```typescript
// 在登录成功后调用
await saveCookies(page, 'facebook');
```

## 6. 最佳实践

### 6.1 错误处理
- 当cookie文件不存在时，应优雅处理，不影响程序运行
- 当cookie文件格式错误时，应捕获异常并记录日志
- 当cookie加载失败时，应允许程序继续执行，尝试其他登录方式

### 6.2 安全性
- 不要在代码中硬编码账号密码
- 不要将cookie文件提交到版本控制系统
- 确保cookie文件的访问权限设置正确

### 6.3 性能优化
- 只在必要时加载和保存cookie
- 避免频繁读写cookie文件
- 考虑使用内存缓存减少文件I/O操作

## 7. 兼容性

本标准兼容以下场景：
- 使用Playwright进行浏览器自动化
- 使用Puppeteer进行浏览器自动化
- 其他需要cookie持久化的场景

## 8. 迁移指南

### 8.1 从旧格式迁移
如果您之前使用的是其他格式的cookie存储，可以使用以下步骤迁移：

1. 运行现有的登录流程，使用本标准的保存方法保存cookie
2. 删除旧格式的cookie文件
3. 更新代码以使用本标准的加载方法

### 8.2 跨平台兼容性
本标准在不同操作系统上的表现一致，无需针对不同平台进行特殊处理。

## 9. 故障排除

### 9.1 常见问题
- **cookie加载失败**：检查文件路径是否正确，文件格式是否符合标准
- **登录状态丢失**：检查cookie是否过期，尝试重新登录并保存新的cookie
- **权限错误**：确保程序有读写cookie文件的权限

### 9.2 调试建议
- 启用详细日志，记录cookie的加载和保存过程
- 检查cookie文件的内容，确保格式正确
- 使用浏览器的开发者工具检查cookie是否正确设置

## 10. 标准版本

- **版本**：1.0.0
- **生效日期**：2026-03-18
- **更新记录**：
  - 1.0.0：初始版本，基于成功的Facebook登录经验制定

## 11. 结语

本标准旨在提供一种统一、可靠的cookie处理方式，确保项目中的所有技能能够正确共享和使用cookie。遵循本标准将有助于提高代码的可维护性和可靠性，减少因cookie处理不当导致的问题。

如果您有任何疑问或