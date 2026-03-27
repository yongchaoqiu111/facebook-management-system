import { llmClient, LLMOutput } from '../../core/llm/llm-client';

const MODULE = 'LLMDocumentAnalysis';

export interface LLMDocumentAnalysisInput {
  documentContent: string;
  task: string;
  skillId: string;
  traceId: string;
}

export interface LLMDocumentAnalysisOutput {
  code: number;
  data: {
    analysis: string;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
}

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

export async function analyzeDocument(input: LLMDocumentAnalysisInput): Promise<LLMDocumentAnalysisOutput> {
  log(`开始分析文档，任务: ${input.task}`);

  try {
    const llmOutput: LLMOutput = await llmClient.analyzeDocument(
      input.documentContent,
      input.task,
      input.skillId,
      input.traceId
    );

    if (!llmOutput.ok) {
      log(`LLM 分析失败: ${llmOutput.message}`);
      return {
        code: llmOutput.code,
        data: {
          analysis: `分析失败: ${llmOutput.message}`
        }
      };
    }

    log(`文档分析完成，耗时: ${llmOutput.durationMs}ms`);
    return {
      code: 0,
      data: {
        analysis: llmOutput.data?.content || '',
        tokens: llmOutput.data?.tokens
      }
    };
  } catch (error) {
    log(`分析过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
    return {
      code: 500,
      data: {
        analysis: `分析过程中发生错误: ${error instanceof Error ? error.message : String(error)}`
      }
    };
  }
}
