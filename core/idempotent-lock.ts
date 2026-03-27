import Redis from 'ioredis';
import { config } from './config';

export const redisConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  retryStrategy: (times: number): number => Math.min(times * 50, config.redis.retryDelayMaxMs),
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
  lazyConnect: true
};

export const redis = new Redis({
  ...redisConnectionOptions
});

const MODULE = 'IdempotentLock';
const memoryLocks: Map<string, number> = new Map<string, number>();
let redisAvailable = false;

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

redis.on('error', (error: unknown) => {
  redisAvailable = false;
  console.error(`[${MODULE}] [${new Date().toISOString()}] redis error:`, error);
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 将 Date 格式化为 YYYY-MM-DD。
 * @param date 日期对象。
 * @returns YYYY-MM-DD 格式字符串。
 */
function dateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildKey(taskId: string, date: Date): string {
  return `task:lock:${taskId}:${dateToYYYYMMDD(date)}`;
}

async function withRetry<T>(operation: () => Promise<T>, action: string): Promise<T | null> {
  for (let i = 0; i < 3; i += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      console.error(`[${MODULE}] [${new Date().toISOString()}] ${action} failed:`, error);
      if (i < 2) {
        await sleep(1000);
      }
    }
  }

  return null;
}

async function ensureRedisReady(): Promise<boolean> {
  if (redisAvailable && redis.status === 'ready') {
    return true;
  }

  const result = await withRetry(async () => {
    if (redis.status === 'wait') {
      await redis.connect();
    }

    const pong = await redis.ping();
    return pong;
  }, 'ensureRedisReady');

  redisAvailable = result === 'PONG';
  return redisAvailable;
}

function cleanupMemoryLocks(): void {
  const now = Date.now();
  for (const [key, expiresAt] of memoryLocks.entries()) {
    if (expiresAt <= now) {
      memoryLocks.delete(key);
    }
  }
}

function acquireMemoryLock(key: string): boolean {
  cleanupMemoryLocks();
  if (memoryLocks.has(key)) {
    return false;
  }

  memoryLocks.set(key, Date.now() + 86400 * 1000);
  return true;
}

/**
 * 检查 Redis 当前是否可用。
 * @returns Promise<boolean>
 */
export async function isRedisAvailable(): Promise<boolean> {
  return ensureRedisReady();
}

/**
 * 获取任务日幂等锁。
 * @param taskId 任务ID。
 * @param date 指定日期，默认当天。
 * @returns 是否加锁成功。
 */
export async function acquireLock(taskId: string, date: Date = new Date()): Promise<boolean> {
  const dateStr = dateToYYYYMMDD(date);
  const key = buildKey(taskId, date);

  if (!await ensureRedisReady()) {
    const fallback = acquireMemoryLock(key);
    log(`${taskId} ${dateStr} lock: ${fallback} (memory-fallback)`);
    return fallback;
  }

  const result = await withRetry(() => redis.set(key, '1', 'EX', 86400, 'NX'), 'acquireLock');
  const ok = result === 'OK';
  log(`${taskId} ${dateStr} lock: ${ok}`);
  return ok;
}

/**
 * 主动释放任务日幂等锁。
 * @param taskId 任务ID。
 * @param date 指定日期，默认当天。
 * @returns Promise<void>
 */
export async function releaseLock(taskId: string, date: Date = new Date()): Promise<void> {
  const dateStr = dateToYYYYMMDD(date);
  const key = buildKey(taskId, date);

  if (!await ensureRedisReady()) {
    memoryLocks.delete(key);
    log(`${taskId} ${dateStr} lock: released (memory-fallback)`);
    return;
  }

  await withRetry(() => redis.del(key), 'releaseLock');
  log(`${taskId} ${dateStr} lock: released`);
}

export { dateToYYYYMMDD };
