const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 读取配置
const envPath = path.resolve(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found');
  process.exit(1);
}

// 解析 .env 文件
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#].+?)=(.+)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const baseUrl = envVars.LLM_BASE_URL || 'https://api.scnet.cn/api/llm/v1';
const apiKey = envVars.LLM_API_KEY;
const model = envVars.LLM_MODEL || 'Qwen3-235B-A22B';

if (!apiKey) {
  console.error('Error: LLM_API_KEY not found in .env file');
  process.exit(1);
}

// 测试请求
const testRequest = async () => {
  console.log('Testing LLM API connection...');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Model: ${model}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  
  try {
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello! Can you tell me a short joke?' }
      ],
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 30000
    });
    
    console.log('\n✅ API call successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message?.content || response.data.choices[0].text;
      if (content) {
        console.log('\n🤖 LLM Response:');
        console.log(content);
      }
    }
    
  } catch (error) {
    console.error('\n❌ API call failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
};

testRequest();
