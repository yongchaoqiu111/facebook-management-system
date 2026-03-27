import fs from 'fs';
import path from 'path';

const MODULE = 'CommentIntercept';

export interface CommentInterceptInput {
  skillId: string;
  traceId: string;
}

export interface CommentInterceptOutput {
  code: number;
  data: {
    processedCount: number;
    repliedCount: number;
    error: string;
  };
}

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

// 获取当前文件目录
const __dirname = path.dirname(process.cwd());

// 读取文本文件内容
function readTextFile(filePath: string): string[] {
  try {
    if (!fs.existsSync(filePath)) {
      log(`文件不存在: ${filePath}`);
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    log(`成功读取文件: ${filePath}，共 ${lines.length} 行`);
    return lines;
  } catch (error) {
    log(`读取文件失败: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

// 随机选择数组中的一个元素
function getRandomItem<T>(array: T[]): T | undefined {
  if (array.length === 0) {
    return undefined;
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

// 检查评论是否包含目标关键词
function containsKeyword(comment: string, keywords: string[]): boolean {
  const commentLower = comment.toLowerCase();
  return keywords.some(keyword => commentLower.includes(keyword.toLowerCase()));
}

// 模拟Facebook评论回复
async function replyToComment(commentId: string, replyContent: string): Promise<boolean> {
  try {
    log(`回复评论 ${commentId}: ${replyContent.substring(0, 50)}...`);
    // 这里应该是实际的Facebook API调用
    // 由于是模拟，直接返回成功
    return true;
  } catch (error) {
    log(`回复评论失败: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// 模拟搜索贴文
async function searchPosts(keyword: string): Promise<any[]> {
  try {
    log(`搜索关键词: ${keyword}`);
    // 这里应该是实际的Facebook搜索API调用
    // 由于是模拟，返回一些示例数据
    return [
      {
        postId: 'post_1',
        title: `关于${keyword}的讨论`,
        comments: [
          {
            commentId: 'comment_1',
            content: `我对${keyword}很感兴趣，想了解更多信息`,
            author: 'user1'
          },
          {
            commentId: 'comment_2',
            content: `这个话题不错，大家怎么看${keyword}？`,
            author: 'user2'
          },
          {
            commentId: 'comment_3',
            content: `路过看看，不发表意见`,
            author: 'user3'
          }
        ]
      },
      {
        postId: 'post_2',
        title: `${keyword}的最新动态`,
        comments: [
          {
            commentId: 'comment_4',
            content: `听说${keyword}最近有新进展`,
            author: 'user4'
          },
          {
            commentId: 'comment_5',
            content: `我一直在关注${keyword}的发展`,
            author: 'user5'
          }
        ]
      }
    ];
  } catch (error) {
    log(`搜索贴文失败: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

export async function commentInterceptSkill(input: CommentInterceptInput): Promise<CommentInterceptOutput> {
  log('开始评论区截留任务');
  
  try {
    // 定义文件路径
    const searchKeywordsFile = path.join(__dirname, '../../user-config/assets/pinglunci/ss.txt');
    const targetKeywordsFile = path.join(__dirname, '../../user-config/assets/pinglunci/pinlunci.txt');
    const replyContentsFile = path.join(__dirname, '../../user-config/assets/pinglunci/huifu.txt');
    
    // 读取关键词和回复内容
    const searchKeywords = readTextFile(searchKeywordsFile);
    const targetKeywords = readTextFile(targetKeywordsFile);
    const replyContents = readTextFile(replyContentsFile);
    
    if (searchKeywords.length === 0) {
      throw new Error('搜索关键词文件为空');
    }
    
    if (targetKeywords.length === 0) {
      throw new Error('目标关键词文件为空');
    }
    
    if (replyContents.length === 0) {
      throw new Error('回复内容文件为空');
    }
    
    // 随机选择一个搜索关键词
    const selectedKeyword = getRandomItem(searchKeywords);
    if (!selectedKeyword) {
      throw new Error('无法选择搜索关键词');
    }
    
    log(`选择搜索关键词: ${selectedKeyword}`);
    
    // 搜索贴文
    const posts = await searchPosts(selectedKeyword);
    log(`找到 ${posts.length} 篇相关贴文`);
    
    let processedCount = 0;
    let repliedCount = 0;
    
    // 遍历每篇贴文的评论
    for (const post of posts) {
      for (const comment of post.comments) {
        processedCount++;
        
        // 检查评论是否包含目标关键词
        if (containsKeyword(comment.content, targetKeywords)) {
          log(`命中目标关键词，准备回复评论 ${comment.commentId}`);
          
          // 随机选择一条回复内容
          const replyContent = getRandomItem(replyContents);
          if (replyContent) {
            // 回复评论
            const success = await replyToComment(comment.commentId, replyContent);
            if (success) {
              repliedCount++;
              log(`成功回复评论 ${comment.commentId}`);
            } else {
              log(`回复评论 ${comment.commentId} 失败`);
            }
          }
        }
      }
    }
    
    log('评论区截留任务完成');
    
    return {
      code: 0,
      data: {
        processedCount: processedCount,
        repliedCount: repliedCount,
        error: ''
      }
    };
  } catch (error) {
    log(`任务执行失败: ${error instanceof Error ? error.message : String(error)}`);
    return {
      code: 500,
      data: {
        processedCount: 0,
        repliedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}
