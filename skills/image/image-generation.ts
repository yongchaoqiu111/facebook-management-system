import fs from 'fs';
import path from 'path';
import axios from 'axios';

const MODULE = 'ImageGeneration';

// 获取当前文件目录
let __dirname = path.dirname(new URL(import.meta.url).pathname);
// 修复Windows路径问题（移除开头的反斜杠）
if (__dirname.startsWith('/')) {
  __dirname = __dirname.substring(1);
}

export interface ImageGenerationInput {
  skillId: string;
  traceId: string;
  prompt: string;
}

export interface ImageGenerationOutput {
  code: number;
  data: {
    imagePath: string;
    imageUrl: string;
  };
}

function log(message: string): void {
  console.log(`[${MODULE}] [${new Date().toISOString()}] ${message}`);
}

// 读取文生图API Key
function getImageApiKey(): string {
  const keyFile = path.join(__dirname, '../../data/qwen-image-2.0key.txt');
  
  try {
    if (!fs.existsSync(keyFile)) {
      log(`API Key文件不存在: ${keyFile}`);
      return '';
    }
    
    const apiKey = fs.readFileSync(keyFile, 'utf8').trim();
    log('成功读取文生图API Key');
    return apiKey;
  } catch (error) {
    log(`读取API Key失败: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

// 获取下一个图片文件名
function getNextImagePath(): string {
  const imagesDir = path.join(__dirname, '../../images');
  
  // 确保目录存在
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  // 查找已存在的图片文件
  let nextNumber = 1;
  while (true) {
    const imagePath = path.join(imagesDir, `${nextNumber}.png`);
    if (!fs.existsSync(imagePath)) {
      return imagePath;
    }
    nextNumber++;
  }
}

// 调用文生图API
async function generateImage(prompt: string): Promise<string> {
  const apiKey = getImageApiKey();
  
  if (!apiKey) {
    throw new Error('文生图API Key未配置');
  }
  
  const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
  
  const messages = [
    {
      role: 'user',
      content: [
        { text: prompt }
      ]
    }
  ];
  
  const requestData = {
    model: 'qwen-image-2.0-pro',
    input: {
      messages: messages
    },
    parameters: {
      n: 1,
      negative_prompt: '',
      prompt_extend: true,
      watermark: false,
      size: '1080*1920'
    }
  };
  
  log(`调用文生图API，提示词: ${prompt.substring(0, 50)}...`);
  
  try {
    const response = await axios.post(
      apiUrl,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    if (response.status === 200 && response.data) {
      const result = response.data;
      
      if (result.output && result.output.choices) {
        const choice = result.output.choices[0];
        
        if (choice.message && choice.message.content) {
          const content = choice.message.content;
          
          // 查找图片URL
          for (const item of content) {
            if (item.image) {
              log('文生图API调用成功，获取到图片URL');
              return item.image;
            }
          }
        }
      }
      
      throw new Error(`API返回格式错误: ${JSON.stringify(result)}`);
    } else {
      throw new Error(`API调用失败: ${response.status} - ${response.statusText}`);
    }
  } catch (error) {
    log(`文生图API调用失败: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// 下载图片并保存
async function downloadImage(imageUrl: string, outputPath: string): Promise<void> {
  log(`开始下载图片到: ${outputPath}`);
  
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    fs.writeFileSync(outputPath, response.data);
    log(`图片下载成功，保存到: ${outputPath}`);
  } catch (error) {
    log(`图片下载失败: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function generateImageSkill(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  log('开始文生图任务');
  
  try {
    if (!input.prompt || input.prompt.trim() === '') {
      throw new Error('提示词不能为空');
    }
    
    // 调用文生图API生成图片
    const imageUrl = await generateImage(input.prompt);
    
    // 获取保存路径
    const imagePath = getNextImagePath();
    
    // 下载并保存图片
    await downloadImage(imageUrl, imagePath);
    
    log('文生图任务完成');
    
    return {
      code: 0,
      data: {
        imagePath: imagePath,
        imageUrl: imageUrl
      }
    };
  } catch (error) {
    log(`任务执行失败: ${error instanceof Error ? error.message : String(error)}`);
    return {
      code: 500,
      data: {
        imagePath: '',
        imageUrl: ''
      }
    };
  }
}