const { LLMSlient } = require('./dist/core/llm/llm-client');
const { postToFacebook } = require('./dist/skills/facebook-skills');
const fs = require('fs');
const path = require('path');

// 加载关键词
function loadKeywords() {
    try {
        const keywordsPath = path.join(__dirname, 'sou', 'keywords.txt');
        if (fs.existsSync(keywordsPath)) {
            const content = fs.readFileSync(keywordsPath, 'utf8');
            return content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        }
        console.warn('关键词文件不存在，使用默认关键词');
        return ['AI', '人工智能', '科技', '创新'];
    } catch (error) {
        console.error('加载关键词失败:', error);
        return ['AI', '人工智能', '科技', '创新'];
    }
}

// 加载提示词
function loadPrompt() {
    try {
        const promptPath = path.join(__dirname, 'sou', 'prompt.txt');
        if (fs.existsSync(promptPath)) {
            const content = fs.readFileSync(promptPath, 'utf8');
            return content.trim();
        }
        console.warn('提示词文件不存在，使用默认提示词');
        return '请直接输出：今天 {{keyword}} 领域最重要的 1 条技术新闻，(只要技术类新闻) 用大白话总结给出自己的思考跟观点，适合发帖字数 100字内 。不要包含任何思考过程或其他说明，直接输出最终内容。';
    } catch (error) {
        console.error('加载提示词失败:', error);
        return '请直接输出：今天 {{keyword}} 领域最重要的 1 条技术新闻，(只要技术类新闻) 用大白话总结给出自己的思考跟观点，适合发帖字数 100字内 。不要包含任何思考过程或其他说明，直接输出最终内容。';
    }
}

// 选择图片
function getNextImage() {
    try {
        const imagesDir = path.join(__dirname, 'images');
        if (!fs.existsSync(imagesDir)) {
            console.warn(`图片目录不存在: ${imagesDir}`);
            return null;
        }

        // 获取所有图片文件并按文件名排序
        const files = fs.readdirSync(imagesDir).filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        }).sort((a, b) => {
            // 按文件名排序，处理数字编号的文件
            const aName = path.basename(a, path.extname(a));
            const bName = path.basename(b, path.extname(b));
            const aNum = parseInt(aName);
            const bNum = parseInt(bName);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }
            return a.localeCompare(b);
        });

        if (files.length === 0) {
            console.warn('图片目录中没有图片文件');
            return null;
        }

        // 加载并更新图片索引
        const imageIndexFile = path.join(__dirname, 'data', 'image-index.json');
        let lastIndex = 0;
        
        if (fs.existsSync(imageIndexFile)) {
            try {
                const content = fs.readFileSync(imageIndexFile, 'utf8');
                const data = JSON.parse(content);
                lastIndex = data.lastIndex || 0;
            } catch (error) {
                console.error('加载图片索引失败:', error);
            }
        }

        // 轮回选择图片
        const selectedFile = files[lastIndex % files.length];
        lastIndex++;

        // 保存图片索引
        try {
            const data = { lastIndex };
            fs.writeFileSync(imageIndexFile, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('保存图片索引失败:', error);
        }

        console.log(`选择的图片: ${selectedFile}`);
        return path.join(imagesDir, selectedFile);
    } catch (error) {
        console.error('选择图片失败:', error);
        return null;
    }
}

// 保存结果到tiezi目录
function saveResult(content) {
    try {
        const tieziDir = path.join(__dirname, 'tiezi');
        if (!fs.existsSync(tieziDir)) {
            fs.mkdirSync(tieziDir, { recursive: true });
        }

        const date = new Date().toISOString().split('T')[0];
        const outputPath = path.join(tieziDir, `${date}_post.txt`);
        fs.writeFileSync(outputPath, content, 'utf8');
        console.log(`结果保存到: ${outputPath}`);
    } catch (error) {
        console.error('保存结果失败:', error);
    }
}

// 测试大模型交互
async function testLLMPrompt() {
    try {
        console.log('开始测试大模型交互...');
        
        // 加载关键词
        const keywords = loadKeywords();
        console.log('加载的关键词:', keywords);
        
        // 加载提示词
        const prompt = loadPrompt();
        console.log('使用的提示词:', prompt);
        
        const llmClient = new LLMSlient();
        const traceId = `test-${Date.now()}`;
        
        const input = {
            prompt,
            skillId: 'test-prompt',
            traceId,
            parameters: {
                maxTokens: 200
            }
        };
        
        console.log('调用 LLM 进行交互...');
        console.log('提示词:', prompt);
        
        const response = await llmClient.generate(input);
        
        console.log('LLM 响应:', JSON.stringify(response, null, 2));
        
        if (response.ok && response.data?.content) {
            console.log('✅ 测试成功！');
            console.log('LLM 输出内容:');
            console.log(response.data.content);
            
            // 保存结果到tiezi目录
            saveResult(response.data.content);
            
            // 选择图片
            const selectedImage = getNextImage();
            
            // 发布到Facebook
            const postParams = {
                text: response.data.content,
                publish: true
            };
            
            if (selectedImage) {
                postParams.imagePaths = [selectedImage];
                console.log(`包含图片: ${selectedImage}`);
            }
            
            console.log('准备发布到Facebook...');
            const postResult = await postToFacebook(postParams);
            
            if (postResult.code === 0) {
                console.log(`✅ Facebook 发贴成功: ${postResult.data.postId}`);
            } else {
                console.log(`❌ Facebook 发贴失败: ${postResult.data}`);
            }
        } else {
            console.log('❌ 测试失败:', response.message || '未返回内容');
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testLLMPrompt();
