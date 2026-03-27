import { execSync } from 'child_process';
import { SkillExecutionResponse, SkillErrorCode, buildSkillSuccess, buildSkillFailure } from './standards/contracts';

export interface DouyinSmartInteractInput {
  keywords?: string[];
  maxVideos?: number;
  maxCommentsPerVideo?: number;
  searchIntervalMs?: number;
  loginTimeoutSeconds?: number;
}

export interface DouyinSmartInteractOutput {
  keywords: string[];
  maxVideos: number;
  maxCommentsPerVideo: number;
  interactions: Array<{
    keyword: string;
    videos_processed: number;
    comments_posted: number;
    likes_given: number;
  }>;
}

export async function douyinSmartInteract(input: DouyinSmartInteractInput): Promise<SkillExecutionResponse<DouyinSmartInteractOutput>> {
  const traceId = `trace_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    // 构建命令参数
    const params = JSON.stringify(input);
    // 执行 Python 脚本，使用完整的 Python 路径
    const pythonPath = "c:\\users\\administrator\\appdata\\local\\programs\\python\\python313\\python.exe";
    console.log(`[DouyinSmartInteract] 执行命令: ${pythonPath} douyin-automation.py smart_interact '${params}'`);
    
    try {
      const output = execSync(`${pythonPath} douyin-automation.py smart_interact '${params}'`, { 
        encoding: 'utf8', 
        timeout: 300000,
        stdio: 'pipe'
      });
      
      console.log(`[DouyinSmartInteract] 命令输出: ${output}`);
      
      // 解析输出
      const result = JSON.parse(output);
      const durationMs = Date.now() - startTime;
      
      if (result.status === 'success') {
        return buildSkillSuccess({
          data: result.data as DouyinSmartInteractOutput,
          traceId,
          message: result.message,
          durationMs
        });
      } else {
        return buildSkillFailure({
          code: SkillErrorCode.EXTERNAL_SERVICE,
          message: result.message,
          traceId,
          durationMs
        });
      }
    } catch (execError) {
      console.error(`[DouyinSmartInteract] 命令执行失败: ${execError instanceof Error ? execError.message : String(execError)}`);
      if (execError instanceof Error && 'stdout' in execError && 'stderr' in execError) {
        console.error(`[DouyinSmartInteract] 标准输出: ${execError.stdout}`);
        console.error(`[DouyinSmartInteract] 标准错误: ${execError.stderr}`);
      }
      throw execError;
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return buildSkillFailure({
      code: SkillErrorCode.UNKNOWN,
      message: `执行抖音智能互动失败: ${error instanceof Error ? error.message : String(error)}`,
      traceId,
      durationMs
    });
  }
}

export async function testDouyinSearchBox(): Promise<SkillExecutionResponse<any>> {
  const traceId = `trace_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    // 执行 Python 脚本，使用完整的 Python 路径
    const pythonPath = "c:\\users\\administrator\\appdata\\local\\programs\\python\\python313\\python.exe";
    console.log(`[TestDouyinSearchBox] 执行命令: ${pythonPath} douyin-automation.py test_search`);
    
    try {
      const output = execSync(`${pythonPath} douyin-automation.py test_search`, { 
        encoding: 'utf8', 
        timeout: 60000,
        stdio: 'pipe'
      });
      
      console.log(`[TestDouyinSearchBox] 命令输出: ${output}`);
      
      // 解析输出
      const result = JSON.parse(output);
      const durationMs = Date.now() - startTime;
      
      if (result.status === 'success') {
        return buildSkillSuccess({
          data: result,
          traceId,
          message: result.message,
          durationMs
        });
      } else {
        return buildSkillFailure({
          code: SkillErrorCode.EXTERNAL_SERVICE,
          message: result.message,
          traceId,
          durationMs
        });
      }
    } catch (execError) {
      console.error(`[TestDouyinSearchBox] 命令执行失败: ${execError instanceof Error ? execError.message : String(execError)}`);
      if (execError instanceof Error && 'stdout' in execError && 'stderr' in execError) {
        console.error(`[TestDouyinSearchBox] 标准输出: ${execError.stdout}`);
        console.error(`[TestDouyinSearchBox] 标准错误: ${execError.stderr}`);
      }
      throw execError;
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return buildSkillFailure({
      code: SkillErrorCode.UNKNOWN,
      message: `测试搜索框失败: ${error instanceof Error ? error.message : String(error)}`,
      traceId,
      durationMs
    });
  }
}

