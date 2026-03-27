import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { llmClient, LLMInput } from '../../core/llm/llm-client';

const MODULE = 'HotSearchExplorer';

export interface HotSearchExplorerInput {
  skillId: string;
  traceId: string;
}

export interface HotSearchExplorerOutput {
  code: number;
  data: {
    searchKeyword: string;
    newsCount: number;
    generatedPost: string;
    updatedKeywords: boolean;
  };
}

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

function loadPrompts(): { explorerPrompt: string; interactPrompt: string } {
  const promptsFile = path.resolve('D:\\weibo\\data\\prompts.json');
  try {
    if (fs.existsSync(promptsFile)) {
      const content = fs.readFileSync(promptsFile, 'utf8');
      const prompts = JSON.parse(content);
      return {
        explorerPrompt: prompts.explorerPrompt || '',
        interactPrompt: prompts.interactPrompt || ''
      };
    }
  } catch (error) {
    log(`读取提示词配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
  return {
    explorerPrompt: '',
    interactPrompt: ''
  };
}

function readKeywords(): string[] {
  const keywordsPath = path.resolve('D:\\weibo\\sou\\sou.txt');
  try {
    if (!fs.existsSync(keywordsPath)) {
      log('关键词文件不存在，创建默认文件');
      fs.writeFileSync(keywordsPath, '人工智能\n科技\n新闻\n健康\n娱乐', 'utf8');
    }
    const content = fs.readFileSync(keywordsPath, 'utf8');
    return content.split('\n').filter(line => line.trim().length > 0);
  } catch (error) {
    log(`读取关键词文件失败: ${error instanceof Error ? error.message : String(error)}`);
    return ['人工智能', '科技', '新闻', '健康', '娱乐'];
  }
}

function writeKeywords(keywords: string[]): void {
  const keywordsPath = path.resolve('D:\\weibo\\sou\\sou.txt');
  try {
    fs.writeFileSync(keywordsPath, keywords.join('\n'), 'utf8');
    log(`关键词文件已更新，共 ${keywords.length} 个关键词`);
  } catch (error) {
    log(`写入关键词文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function selectRandomKeyword(keywords: string[]): string {
  const randomIndex = Math.floor(Math.random() * keywords.length);
  return keywords[randomIndex];
}

async function searchGoogle(): Promise<string[]> {
  // 使用配置文件中的提示词来生成相关内容
  const prompts = loadPrompts();
  let prompt = prompts.explorerPrompt;
  
  // 如果配置文件中没有提示词，使用默认提示词
  if (!prompt || prompt.trim() === '') {
    prompt = `你是一名喜欢养绿植的爱好者 给我2种今年流行养殖的绿植新品种`;
  }
  
  log(`使用提示词: ${prompt.substring(0, 50)}...`);
  
  // 构造LLM输入
  const llmInput: LLMInput = {
    prompt: prompt,               // 使用配置的提示词
    skillId: 'mcp-hot-search-explorer',
    traceId: `hot-search-${Date.now()}`,
    parameters: {
      maxTokens: 800,
      temperature: 0.7,
      topP: 0.95
    }
  };
  
  try {
    // 调用LLM生成内容
    const llmOutput = await llmClient.generate(llmInput);
    
    if (llmOutput.ok && llmOutput.data?.content) {
      const generatedContent = llmOutput.data.content.trim();
      log(`使用LLM生成的内容: ${generatedContent.substring(0, 50)}...`);
      return [generatedContent];
    } else {
      log(`❌ LLM调用失败: ${llmOutput.message || '无错误信息'}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`💥 LLM调用异常: ${errorMsg}`);
  }
  
  // 调用失败就返回空值
  log('LLM调用失败，返回空值');
  return [];
}

function saveNews(news: string[], keyword: string): string {
  const newsPath = path.join(__dirname, '../../user-config/assets/news/1.txt');
  
  // 确保目录存在
  const newsDir = path.dirname(newsPath);
  if (!fs.existsSync(newsDir)) {
    fs.mkdirSync(newsDir, { recursive: true });
  }
  
  const content = `搜索关键词: ${keyword}\n\n${news.join('\n')}`;
  fs.writeFileSync(newsPath, content, 'utf8');
  log(`新闻已保存到: ${newsPath}`);
  return content;
}

function sanitizePostContent(content: string): string {
  // 移除 <think> 标签及其内容
  let sanitized = content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
  
  // 移除可能的思考过程文本
  sanitized = sanitized.replace(/好的，我需要.*?/s, '');
  sanitized = sanitized.replace(/首先，我得.*?/s, '');
  sanitized = sanitized.replace(/接下来，我需要.*?/s, '');
  sanitized = sanitized.replace(/然后，添加.*?/s, '');
  sanitized = sanitized.replace(/要注意.*?/s, '');
  sanitized = sanitized.replace(/检查有没有.*?/s, '');
  sanitized = sanitized.replace(/可能需要.*?/s, '');
  
  return sanitized.trim();
}

async function generateFacebookPost(newsContent: string): Promise<string> {
  // 读取配置文件中的提示词
  const prompts = loadPrompts();
  let prompt = prompts.explorerPrompt;
  
  // 如果配置文件中没有提示词，使用默认提示词
  if (!prompt || prompt.trim() === '') {
    prompt = `你是一名喜欢养绿植的爱好者 介于 给我的新品种 你帮我生成一篇发布Facebook 绿植养殖心得的贴文`;
  }
  
  // 将新闻内容插入到提示词中
  prompt = prompt.replace('介于', `介于 ${newsContent || ''}`);

  // 2. 构造LLM入参（保留skillId/traceId，补充千问适配参数）
  const llmInput: LLMInput = {
    prompt: prompt,               // 核心Prompt（必填）
    skillId: 'mcp-hot-search-explorer', // 保留（用于缓存/日志）
    traceId: `hot-search-${Date.now()}`, // 保留（用于追踪）
    parameters: {
      maxTokens: 800,              // 千问生成长度（适配）
      temperature: 0.7,             // 随机性（千问推荐）
      topP: 0.95                   // 千问推荐值
    }
  };

  try {
    // 3. 调用修复后的LLM客户端
    const llmOutput = await llmClient.generate(llmInput);
    
    // 4. 打印完整返回（排查用）
    log(`LLM调用结果: ${JSON.stringify(llmOutput, null, 2)}`);

    // 5. 适配千问返回格式（核心修改：从choices[0].text读取内容）
    if (llmOutput.ok && llmOutput.data?.content) {
      const rawContent = llmOutput.data.content;
      const sanitizedContent = sanitizePostContent(rawContent);

      if (sanitizedContent && sanitizedContent.trim() !== '') {
        log(`✅ 成功生成Facebook帖子: ${sanitizedContent.slice(0, 50)}...`);
        return sanitizedContent;
      } else {
        log(`⚠️ 千问返回内容为空或无效`);
      }
    } else {
      log(`❌ LLM调用失败: ${llmOutput.message || '无错误信息'}`);
    }
  } catch (error) {
    // 捕获所有异常（包括网络/超时/客户端错误）
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`💥 LLM调用异常: ${errorMsg}`);
    log(`异常堆栈: ${error instanceof Error ? error.stack || '无堆栈信息' : '无堆栈信息'}`);
  }

  // 调用失败就返回空值，不使用备用内容
  log('LLM调用失败，返回空值');
  return '';
}

function savePost(post: string): void {
  const postDir = path.resolve('D:\\weibo\\tiezi');
  if (!fs.existsSync(postDir)) {
    fs.mkdirSync(postDir, { recursive: true });
  }

  // 保存到固定的2.txt文件，供二次交互技能读取
  const postPath = path.join(postDir, '2.txt');
  
  fs.writeFileSync(postPath, post, 'utf8');
  log(`帖子已保存到: ${postPath}`);
}

function extractPotentialKeywords(news: string[]): string[] {
  // 简单的关键词提取逻辑，实际项目中可以使用更复杂的NLP方法
  const keywords: Set<string> = new Set();
  
  news.forEach(item => {
    // 提取可能的热搜词
    const words = item.split(/[\s，。！？；："'()\[\]{}]+/).filter(word => word.length >= 2);
    words.forEach(word => keywords.add(word));
  });
  
  return Array.from(keywords).slice(0, 10); // 只取前10个可能的关键词
}

function updateKeywords(existingKeywords: string[], newKeywords: string[]): boolean {
  let updated = false;
  const maxKeywords = 100;
  
  newKeywords.forEach(keyword => {
    if (!existingKeywords.includes(keyword) && existingKeywords.length < maxKeywords) {
      existingKeywords.push(keyword);
      updated = true;
    } else if (!existingKeywords.includes(keyword) && existingKeywords.length >= maxKeywords) {
      // 替换最老的关键词
      existingKeywords.shift();
      existingKeywords.push(keyword);
      updated = true;
    }
  });
  
  if (updated) {
    writeKeywords(existingKeywords);
  }
  
  return updated;
}

export async function exploreHotSearch(input: HotSearchExplorerInput): Promise<HotSearchExplorerOutput> {
  log('开始热搜词探索任务');
  
  try {
    // 1. 使用提示词生成内容
    const news = await searchGoogle();
    log(`找到 ${news.length} 条相关新闻`);
    
    if (news.length === 0) {
      return {
        code: 0,
        data: {
          searchKeyword: '提示词生成',
          newsCount: 0,
          generatedPost: '未找到相关新闻',
          updatedKeywords: false
        }
      };
    }
    
    // 2. 保存新闻
    const newsContent = saveNews(news, '提示词生成');
    
    // 3. 生成Facebook帖子
    const post = await generateFacebookPost(newsContent);
    
    // 4. 保存帖子
    savePost(post);
    
    log('热搜词探索任务完成');
    
    return {
      code: 0,
      data: {
        searchKeyword: '提示词生成',
        newsCount: news.length,
        generatedPost: post,
        updatedKeywords: false
      }
    };
  } catch (error) {
    log(`任务执行失败: ${error instanceof Error ? error.message : String(error)}`);
    return {
      code: 500,
      data: {
        searchKeyword: '',
        newsCount: 0,
        generatedPost: `任务执行失败: ${error instanceof Error ? error.message : String(error)}`,
        updatedKeywords: false
      }
    };
  }
}
