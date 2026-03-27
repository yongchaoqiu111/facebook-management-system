# 开发文档

## 文件放置标准

为了保持代码库的整洁和可维护性，所有文件必须按照以下标准放置：

- **.js** 文件：放置在 `js/` 目录
- **.ts** 文件：放置在 `ts/` 目录
- **.py** 文件：放置在 `py/` 目录
- **.log** 文件：放置在 `logs/` 目录
- **.json** 文件：放置在 `config/` 目录
- **.env** 文件：放置在 `config/` 目录
- **.ps1** 文件：放置在 `scripts/` 目录
- **.sh** 文件：放置在 `scripts/` 目录
- **.bat** 文件：放置在 `scripts/` 目录
- **.cmd** 文件：放置在 `scripts/` 目录
- **.exe** 文件：放置在 `installers/` 目录

## 其他文件

- **配置文件**：放置在 `config/` 目录
- **脚本文件**：放置在 `scripts/` 目录
- **日志文件**：放置在 `logs/` 目录
- **安装程序**：放置在 `installers/` 目录
- **数据库文件**：保持在根目录
- **README.md**：保持在根目录
- **.env.example**：保持在根目录
- **.gitignore**：保持在根目录

## 路径引用规范

在代码中引用其他文件时，应使用相对路径，并遵循以下格式：

```
// 正确示例
import module from './js/module.js';
const config = require('./config/config.json');

// 错误示例
import module from './module.js'; // 应使用 ./js/module.js
const config = require('./config.json'); // 应使用 ./config/config.json
```

## Cookie 处理标准

为了统一cookie的处理方式，所有技能必须遵循以下标准：

1. **存储格式**：使用文本格式存储cookie，每行一个cookie，字段用制表符分隔
2. **存储位置**：cookie文件应放置在 `cookie/` 目录下
3. **文件命名**：按照 `{platform}.txt` 的格式命名，例如 `facebook.txt`
4. **数据结构**：每行包含以下字段（用制表符分隔）：
   - name: cookie名称
   - value: cookie值
   - domain: 域名
   - path: 路径
   - expires: 过期时间（ISO格式或"会话"）
   - httpOnly: 是否仅HTTP（✓表示是）
   - secure: 是否安全（✓表示是）
   - sameSite: 同源策略
   - priority: 优先级
   - sameParty: 是否同党
   - sourceScheme: 源方案
   - partitionKey: 分区键

5. **加载方式**：解析文本格式cookie并使用 `page.context().addCookies()` 加载
6. **保存方式**：使用 `page.context().cookies()` 获取cookie并以文本格式保存

**示例代码**：

```typescript
// 加载cookie
if (fs.existsSync(cookiePath)) {
  try {
    const cookieContent = fs.readFileSync(cookiePath, 'utf-8');
    const cookies = cookieContent.split('\n').map(line => {
      const parts = line.split('\t');
      if (parts.length >= 7) {
        const cookie = {
          name: parts[0],
          value: parts[1],
          domain: parts[2],
          path: parts[3],
          httpOnly: parts[5] === '✓',
          secure: parts[6] === '✓'
        };
        
        // 处理过期时间
        const expiresStr = parts[4];
        if (expiresStr && expiresStr !== '会话') {
          const expires = new Date(expiresStr);
          if (!isNaN(expires.getTime())) {
            cookie.expires = expires.getTime() / 1000;
          }
        }
        
        return cookie;
      }
      return null;
    }).filter(Boolean);
    
    await page.context().addCookies(cookies);
  } catch (error) {
    console.error('加载cookie失败:', error);
  }
}

// 保存cookie
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
    cookie.sameSite || '',
    cookie.priority || '',
    cookie.sameParty || '',
    cookie.sourceScheme || '',
    cookie.partitionKey || ''
  ].join('\t');
}).join('\n');
fs.writeFileSync(cookiePath, cookieContent);
```
