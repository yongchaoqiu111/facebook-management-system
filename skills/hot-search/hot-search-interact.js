const fs = require('fs');
const path = require('path');
const { llmClient } = require('../../core/llm/llm-client');

const MODULE = 'HotSearchInteract';

function log(message) {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

function loadPrompts() {
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

function readNews() {
  const newsDir = path.resolve('D:\\weibo\\news');
  try {
    if (!fs.existsSync(newsDir)) {
      log('新闻目录不存在');
      return [];
    }
    
    // 读取固定的1.txt文件
    const newsFile = path.join(newsDir, '1.txt');
    
    if (!fs.existsSync(newsFile)) {
      log('新闻文件不存在');
      return [];
    }
    
    const content = fs.readFileSync(newsFile, 'utf8');
    log(`读取新闻文件: ${newsFile}`);
    return [content];
    
  } catch (error) {
    log(`读取新闻失败: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

async function generateAIExpertPost(newsContent) {
  // 读取配置文件中的提示词
  const prompts = loadPrompts();
  let prompt = prompts.interactPrompt;
  
  // 打印读取到的提示词，用于调试
  log(`读取到的提示词: ${prompt}`);
  
  // 如果配置文件中没有提示词，使用默认提示词
  if (!prompt || prompt.trim() === '') {
    prompt = `你是一名喜欢养绿植的爱好者 介于 给我的新品种 你帮我生成一篇发布Facebook 绿植养殖心得的贴文`;
    log('使用默认提示词');
  }
  
  // 将新闻内容插入到提示词中
  prompt = prompt.replace('介于', `介于 ${newsContent || ''}`);
  log(`最终提示词: ${prompt}`);

  // 2. 构造LLM入参（保留skillId/traceId，补充千问适配参数）
  const llmInput = {
    prompt: prompt,
    skillId: 'mcp-hot-search-interact', // 保留业务标识
    traceId: `hot-search-interact-${Date.now()}`, // 保留追踪ID
    parameters: {
      maxTokens: 1000, // 适配长文本生成（AI感悟文章）
      temperature: 0.8, // 更高随机性，符合博主风格
      topP: 0.9
    }
  };

  try {
    // 3. 调用修复后的LLM客户端
    const llmOutput = await llmClient.generate(llmInput);
    
    // 4. 打印完整返回（排查关键）
    log(`【二次交互技能】LLM调用结果: ${JSON.stringify(llmOutput, null, 2)}`);

    // 5. 适配千问Completions接口返回格式（核心修改）
    if (llmOutput.ok && llmOutput.data?.content) {
      const rawContent = llmOutput.data.content;
      const content = rawContent.trim();

      // 严格校验内容有效性
      if (content && content !== '无法生成帖子内容' && content.length > 50) {
        log(`✅ 成功生成AI专家感悟文章: ${content.slice(0, 60)}...`);
        return content;
      } else {
        log(`⚠️ 千问返回内容无效（空/过短/兜底提示）`);
      }
    } else {
      log(`❌ 【二次交互技能】LLM调用失败: ${llmOutput.message || '无错误信息'}`);
    }
  } catch (error) {
    // 捕获全量异常并打印堆栈
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`💥 【二次交互技能】LLM调用异常: ${errorMsg}`);
    log(`异常堆栈: ${error.stack || '无堆栈信息'}`);
  }

  // 调用失败就返回空值
  log('LLM调用失败，返回空值');
  return '';
}

function extractHashtags(post) {
  const hashtagRegex = /#([^#\s]+)/g;
  const hashtags = [];
  let match;
  
  while ((match = hashtagRegex.exec(post)) !== null) {
    hashtags.push(match[1]);
  }
  
  return hashtags;
}

function saveHashtags(hashtags) {
  if (hashtags.length === 0) {
    log('没有提取到话题标签');
    return;
  }
  
  const souFilePath = path.resolve('D:\\weibo\\sou\\sou.txt');
  
  try {
    // 直接用新的话题标签替换整个文件
    fs.writeFileSync(souFilePath, hashtags.join('\n'), 'utf8');
    log(`已提取并替换话题标签: ${hashtags.join(', ')}`);
  } catch (error) {
    log(`保存话题标签失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function savePost(post) {
  const postDir = path.resolve('D:\\weibo\\tiezi');
  if (!fs.existsSync(postDir)) {
    fs.mkdirSync(postDir, { recursive: true });
  }

  const postPath = path.join(postDir, '1.txt');
  
  try {
    fs.writeFileSync(postPath, post, 'utf8');
    log(`帖子已保存到: ${postPath}`);
    
    // 提取并保存话题标签
    const hashtags = extractHashtags(post);
    saveHashtags(hashtags);
    
    return true;
  } catch (error) {
    log(`保存帖子失败: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function interactHotSearch(input) {
  log('开始热搜词二次交互任务');
  
  try {
    // 1. 读取最新的新闻内容
    const news = readNews();
    
    if (news.length === 0) {
      return {
        code: 0,
        data: {
          generatedPost: '未找到相关新闻',
          saved: false
        }
      };
    }
    
    // 2. 基于新闻内容生成AI技术博主风格的文章
    const post = await generateAIExpertPost(news[0]);
    
    // 3. 保存帖子到1.txt
    const saved = savePost(post);
    
    log('热搜词二次交互任务完成');
    
    return {
      code: 0,
      data: {
        generatedPost: post,
        saved
      }
    };
  } catch (error) {
    log(`任务执行失败: ${error instanceof Error ? error.message : String(error)}`);
    return {
      code: 500,
      data: {
        generatedPost: `任务执行失败: ${error instanceof Error ? error.message : String(error)}`,
        saved: false
      }
    };
  }
}

module.exports = {
  interactHotSearch
};