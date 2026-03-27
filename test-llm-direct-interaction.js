const { llmClient } = require('./dist/core/llm/llm-client');
const fs = require('fs');
const path = require('path');

async function testLLMDirectInteraction() {
  console.log('开始测试与大模型的直接交互...');
  
  try {
    // 第一步：询问AI圈子的热点
    const firstPrompt = '今天在AI圈子有什么特别值得探讨或者关注的事情吗?';
    console.log('\n第一步：发送初始问题...');
    console.log(`问题: ${firstPrompt}`);
    
    const firstResponse = await llmClient.generate({
      prompt: firstPrompt,
      skillId: 'test-llm-interaction',
      traceId: `llm-test-${Date.now()}`
    });
    
    if (!firstResponse.ok || !firstResponse.data?.content) {
      console.error('大模型第一次回复失败:', firstResponse.message);
      return;
    }
    
    console.log('\n大模型第一次回复:');
    console.log(firstResponse.data.content);
    
    // 保存第一次回复
    const date = new Date().toISOString().split('T')[0];
    const firstResponsePath = path.join('D:\\weibo\\llm_interactions', `${date}_first_response.txt`);
    
    if (!fs.existsSync(path.dirname(firstResponsePath))) {
      fs.mkdirSync(path.dirname(firstResponsePath), { recursive: true });
    }
    
    fs.writeFileSync(firstResponsePath, firstResponse.data.content);
    console.log(`\n第一次回复已保存到: ${firstResponsePath}`);
    
    // 第二步：请求改写为Facebook帖子
    const secondPrompt = `嗯，这个新闻有点意思，但是我觉得观点不够鲜明。请你帮我用资深AI工作员的角度去改写一下这个新闻，作为Facebook的帖子发布。要求：\n1. 语言自然流畅，符合Facebook风格\n2. 突出核心内容\n3. 从专业角度分析，提供独特见解\n4. 适当添加个人观点和评论\n5. 长度适中，控制在300-500字之间\n6. 使用中文撰写\n7. 可以使用表情符号增强可读性\n8. 结构清晰，分段合理\n\n原内容：\n${firstResponse.data.content}`;
    
    console.log('\n第二步：请求改写为Facebook帖子...');
    
    const secondResponse = await llmClient.generate({
      prompt: secondPrompt,
      skillId: 'test-llm-interaction',
      traceId: `llm-test-${Date.now() + 1}`
    });
    
    if (!secondResponse.ok || !secondResponse.data?.content) {
      console.error('大模型第二次回复失败:', secondResponse.message);
      return;
    }
    
    console.log('\n大模型第二次回复 (Facebook帖子):');
    console.log(secondResponse.data.content);
    
    // 保存第二次回复
    const secondResponsePath = path.join('D:\\weibo\\llm_interactions', `${date}_second_response.txt`);
    fs.writeFileSync(secondResponsePath, secondResponse.data.content);
    console.log(`\n第二次回复已保存到: ${secondResponsePath}`);
    
    // 也保存到tiezi目录，作为当天的帖子
    const postPath = path.join('D:\\weibo\\tiezi', `${date}_post.txt`);
    fs.writeFileSync(postPath, secondResponse.data.content);
    console.log(`\nFacebook帖子已保存到: ${postPath}`);
    
    console.log('\n测试完成!');
    
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

// 运行测试
testLLMDirectInteraction();