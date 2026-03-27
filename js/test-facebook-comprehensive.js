const fs = require('fs');
const path = require('path');

async function testFacebookComprehensive() {
  console.log('=== Facebook 综合功能测试 ===\n');
  
  // 测试 1: Facebook 登录
  console.log('1. 测试 Facebook 登录');
  try {
    const loginResponse = await fetch('http://localhost:3000/facebook/login/headed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ timeoutSeconds: 180 })
    });
    const loginResult = await loginResponse.json();
    console.log('登录结果:', loginResult);
    if (loginResult.ok) {
      console.log('✓ 登录成功\n');
    } else {
      console.log('✗ 登录失败\n');
    }
  } catch (error) {
    console.log('✗ 登录测试失败:', error.message, '\n');
  }
  
  // 测试 2: Facebook 发帖（带图片）
  console.log('2. 测试 Facebook 发帖（带图片）');
  try {
    const postResponse = await fetch('http://localhost:3000/facebook/post/headed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: '测试 Facebook 综合功能 - 带图片',
        imagePaths: ['images/1.png'],
        publish: false
      })
    });
    const postResult = await postResponse.json();
    console.log('发帖结果:', postResult);
    if (postResult.ok) {
      console.log('✓ 发帖成功，帖子ID:', postResult.result.data.postId);
      console.log('✓ 帖子状态:', postResult.result.data.status);
      console.log('\n');
    } else {
      console.log('✗ 发帖失败\n');
    }
  } catch (error) {
    console.log('✗ 发帖测试失败:', error.message, '\n');
  }
  
  // 测试 3: Facebook 互动
  console.log('3. 测试 Facebook 互动');
  try {
    const interactResponse = await fetch('http://localhost:3000/facebook/interact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'like',
        postId: '123456',
        content: '这是一条评论'
      })
    });
    const interactResult = await interactResponse.json();
    console.log('互动结果:', interactResult);
    if (interactResult.ok) {
      console.log('✓ 互动成功\n');
    } else {
      console.log('✗ 互动失败\n');
    }
  } catch (error) {
    console.log('✗ 互动测试失败:', error.message, '\n');
  }
  
  // 测试 4: Facebook 搜索
  console.log('4. 测试 Facebook 搜索');
  try {
    const searchResponse = await fetch('http://localhost:3000/facebook/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        keywords: ['AI', 'technology'],
        maxPosts: 5
      })
    });
    const searchResult = await searchResponse.json();
    console.log('搜索结果:', searchResult);
    if (searchResult.ok) {
      console.log('✓ 搜索成功，找到', searchResult.result.data.length, '条结果');
      console.log('\n');
    } else {
      console.log('✗ 搜索失败\n');
    }
  } catch (error) {
    console.log('✗ 搜索测试失败:', error.message, '\n');
  }
  
  console.log('=== 测试完成 ===');
  console.log('所有 Facebook 技能都已测试完毕');
  console.log('API 端点列表:');
  console.log('- POST /facebook/login/headed - Facebook 登录');
  console.log('- POST /facebook/post/headed - Facebook 发帖（支持图片）');
  console.log('- POST /facebook/interact - Facebook 互动（点赞/评论/分享）');
  console.log('- POST /facebook/search - Facebook 搜索');
}

testFacebookComprehensive().catch(console.error);
