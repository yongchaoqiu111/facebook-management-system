/**
 * 工程标准契约（V1）
 * 目标：统一主骨架与技能模块的数据、通讯、依赖、错误码、可观测字段。
 */

export type CommunicationMode = 'local-function' | 'http' | 'queue';

export interface SkillInputSchema {
  type: 'object';
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
}

export interface SkillMetadataContract {
  skillId: string;
  name: string;
  version: string;
  description: string;
  inputSchema: SkillInputSchema;
  outputSchema: Record<string, unknown>;
  healthCheckUrl: string;
  communicationMode: CommunicationMode;
  timeout: number;
}

export interface SkillExecutionContext {
  traceId: string;
  taskId: string;
  accountId?: string;
  requestedAt: number;
}

export interface SkillExecutionRequest<TInput = Record<string, unknown>> {
  skillId: string;
  input: TInput;
  context: SkillExecutionContext;
}

export interface SkillExecutionSuccess<TData = unknown> {
  ok: true;
  code: 0;
  message: string;
  data: TData;
  traceId: string;
  durationMs: number;
}

export interface SkillExecutionFailure {
  ok: false;
  code: number;
  message: string;
  errorType?: string;
  retryable?: boolean;
  traceId: string;
  durationMs: number;
}

export type SkillExecutionResponse<TData = unknown> = SkillExecutionSuccess<TData> | SkillExecutionFailure;

export const SkillErrorCode = {
  UNKNOWN: 10000,
  INVALID_INPUT: 10001,
  TIMEOUT: 10002,
  EXTERNAL_SERVICE: 10003,
  AUTH_EXPIRED: 11001,
  RATE_LIMIT: 11002
} as const;

export type SkillErrorCodeValue = typeof SkillErrorCode[keyof typeof SkillErrorCode];

export function buildSkillSuccess<TData>(params: {
  data: TData;
  traceId: string;
  message?: string;
  durationMs: number;
}): SkillExecutionSuccess<TData> {
  return {
    ok: true,
    code: 0,
    message: params.message || 'ok',
    data: params.data,
    traceId: params.traceId,
    durationMs: params.durationMs
  };
}

export function buildSkillFailure(params: {
  code?: SkillErrorCodeValue;
  message: string;
  traceId: string;
  durationMs: number;
  errorType?: string;
  retryable?: boolean;
}): SkillExecutionFailure {
  return {
    ok: false,
    code: params.code ?? SkillErrorCode.UNKNOWN,
    message: params.message,
    errorType: params.errorType,
    retryable: params.retryable,
    traceId: params.traceId,
    durationMs: params.durationMs
  };
}
