import { acquireLock } from './idempotent-lock';
import { getCachedLLM, setCachedLLM } from './llm-cache';
import { sendToDeadLetter, sendToHumanIntervention, WeiboErrorCode } from './human-intervention';
import { startSpan, getSpans, Span } from './traceability';
import {
  searchAiNews,
  generateWeiboContent,
  processWeiboImage,
  postToWeibo
} from '../skills/weibo/weibo-skills';
import { buildPersonaPromptForTopic } from './content-strategy';

const MODULE = 'TaskOrchestrator';
const MAX_RETRIES = 3;
const taskTraceMap: Map<string, string> = new Map<string, string>();

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

function isWeiboErrorCode(value: string): value is WeiboErrorCode {
  return [
    'WEIBO_TOKEN_EXPIRED',
    'WEIBO_ACCOUNT_DISABLED',
    'WEIBO_CAPTCHA_REQUIRED',
    'WEIBO_RATE_LIMIT'
  ].includes(value);
}

function parseWeiboErrorCode(error: Error): WeiboErrorCode | null {
  const match = error.message.match(/(WEIBO_[A-Z_]+)/);
  if (!match) {
    return null;
  }
  const code = match[1];
  return isWeiboErrorCode(code) ? code : null;
}

async function runStep<T>(traceId: string, stepId: string, skillId: string, action: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  const span = startSpan(traceId, stepId, skillId);
  log(`step start: ${stepId} skill=${skillId}`);

  try {
    const result = await action();
    span.end('success');
    log(`step end: ${stepId} skill=${skillId} duration=${Date.now() - startedAt}ms status=success`);
    return result;
  } catch (error: unknown) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    span.end('failure', normalizedError.message);
    log(`step end: ${stepId} skill=${skillId} duration=${Date.now() - startedAt}ms status=failure`);
    throw normalizedError;
  }
}

/**
 * 执行微博自动化任务。
 * @param taskId 任务ID。
 * @param accountId 账号ID。
 * @returns Promise<void>
 */
export async function executeWeiboTask(taskId: string, accountId: string = 'default'): Promise<void> {
  const traceId = `trace_${taskId}_${Date.now()}`;
  taskTraceMap.set(taskId, traceId);
  const start = Date.now();
  let attempt = 0;

  log(`task start: ${taskId} account=${accountId}`);

  const locked = await acquireLock(taskId);
  if (!locked) {
    log(`task skipped by idempotent lock: ${taskId}`);
    return;
  }

  while (attempt < MAX_RETRIES) {
    attempt += 1;
    try {
      const newsResult = await runStep(traceId, 'step1', 'mcp-weibo-ai-news', async () => searchAiNews({ query: 'AI', size: 5 }));

      const topic = newsResult.data.items[0]?.title ?? 'AI 行业动态';
      const newsDigest = newsResult.data.items
        .slice(0, 3)
        .map((item, i) => `${i + 1}. ${item.title}（${item.source}）${item.url}`)
        .join('\n');
      const prompt = `${buildPersonaPromptForTopic(topic)}\n\n新闻素材（公开链接，仅做摘要与观点整合，不要照抄原文）：\n${newsDigest}`;

      const llmText = await runStep(traceId, 'step2', 'mcp-weibo-llm-generate', async () => {
        const cached = await getCachedLLM(prompt);
        if (cached) {
          log(`llm cache hit: ${taskId}`);
          return cached.text;
        }

        const generated = await generateWeiboContent({ prompt, topic, style: '搞笑' });
        setCachedLLM(prompt, generated.data);
        return generated.data.text;
      });

      let imageUrls: string[] | undefined;
      try {
        const imageResult = await runStep(traceId, 'step3', 'mcp-weibo-image', async () => processWeiboImage({ keyword: topic, count: 1 }));
        imageUrls = imageResult.data.urls;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        log(`optional image step skipped: ${message}`);
      }

      await runStep(traceId, 'step4', 'mcp-weibo-post', async () => postToWeibo({
        text: llmText,
        imageUrls,
        weiboAccountId: accountId
      }));

      const duration = Date.now() - start;
      log(`task success: ${taskId} duration=${duration}ms traceId=${traceId}`);
      return;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const code = parseWeiboErrorCode(error);
      log(`task attempt failed: ${taskId} attempt=${attempt} error=${error.message}`);

      if (code) {
        await sendToHumanIntervention(
          { taskId, accountId, traceId, attempt },
          code,
          error.message
        );
        log(`task sent to human intervention: ${taskId} code=${code}`);
        return;
      }

      if (attempt >= MAX_RETRIES) {
        await sendToDeadLetter({ taskId, accountId, traceId, attempt }, error);
        log(`task failed permanently: ${taskId}`);
        return;
      }

      log(`task retrying: ${taskId} attempt=${attempt} error=${error.message}`);
    }
  }
}

/**
 * 获取任务链路。
 * @param traceId 链路ID。
 * @returns Span 列表。
 */
export function getTaskTrace(traceId: string): Span[] {
  return getSpans(traceId);
}

/**
 * 获取任务最近一次执行的链路ID。
 * @param taskId 任务ID。
 * @returns 链路ID或 undefined。
 */
export function getTraceIdByTaskId(taskId: string): string | undefined {
  return taskTraceMap.get(taskId);
}

/**
 * 获取任务最近一次执行的链路详情。
 * @param taskId 任务ID。
 * @returns Span 列表。
 */
export function getTaskTraceByTaskId(taskId: string): Span[] {
  const traceId = taskTraceMap.get(taskId);
  return traceId ? getSpans(traceId) : [];
}
