const { llmClient } = require('./dist/core/llm/llm-client');

async function testLLMApiKey() {
  console.log('测试大模型API key是否可用...');
  
  try {
    const prompt = '请简单介绍一下人工智能的发展趋势';
    
    const llmInput = {
      prompt,
      skillId: 'test-api-key',
      traceId: `test-${Date.now()}`
    };
    
    console.log('发送测试请求...');
    const llmOutput = await llmClient.generate(llmInput);
    
    if (llmOutput.ok && llmOutput.data?.content) {
      console.log('✅ API调用成功！');
      console.log('响应内容:');
      console.log(llmOutput.data.content);
      return true;
    } else {
      console.log('❌ API调用失败:', llmOutput.message);
      return false;
    }
  } catch (error) {
    console.log('❌ API调用出错:', error.message);
    return false;
  }
}

// 运行测试
testLLMApiKey();