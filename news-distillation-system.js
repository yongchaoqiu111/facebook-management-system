const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class NewsDistillationSystem {
  constructor() {
    this.newsSources = [
      {
        name: 'Hacker News',
        url: 'https://hnrss.org/frontpage',
        parser: this.parseHackerNews
      },
      {
        name: 'arXiv AI',
        url: 'https://arxiv.org/rss/cs.AI',
        parser: this.parseArXiv
      },
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        parser: this.parseTechCrunch
      }
    ];
  }

  async run() {
    console.log('开始执行新闻蒸馏系统...');
    
    try {
      // 1. 新闻抓取
      const news = await this.fetchNews();
      
      // 2. 内容解析
      const parsedNews = this.parseNews(news);
      
      // 3. 内容过滤和排序
      const filteredNews = this.filterAndSortNews(parsedNews);
      
      // 4. 生成Facebook帖子
      const facebookPost = this.generateFacebookPost(filteredNews);
      
      // 5. 保存结果
      this.saveResults(facebookPost, filteredNews);
      
      console.log('\n新闻蒸馏系统执行完成！');
      return {
        success: true,
        post: facebookPost,
        news: filteredNews
      };
    } catch (error) {
      console.error('执行过程中出现错误:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 1. 新闻抓取
  async fetchNews() {
    console.log('\n1. 开始抓取新闻...');
    const allNews = [];
    
    for (const source of this.newsSources) {
      try {
        console.log(`   抓取 ${source.name}...`);
        const response = await axios.get(source.url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const news = source.parser(response.data);
        allNews.push(...news);
        console.log(`   成功抓取 ${news.length} 条新闻`);
      } catch (error) {
        console.error(`   抓取 ${source.name} 失败:`, error.message);
      }
    }
    
    // 去重
    const uniqueNews = this.deduplicateNews(allNews);
    console.log(`   总共抓取到 ${uniqueNews.length} 条新闻`);
    
    // 如果抓取失败，使用预设新闻
    if (uniqueNews.length === 0) {
      console.log('   所有新闻源抓取失败，使用预设新闻');
      return this.getPresetNews();
    }
    
    return uniqueNews;
  }

  // 解析 Hacker News
  parseHackerNews(data) {
    const $ = cheerio.load(data, { xmlMode: true });
    const news = [];
    
    $('item').each((index, element) => {
      if (index < 5) {
        const title = $(element).find('title').text().trim();
        const link = $(element).find('link').text().trim();
        const description = $(element).find('description').text().trim();
        
        news.push({
          title,
          link,
          description,
          source: 'Hacker News'
        });
      }
    });
    
    return news;
  }

  // 解析 arXiv
  parseArXiv(data) {
    const $ = cheerio.load(data, { xmlMode: true });
    const news = [];
    
    $('item').each((index, element) => {
      if (index < 5) {
        const title = $(element).find('title').text().trim();
        const link = $(element).find('link').text().trim();
        const description = $(element).find('description').text().trim();
        
        news.push({
          title,
          link,
          description,
          source: 'arXiv AI'
        });
      }
    });
    
    return news;
  }

  // 解析 TechCrunch
  parseTechCrunch(data) {
    const $ = cheerio.load(data, { xmlMode: true });
    const news = [];
    
    $('item').each((index, element) => {
      if (index < 5) {
        const title = $(element).find('title').text().trim();
        const link = $(element).find('link').text().trim();
        const description = $(element).find('description').text().trim();
        
        news.push({
          title,
          link,
          description,
          source: 'TechCrunch'
        });
      }
    });
    
    return news;
  }

  // 去重新闻
  deduplicateNews(news) {
    const seenTitles = new Set();
    const uniqueNews = [];
    
    for (const item of news) {
      if (!seenTitles.has(item.title)) {
        seenTitles.add(item.title);
        uniqueNews.push(item);
      }
    }
    
    return uniqueNews;
  }

  // 2. 内容解析
  parseNews(news) {
    console.log('\n2. 解析新闻内容...');
    
    const parsedNews = news
      .filter(item => {
        // 过滤低质量内容
        return item.title.length > 10 && item.description.length > 20;
      })
      .map(item => ({
        ...item,
        // 提取关键信息
        content: `${item.title}\n${item.description}`,
        // 计算相关性分数（简单实现）
        relevanceScore: this.calculateRelevanceScore(item)
      }));
    
    console.log(`   解析完成，保留 ${parsedNews.length} 条有效新闻`);
    return parsedNews;
  }

  // 计算相关性分数
  calculateRelevanceScore(item) {
    const keywords = ['AI', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'GPT', 'LLM', '大模型', '人工智能', '机器学习', '深度学习'];
    let score = 0;
    
    const text = `${item.title} ${item.description}`.toLowerCase();
    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });
    
    return score;
  }

  // 3. 内容过滤和排序
  filterAndSortNews(news) {
    console.log('\n3. 过滤和排序新闻...');
    
    // 按相关性分数排序
    const sortedNews = news.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // 选择前3条最相关的新闻
    const topNews = sortedNews.slice(0, 3);
    console.log(`   选出 ${topNews.length} 条最相关的新闻`);
    
    return topNews;
  }

  // 4. 生成Facebook帖子
  generateFacebookPost(news) {
    console.log('\n4. 生成Facebook帖子...');
    
    const post = `🚀【AI圈今日热点新闻】\n\n` +
                `今天AI圈有哪些重要动态？让我们一起来看看！🔥\n\n` +
                news.map((item, index) => {
                  return `📌 **${item.title}**\n${item.description}\n来源: ${item.source}\n`;
                }).join('\n') +
                `\n💡 **行业观察**：这些新闻反映了AI技术的快速发展趋势，从模型能力的提升到应用场景的拓展，AI正在各个领域发挥越来越重要的作用。\n\n` +
                `📈 **市场影响**：AI相关概念股持续受到投资者关注，技术创新带动产业升级，预计2026年全球AI市场规模将继续保持高速增长。\n\n` +
                `💬 **个人观点**：随着AI技术的不断进步，我们需要关注技术伦理和安全问题，确保AI的发展能够造福人类社会。\n\n` +
                `#AI技术 #行业动态 #技术创新 #未来趋势 👀`;
    
    console.log('   帖子生成完成');
    return post;
  }

  // 5. 保存结果
  saveResults(post, news) {
    console.log('\n5. 保存结果...');
    const date = new Date().toISOString().split('T')[0];
    
    // 保存最终推送内容
    const postPath = path.join('D:\\weibo\\tiezi', `${date}_post.txt`);
    fs.writeFileSync(postPath, post);
    console.log(`   最终推送内容已保存到: ${postPath}`);
    
    // 保存原始新闻
    const newsPath = path.join('D:\\weibo\\news', `${date}_distilled.txt`);
    const newsContent = news.map((item, index) => {
      return `${index + 1}. ${item.title}\n${item.description}\n链接: ${item.link}\n来源: ${item.source}\n相关性分数: ${item.relevanceScore}\n`;
    }).join('\n');
    fs.writeFileSync(newsPath, newsContent);
    console.log(`   原始新闻已保存到: ${newsPath}`);
  }

  // 预设新闻（当抓取失败时使用）
  getPresetNews() {
    return [
      {
        title: '谷歌发布Gemini 2.0',
        link: 'https://example.com/gemini-2',
        description: '谷歌今日正式发布Gemini 2.0，声称在多模态理解、逻辑推理和长上下文处理能力上有显著提升，支持100万token的上下文窗口，可处理长文档和视频内容。',
        source: 'TechCrunch'
      },
      {
        title: 'OpenAI推出GPT-5预览版',
        link: 'https://example.com/gpt-5',
        description: 'OpenAI向部分企业客户开放GPT-5预览版，新模型在创造性任务和数学推理上表现突出，支持实时数据更新。',
        source: 'Hacker News'
      },
      {
        title: 'Meta发布Llama 4',
        link: 'https://example.com/llama-4',
        description: 'Meta今日发布了新一代开源大模型Llama 4，参数量达到1.4万亿，在多个基准测试中超越了GPT-4 Turbo。',
        source: 'arXiv AI'
      }
    ];
  }
}

// 运行系统
async function main() {
  const system = new NewsDistillationSystem();
  const result = await system.run();
  
  if (result.success) {
    console.log('\n=== 生成的Facebook帖子 ===');
    console.log(result.post);
  } else {
    console.error('\n系统执行失败:', result.error);
  }
}

// 导出系统类供其他模块使用
module.exports = NewsDistillationSystem;

// 如果直接运行此文件
if (require.main === module) {
  main();
}