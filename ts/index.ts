import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import type { FSWatcher } from 'chokidar';
import { config } from './core/config';
import { redis } from './core/idempotent-lock';
import { db, initLLMCache } from './core/llm-cache';
import { startSkillRegistryWatcher, getAllSkills, SkillMetadata } from './core/skill-registry';
import { executeWeiboTask, getTaskTraceByTaskId } from './core/task-orchestrator';
import { startHumanInterventionWorkers } from './core/human-intervention';
import { generateWeiboContent, searchAiNews } from './skills/weibo/weibo-skills';
import { loginToFacebook, postToFacebook, interactFacebook, searchFacebook } from './skills/facebook/facebook-skills';
import { runHeadedWeiboSimulation } from './core/browser-simulator';
import { loginWithQrHeaded, loginWithPasswordHeaded, postWeiboHeaded, postWeiboMediaHeaded } from './weibo-browser-automation';
import { DouyinAutomation } from './douyin-automation';
import { douyinSmartInteract, testDouyinSearchBox, calibrateDouyinSearchBox, calibrateDouyinCommentButton } from './douyin-smart-interact';
import { buildDailyWorkflowPreview, runDailyWorkflowAndPublish } from './daily-publish-workflow';
import { runFollowInterestWorkflow } from './follow-interest-workflow';
import { runSmartFollowWorkflow } from './smart-follow-workflow';
import { getFollowKeywordsFromText, getPersonaFromText } from './core/text-config-loader';
import {
  PersonaProfile,
  defaultPersona,
  buildDailyPromptPlan,
  buildPersonaPromptForTopic
} from './core/content-strategy';

const MODULE = 'Bootstrap';
const PORT = config.app.port;
const app = express();
let skillWatcher: FSWatcher | null = null;

app.use(express.json());

if (!config.llm.baseUrl || !config.llm.apiKey) {
  console.warn(`[${MODULE}] [${new Date().toISOString()}] LLM未配置完整：请设置LLM_BASE_URL和LLM_API_KEY（或OPENAI_API_KEY同名变量）`);
}

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

function parsePersona(rawPersona: unknown): PersonaProfile {
  if (!rawPersona || typeof rawPersona !== 'object') {
    return defaultPersona;
  }

  const personaObj = rawPersona as Partial<PersonaProfile>;
  return {
    role: typeof personaObj.role === 'string' ? personaObj.role : defaultPersona.role,
    focus: typeof personaObj.focus === 'string' ? personaObj.focus : defaultPersona.focus,
    currentWorkflows: Array.isArray(personaObj.currentWorkflows)
      ? personaObj.currentWorkflows.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
      : defaultPersona.currentWorkflows,
    audience: typeof personaObj.audience === 'string' ? personaObj.audience : defaultPersona.audience,
    tone: personaObj.tone === '专业' || personaObj.tone === '严谨' || personaObj.tone === '轻松' ? personaObj.tone : defaultPersona.tone
  };
}

function parseStyle(value: unknown): '搞笑' | '严肃' | '煽情' | undefined {
  return value === '搞笑' || value === '严肃' || value === '煽情' ? value : undefined;
}

interface SkillJsonInputSchema {
  type: string;
  properties: Record<string, { type: string }>;
  required?: string[];
}

interface SkillJson {
  skillId: string;
  name: string;
  version: string;
  description: string;
  inputSchema: SkillJsonInputSchema;
  outputSchema: Record<string, unknown>;
  healthCheckUrl: string;
  communicationMode: string;
  timeout: number;
}

