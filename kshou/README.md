# 抖音登录管理系统

这是一个独立的抖音登录管理系统，用于打开抖音、保存 Cookie 和携带 Cookie 登录。

## 功能特点

- 打开抖音并手动登录
- 保存登录状态的 Cookie
- 使用保存的 Cookie 登录抖音
- 简单易用的 Web 界面

## 技术栈

- Node.js
- Express
- Puppeteer
- HTML/CSS/JavaScript

## 安装和使用

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
node login.js
```

服务器将在端口 3001 上运行。

### 3. 访问 Web 界面

打开浏览器，访问：

```
http://localhost:3001/login.html
```

### 4. 使用流程

1. **打开抖音**：点击"打开抖音"按钮，在新窗口中登录抖音
2. **保存 Cookie**：登录完成后，点击"保存Cookie"按钮，系统会保存当前登录状态的 Cookie
3. **携带 Cookie 登录**：点击"携带Cookie登录"按钮，系统会使用保存的 Cookie 登录抖音

## 命令行使用

除了 Web 界面，您还可以通过命令行使用以下命令：

- **打开抖音**：`node login.js open`
- **保存 Cookie**：`node login.js save`
- **携带 Cookie 登录**：`node login.js login`

## 目录结构

- `login.html` - Web 界面
- `login.js` - 后端服务器和 Puppeteer 脚本
- `package.json` - 依赖配置
- `cookie.txt` - Cookie 存储文件
- `chrome-profile-1774327512015/` - Chrome 配置文件目录
- `安装脚本/` - 安装脚本目录

## 注意事项

- 首次使用时，需要先打开抖音并手动登录
- Cookie 会保存在 `cookie.txt` 文件中
- 服务器运行在端口 3001 上，请确保该端口未被占用
- 本系统使用 Puppeteer 模拟浏览器操作，需要安装 Chrome 浏览器

## 故障排除

- **端口被占用**：如果端口 3001 被占用，请修改 `login.js` 文件中的 `PORT` 变量
- **Cookie 保存失败**：请确保已在浏览器中登录抖音
- **依赖安装失败**：请确保 Node.js 版本 >= 14.0.0

## 联系方式

如果您有任何问题或建议，请联系我们。