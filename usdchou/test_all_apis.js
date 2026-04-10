const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let token = '';
let testGroupId = '';

// 测试结果统计
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, success, data = null) {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (!success && data) {
    console.log('   错误:', JSON.stringify(data, null, 2));
  }
  results.tests.push({ name, success, data });
  if (success) results.passed++;
  else results.failed++;
}

async function runTests() {
  console.log('\n🚀 开始全面测试API接口...\n');

  // 1. 测试登录
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'testuser',
      password: '123456'
    });
    token = loginRes.data.data.token;
    logTest('1. 登录接口', !!token, loginRes.data);
  } catch (err) {
    logTest('1. 登录接口', false, err.response?.data || err.message);
    return;
  }

  // 2. 测试获取聊天列表
  try {
    const chatsRes = await axios.get(`${BASE_URL}/api/chats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const hasChainGroup = chatsRes.data.data.some(g => g.isChainGroup === true);
    logTest('2. 获取聊天列表', chatsRes.data.success && hasChainGroup, {
      群组数量: chatsRes.data.data.length,
      有接龙群: hasChainGroup
    });
    
    // 保存接龙群ID用于后续测试
    const chainGroup = chatsRes.data.data.find(g => g.isChainGroup === true);
    if (chainGroup) {
      testGroupId = chainGroup._id;
      console.log(`   测试群ID: ${testGroupId}\n`);
    }
  } catch (err) {
    logTest('2. 获取聊天列表', false, err.response?.data || err.message);
  }

  // 3. 测试发送消息（不传clientMsgId）
  try {
    const msgRes = await axios.post(`${BASE_URL}/api/chats/messages`, {
      groupId: testGroupId,
      content: '测试消息-自动生成ID',
      type: 'text'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    logTest('3. 发送消息(无clientMsgId)', msgRes.data.success, {
      消息ID: msgRes.data.data._id,
      内容: msgRes.data.data.content
    });
  } catch (err) {
    logTest('3. 发送消息(无clientMsgId)', false, err.response?.data || err.message);
  }

  // 4. 测试发送消息（传clientMsgId）
  try {
    const clientMsgId = `test_${Date.now()}`;
    const msgRes = await axios.post(`${BASE_URL}/api/chats/messages`, {
      groupId: testGroupId,
      content: '测试消息-指定ID',
      type: 'text',
      clientMsgId: clientMsgId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    logTest('4. 发送消息(有clientMsgId)', msgRes.data.success, {
      消息ID: msgRes.data.data._id,
      clientMsgId: msgRes.data.data.clientMsgId
    });
  } catch (err) {
    logTest('4. 发送消息(有clientMsgId)', false, err.response?.data || err.message);
  }

  // 5. 测试重复发送（相同clientMsgId应该返回缓存）
  try {
    const clientMsgId = `test_duplicate_${Date.now()}`;
    await axios.post(`${BASE_URL}/api/chats/messages`, {
      groupId: testGroupId,
      content: '重复测试1',
      type: 'text',
      clientMsgId: clientMsgId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const res2 = await axios.post(`${BASE_URL}/api/chats/messages`, {
      groupId: testGroupId,
      content: '重复测试2',
      type: 'text',
      clientMsgId: clientMsgId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const isDuplicate = res2.data.data.content === '重复测试1';
    logTest('5. 重复消息去重', isDuplicate, {
      第一次: '重复测试1',
      第二次返回: res2.data.data.content,
      是否去重: isDuplicate
    });
  } catch (err) {
    logTest('5. 重复消息去重', false, err.response?.data || err.message);
  }

  // 6. 测试查询消息历史
  try {
    const historyRes = await axios.get(`${BASE_URL}/api/chats/messages/${testGroupId}?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    logTest('6. 查询消息历史', historyRes.data.success, {
      消息数量: historyRes.data.data.length
    });
  } catch (err) {
    logTest('6. 查询消息历史', false, err.response?.data || err.message);
  }

  // 7. 测试速率限制（快速发送6条消息）
  try {
    let rateLimited = false;
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 200)); // 每次间隔200ms
      try {
        await axios.post(`${BASE_URL}/api/chats/messages`, {
          groupId: testGroupId,
          content: `速率测试${i}`,
          type: 'text'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        if (err.response?.status === 429) {
          rateLimited = true;
          break;
        }
      }
    }
    logTest('7. 速率限制', rateLimited, {
      说明: rateLimited ? '第6条被限制' : '未触发限制'
    });
  } catch (err) {
    logTest('7. 速率限制', false, err.response?.data || err.message);
  }

  // 等待5秒让速率限制重置
  console.log('\n⏳ 等待速率限制重置...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 8. 测试XSS防护
  try {
    const xssContent = '<script>alert("XSS")</script>Hello';
    const msgRes = await axios.post(`${BASE_URL}/api/chats/messages`, {
      groupId: testGroupId,
      content: xssContent,
      type: 'text'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const isSanitized = !msgRes.data.data.content.includes('<script>');
    logTest('8. XSS防护', isSanitized, {
      原始内容: xssContent,
      过滤后: msgRes.data.data.content,
      已过滤: isSanitized
    });
  } catch (err) {
    logTest('8. XSS防护', false, err.response?.data || err.message);
  }

  // 9. 测试无效Token
  try {
    await axios.get(`${BASE_URL}/api/chats`, {
      headers: { Authorization: 'Bearer invalid_token' }
    });
    logTest('9. 无效Token拦截', false, '应该返回401但成功了');
  } catch (err) {
    const isUnauthorized = err.response?.status === 401;
    logTest('9. 无效Token拦截', isUnauthorized, {
      状态码: err.response?.status
    });
  }

  // 10. 测试缺少必填参数
  try {
    await axios.post(`${BASE_URL}/api/chats/messages`, {
      content: '测试'
      // 缺少groupId和receiverId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    logTest('10. 参数验证', false, '应该返回400但成功了');
  } catch (err) {
    const isBadRequest = err.response?.status === 400;
    logTest('10. 参数验证', isBadRequest, {
      状态码: err.response?.status
    });
  }

  // 输出测试报告
  console.log('\n' + '='.repeat(60));
  console.log(`测试结果: ✅ 通过${results.passed}个，❌ 失败${results.failed}个`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n失败的测试:');
    results.tests.filter(t => !t.success).forEach(t => {
      console.log(`  - ${t.name}`);
    });
  } else {
    console.log('\n🎉 所有测试通过！接口可以交付前端联调！');
  }
  console.log('');
}

runTests().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
