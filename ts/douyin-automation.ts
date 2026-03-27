import { execSync } from 'child_process';
import { join } from 'path';
import { SkillErrorCode } from './standards/contracts';

export interface DouyinLikeInput {
  action: 'start' | 'like';
  params?: Record<string, any>;
}

export interface DouyinLikeOutput {
  status: 'success' | 'error';
  message: string;
}

export class DouyinAutomation {
  private pythonScriptPath: string;

  constructor() {
    this.pythonScriptPath = join(process.cwd(), 'douyin-automation.py');
  }

  async likeVideo(input: DouyinLikeInput): Promise<{ ok: boolean; code: number; message: string; data?: DouyinLikeOutput }> {
    try {
      const { action, params = {} } = input;
      
      // 调用Python脚本
      const result = execSync(
        `py "${this.pythonScriptPath}" "${action}" "${JSON.stringify(params)}"`,
        { encoding: 'utf8', timeout: 60000 }
      );

      const output: DouyinLikeOutput = JSON.parse(result);
      
      if (output.status === 'success') {
        return {
          ok: true,
          code: 0,
          message: output.message,
          data: output
        };
      } else {
        return {
          ok: false,
          code: SkillErrorCode.EXTERNAL_SERVICE,
          message: output.message
        };
      }
    } catch (error: any) {
      return {
        ok: false,
        code: SkillErrorCode.EXTERNAL_SERVICE,
        message: `执行失败: ${error.message}`
      };
    }
  }
}