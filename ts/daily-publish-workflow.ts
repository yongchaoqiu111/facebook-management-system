import { PersonaProfile, buildPersonaPromptForTopic, defaultPersona } from './content-strategy';
import { generateWeiboContent, searchAiNews, AiNewsItem, WeiboLLMGenerateInput } from './skills/weibo-skills';
import { postWeiboHeaded, BrowserActionResult } from './weibo-browser-automation';
import fs from 'fs';
import path from 'path';
import { config } from './config';

export interface DailyWorkflowInput {
  query?: string;
  size?: number;
  style?: WeiboLLMGenerateInput['style'];
  persona?: PersonaProfile;
}

export interface DailyWorkflowPreviewResult {
  topic: string;
  prompt: string;
  text: string;
  query: string;
  newsItems: AiNewsItem[];
  persona: PersonaProfile;
}

export interface DailyWorkflowPublishInput extends DailyWorkflowInput {
  textOverride?: string;
  publish?: boolean;
  loginTimeoutSeconds?: number;
}

export interface DailyWorkflowPublishResult {
  preview: DailyWorkflowPreviewResult;
  publishResult: BrowserActionResult;
}

function pickPersona(inputPersona?: PersonaProfile): PersonaProfile {
  if (!inputPersona) {
    return defaultPersona;
  }

  const workflows = Array.isArray(inputPersona.currentWorkflows) && inputPersona.currentWorkflows.length > 0
    ? inputPersona.currentWorkflows
    : defaultPersona.currentWorkflows;

  return {
    role: inputPersona.role || defaultPersona.role,
    focus: inputPersona.focus || defaultPersona.focus,
    currentWorkflows: workflows,
    audience: inputPersona.audience || defaultPersona.audience,
    tone: inputPersona.tone || defaultPersona.tone
  };
}

function buildNewsDigest(items: AiNewsItem[]): string {
  return items
    .slice(0, 3)
    .map((item, i) => `${i + 1}. ${item.title}（${item.source}）${item.url}`)
    .join('\n');
}

function readSmartFollowMaterial(): string {
  try {
    const filePath = path.resolve(process.cwd(), config.weibo.follow.smart.insightsFilePath);
    if (!fs.existsSync(filePath)) {
      return '';
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as { distilledSummary?: string };
    return typeof parsed.distilledSummary === 'string' ? parsed.distilledSummary.trim() : '';
  } catch {
    return '';
  }
}

export async function buildDailyWorkflowPreview(input: DailyWorkflowInput): Promise<DailyWorkflowPreviewResult> {
  const query = (input.query || 'AI').trim() || 'AI';
  const size = Math.max(1, Math.min(10, input.size ?? 5));
  const persona = pickPersona(input.persona);

  const news = await searchAiNews({ query, size });
  const newsItems = news.data.items;
  const topic = newsItems[0]?.title || 'AI 行业动态';
  const newsDigest = buildNewsDigest(newsItems);
  const followMaterial = readSmartFollowMaterial();

  const prompt = `${buildPersonaPromptForTopic(topic, persona)}\n\n新闻素材（公开链接，仅做摘要与观点整合，不要照抄原文）：\n${newsDigest}${followMaterial ? `\n\n昨日/今日用户兴趣洞察（可作为观点素材，不要照抄）：\n${followMaterial}` : ''}`;
  const generated = await generateWeiboContent({
    prompt,
    topic,
    style: input.style
  });

  return {
    topic,
    prompt,
    text: generated.data.text,
    query,
    newsItems,
    persona
  };
}

export async function runDailyWorkflowAndPublish(input: DailyWorkflowPublishInput): Promise<DailyWorkflowPublishResult> {
  const preview = await buildDailyWorkflowPreview(input);
  const text = (input.textOverride || preview.text).trim();

  const publishResult = await postWeiboHeaded({
    text,
    publish: input.publish !== false,
    loginTimeoutSeconds: input.loginTimeoutSeconds
  });

  return {
    preview: {
      ...preview,
      text
    },
    publishResult
  };
}
