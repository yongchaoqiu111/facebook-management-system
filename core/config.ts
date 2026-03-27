import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_PATH || path.resolve(process.cwd(), '.env') });

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullable(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (!value) {
      continue;
    }
    if (value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function readTextFileTrim(filePath: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    return raw.length > 0 ? raw : undefined;
  } catch {
    return undefined;
  }
}

function toRate(value: string | undefined, fallback: number): number {
  const n = toNumber(value, fallback);
  if (n < 0) {
    return 0;
  }
  if (n > 1) {
    return 1;
  }
  return n;
}

export interface AppConfig {
  app: {
    port: number;
  };
  weibo: {
    defaultAccountId: string;
    auth: {
      passwordLoginEnabled: boolean;
      username: string | null;
      password: string | null;
      passwordFilePath: string;
    };
    persona: {
      profileFilePath: string;
    };
    follow: {
      enabled: boolean;
      cron: string;
      timezone: string;
      keywordFilePath: string;
      perKeywordMaxFollows: number;
      loginTimeoutSeconds: number;
      smart: {
        maxTotalPosts: number;
        perKeywordMaxPosts: number;
        maxLikes: number;
        maxFollows: number;
        maxComments: number;
        commentText: string;
        insightsFilePath: string;
      };
    };
    dailyWorkflow: {
      enabled: boolean;
      cron: string;
      timezone: string;
      query: string;
      size: number;
      style: '搞笑' | '严肃' | '煽情';
      loginTimeoutSeconds: number;
    };
  };
  redis: {
    host: string;
    port: number;
    retryDelayMaxMs: number;
    maxRetriesPerRequest: number;
  };
  dingTalk: {
    webhook: string | null;
  };
  llm: {
    baseUrl: string | null;
    apiKey: string | null;
    apiType: 'openai-completions';
    model: string;
    timeoutMs: number;
  };
  skillMock: {
    failureRate: number;
    minDelayMs: number;
    maxDelayMs: number;
  };
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function toStyle(value: string | undefined, fallback: '搞笑' | '严肃' | '煽情'): '搞笑' | '严肃' | '煽情' {
  return value === '搞笑' || value === '严肃' || value === '煽情' ? value : fallback;
}

export const config: AppConfig = {
  app: {
    port: toNumber(process.env.APP_PORT, 3000)
  },
  weibo: {
    defaultAccountId: process.env.WEIBO_DEFAULT_ACCOUNT_ID || 'default',
    auth: {
      passwordLoginEnabled: toBoolean(process.env.WEIBO_PASSWORD_LOGIN_ENABLED, false),
      username: toNullable(firstNonEmpty(
        process.env.WEIBO_USERNAME,
        process.env.WEIBO_LOGIN_USERNAME
      )),
      password: toNullable(firstNonEmpty(
        readTextFileTrim(path.resolve(process.cwd(), process.env.WEIBO_PASSWORD_FILE || 'user-config/credentials/weibo_password.txt')),
        process.env.WEIBO_PASSWORD,
        process.env.WEIBO_LOGIN_PASSWORD
      )),
      passwordFilePath: process.env.WEIBO_PASSWORD_FILE || 'user-config/credentials/weibo_password.txt'
    },
    persona: {
      profileFilePath: process.env.WEIBO_PERSONA_PROFILE_FILE || 'user-config/data/persona_profile.txt'
    },
    follow: {
      enabled: toBoolean(process.env.WEIBO_FOLLOW_ENABLED, true),
      cron: process.env.WEIBO_FOLLOW_CRON || '30 9 * * *',
      timezone: process.env.WEIBO_FOLLOW_TIMEZONE || 'Asia/Shanghai',
      keywordFilePath: process.env.WEIBO_FOLLOW_KEYWORD_FILE || 'user-config/data/follow_keywords.txt',
      perKeywordMaxFollows: toNumber(process.env.WEIBO_FOLLOW_PER_KEYWORD_MAX_FOLLOWS, 3),
      loginTimeoutSeconds: toNumber(process.env.WEIBO_FOLLOW_LOGIN_TIMEOUT_SECONDS, 240),
      smart: {
        maxTotalPosts: toNumber(process.env.WEIBO_SMART_MAX_TOTAL_POSTS, 10),
        perKeywordMaxPosts: toNumber(process.env.WEIBO_SMART_PER_KEYWORD_MAX_POSTS, 5),
        maxLikes: toNumber(process.env.WEIBO_SMART_MAX_LIKES, 2),
        maxFollows: toNumber(process.env.WEIBO_SMART_MAX_FOLLOWS, 1),
        maxComments: toNumber(process.env.WEIBO_SMART_MAX_COMMENTS, 1),
        commentText: process.env.WEIBO_SMART_COMMENT_TEXT || '观点很有启发，感谢分享。',
        insightsFilePath: process.env.WEIBO_SMART_INSIGHTS_FILE || 'user-config/data/smart_follow_insights.json'
      }
    },
    dailyWorkflow: {
      enabled: toBoolean(process.env.WEIBO_DAILY_WORKFLOW_ENABLED, true),
      cron: process.env.WEIBO_DAILY_WORKFLOW_CRON || '0 8 * * *',
      timezone: process.env.WEIBO_DAILY_WORKFLOW_TIMEZONE || 'Asia/Shanghai',
      query: process.env.WEIBO_DAILY_WORKFLOW_QUERY || 'AI',
      size: toNumber(process.env.WEIBO_DAILY_WORKFLOW_SIZE, 5),
      style: toStyle(process.env.WEIBO_DAILY_WORKFLOW_STYLE, '严肃'),
      loginTimeoutSeconds: toNumber(process.env.WEIBO_DAILY_WORKFLOW_LOGIN_TIMEOUT_SECONDS, 240)
    }
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: toNumber(process.env.REDIS_PORT, 6379),
    retryDelayMaxMs: toNumber(process.env.REDIS_RETRY_DELAY_MAX_MS, 2000),
    maxRetriesPerRequest: toNumber(process.env.REDIS_MAX_RETRIES_PER_REQUEST, 3)
  },
  dingTalk: {
    webhook: toNullable(process.env.DINGTALK_WEBHOOK)
  },
  llm: {
    // 核心：固定千问的OpenAI兼容baseUrl（套餐专属地址）
    baseUrl: toNullable(firstNonEmpty(
      process.env.LLM_BASE_URL,
      'https://coding.dashscope.aliyuncs.com/v1', // 千问套餐专属地址（兼容OpenAI接口）
      process.env.OPENAI_BASE_URL,
      process.env.OPENAI_API_BASE,
      process.env.OPENAI_API_URL,
      process.env.OPENCLAW_LLM_BASE_URL
    )),
    // 优化：补充API Key缺失提示
    apiKey: (() => {
      try {
        const keyPath = path.resolve(process.cwd(), process.env.LLM_API_KEY_FILE || 'user-config/credentials/llm-api-key2.txt');
        const key = toNullable(firstNonEmpty(readTextFileTrim(keyPath)));
        if (!key) {
          console.warn(`⚠️ 千问API Key缺失：文件 ${keyPath} 为空或不存在`);
        }
        return key;
      } catch (e) {
        console.error(`❌ 读取API Key文件失败：${e instanceof Error ? e.message : String(e)}`);
        return null;
      }
    })(),
    // 保留：千问支持openai-completions格式
    apiType: 'openai-completions',
    // 优化：校验模型名，防止指向非千问模型
    model: (() => {
      const modelName = firstNonEmpty(process.env.LLM_MODEL, process.env.OPENAI_MODEL) || 'qwen3.5-plus';
      if (!modelName.toLowerCase().includes('qwen')) {
        console.warn(`⚠️ 模型名错误(${modelName})，自动切换为qwen3.5-plus`);
        return 'qwen3.5-plus';
      }
      return modelName;
    })(),
    // 优化：调大超时时间，适配千问响应速度
    timeoutMs: toNumber(process.env.LLM_TIMEOUT_MS, 300000)
  },
  skillMock: {
    failureRate: toRate(process.env.SKILL_MOCK_FAILURE_RATE, 0.1),
    minDelayMs: toNumber(process.env.SKILL_MOCK_MIN_DELAY_MS, 200),
    maxDelayMs: toNumber(process.env.SKILL_MOCK_MAX_DELAY_MS, 1000)
  }
};