export async function calibrateDouyinSearchBox(): Promise<SkillExecutionResponse<any>> {
  const traceId = `trace_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    // 执行 Python 脚本，使用完整的 Python 路径
    const pythonPath = "c:\\users\\administrator\\appdata\\local\\programs\\python\\python313\\python.exe";
    console.log(`[CalibrateDouyinSearchBox] 执行命令: ${pythonPath} douyin-automation.py calibrate_search`);
    
    try {
      const output = execSync(`${pythonPath} douyin-automation.py calibrate_search`, { 
        encoding: 'utf8', 
        timeout: 120000,
        stdio: 'pipe'
      });
      
      console.log(`[CalibrateDouyinSearchBox] 命令输出: ${output}`);
      
      // 解析输出
      const result = JSON.parse(output);
      const durationMs = Date.now() - startTime;
      
      if (result.status === 'success') {
        return buildSkillSuccess({
          data: result,
          traceId,
          message: result.message,
          durationMs
        });
      } else {
        return buildSkillFailure({
          code: SkillErrorCode.EXTERNAL_SERVICE,
          message: result.message,
          traceId,
          durationMs
        });
      }
    } catch (execError) {
      console.error(`[CalibrateDouyinSearchBox] 命令执行失败: ${execError instanceof Error ? execError.message : String(execError)}`);
      if (execError instanceof Error && 'stdout' in execError && 'stderr' in execError) {
        console.error(`[CalibrateDouyinSearchBox] 标准输出: ${execError.stdout}`);
        console.error(`[CalibrateDouyinSearchBox] 标准错误: ${execError.stderr}`);
      }
      throw execError;
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return buildSkillFailure({
      code: SkillErrorCode.UNKNOWN,
      message: `校准搜索框失败: ${error instanceof Error ? error.message : String(error)}`,
      traceId,
      durationMs
    });
  }
}

export async function calibrateDouyinCommentButton(): Promise<SkillExecutionResponse<any>> {
  const traceId = `trace_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    // 执行 Python 脚本，使用完整的 Python 路径
    const pythonPath = "c:\\users\\administrator\\appdata\\local\\programs\\python\\python313\\python.exe";
    console.log(`[CalibrateDouyinCommentButton] 执行命令: ${pythonPath} douyin-automation.py calibrate_comment`);
    
    try {
      const output = execSync(`${pythonPath} douyin-automation.py calibrate_comment`, { 
        encoding: 'utf8', 
        timeout: 120000,
        stdio: 'pipe'
      });
      
      console.log(`[CalibrateDouyinCommentButton] 命令输出: ${output}`);
      
      // 解析输出
      const result = JSON.parse(output);
      const durationMs = Date.now() - startTime;
      
      if (result.status === 'success') {
        return buildSkillSuccess({
          data: result,
          traceId,
          message: result.message,
          durationMs
        });
      } else {
        return buildSkillFailure({
          code: SkillErrorCode.EXTERNAL_SERVICE,
          message: result.message,
          traceId,
          durationMs
        });
      }
    } catch (execError) {
      console.error(`[CalibrateDouyinCommentButton] 命令执行失败: ${execError instanceof Error ? execError.message : String(execError)}`);
      if (execError instanceof Error && 'stdout' in execError && 'stderr' in execError) {
        console.error(`[CalibrateDouyinCommentButton] 标准输出: ${execError.stdout}`);
        console.error(`[CalibrateDouyinCommentButton] 标准错误: ${execError.stderr}`);
      }
      throw execError;
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return buildSkillFailure({
      code: SkillErrorCode.UNKNOWN,
      message: `校准评论按钮失败: ${error instanceof Error ? error.message : String(error)}`,
      traceId,
      durationMs
    });
  }
}
