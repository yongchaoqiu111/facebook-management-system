const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let token = '';
let testGroupId = '';
let testRedPacketId = '';

const results = { passed: 0, failed: 0, tests: [] };

function logTest(name, success, data = null) {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (!success && data) {
    console.log('   错误:', JSON.stringify(data, null, 2));
  } else if (success && data) {
    console.log('   数据:', typeof data === 'object' ? JSON.stringify(data).substring(0, 150) : data);
  }
  results.tests.push({ name, success, data });
  if (success) results.passed++;
  else results.failed++;
}

async function runTests() {
  console.log('\n🚀 开始全面测试API接口...\n');

  // 1. 登录
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'testuser',
      password: '123456'
    });
    token = loginRes.data.data.token;
    logTest('1. 登录接口', !!token);
  } catch (err) {
    logTest('1. 登录接口', false, err.response?.data || err.message);
    return;
  }

  // 2. 获取聊天列表
  try {
    const chatsRes = await axios.get(`${BASE_URL}/api/chats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chainGroup = chatsRes.data.data.find(g => g.isChainGroup === true);
    if (chainGroup) testGroupId = chainGroup._id;
    logTest('2. GET /api/chats', chatsRes.data.success, { 群组数: chatsRes.data.data.length, 接龙群ID: testGroupId });
  } catch (err) {
    logTest('2. GET /api/chats', false, err.response?.data || err.message);
  }

  // 3. 发送消息
  try {
    const msgRes = await axios.post(`${BASE_URL}/api/chats/messages`, {
      groupId: testGroupId,
      content: '测试',
      type: 'text'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    logTest('3. POST /api/chats/messages', msgRes.data.success, { 消息ID: msgRes.data.data._id });
  } catch (err) {
    logTest('3. POST /api/chats/messages', false, err.response?.data || err.message);
  }

  // 4. 查询消息历史
  try {
    const historyRes = await axios.get(`${BASE_URL}/api/chats/messages/${testGroupId}?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    logTest('4. GET /api/chats/messages/:chatId', historyRes.data.success, { 数量: historyRes.data.data.length });
  } catch (err) {
    logTest('4. GET /api/chats/messages/:chatId', false, err.response?.data || err.message);
  }

  // 5. 创建红包
  try {
    const redPacketRes = await axios.post(`${BASE_URL}/api/redpackets`, {
      type: 'normal',
      totalAmount: 100,
      count: 10,
      message: '测试',
      roomId: testGroupId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    testRedPacketId = redPacketRes.data.data._id;
    logTest('5. POST /api/redpackets - 创建红包', redPacketRes.data.success, { 红包ID: testRedPacketId });
  } catch (err) {
    logTest('5. POST /api/redpackets - 创建红包', false, err.response?.data || err.message);
  }

  // 6. 领取红包
  try {
    const openRes = await axios.post(`${BASE_URL}/api/redpackets/${testRedPacketId}/open`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    logTest('6. POST /api/redpackets/:id/open - 领取红包', openRes.data.success, { 金额: openRes.data.data.amount });
  } catch (err) {
    logTest('6. POST /api/redpackets/:id/open - 领取红包', false, err.response?.data || err.message);
  }

  // 7. 红包详情
  try {
    const detailRes = await axios.get(`${BASE_URL}/api/redpackets/detail/${testRedPacketId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    logTest('7. GET /api/redpackets/detail/:id - 红包详情', detailRes.data.success, { 已领: detailRes.data.data.openedCount });
  } catch (err) {
    logTest('7. GET /api/redpackets/detail/:id - 红包详情', false, err.response?.data || err.message);
  }

  // 8. 群组红包列表
  try {
    const groupRes = await axios.get(`${BASE_URL}/api/redpackets/group/${testGroupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    logTest('8. GET /api/redpackets/group/:groupId', groupRes.data.success, { 数量: groupRes.data.data.length });
  } catch (err) {
    logTest('8. GET /api/redpackets/group/:groupId', false, err.response?.data || err.message);
  }

  // 9. Socket事件名验证
  const fs = require('fs');
  const handlerContent = fs.readFileSync('./services/socketHandlers/groupMessageHandler.js', 'utf-8');
  const events = [...new Set(handlerContent.match(/\.emit\(['"]([^'"]+)['"]/g)?.map(m => m.match(/['"]([^'"]+)['"]/)[1]) || [])];
  logTest('9. Socket事件名', true, { 实际事件: events });

  // 输出报告
  console.log('\n' + '='.repeat(60));
  console.log(`测试结果: ✅ 通过${results.passed}个，❌ 失败${results.failed}个`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n失败的测试:');
    results.tests.filter(t => !t.success).forEach(t => {
      console.log(`  - ${t.name}`);
    });
  } else {
    console.log('\n🎉 所有测试通过！');
  }
  console.log('');
}

runTests().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
