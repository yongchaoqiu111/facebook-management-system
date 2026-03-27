/**
 * 简化版链路追踪 Span。
 */
export interface Span {
  traceId: string;
  stepId: string;
  skillId: string;
  startTime: number;
  endTime: number;
  status: 'success' | 'failure';
  error?: string;
}

const MODULE = 'Traceability';
const SPAN_LIMIT = 1000;
const spans: Span[] = [];

function log(traceId: string, stepId: string, status: 'success' | 'failure'): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${traceId} ${stepId} ${status}`);
}

/**
 * 开始一个步骤追踪。
 * @param traceId 链路ID。
 * @param stepId 步骤ID。
 * @param skillId 技能ID。
 * @returns 一个 end 回调，用于结束该步骤。
 */
export function startSpan(traceId: string, stepId: string, skillId: string): { end: (status: 'success' | 'failure', error?: string) => void } {
  const startTime = Date.now();

  const end = (status: 'success' | 'failure', error?: string): void => {
    try {
      const span: Span = {
        traceId,
        stepId,
        skillId,
        startTime,
        endTime: Date.now(),
        status,
        error
      };

      spans.push(span);
      while (spans.length > SPAN_LIMIT) {
        spans.shift();
      }

      log(traceId, stepId, status);
    } catch (err: unknown) {
      console.error(`[${MODULE}] [${new Date().toISOString()}] end span failed:`, err);
    }
  };

  return { end };
}

/**
 * 查询指定 traceId 的 span 列表。
 * @param traceId 链路ID。
 * @returns Span 列表。
 */
export function getSpans(traceId: string): Span[] {
  return spans.filter((item) => item.traceId === traceId);
}
