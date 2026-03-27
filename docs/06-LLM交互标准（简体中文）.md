# LLM 交互标准

## 1. 标准概述

为了统一项目中LLM（大语言模型）的交互方式，确保所有技能能够按照一致的标准与LLM进行交互，特制定本标准。本标准基于项目的实际需求，确保LLM交互的一致性、可靠性和可扩展性。

## 2. 核心概念

### 2.1 LLM 交互流程

1. **输入准备**：技能准备LLM所需的输入数据，包括提示词、上下文、参数等
2. **API调用**：调用LLM API，发送请求并获取响应
3. **响应处理**：处理LLM的响应，提取有用信息
4. **结果应用**：将处理后的结果应用到技能逻辑中

### 2.2 关键组件

- **LLM 客户端**：负责与LLM API的通信
- **上下文管理**：管理对话历史和上下文信息
- **提示词模板**：标准化的提示词结构
- **响应解析器**：解析LLM的响应，提取结构化信息
- **缓存系统**：缓存LLM的响应，提高性能

## 3. 配置标准

### 3.1 配置结构

LLM 配置应统一存储在 `config.ts` 文件中，包含以下字段：

```typescript
interface LLMConfig {
  baseUrl: string;           // LLM API 基础 URL
  apiKey: string;            // API 密钥
  model: string;             // 模型名称
  timeoutMs: number;         // 超时时间（毫秒）
  temperature: number;       // 温度参数
  maxTokens: number;         // 最大 tokens
  apiKeyFile?: string;       // API 密钥文件路径
}
```

### 3.2 配置来源

1. **环境变量**：通过 `.env` 文件设置
2. **配置文件**：通过 `data/llm_api_key.txt` 文件设置
3. **代码默认值**：在配置文件中设置默认值

## 4. 输入标准

### 4.1 输入结构

```typescript
interface LLMInput {
  prompt: string;            // 提示词
  context?: string[];        // 上下文（对话历史）
  parameters?: {
    temperature?: number;     // 温度参数
    maxTokens?: number;       // 最大 tokens
    topP?: number;            // 采样参数
    stop?: string[];          // 停止词
  };
  skillId: string;           // 技能 ID
  traceId: string;            // 追踪 ID
}
```

### 4.2 提示词标准

提示词应包含以下部分：

1. **系统提示**：定义LLM的角色和行为
2. **上下文**：相关的背景信息
3. **任务描述**：具体的任务要求
4. **格式要求**：期望的输出格式

**示例**：

```
你是一个专业的中文微博文案助手。

背景：用户需要围绕"人工智能"主题生成一条微博文案。

任务：生成一条风格严肃的微博文案，要求自然、简洁、可发布。

格式：仅输出最终可发布文案，不要输出推理过程。
```

## 5. 输出标准

### 5.1 输出结构

```typescript
interface LLMOutput {
  ok: boolean;               // 是否成功
  code: number;              // 错误码
  message: string;           // 消息
  data?: {
    content: string;         // LLM 生成的内容
    tokens?: {
      prompt: number;        // 提示词 tokens
      completion: number;     // 完成 tokens
      total: number;          // 总 tokens
    };
  };
  traceId: string;            // 追踪 ID
  durationMs: number;         // 执行时间
}
```

### 5.2 错误码

| 错误码 | 描述 | 重试建议 |
|--------|------|----------|
| 0 | 成功 | - |
| 401 | API 密钥错误 | 检查 API 密钥 |
| 403 | 权限不足 | 检查 API 权限 |
| 408 | 请求超时 | 增加超时时间 |
| 429 | 速率限制 | 减少请求频率 |
| 500 | 服务器错误 | 稍后重试 |
| 503 | 服务不可用 | 稍后重试 |

## 6. 上下文管理

### 6.1 上下文结构

```typescript
interface LLMContext {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  maxMessages: number;       // 最大消息数
  maxTokens: number;         // 最大 tokens
}
```

### 6.2 上下文管理策略

1. **消息限制**：限制上下文消息数量，避免超过模型的上下文窗口
2. **时间限制**：只保留最近一段时间的消息
3. **重要性排序**：优先保留重要的消息
4. **摘要压缩**：对长消息进行摘要，减少 tokens 消耗

## 7. 缓存标准

### 7.1 缓存结构

```typescript
interface LLMCache {
  key: string;               // 缓存键
  input: LLMInput;            // 输入
  output: LLMOutput;          // 输出
  timestamp: number;          // 时间戳
  expiry: number;             // 过期时间
}
```

### 7.2 缓存策略

1. **缓存键生成**：基于提示词和参数生成唯一键
2. **过期策略**：设置合理的过期时间
3. **内存限制**：限制缓存大小，避免内存溢出
4. **持久化**：可选的缓存持久化

## 8. 实现标准

### 8.1 LLM 客户端

```typescript
class LLMSlient {
  private config: LLMConfig;
  private cache: Map<string, LLMOutput>;

  constructor(config: LLMConfig) {
    this.config = config;
    this.cache = new Map();
  }

  async generate(input: LLMInput): Promise<LLMOutput> {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(input);
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const startTime = Date.now();
    
    try {
      // 准备请求数据
      const requestData = this.prepareRequest(input);
      
      // 发送请求
      const response = await this.sendRequest(requestData);
      
      // 处理响应
      const output = this.processResponse(response, input.traceId);
      
      // 缓存结果
      this.cache.set(cacheKey, output);
      
      return output;
    } catch (error) {
      return {
        ok: false,
        code: 500,
        message: `LLM 调用失败: ${error instanceof Error ? error.message : String(error)}`,
        traceId: input.traceId,
        durationMs: Date.now() - startTime
      };
    }
  }

  private generateCacheKey(input: LLMInput): string {
    return `${input.prompt}_${JSON.stringify(input.parameters || {})}`;
  }

  private prepareRequest(input: LLMInput): any {
    // 准备请求数据
  }

  private async sendRequest(requestData: any): Promise<any> {
    // 发送请求
  }

  private processResponse(response: any, traceId: string): LLMOutput {
    // 处理响应
  }
}
```

