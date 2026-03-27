"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsDistillationSkill = exports.NewsDistillationSkill = void 0;
const llm_client_1 = require("../../core/llm/llm-client");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const MODULE = 'NewsDistillation';
class NewsDistillationSkill {
    constructor() {
        this.lastImageIndex = 0;
        this.llmClient = new llm_client_1.LLMSlient();
        this.mediaLibrary = this.loadMediaLibrary();
        // 初始化图片索引文件路径
        if (__dirname.includes('dist')) {
            this.imageIndexFile = path_1.default.join(__dirname, '../../../data/image-index.json');
        }
        else {
            this.imageIndexFile = path_1.default.join(__dirname, '../../data/image-index.json');
        }
        // 加载上次的图片索引
        this.loadLastImageIndex();
    }
    loadLastImageIndex() {
        try {
            if (fs_1.default.existsSync(this.imageIndexFile)) {
                const content = fs_1.default.readFileSync(this.imageIndexFile, 'utf8');
                const data = JSON.parse(content);
                this.lastImageIndex = data.lastIndex || 0;
            }
        }
        catch (error) {
            console.error(`[${MODULE}] 加载图片索引失败:`, error);
            this.lastImageIndex = 0;
        }
    }
    saveLastImageIndex() {
        try {
            const data = { lastIndex: this.lastImageIndex };
            fs_1.default.writeFileSync(this.imageIndexFile, JSON.stringify(data, null, 2), 'utf8');
        }
        catch (error) {
            console.error(`[${MODULE}] 保存图片索引失败:`, error);
        }
    }
    getNextImage() {
        try {
            const imagesDir = path_1.default.join(__dirname, '../../images');
            if (!fs_1.default.existsSync(imagesDir)) {
                console.warn(`[${MODULE}] 图片目录不存在: ${imagesDir}`);
                return null;
            }
            // 获取所有图片文件并按文件名排序
            const files = fs_1.default.readdirSync(imagesDir).filter(file => {
                const ext = path_1.default.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
            }).sort((a, b) => {
                // 按文件名排序，处理数字编号的文件
                const aName = path_1.default.basename(a, path_1.default.extname(a));
                const bName = path_1.default.basename(b, path_1.default.extname(b));
                const aNum = parseInt(aName);
                const bNum = parseInt(bName);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                }
                return a.localeCompare(b);
            });
            if (files.length === 0) {
                console.warn(`[${MODULE}] 图片目录中没有图片文件`);
                return null;
            }
            // 轮回选择图片
            const selectedFile = files[this.lastImageIndex % files.length];
            this.lastImageIndex++;
            this.saveLastImageIndex();
            console.log(`[${MODULE}] 选择的图片: ${selectedFile}`);
            return path_1.default.join(imagesDir, selectedFile);
        }
        catch (error) {
            console.error(`[${MODULE}] 选择图片失败:`, error);
            return null;
        }
    }
    loadMediaLibrary() {
        try {
            // 构建正确的媒体库文件路径
            let mediaLibraryPath;
            if (__dirname.includes('dist')) {
                // 编译后的路径
                mediaLibraryPath = path_1.default.join(__dirname, '../../../data/media-library.json');
            }
            else {
                // 源代码路径
                mediaLibraryPath = path_1.default.join(__dirname, '../../data/media-library.json');
            }
            if (fs_1.default.existsSync(mediaLibraryPath)) {
                const content = fs_1.default.readFileSync(mediaLibraryPath, 'utf8');
                return JSON.parse(content);
            }
            console.warn(`[${MODULE}] 媒体库文件不存在，使用空媒体库`);
            return { reputableMedia: [] };
        }
        catch (error) {
            console.error(`[${MODULE}] 加载媒体库失败:`, error);
            return { reputableMedia: [] };
        }
    }
    getMediaPriority(url) {
        // 检查URL是否来自知名媒体
        for (const media of this.mediaLibrary.reputableMedia) {
            if (url.includes(media.domain)) {
                return media.priority;
            }
        }
        // 默认优先级为4（最低）
        return 4;
    }
    calculateTokenCount(text) {
        // 简单的token计算：1个中文字符约等于2个token，1个英文字符约等于1个token
        let tokenCount = 0;
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            if (charCode >= 0x4e00 && charCode <= 0x9fff) {
                // 中文字符
                tokenCount += 2;
            }
            else if (charCode >= 0x0000 && charCode <= 0x007f) {
                // 英文字符
                tokenCount += 1;
            }
            else {
                // 其他字符
                tokenCount += 1;
            }
        }
        return tokenCount;
    }
    async execute(traceId) {
        try {
            console.log(`[${MODULE}] 开始执行新闻蒸馏任务`);
            // 1. 新闻源抓取
            const newsArticles = await this.fetchNews();
            console.log(`[${MODULE}] 抓取到 ${newsArticles.length} 篇新闻`);
            if (newsArticles.length === 0) {
                return {
                    ok: false,
                    code: 404,
                    message: '未抓取到新闻',
                    traceId
                };
            }
            // 2. 内容解析和过滤
            const filteredArticles = this.filterArticles(newsArticles);
            console.log(`[${MODULE}] 过滤后剩余 ${filteredArticles.length} 篇新闻`);
            if (filteredArticles.length === 0) {
                return {
                    ok: false,
                    code: 404,
                    message: '过滤后无有效新闻',
                    traceId
                };
            }
            // 3. 大模型蒸馏
            const distilledNews = await this.distillNews(filteredArticles, traceId);
            console.log(`[${MODULE}] 新闻蒸馏完成`);
            // 4. 格式美化
            const formattedNews = this.formatNews(distilledNews);
            console.log(`[${MODULE}] 新闻格式美化完成`);
            // 5. 选择图片
            const selectedImage = this.getNextImage();
            console.log(`[${MODULE}] 选择的图片: ${selectedImage || '无'}`);
            // 6. 保存结果
            await this.saveResult(formattedNews);
            console.log(`[${MODULE}] 结果保存完成`);
            return {
                ok: true,
                code: 0,
                message: '新闻蒸馏任务执行成功',
                data: {
                    formattedNews,
                    articleCount: filteredArticles.length,
                    selectedImage
                },
                traceId
            };
        }
        catch (error) {
            console.error(`[${MODULE}] 执行失败:`, error);
            return {
                ok: false,
                code: 500,
                message: `执行失败: ${error instanceof Error ? error.message : String(error)}`,
                traceId
            };
        }
    }
    async fetchNews() {
        // 从D:\weibo\sou\sou.txt文件中读取关键词
        const keywords = this.loadKeywords();
        const platforms = ['newsapi', 'gnews'];
        const allArticles = [];
        for (const keyword of keywords) {
            for (const platform of platforms) {
                try {
                    const articles = await this.fetchNewsFromPlatform(platform, keyword);
                    allArticles.push(...articles);
                }
                catch (error) {
                    console.error(`[${MODULE}] 从 ${platform} 抓取新闻失败:`, error);
                }
            }
        }
        // 去重
        const uniqueArticles = this.deduplicateArticles(allArticles);
        return uniqueArticles;
    }
    loadKeywords() {
        try {
            const keywordsPath = path_1.default.join(__dirname, '../../user-config/assets/sou/sou.txt');
            if (fs_1.default.existsSync(keywordsPath)) {
                const content = fs_1.default.readFileSync(keywordsPath, 'utf8');
                return content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
            }
            console.warn(`[${MODULE}] 关键词文件不存在，使用默认关键词`);
            return ['AI', '人工智能', '科技', '创新'];
        }
        catch (error) {
            console.error(`[${MODULE}] 加载关键词失败:`, error);
            return ['AI', '人工智能', '科技', '创新'];
        }
    }
    async fetchNewsFromPlatform(platform, keyword) {
        let url = '';
        let apiKey = '';
        switch (platform) {
            case 'newsapi':
                apiKey = '05a90af01d3040b793f74d6e41c5ea72';
                url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&language=zh&sortBy=publishedAt&apiKey=${apiKey}`;
                break;
            case 'gnews':
                apiKey = 'ef01dbeea077f62ff84ad01421baf4af';
                url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(keyword)}&lang=zh&max=10&apikey=${apiKey}`;
                break;
            default:
                return [];
        }
        const response = await axios_1.default.get(url);
        const articles = [];
        if (platform === 'newsapi') {
            if (response.data.articles && response.data.articles.length > 0) {
                response.data.articles.forEach((article) => {
                    if (article.title && article.url) {
                        const mediaPriority = this.getMediaPriority(article.url);
                        articles.push({
                            title: article.title,
                            url: article.url,
                            content: article.description || '',
                            platform: 'newsapi',
                            source: article.source?.name || '',
                            mediaPriority
                        });
                    }
                });
            }
        }
        else if (platform === 'gnews') {
            if (response.data.articles && response.data.articles.length > 0) {
                response.data.articles.forEach((article) => {
                    if (article.title && article.url) {
                        const mediaPriority = this.getMediaPriority(article.url);
                        articles.push({
                            title: article.title,
                            url: article.url,
                            content: article.description || '',
                            platform: 'gnews',
                            source: article.source?.name || '',
                            mediaPriority
                        });
                    }
                });
            }
        }
        return articles;
    }
    deduplicateArticles(articles) {
        const seen = new Set();
        return articles.filter(article => {
            const key = article.title.trim();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    filterArticles(articles) {
        // 过滤低质量文章
        const filtered = articles.filter(article => {
            // 过滤内容过短的文章
            if (!article.content || article.content.length < 50) {
                return false;
            }
            // 过滤标题过短的文章
            if (!article.title || article.title.length < 10) {
                return false;
            }
            return true;
        });
        // 按媒体优先级排序（优先级数字越小越优先）
        filtered.sort((a, b) => {
            const priorityA = a.mediaPriority || 4;
            const priorityB = b.mediaPriority || 4;
            return priorityA - priorityB;
        });
        // 只保留前10篇文章
        return filtered.slice(0, 10);
    }
    async distillNews(articles, traceId) {
        try {
            // 构建提示词，使用更简单的格式
            const articlesText = articles.slice(0, 2).map((article, index) => {
                return `${index + 1}. ${article.title}\n来源: ${article.source || article.platform}\n内容: ${article.content}\n`;
            }).join('\n');
            console.log(`[${MODULE}] 构建提示词，长度: ${articlesText.length}`);
            const prompt = `
你是一名专业的新闻分析师，请用中文总结以下新闻的核心内容，提取3个关键要点，并撰写一篇简短的分析文章。

新闻：
${articlesText}

请直接输出以下格式的内容，不要包含任何其他说明或思考：

标题：你的标题

摘要：你的摘要

要点：
1. 要点1
2. 要点2
3. 要点3

分析：你的分析文章
`;
            // 计算token数
            const tokenCount = this.calculateTokenCount(prompt);
            console.log(`[${MODULE}] 提示词总长度: ${prompt.length}, 预估token数: ${tokenCount}`);
            const input = {
                prompt,
                skillId: 'news-distillation',
                traceId,
                parameters: {
                    maxTokens: 500
                }
            };
            console.log(`[${MODULE}] 调用 LLM 进行新闻蒸馏`);
            const response = await this.llmClient.generate(input);
            console.log(`[${MODULE}] LLM 响应:`, JSON.stringify(response, null, 2));
            if (!response.ok || !response.data?.content) {
                throw new Error(`LLM 蒸馏失败: ${response.message || '未返回内容'}`);
            }
            const content = response.data.content;
            console.log(`[${MODULE}] LLM 输出内容:`, content);
            // 移除 <think> 标签
            const cleanedContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            // 解析 LLM 输出
            // 处理不同的换行符和空白字符
            const normalizedContent = cleanedContent.replace(/\r\n/g, '\n');
            // 提取标题
            const titleMatch = normalizedContent.match(/标题：([\s\S]*?)\n\n摘要：/);
            // 提取摘要
            const summaryMatch = normalizedContent.match(/摘要：([\s\S]*?)\n\n要点：/);
            // 提取要点
            const keyPointsMatch = normalizedContent.match(/要点：[\s\n]*([\s\S]*?)[\s\n]*分析：/);
            // 提取分析
            const analysisMatch = normalizedContent.match(/分析：([\s\S]*)$/);
            let title = 'AI 领域最新动态分析';
            let summary = '暂无摘要';
            let keyPoints = ['暂无要点'];
            let refinedContent = '暂无分析文章';
            if (titleMatch)
                title = titleMatch[1].trim();
            if (summaryMatch)
                summary = summaryMatch[1].trim();
            if (keyPointsMatch) {
                // 提取要点
                const pointsText = keyPointsMatch[1].trim();
                // 简单分割并过滤
                const lines = pointsText.split('\n');
                const extractedPoints = [];
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine && (trimmedLine.startsWith('1.') || trimmedLine.startsWith('2.') || trimmedLine.startsWith('3.'))) {
                        extractedPoints.push(trimmedLine);
                    }
                }
                if (extractedPoints.length > 0) {
                    keyPoints = extractedPoints;
                }
            }
            if (analysisMatch)
                refinedContent = analysisMatch[1].trim();
            console.log(`[${MODULE}] 解析结果 - 标题: ${title}, 摘要: ${summary.substring(0, 50)}..., 要点数量: ${keyPoints.length}`);
            // 检查解析结果是否有效
            if (title === 'AI 领域最新动态分析' && summary === '暂无摘要') {
                throw new Error('LLM 输出格式无效');
            }
            return {
                title,
                summary,
                keyPoints,
                refinedContent,
                formattedContent: ''
            };
        }
        catch (error) {
            console.error(`[${MODULE}] LLM 蒸馏失败:`, error);
            throw error;
        }
    }
    getMockDistilledNews() {
        return {
            title: 'AI 领域最新动态分析',
            summary: '近期 AI 领域有多项重要发展，包括技术突破、产业应用和投资趋势。',
            keyPoints: [
                'AI 技术在制造业和供应链领域的应用加速',
                '大型科技公司持续加大 AI 研发投入',
                'AI 人才需求持续增长，薪资水平保持高位'
            ],
            refinedContent: '随着 AI 技术的不断发展，其在各个行业的应用也日益广泛。近期，制造业和供应链领域成为 AI 技术的重要应用场景，通过智能化改造提升生产效率和管理水平。同时，大型科技公司持续加大 AI 研发投入，推动技术创新。此外，AI 人才需求持续增长，相关岗位薪资水平保持高位，反映了市场对 AI 专业人才的迫切需求。',
            formattedContent: ''
        };
    }
    formatNews(distilled) {
        // 格式化新闻，添加 emoji 和分隔线
        let formatted = `📰 **${distilled.title}**\n\n`;
        formatted += `📝 **摘要**\n${distilled.summary}\n\n`;
        formatted += `🔑 **关键要点**\n`;
        distilled.keyPoints.forEach((point, index) => {
            // 检查要点是否已经包含编号，如果包含则直接使用，否则添加编号
            if (point.match(/^\d+\. /)) {
                formatted += `${point}\n`;
            }
            else {
                formatted += `${index + 1}. ${point}\n`;
            }
        });
        formatted += `\n📊 **分析文章**\n${distilled.refinedContent}\n\n`;
        formatted += `---\n`;
        formatted += `📅 ${new Date().toISOString().split('T')[0]}`;
        return formatted;
    }
    async saveResult(formattedNews) {
        const fs = require('fs');
        const path = require('path');
        // 保存到news目录
        const newsDir = path.join(__dirname, '../../news');
        if (!fs.existsSync(newsDir)) {
            fs.mkdirSync(newsDir, { recursive: true });
        }
        const date = new Date().toISOString().split('T')[0];
        const newsOutputPath = path.join(newsDir, `${date}_distilled.txt`);
        fs.writeFileSync(newsOutputPath, formattedNews, 'utf8');
        console.log(`[${MODULE}] 结果保存到: ${newsOutputPath}`);
        // 保存到tiezi目录
        const tieziDir = path.join(__dirname, '../../tiezi');
        if (!fs.existsSync(tieziDir)) {
            fs.mkdirSync(tieziDir, { recursive: true });
        }
        const tieziOutputPath = path.join(tieziDir, `${date}_post.txt`);
        fs.writeFileSync(tieziOutputPath, formattedNews, 'utf8');
        console.log(`[${MODULE}] 结果保存到: ${tieziOutputPath}`);
    }
}
exports.NewsDistillationSkill = NewsDistillationSkill;
exports.newsDistillationSkill = new NewsDistillationSkill();
