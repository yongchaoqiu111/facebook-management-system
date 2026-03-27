# Facebook管理系统

本工程用于Facebook自动化编排，支持“技能模块化 + 工作流调度 + 可观测追踪 + LLM 统一配置”。

## 技术栈

- **运行环境**：Node.js
- **通信协议**：HTTP + WebSocket
- **大模型接口**：支持千问模型（Qwen）
- **定时任务**：基于node-schedule
- **技能模块**：JavaScript/TypeScript混合模式

## 核心功能

- ✅ 热搜词探索与二次交互
- ✅ LLM调用超时控制与自动重试
- ✅ WebSocket长连接通信
- ✅ 定时任务调度系统
- ✅ 自动日期拼接（{currentDate}占位符）
- ✅ 一键更新脚本

## 依赖安装

```bash
# 安装所有依赖
npm install

# 核心依赖包
# - express: Web服务器
# - ws: WebSocket实现
# - axios: HTTP客户端
# - uuid: 生成唯一标识符
# - dotenv: 环境变量管理
# - node-schedule: 定时任务
# - cheerio: HTML解析
```

## WebSocket配置

系统采用WebSocket长连接进行大模型调用，配置如下：

- **服务端地址**：`ws://127.0.0.1:3000`
- **连接方式**：自动重连 + 心跳保活
- **超时控制**：单次请求10分钟超时
- **重试策略**：5次指数增长重试（3秒→6秒→12秒→24秒→48秒）

## 快速启动

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   - 创建 `.env` 文件，配置LLM API密钥和基础URL
   - 配置 `data/prompts.json` 文件，设置提示词

3. **启动服务**
   ```bash
   node server.js
   ```

服务默认启动于 `http://0.0.0.0:3000`。

## 一键更新

项目提供两个更新脚本：

1. **快速更新（仅代码）**
   ```bash
   update.bat
   ```

2. **完整更新（代码+依赖）**
   ```bash
   update_full.bat
   ```

## 定时任务配置

编辑 `data/tasks.json` 文件配置定时任务：

```json
[
  {
    "id": "task-1774239986550",
    "time": "12:53",
    "skill": "hot-search-explorer"
  },
  {
    "id": "task-1774239993461",
    "time": "12:54",
    "skill": "hot-search-interact"
  }
]
```

## 提示词配置

编辑 `data/prompts.json` 文件配置提示词：

```json
{
  "explorerPrompt": "你是一名美食爱好者，给我{currentDate}的美食类最新新闻，字数100字内",
  "interactPrompt": "你是一名美食爱好者，基于最新美食新闻，帮我生成一篇发布Facebook的美食类贴文，字数200字内"
}
```

注意：`{currentDate}` 会自动替换为当前日期（格式：YYYY年MM月DD日）

## 文档入口

- 接口与工程标准（必读）：[docs/01-工程接口与技能标准（简体中文）.md](docs/01-%E5%B7%A5%E7%A8%8B%E6%8E%A5%E5%8F%A3%E4%B8%8E%E6%8A%80%E8%83%BD%E6%A0%87%E5%87%86%EF%BC%88%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87%EF%BC%89.md)
- 程序员使用说明（落地实操）：[docs/02-程序员使用说明（简体中文）.md](docs/02-%E7%A8%8B%E5%BA%8F%E5%91%98%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E%EF%BC%88%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87%EF%BC%89.md)
- 标准契约类型定义：[standards/contracts.ts](standards/contracts.ts)
