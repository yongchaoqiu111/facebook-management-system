const axios = require('axios');

async function testCodingPlanAPI() {
  const baseUrl = 'https://api.scnet.cn/api/llm/v1';
  const apiKey = 'sk-OTYwLTIxNTk3NzQ1MDAwLTE3NzM2MDExNzg2OTc=';
  const model = 'Qwen3-235B-A22B';

  // 测试 1: 尝试 chat/completions 端点
  console.log('测试 1: 尝试 chat/completions 端点...');
  try {
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的AI助手，能够根据用户的需求提供准确、有用的信息。'
        },
        {
          role: 'user',
          content: '请生成一条关于人工智能的简短微博文案，风格严肃。'
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('测试 1 成功:', response.data);
  } catch (error) {
    console.error('测试 1 失败:', error.response ? error.response.data : error.message);
  }

  // 测试 2: 尝试 completions 端点
  console.log('\n测试 2: 尝试 completions 端点...');
  try {
    const response = await axios.post(`${baseUrl}/completions`, {
      model: model,
      prompt: '请生成一条关于人工智能的简短微博文案，风格严肃。',
      temperature: 0.7,
      max_tokens: 300
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('测试 2 成功:', response.data);
  } catch (error) {
    console.error('测试 2 失败:', error.response ? error.response.data : error.message);
  }

  // 测试 3: 尝试直接访问 API 根路径
  console.log('\n测试 3: 尝试直接访问 API 根路径...');
  try {
    const response = await axios.get(baseUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 10000
    });
    console.log('测试 3 成功:', response.data);
  } catch (error) {
    console.error('测试 3 失败:', error.response ? error.response.data : error.message);
  }
}

testCodingPlanAPI();
