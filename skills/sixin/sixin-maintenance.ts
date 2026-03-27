import fs from 'fs';
import path from 'path';
import { llmClient, LLMInput } from '../../core/llm/llm-client';

const MODULE = 'SixinMaintenance';

export interface SixinMaintenanceInput {
  skillId: string;
  traceId: string;
}

export interface SixinMaintenanceOutput {
  code: number;
  data: {
    processedCount: number;
    successCount: number;
    failedCount: number;
    results: Array<{
      userId: string;
      userMessage: string;
      response: string;
      success: boolean;
      error?: string;
    }>;
  };
}

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

// 读取私信模板
function readReplyTemplates(round: number): string[] {
  const templateFiles = {
    1: path.join(__dirname, '../../user-config/assets/sixin/1.txt'),
    2: path.join(__dirname, '../../user-config/assets/sixin/2.txt'),
    3: path.join(__dirname, '../../user-config/assets/sixin/3.txt')
  };
  
  const templateFile = templateFiles[round as keyof typeof templateFiles];
  
  try {
    if (!fs.existsSync(templateFile)) {
      log(`模板文件不存在: ${templateFile}`);
      return [];
    }
    
    const content = fs.readFileSync(templateFile, 'utf8');
    const templates = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('一、') && !line.startsWith('二、') && !line.startsWith('三、') && !line.startsWith('四、'));
    
    log(`读取到 ${templates.length} 个回复模板 (第${round}轮)`);
    return templates;
  } catch (error) {
    log(`读取模板文件失败: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// 获取待处理的私信列表（模拟数据，实际应该从数据库或API获取）
function getPendingMessages(): Array<{ userId: string; message: string; round: number }> {
  // 这里应该从数据库或API获取真实的私信数据
  // 暂时返回模拟数据
  return [
    { userId: 'user1', message: '你好，很高兴认识你', round: 1 },
    { userId: 'user2', message: '最近工作怎么样？', round: 1 },
    { userId: 'user3', message: '你平时有什么爱好？', round: 1 },
    { userId: 'user4', message: '你是做什么工作的？', round: 1 },
    { userId: 'user5', message: '今天天气真好', round: 1 },
    { userId: 'user6', message: '谢谢，我觉得我们挺聊得来的', round: 2 },
    { userId: 'user7', message: '我平时喜欢看书和运动', round: 2 },
    { userId: 'user8', message: '你说得对，真诚最重要', round: 2 },
    { userId: 'user9', message: '好的，我也觉得可以加微信聊聊', round: 3 },
    { userId: 'user10', message: '谢谢你的回复，我们保持联系', round: 3 }
  ];
}

// 随机选择N个模板
function selectRandomTemplates(templates: string[], count: number): string[] {
  if (templates.length <= count) {
    return templates;
  }
  
  const shuffled = [...templates].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// 生成LLM提示词
function generatePrompt(userMessage: string, templates: string[]): string {
  return `请你作为一名专业的社交媒体运营专家，帮助我从以下10个回复模板中选择一个最合适的回复给用户。

用户的私信内容：
"${userMessage}"

可供选择的回复模板：
${templates.map((template, index) => `${index + 1}. ${template}`).join('\n')}

请你：
1. 分析用户的私信内容和语气
2. 从上述10个回复模板中选择一个最合适的
3. 如果没有合适的，也可以给出你认为更好的回复
4. 只输出最终的回复内容，不要包含任何分析或说明`;
}

// 发送回复给用户（模拟）
function sendReplyToUser(userId: string, response: string): boolean {
  // 实际应该调用API发送私信
  log(`发送回复给用户 ${userId}: ${response}`);
  return true;
}

export async function maintainSixin(input: SixinMaintenanceInput): Promise<SixinMaintenanceOutput> {
  log('开始私信维护任务');
  
  try {
    const messages = getPendingMessages();
    const results: Array<{
      userId: string;
      userMessage: string;
      response: string;
      success: boolean;
      error?: string;
    }> = [];
    
    let successCount = 0;
    let failedCount = 0;
    
    // 一次处理10个私信
    const batchSize = 10;
    const batchMessages = messages.slice(0, batchSize);
    
    for (const msg of batchMessages) {
      try {
        log(`处理用户 ${msg.userId} 的私信，第${msg.round}轮回复`);
        
        // 读取对应轮次的回复模板
        const templates = readReplyTemplates(msg.round);
        
        if (templates.length === 0) {
          log(`没有可用的回复模板，跳过用户 ${msg.userId}`);
          results.push({
            userId: msg.userId,
            userMessage: msg.message,
            response: '',
            success: false,
            error: '没有可用的回复模板'
          });
          failedCount++;
          continue;
        }
        
        // 随机选择10个模板
        const selectedTemplates = selectRandomTemplates(templates, 10);
        
        // 生成LLM提示词
        const prompt = generatePrompt(msg.message, selectedTemplates);
        
        // 调用LLM选择最佳回复
        const llmInput: LLMInput = {
          prompt: prompt,
          skillId: 'sixin-maintenance',
          traceId: `sixin-${Date.now()}-${msg.userId}`,
          parameters: {
            maxTokens: 500,
            temperature: 0.3,
            topP: 0.9
          }
        };
        
        const llmOutput = await llmClient.generate(llmInput);
        
        if (llmOutput.ok && llmOutput.data?.content) {
          const response = llmOutput.data.content.trim();
          
          // 发送回复给用户
          const sendSuccess = sendReplyToUser(msg.userId, response);
          
          if (sendSuccess) {
            log(`✅ 成功维护用户 ${msg.userId} 的私信`);
            results.push({
              userId: msg.userId,
              userMessage: msg.message,
              response: response,
              success: true
            });
            successCount++;
          } else {
            log(`❌ 发送回复失败: 用户 ${msg.userId}`);
            results.push({
              userId: msg.userId,
              userMessage: msg.message,
              response: response,
              success: false,
              error: '发送回复失败'
            });
            failedCount++;
          }
        } else {
          log(`❌ LLM调用失败: ${llmOutput.message || '无错误信息'}`);
          results.push({
            userId: msg.userId,
            userMessage: msg.message,
            response: '',
            success: false,
            error: llmOutput.message || 'LLM调用失败'
          });
          failedCount++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`💥 处理用户 ${msg.userId} 的私信时发生异常: ${errorMsg}`);
        results.push({
          userId: msg.userId,
          userMessage: msg.message,
          response: '',
          success: false,
          error: errorMsg
        });
        failedCount++;
      }
    }
    
    log(`私信维护任务完成，处理 ${batchMessages.length} 个私信，成功 ${successCount} 个，失败 ${failedCount} 个`);
    
    return {
      code: 0,
      data: {
        processedCount: batchMessages.length,
        successCount,
        failedCount,
        results
      }
    };
  } catch (error) {
    log(`任务执行失败: ${error instanceof Error ? error.message : String(error)}`);
    return {
      code: 500,
      data: {
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        results: []
      }
    };
  }
}