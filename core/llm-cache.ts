import crypto from 'crypto';
import Database from 'better-sqlite3';
import cron from 'node-cron';
import path from 'path';

const MODULE = 'LLMCache';
const DB_PATH = path.resolve(process.cwd(), 'weibo.db');

export const db = new Database(DB_PATH);
let cacheCleanupStarted = false;

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}

function isCachedResponse(value: unknown): value is { text: string } {
  return typeof value === 'object' && value !== null && 'text' in value && typeof (value as { text: unknown }).text === 'string';
}

function initTable(): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS llm_cache (
        prompt_hash TEXT PRIMARY KEY,
        prompt TEXT,
        response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    log('llm_cache table ready');
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] initTable failed:`, error);
  }
}

/**
 * 清理过期缓存（1天前）。
 * @returns void
 */
export function cleanExpiredCache(): void {
  try {
    const stmt = db.prepare(`DELETE FROM llm_cache WHERE created_at < datetime('now', '-1 day')`);
    const result = stmt.run();
    log(`expired cache cleaned: ${result.changes}`);
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] cleanExpiredCache failed:`, error);
  }
}

/**
 * 查询缓存。
 * @param prompt 输入提示词。
 * @returns 缓存响应或 null。
 */
export async function getCachedLLM(prompt: string): Promise<{ text: string } | null> {
  try {
    const promptHash = hashPrompt(prompt);
    const stmt = db.prepare('SELECT response FROM llm_cache WHERE prompt_hash = ?');
    const row = stmt.get(promptHash) as { response?: string } | undefined;

    if (!row?.response) {
      return null;
    }

    try {
      const parsed = JSON.parse(row.response) as unknown;
      if (isCachedResponse(parsed)) {
        return { text: parsed.text };
      }

      const delStmt = db.prepare('DELETE FROM llm_cache WHERE prompt_hash = ?');
      delStmt.run(promptHash);
      return null;
    } catch (error: unknown) {
      console.error(`[${MODULE}] [${new Date().toISOString()}] parse cache failed:`, error);
      const delStmt = db.prepare('DELETE FROM llm_cache WHERE prompt_hash = ?');
      delStmt.run(promptHash);
      return null;
    }
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] getCachedLLM failed:`, error);
    return null;
  }
}

/**
 * 写入缓存。
 * @param prompt 输入提示词。
 * @param response 模型响应。
 * @returns void
 */
export function setCachedLLM(prompt: string, response: { text: string }): void {
  try {
    const promptHash = hashPrompt(prompt);
    const payload = JSON.stringify(response);
    const stmt = db.prepare(`
      INSERT INTO llm_cache (prompt_hash, prompt, response)
      VALUES (?, ?, ?)
      ON CONFLICT(prompt_hash)
      DO UPDATE SET response = excluded.response, created_at = CURRENT_TIMESTAMP
    `);
    stmt.run(promptHash, prompt, payload);
  } catch (error: unknown) {
    console.error(`[${MODULE}] [${new Date().toISOString()}] setCachedLLM failed:`, error);
  }
}

/**
 * 初始化 LLM 缓存模块。
 * @returns void
 */
export function initLLMCache(): void {
  initTable();
  cleanExpiredCache();
  if (!cacheCleanupStarted) {
    cron.schedule('0 4 * * *', () => {
      cleanExpiredCache();
    });
    cacheCleanupStarted = true;
    log('cron scheduled at 04:00 daily');
  }
}
