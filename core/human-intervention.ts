import axios from 'axios';
import { Queue, Worker, Job } from 'bullmq';
import { redisConnectionOptions, isRedisAvailable } from './idempotent-lock';
import { config } from './config';

const MODULE = 'HumanIntervention';

export type WeiboErrorCode =
  | 'WEIBO_TOKEN_EXPIRED'
  | 'WEIBO_ACCOUNT_DISABLED'
  | 'WEIBO_CAPTCHA_REQUIRED'
  | 'WEIBO_RATE_LIMIT';

/**
 * 人工介入任务上下文。
 */
export interface HumanTaskContext {
  taskId: string;
  accountId: string;
  [key: string]: unknown;
}

/**
 * 死信任务上下文。
 */
export interface DeadLetterTaskContext {
  taskId: string;
  [key: string]: unknown;
}

type InterventionJobStatus = 'pending' | 'processed' | 'failed';

interface HumanInterventionJobData {
  taskContext: HumanTaskContext;
  errorCode: WeiboErrorCode;
  errorMsg: string;
  createdAt: number;
  status: InterventionJobStatus;
}

interface DeadLetterJobData {
  taskContext: DeadLetterTaskContext;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  createdAt: number;
  status: InterventionJobStatus;
}

const dingTalkWebhook = config.dingTalk.webhook;

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

export const humanInterventionQueue = new Queue<HumanInterventionJobData>('human-intervention-queue', {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false
  }
});

export const deadLetterQueue = new Queue<DeadLetterJobData>('dead-letter-queue', {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false
  }
});

async function notifyDingTalk(taskContext: HumanTaskContext, errorCode: WeiboErrorCode, errorMsg: string): Promise<void> {
  if (!dingTalkWebhook) {
    log('dingTalkWebhook is empty, skip notification');
    return;
  }

  const payload = {
    msgtype: 'markdown',
    markdown: {
      title: '⚠️ 微博账号异常',
      text: `**任务ID**: ${taskContext.taskId}\n**账号ID**: ${taskContext.accountId}\n**错误类型**: ${errorCode}\n**错误详情**: ${errorMsg}\n**时间**: ${new Date().toISOString()}\n**建议操作**: 请及时处理`
    }
  };

  try {
    await axios.post(dingTalkWebhook, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    log(`dingTalk notified: ${taskContext.taskId}`);
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] dingTalk notify failed:`, error);
  }
}

/**
 * 将任务送入人工介入队列。
 * @param taskContext 任务上下文。
 * @param errorCode 微博错误码。
 * @param errorMsg 错误详情。
 * @returns Promise<void>
 */
export async function sendToHumanIntervention(taskContext: HumanTaskContext, errorCode: WeiboErrorCode, errorMsg: string): Promise<void> {
  try {
    await humanInterventionQueue.add('human-intervention', {
      taskContext,
      errorCode,
      errorMsg,
      createdAt: Date.now(),
      status: 'pending'
    });
    log(`queued human intervention: ${taskContext.taskId}`);
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] enqueue human intervention failed:`, error);
  }

  await notifyDingTalk(taskContext, errorCode, errorMsg);
}

/**
 * 将彻底失败的任务送入死信队列。
 * @param taskContext 任务上下文。
 * @param error 错误对象。
 * @returns Promise<void>
 */
export async function sendToDeadLetter(taskContext: DeadLetterTaskContext, error: Error): Promise<void> {
  try {
    await deadLetterQueue.add('dead-letter', {
      taskContext,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      createdAt: Date.now(),
      status: 'pending'
    });
    log(`queued dead letter: ${taskContext.taskId}`);
  } catch (err: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] enqueue dead letter failed:`, err);
  }
}

/**
 * 启动人工介入与死信队列 Worker。
 * @returns void
 */
export function startHumanInterventionWorkers(): void {
  isRedisAvailable().then((available) => {
    if (!available) {
      log('redis unavailable, skip bullmq workers startup');
      return;
    }

  const humanWorker = new Worker(
    'human-intervention-queue',
    async (job: Job<HumanInterventionJobData>): Promise<void> => {
      log(`human job pending: ${job.id} taskId=${job.data.taskContext.taskId}`);
      await job.updateData({ ...job.data, status: 'processed' });
      log(`human job processed: ${job.id} taskId=${job.data.taskContext.taskId}`);
    },
    { connection: redisConnectionOptions }
  );

  const deadLetterWorker = new Worker(
    'dead-letter-queue',
    async (job: Job<DeadLetterJobData>): Promise<void> => {
      log(`dead-letter pending: ${job.id} taskId=${job.data.taskContext.taskId}`);
      await job.updateData({ ...job.data, status: 'processed' });
      log(`dead-letter processed: ${job.id} taskId=${job.data.taskContext.taskId}`);
    },
    { connection: redisConnectionOptions }
  );

  humanWorker.on('failed', (job: Job<HumanInterventionJobData> | undefined, error: Error) => {
    if (job) {
      job.updateData({ ...job.data, status: 'failed' }).catch((updateError: unknown) => {
        console.error(`[${MODULE}] [${new Date().toISOString()}] mark human job failed status error:`, updateError);
      });
    }
    console.error(`[${MODULE}] [${new Date().toISOString()}] human worker failed:`, job?.id, error);
  });

  deadLetterWorker.on('failed', (job: Job<DeadLetterJobData> | undefined, error: Error) => {
    if (job) {
      job.updateData({ ...job.data, status: 'failed' }).catch((updateError: unknown) => {
        console.error(`[${MODULE}] [${new Date().toISOString()}] mark dead-letter job failed status error:`, updateError);
      });
    }
    console.error(`[${MODULE}] [${new Date().toISOString()}] dead-letter worker failed:`, job?.id, error);
  });
  }).catch((error: unknown) => {
    console.error(`[${MODULE}] [${new Date().toISOString()}] failed to start workers:`, error);
  });
}