function buildSkillDefinitions(): SkillJson[] {
  const healthUrl = `http://localhost:${PORT}/health`;

  return [
    {
      skillId: 'mcp-weibo-post-media',
      name: '微博图文/视频发布',
      version: '1.0.0',
      description: '发布带图片或视频的微博内容',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          imagePaths: { type: 'array' },
          videoPath: { type: 'string' },
          publish: { type: 'boolean' }
        },
        required: []
      },
      outputSchema: { code: 'number', data: 'object' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 60000
    },
    {
      skillId: 'mcp-weibo-follow-smart',
      name: '微博智能关注',
      version: '1.0.0',
      description: '按关键词搜索帖子，AI评估后执行关注/点赞',
      inputSchema: { type: 'object', properties: { keywords: { type: 'array' }, perKeywordMaxPosts: { type: 'number' } }, required: [] },
      outputSchema: { code: 'number', data: 'object' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 40000
    },
    {
      skillId: 'mcp-weibo-follow-interest',
      name: '微博兴趣关注',
      version: '1.0.0',
      description: '按关键词搜索并关注相关账号',
      inputSchema: { type: 'object', properties: { keywords: { type: 'array' }, perKeywordMaxFollows: { type: 'number' } }, required: [] },
      outputSchema: { code: 'number', data: 'object' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 20000
    },
    {
      skillId: 'mcp-weibo-ai-news',
      name: 'AI新闻检索',
      version: '1.0.0',
      description: '搜索公开 AI 新闻素材（标题/链接/摘要）',
      inputSchema: { type: 'object', properties: { query: { type: 'string' }, size: { type: 'number' } }, required: [] },
      outputSchema: { code: 'number', data: 'object' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 12000
    },
    {
      skillId: 'mcp-weibo-hot',
      name: '微博热搜',
      version: '1.0.0',
      description: '获取微博热搜榜',
      inputSchema: { type: 'object', properties: { limit: { type: 'number' } }, required: [] },
      outputSchema: { code: 'number', data: 'array' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 10000
    },
    {
      skillId: 'mcp-weibo-llm-generate',
      name: '微博文案生成',
      version: '1.0.0',
      description: '使用LLM生成微博文案',
      inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, topic: { type: 'string' }, style: { type: 'string' } }, required: ['prompt', 'topic'] },
      outputSchema: { code: 'number', data: 'object' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 10000
    },
    {
      skillId: 'mcp-weibo-image',
      name: '微博配图',
      version: '1.0.0',
      description: '下载/处理微博配图',
      inputSchema: { type: 'object', properties: { keyword: { type: 'string' }, count: { type: 'number' } }, required: ['keyword', 'count'] },
      outputSchema: { code: 'number', data: 'object' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 15000
    },
    {
      skillId: 'mcp-weibo-post',
      name: '微博发帖',
      version: '1.0.0',
      description: '发送微博内容',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, imageUrls: { type: 'array' }, weiboAccountId: { type: 'string' } }, required: ['text', 'weiboAccountId'] },
      outputSchema: { code: 'number', data: 'object' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 15000
    },
    {
      skillId: 'mcp-weibo-interact',
      name: '微博互动',
      version: '1.0.0',
      description: '执行点赞、评论或转发',
      inputSchema: { type: 'object', properties: { action: { type: 'string' }, postId: { type: 'string' }, content: { type: 'string' }, weiboAccountId: { type: 'string' } }, required: ['action', 'postId', 'weiboAccountId'] },
      outputSchema: { code: 'number', data: 'object' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 10000
    },
    {
      skillId: 'mcp-weibo-message',
      name: '微博私信处理',
      version: '1.0.0',
      description: '检查或回复微博私信',
      inputSchema: { type: 'object', properties: { action: { type: 'string' }, weiboAccountId: { type: 'string' }, msgId: { type: 'string' }, replyText: { type: 'string' } }, required: ['action', 'weiboAccountId'] },
      outputSchema: { code: 'number', data: 'object' },
      healthCheckUrl: healthUrl,
      communicationMode: 'local-function',
      timeout: 10000
    }
  ];
}

function ensureSkillJsonFiles(): void {
  // 确保平台目录存在
  const skillsDir = path.resolve(process.cwd(), 'skills');
  const weiboSkillsDir = path.resolve(skillsDir, 'weibo');
  const facebookSkillsDir = path.resolve(skillsDir, 'facebook');
  
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }
  if (!fs.existsSync(weiboSkillsDir)) {
    fs.mkdirSync(weiboSkillsDir, { recursive: true });
  }
  if (!fs.existsSync(facebookSkillsDir)) {
    fs.mkdirSync(facebookSkillsDir, { recursive: true });
  }

  const skills = buildSkillDefinitions();

  skills.forEach((item) => {
    // 根据技能ID判断平台
    const platformDir = item.skillId.startsWith('mcp-weibo') ? weiboSkillsDir : facebookSkillsDir;
    const filePath = path.join(platformDir, `${item.skillId}.skill.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(item, null, 2), 'utf8');
    } catch (error: unknown) {
      console.error(`[${MODULE}] [${new Date().toISOString()}] write skill file failed:`, filePath, error);
    }
  });
}

function scheduleDailyWeiboTask(accountId: string = 'default'): void {
  if (!config.weibo.dailyWorkflow.enabled) {
    log('daily workflow disabled by config');
    return;
  }

  const cronExpression = config.weibo.dailyWorkflow.cron;
  cron.schedule(cronExpression, async () => {
    const taskId = `weibo_daily_publish_${accountId}`;
    log(`daily workflow triggered: ${taskId}`);
    try {
      const result = await runDailyWorkflowAndPublish({
        query: config.weibo.dailyWorkflow.query,
        size: config.weibo.dailyWorkflow.size,
        style: config.weibo.dailyWorkflow.style,
        persona: getPersonaFromText(),
        publish: true,
        loginTimeoutSeconds: config.weibo.dailyWorkflow.loginTimeoutSeconds
      });

      if (!result.publishResult.ok) {
        throw new Error(result.publishResult.message);
      }

      log(`daily workflow success: ${taskId} topic=${result.preview.topic}`);
    } catch (error: unknown) {
      console.error(`[${MODULE}] [${new Date().toISOString()}] daily workflow failed:`, error);
    }
  }, {
    timezone: config.weibo.dailyWorkflow.timezone
  });

  log(`daily workflow scheduled: weibo_daily_publish_${accountId} cron=${cronExpression} timezone=${config.weibo.dailyWorkflow.timezone}`);
}

function scheduleDailyFollowWorkflow(accountId: string = 'default'): void {
  if (!config.weibo.follow.enabled) {
    log('follow workflow disabled by config');
    return;
  }

  const cronExpression = config.weibo.follow.cron;
  cron.schedule(cronExpression, async () => {
    const taskId = `weibo_daily_follow_${accountId}`;
    log(`follow workflow triggered: ${taskId}`);

    try {
      const result = await runFollowInterestWorkflow({
        keywords: getFollowKeywordsFromText(),
        perKeywordMaxFollows: config.weibo.follow.perKeywordMaxFollows,
        loginTimeoutSeconds: config.weibo.follow.loginTimeoutSeconds
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      log(`follow workflow success: ${taskId} followed=${result.data.totalFollowed}`);
    } catch (error: unknown) {
      console.error(`[${MODULE}] [${new Date().toISOString()}] follow workflow failed:`, error);
    }
  }, {
    timezone: config.weibo.follow.timezone
  });

  log(`follow workflow scheduled: weibo_daily_follow_${accountId} cron=${cronExpression} timezone=${config.weibo.follow.timezone}`);
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/skills', (_req: Request, res: Response) => {
  const skills: SkillMetadata[] = getAllSkills();
  res.json(skills);
});

app.post('/news/search', async (req: Request, res: Response) => {
  const query = typeof req.body?.query === 'string' ? req.body.query : 'AI';
  const sizeRaw = req.body?.size;
  const size = typeof sizeRaw === 'number' ? sizeRaw : 5;

  try {
    const result = await searchAiNews({ query, size });
    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] news search failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/workflow/daily/preview', async (req: Request, res: Response) => {
  const query = typeof req.body?.query === 'string' ? req.body.query : 'AI';
  const size = typeof req.body?.size === 'number' ? req.body.size : 5;
  const style = parseStyle(req.body?.style);
  const persona = parsePersona(req.body?.persona);

  try {
    const preview = await buildDailyWorkflowPreview({ query, size, style, persona });
    res.json({ ok: true, preview });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] daily preview failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/workflow/daily/publish', async (req: Request, res: Response) => {
  const query = typeof req.body?.query === 'string' ? req.body.query : 'AI';
  const size = typeof req.body?.size === 'number' ? req.body.size : 5;
  const style = parseStyle(req.body?.style);
  const persona = parsePersona(req.body?.persona);
  const textOverride = typeof req.body?.textOverride === 'string' ? req.body.textOverride : undefined;
  const publish = req.body?.publish !== false;
  const loginTimeoutSeconds = typeof req.body?.loginTimeoutSeconds === 'number' ? req.body.loginTimeoutSeconds : 240;

  try {
    const result = await runDailyWorkflowAndPublish({
      query,
      size,
      style,
      persona,
      textOverride,
      publish,
      loginTimeoutSeconds
    });

    if (!result.publishResult.ok) {
      res.status(500).json({ ok: false, preview: result.preview, error: result.publishResult.message });
      return;
    }

    res.json({ ok: true, preview: result.preview, publishResult: result.publishResult });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] daily publish failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/workflow/follow/run', async (req: Request, res: Response) => {
  const keywords = Array.isArray(req.body?.keywords)
    ? req.body.keywords.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
    : undefined;
  const perKeywordMaxFollows = typeof req.body?.perKeywordMaxFollows === 'number' ? req.body.perKeywordMaxFollows : undefined;
  const loginTimeoutSeconds = typeof req.body?.loginTimeoutSeconds === 'number' ? req.body.loginTimeoutSeconds : undefined;

  try {
    const result = await runFollowInterestWorkflow({ keywords, perKeywordMaxFollows, loginTimeoutSeconds });
    if (!result.ok) {
      res.status(500).json({ ok: false, error: result.message, data: result.data });
      return;
    }
    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] follow workflow run failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/workflow/follow/smart-run', async (req: Request, res: Response) => {
  const keywords = Array.isArray(req.body?.keywords)
    ? req.body.keywords.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
    : undefined;
  const maxTotalPosts = typeof req.body?.maxTotalPosts === 'number' ? req.body.maxTotalPosts : undefined;
  const perKeywordMaxPosts = typeof req.body?.perKeywordMaxPosts === 'number' ? req.body.perKeywordMaxPosts : undefined;
  const maxLikes = typeof req.body?.maxLikes === 'number' ? req.body.maxLikes : undefined;
  const maxFollows = typeof req.body?.maxFollows === 'number' ? req.body.maxFollows : undefined;
  const maxComments = typeof req.body?.maxComments === 'number' ? req.body.maxComments : undefined;
  const commentText = typeof req.body?.commentText === 'string' ? req.body.commentText : undefined;
  const loginTimeoutSeconds = typeof req.body?.loginTimeoutSeconds === 'number' ? req.body.loginTimeoutSeconds : undefined;

  try {
    const result = await runSmartFollowWorkflow({
      keywords,
      maxTotalPosts,
      perKeywordMaxPosts,
      maxLikes,
      maxFollows,
      maxComments,
      commentText,
      loginTimeoutSeconds
    });
    if (!result.ok) {
      res.status(500).json({ ok: false, error: result.message, data: result.data });
      return;
    }
    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] smart follow workflow run failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/simulate/headed', async (req: Request, res: Response) => {
  const taskId = typeof req.body?.taskId === 'string' ? req.body.taskId : `simulate_${Date.now()}`;
  const accountId = typeof req.body?.accountId === 'string' ? req.body.accountId : config.weibo.defaultAccountId;
  const keepOpenSecondsRaw = req.body?.keepOpenSeconds;
  const keepOpenSeconds = typeof keepOpenSecondsRaw === 'number' ? keepOpenSecondsRaw : 20;

  const result = await runHeadedWeiboSimulation({
    taskId,
    accountId,
    keepOpenSeconds
  });

  if (!result.ok) {
    res.status(500).json({ ok: false, error: result.message });
    return;
  }

  res.json({ ok: true, taskId, accountId, message: result.message });
});

app.post('/weibo/login/headed', async (req: Request, res: Response) => {
  const timeoutSecondsRaw = req.body?.timeoutSeconds;
  const timeoutSeconds = typeof timeoutSecondsRaw === 'number' ? timeoutSecondsRaw : 180;

  const result = await loginWithQrHeaded({ timeoutSeconds });
  if (!result.ok) {
    res.status(500).json({ ok: false, error: result.message });
    return;
  }

  res.json({ ok: true, message: result.message, storageStatePath: result.storageStatePath });
});

app.post('/weibo/login/password/headed', async (req: Request, res: Response) => {
  const timeoutSecondsRaw = req.body?.timeoutSeconds;
  const timeoutSeconds = typeof timeoutSecondsRaw === 'number' ? timeoutSecondsRaw : 180;
  const username = typeof req.body?.username === 'string' ? req.body.username : config.weibo.auth.username;
  const password = typeof req.body?.password === 'string' ? req.body.password : config.weibo.auth.password;

  const result = await loginWithPasswordHeaded({
    username: username || '',
    password: password || '',
    timeoutSeconds
  });

  if (!result.ok) {
    res.status(500).json({ ok: false, error: result.message });
    return;
  }

  res.json({ ok: true, message: result.message, storageStatePath: result.storageStatePath });
});

app.post('/weibo/post/headed', async (req: Request, res: Response) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const publish = req.body?.publish === true;
  const loginTimeoutSecondsRaw = req.body?.loginTimeoutSeconds;
  const loginTimeoutSeconds = typeof loginTimeoutSecondsRaw === 'number' ? loginTimeoutSecondsRaw : 180;

  const result = await postWeiboHeaded({ text, publish, loginTimeoutSeconds });
  if (!result.ok) {
    res.status(500).json({ ok: false, error: result.message });
    return;
  }

  res.json({ ok: true, message: result.message });
});

app.post('/weibo/post/media/headed', async (req: Request, res: Response) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : undefined;
  const imagePaths = Array.isArray(req.body?.imagePaths)
    ? req.body.imagePaths.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
    : undefined;
  const videoPath = typeof req.body?.videoPath === 'string' ? req.body.videoPath : undefined;
  const publish = req.body?.publish === true;
  const loginTimeoutSecondsRaw = req.body?.loginTimeoutSeconds;
  const loginTimeoutSeconds = typeof loginTimeoutSecondsRaw === 'number' ? loginTimeoutSecondsRaw : 180;

  const result = await postWeiboMediaHeaded({ text, imagePaths, videoPath, publish, loginTimeoutSeconds });
  if (!result.ok) {
    res.status(500).json({ ok: false, error: result.message });
    return;
  }

  res.json({ ok: true, message: result.message });
});

app.post('/douyin/like', async (req: Request, res: Response) => {
  const action = typeof req.body?.action === 'string' ? req.body.action : 'like';
  const params = typeof req.body?.params === 'object' ? req.body.params : {};

  try {
    const douyinAutomation = new DouyinAutomation();
    const result = await douyinAutomation.likeVideo({ action, params });
    
    if (!result.ok) {
      res.status(500).json({ ok: false, error: result.message });
      return;
    }

    res.json({ ok: true, message: result.message, data: result.data });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] douyin like failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/douyin/smart-interact', async (req: Request, res: Response) => {
  const keywords = Array.isArray(req.body?.keywords)
    ? req.body.keywords.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
    : undefined;
  const maxVideos = typeof req.body?.maxVideos === 'number' ? req.body.maxVideos : undefined;
  const maxCommentsPerVideo = typeof req.body?.maxCommentsPerVideo === 'number' ? req.body.maxCommentsPerVideo : undefined;
  const searchIntervalMs = typeof req.body?.searchIntervalMs === 'number' ? req.body.searchIntervalMs : undefined;
  const loginTimeoutSeconds = typeof req.body?.loginTimeoutSeconds === 'number' ? req.body.loginTimeoutSeconds : undefined;

  try {
    const result = await douyinSmartInteract({
      keywords,
      maxVideos,
      maxCommentsPerVideo,
      searchIntervalMs,
      loginTimeoutSeconds
    });
    
    if (!result.ok) {
      res.status(500).json({ ok: false, error: result.message });
      return;
    }

    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] douyin smart interact failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/douyin/test-search', async (req: Request, res: Response) => {
  try {
    const result = await testDouyinSearchBox();
    
    if (!result.ok) {
      res.status(500).json({ ok: false, error: result.message });
      return;
    }

    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] douyin test search failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/douyin/calibrate-search', async (req: Request, res: Response) => {
  try {
    const result = await calibrateDouyinSearchBox();
    
    if (!result.ok) {
      res.status(500).json({ ok: false, error: result.message });
      return;
    }

    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] douyin calibrate search failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/douyin/calibrate-comment', async (req: Request, res: Response) => {
  try {
    const result = await calibrateDouyinCommentButton();
    
    if (!result.ok) {
      res.status(500).json({ ok: false, error: result.message });
      return;
    }

    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] douyin calibrate comment failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/persona', (_req: Request, res: Response) => {
  res.json({ ok: true, persona: getPersonaFromText() });
});

app.post('/persona/daily-prompts', (req: Request, res: Response) => {
  const persona: PersonaProfile = parsePersona(req.body?.persona);

  const prompts = buildDailyPromptPlan(persona, new Date());
  res.json({ ok: true, persona, prompts });
});

app.post('/ai/generate', async (req: Request, res: Response) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
  const topic = typeof req.body?.topic === 'string' ? req.body.topic : '';
  const style = parseStyle(req.body?.style);

  if (!prompt || !topic) {
    res.status(400).json({ ok: false, error: 'prompt 和 topic 不能为空' });
    return;
  }

  try {
    const result = await generateWeiboContent({ prompt, topic, style });
    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] ai generate failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/ai/generate/persona', async (req: Request, res: Response) => {
  const topic = typeof req.body?.topic === 'string' ? req.body.topic : '';
  const style = parseStyle(req.body?.style);

  if (!topic) {
    res.status(400).json({ ok: false, error: 'topic 不能为空' });
    return;
  }

  try {
    const persona = getPersonaFromText();
    const prompt = buildPersonaPromptForTopic(topic, persona);
    const result = await generateWeiboContent({ prompt, topic, style });
    res.json({ ok: true, persona, prompt, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] persona ai generate failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/task/:taskId/trigger', async (req: Request, res: Response) => {
  const taskId = req.params.taskId;
  const accountId = typeof req.body?.accountId === 'string' ? req.body.accountId : 'default';

  try {
    await executeWeiboTask(taskId, accountId);
    res.json({ ok: true, taskId, accountId });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] trigger task failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/tasks/:taskId/trace', (req: Request, res: Response) => {
  const taskId = req.params.taskId;
  res.json(getTaskTraceByTaskId(taskId));
});

// Facebook 技能路由
app.post('/facebook/login/headed', async (req: Request, res: Response) => {
  const username = typeof req.body?.username === 'string' ? req.body.username : undefined;
  const password = typeof req.body?.password === 'string' ? req.body.password : undefined;
  const timeoutSeconds = typeof req.body?.timeoutSeconds === 'number' ? req.body.timeoutSeconds : 180;

  try {
    const result = await loginToFacebook({ username, password, timeoutSeconds });
    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] facebook login failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/facebook/post/headed', async (req: Request, res: Response) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const imagePaths = Array.isArray(req.body?.imagePaths)
    ? req.body.imagePaths.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
    : undefined;
  const videoPath = typeof req.body?.videoPath === 'string' ? req.body.videoPath : undefined;
  const publish = req.body?.publish === true;
  const loginTimeoutSeconds = typeof req.body?.loginTimeoutSeconds === 'number' ? req.body.loginTimeoutSeconds : 180;

  try {
    const result = await postToFacebook({ text, imagePaths, videoPath, publish, loginTimeoutSeconds });
    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] facebook post failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/facebook/interact', async (req: Request, res: Response) => {
  const action = typeof req.body?.action === 'string' ? req.body.action : undefined;
  const postId = typeof req.body?.postId === 'string' ? req.body.postId : undefined;
  const content = typeof req.body?.content === 'string' ? req.body.content : undefined;
  const loginTimeoutSeconds = typeof req.body?.loginTimeoutSeconds === 'number' ? req.body.loginTimeoutSeconds : 180;

  if (!action || !postId) {
    res.status(400).json({ ok: false, error: 'action 和 postId 不能为空' });
    return;
  }

  try {
    const result = await interactFacebook({ action: action as 'like' | 'comment' | 'share', postId, content, loginTimeoutSeconds });
    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] facebook interact failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/facebook/search', async (req: Request, res: Response) => {
  const keywords = Array.isArray(req.body?.keywords)
    ? req.body.keywords.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
    : undefined;
  const maxPosts = typeof req.body?.maxPosts === 'number' ? req.body.maxPosts : 10;
  const loginTimeoutSeconds = typeof req.body?.loginTimeoutSeconds === 'number' ? req.body.loginTimeoutSeconds : 180;

  if (!keywords || keywords.length === 0) {
    res.status(400).json({ ok: false, error: 'keywords 不能为空' });
    return;
  }

  try {
    const result = await searchFacebook({ keywords, maxPosts, loginTimeoutSeconds });
    res.json({ ok: true, result });
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] facebook search failed:`, error);
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

function setupGlobalHandlers(): void {
  process.on('unhandledRejection', (err: unknown) => {
    console.error('[Global] Unhandled Rejection:', err);
  });

  process.on('uncaughtException', (err: Error) => {
    console.error('[Global] Uncaught Exception:', err);
  });

  process.on('SIGINT', async () => {
    log('shutdown start');
    if (skillWatcher) {
      await skillWatcher.close().catch((error: unknown) => {
        console.error(`[${MODULE}] [${new Date().toISOString()}] skill watcher close failed:`, error);
      });
    }
    try {
      await redis.quit();
    } catch (error: unknown) {
      console.error(`[${MODULE}] [${new Date().toISOString()}] redis quit failed:`, error);
    }

    try {
      db.close();
    } catch (error: unknown) {
      console.error(`[${MODULE}] [${new Date().toISOString()}] sqlite close failed:`, error);
    }

    process.exit(0);
  });
}

/**
 * 启动应用。
 * @returns Promise<void>
 */
export async function bootstrap(): Promise<void> {
  log('init redis singleton');
  log('init sqlite cache');
  initLLMCache();

  log('generate skill json files');
  ensureSkillJsonFiles();

  log('start skill watcher');
  skillWatcher = startSkillRegistryWatcher();

  log('start bullmq workers');
  startHumanInterventionWorkers();

  log('schedule daily weibo task');
  scheduleDailyWeiboTask(config.weibo.defaultAccountId);

  log('schedule daily follow workflow');
  scheduleDailyFollowWorkflow(config.weibo.defaultAccountId);

  setupGlobalHandlers();

  app.listen(PORT, () => {
    log(`service started at http://localhost:${PORT}`);
  });
}

bootstrap().catch((error: unknown) => {
  console.error(`[${MODULE}] [${new Date().toISOString()}] bootstrap failed:`, error);
  process.exit(1);
});

export {
  app,
  redis,
  db,
  initLLMCache,
  startSkillRegistryWatcher,
  executeWeiboTask,
  getAllSkills
};