### 8.2 技能集成

```typescript
async function useLLM(input: SkillInput): Promise<SkillOutput> {
  const llmInput: LLMInput = {
    prompt: '生成微博文案...',
    context: ['用户之前的问题...'],
    parameters: {
      temperature: 0.7,
      maxTokens: 300
    },
    skillId: 'mcp-weibo-post',
    traceId: input.traceId
  };

  const llmClient = new LLMSlient(config.llm);
  const llmOutput = await llmClient.generate(llmInput);

  if (!llmOutput.ok) {
    return {
      ok: false,
      code: llmOutput.code,
      message: llmOutput.message,
      traceId: input.traceId
    };
  }

  // 使用 LLM 输出
  const generatedContent = llmOutput.data?.content || '';
  
  return {
    ok: true,
    code: 0,
    message: '成功',
    data: {
      content: generatedContent
    },
    traceId: input.traceId
  };
}
```

## 9. 最佳实践

### 9.1 提示词设计

1. **明确任务**：清晰描述任务要求
2. **提供示例**：为复杂任务提供示例
3. **设置边界**：明确什么不应该做
4. **控制长度**：避免提示词过长
5. **使用模板**：标准化提示词结构

### 9.2 错误处理

1. **优雅降级**：当LLM调用失败时，提供合理的默认值
2. **重试机制**：对可重试的错误进行重试
3. **错误监控**：记录LLM调用错误，便于排查
4. **用户反馈**：向用户提供清晰的错误信息

### 9.3 性能优化

1. **缓存利用**：合理使用缓存，减少重复调用
2. **批处理**：批量处理相似的请求
3. **异步调用**：使用异步调用，提高并发性能
4. **参数调优**：根据任务类型调整温度等参数

### 9.4 安全性

1. **输入验证**：验证用户输入，防止注入攻击
2. **输出过滤**：过滤LLM输出中的敏感内容
3. **速率限制**：控制API调用频率，避免滥用
4. **密钥管理**：安全存储API密钥，避免硬编码

## 10. 集成标准

### 10.1 技能集成

1. **依赖注入**：通过配置注入LLM客户端
2. **统一接口**：使用标准的LLM输入输出接口
3. **错误处理**：遵循标准的错误处理流程
4. **日志记录**：记录LLM调用日志，便于调试

### 10.2 主骨架集成

1. **集中配置**：在主骨架中集中管理LLM配置
2. **统一客户端**：创建全局LLM客户端实例
3. **监控指标**：监控LLM调用的性能和成功率
4. **健康检查**：提供LLM服务的健康检查接口

## 11. 示例场景

### 11.1 文案生成

**输入**：
```typescript
const llmInput: LLMInput = {
  prompt: '围绕"人工智能"主题生成一条微博文案，风格严肃',
  context: [],
  parameters: {
    temperature: 0.7,
    maxTokens: 300
  },
  skillId: 'mcp-weibo-llm-generate',
  traceId: 'trace-123'
};
```

**输出**：
```typescript
const llmOutput: LLMOutput = {
  ok: true,
  code: 0,
  message: '成功',
  data: {
    content: '人工智能正在深刻改变我们的生活和工作方式。从智能助手到自动驾驶，AI技术的快速发展为我们带来了前所未有的便利。然而，随着AI的普及，我们也需要思考其对社会、就业和隐私的影响。在享受技术红利的同时，我们应该积极探索如何让AI更好地服务于人类，实现科技与人文的和谐统一。',
    tokens: {
      prompt: 50,
      completion: 120,
      total: 170
    }
  },
  traceId: 'trace-123',
  durationMs: 1500
};
```

### 11.2 问答处理

**输入**：
```typescript
const llmInput: LLMInput = {
  prompt: '如何使用Playwright进行浏览器自动化？',
  context: [
    '用户问：什么是浏览器自动化？',
    '助手答：浏览器自动化是指使用代码控制浏览器执行各种操作的技术。'
  ],
  parameters: {
    temperature: 0.5,
    maxTokens: 500
  },
  skillId: 'mcp-weibo-llm-qa',
  traceId: 'trace-456'
};
```

**输出**：
```typescript
const llmOutput: LLMOutput = {
  ok: true,
  code: 0,
  message: '成功',
  data: {
    content: '使用Playwright进行浏览器自动化的基本步骤如下：\n\n1. 安装Playwright：`npm install playwright`\n2. 安装浏览器驱动：`npx playwright install`\n3. 导入Playwright：`import { chromium } from \'playwright\'`\n4. 启动浏览器：`const browser = await chromium.launch()`\n5. 创建页面：`const page = await browser.newPage()`\n6. 访问网站：`await page.goto(\'https://example.com\')`\n7. 执行操作：如点击、填写表单等\n8. 关闭浏览器：`await browser.close()`\n\nPlaywright支持多种浏览器，包括Chromium、Firefox和WebKit，并且提供了丰富的API来模拟用户操作。',
    tokens: {
      prompt: 100,
      completion: 200,
      total: 300
    }
  },
  traceId: 'trace-456',
  durationMs: 2000
};
```

## 12. 结语

本标准旨在提供一种统一、规范的LLM交互方式，确保项目中的所有技能能够按照一致的标准与LLM进行交互。遵循本标准将有助于提高LLM交互的质量和可靠性，减少因交互不规范导致的问题。

如果您有任何疑问或建议，请随时与项目维护者联系。