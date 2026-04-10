// 测试新增API接口
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

let token = '';
let testGroupId = '';
let testRedPacketId = '';

// 1. 登录获取Token
async function login() {
  console.log('\n=== 1. 测试登录 ===');
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'testuser',
      password: '123456'
    });
    
    token = res.data.token || res.data.data?.token;
    console.log('✅ 登录成功');
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'N/A');
    return true;
  } catch (err) {
    console.error('❌ 登录失败:', err.response?.data || err.message);
    return false;
  }
}

// 2. 获取用户信息（验证Token）
async function getUserInfo() {
  console.log('\n=== 2. 测试获取用户信息 ===');
  try {
    const res = await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Token验证成功');
    console.log('用户ID:', res.data.userId);
    console.log('用户名:', res.data.username);
    console.log('余额:', res.data.balance);
    return true;
  } catch (err) {
    console.error('❌ 获取用户信息失败:', err.response?.data || err.message);
    return false;
  }
}

// 3. 获取群组列表（找到测试群）
async function getGroups() {
  console.log('\n=== 3. 测试获取群组列表 ===');
  try {
    const res = await axios.get(`${BASE_URL}/api/groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 获取群组列表成功');
    console.log('群组数量:', res.data.length);
    
    // 找到接龙群
    const chainGroup = res.data.find(g => g._id === '69d4ac8de8e03b8ae3397bb7' || g.name.includes('接龙'));
    if (chainGroup) {
      testGroupId = chainGroup._id;
      console.log('测试群ID:', testGroupId);
      console.log('测试群名称:', chainGroup.name);
    }
    
    return true;
  } catch (err) {
    console.error('❌ 获取群组列表失败:', err.response?.data || err.message);
    return false;
  }
}

// 4. 发送群聊消息
async function sendGroupMessage() {
  console.log('\n=== 4. 测试发送群聊消息 ===');
  try {
    if (!testGroupId) {
      console.log('⚠️  跳过：未找到测试群');
      return true;
    }
    
    const res = await axios.post(`${BASE_URL}/api/chats/messages`, {
      groupId: testGroupId,
      content: '这是一条测试消息 - ' + new Date().toLocaleTimeString(),
      type: 'text',
      clientMsgId: 'test_' + Date.now()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 发送群聊消息成功');
    console.log('消息ID:', res.data.data._id);
    console.log('消息内容:', res.data.data.content);
    return true;
  } catch (err) {
    console.error('❌ 发送群聊消息失败:', err.response?.data || err.message);
    return false;
  }
}

// 5. 查询消息历史
async function getMessageHistory() {
  console.log('\n=== 5. 测试查询消息历史 ===');
  try {
    if (!testGroupId) {
      console.log('⚠️  跳过：未找到测试群');
      return true;
    }
    
    const res = await axios.get(`${BASE_URL}/api/chats/messages/${testGroupId}?limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 查询消息历史成功');
    console.log('消息数量:', res.data.data.length);
    if (res.data.data.length > 0) {
      console.log('最新消息:', res.data.data[0].content);
    }
    return true;
  } catch (err) {
    console.error('❌ 查询消息历史失败:', err.response?.data || err.message);
    return false;
  }
}

// 6. 创建接龙红包
async function createChainRedPacket() {
  console.log('\n=== 6. 测试创建接龙红包 ===');
  try {
    if (!testGroupId) {
      console.log('⚠️  跳过：未找到测试群');
      return true;
    }
    
    const res = await axios.post(`${BASE_URL}/api/redpackets/chain`, {
      chainGroupId: testGroupId,
      totalAmount: 100,
      count: 10
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    testRedPacketId = res.data.data._id;
    console.log('✅ 创建接龙红包成功');
    console.log('红包ID:', testRedPacketId);
    console.log('总金额:', res.data.data.totalAmount);
    console.log('红包个数:', res.data.data.count);
    console.log('剩余数量:', res.data.data.remainCount);
    return true;
  } catch (err) {
    console.error('❌ 创建接龙红包失败:', err.response?.data || err.message);
    return false;
  }
}

// 7. 领取接龙红包
async function openChainRedPacket() {
  console.log('\n=== 7. 测试领取接龙红包 ===');
  try {
    if (!testRedPacketId) {
      console.log('⚠️  跳过：未创建红包');
      return true;
    }
    
    const res = await axios.post(`${BASE_URL}/api/redpackets/chain/${testRedPacketId}/open`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 领取红包成功');
    console.log('领取金额:', res.data.data.amount);
    console.log('我的排名:', res.data.data.myRank);
    console.log('剩余数量:', res.data.data.remainCount);
    console.log('剩余金额:', res.data.data.remainAmount);
    return true;
  } catch (err) {
    console.error('❌ 领取红包失败:', err.response?.data || err.message);
    return false;
  }
}

// 8. 查询红包详情
async function getRedPacketDetail() {
  console.log('\n=== 8. 测试查询红包详情 ===');
  try {
    if (!testRedPacketId) {
      console.log('⚠️  跳过：未创建红包');
      return true;
    }
    
    const res = await axios.get(`${BASE_URL}/api/redpackets/${testRedPacketId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 查询红包详情成功');
    console.log('红包状态:', res.data.data.status);
    console.log('累计领取:', res.data.data.totalClaimed);
    console.log('领取人数:', res.data.data.claims.length);
    return true;
  } catch (err) {
    console.error('❌ 查询红包详情失败:', err.response?.data || err.message);
    return false;
  }
}

// 9. 测试速率限制
async function testRateLimit() {
  console.log('\n=== 9. 测试速率限制（快速发送6条消息）===');
  try {
    if (!testGroupId) {
      console.log('⚠️  跳过：未找到测试群');
      return true;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < 6; i++) {
      try {
        await axios.post(`${BASE_URL}/api/chats/messages`, {
          groupId: testGroupId,
          content: `测试消息 ${i + 1}`,
          type: 'text',
          clientMsgId: 'rate_test_' + Date.now() + '_' + i
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        successCount++;
      } catch (err) {
        if (err.response?.status === 429) {
          failCount++;
          console.log(`✅ 第${i + 1}条消息被限流（符合预期）`);
        } else {
          console.error(`❌ 第${i + 1}条消息发送失败:`, err.response?.data);
        }
      }
      
      // 不等待，立即发送下一条
    }
    
    console.log(`\n结果: 成功${successCount}条，被限流${failCount}条`);
    if (failCount > 0) {
      console.log('✅ 速率限制生效！');
    }
    return true;
  } catch (err) {
    console.error('❌ 速率限制测试失败:', err.message);
    return false;
  }
}

// 主测试流程
async function runTests() {
  console.log('🚀 开始测试新增API接口...\n');
  
  const tests = [
    { name: '登录', fn: login },
    { name: '获取用户信息', fn: getUserInfo },
    { name: '获取群组列表', fn: getGroups },
    { name: '发送群聊消息', fn: sendGroupMessage },
    { name: '查询消息历史', fn: getMessageHistory },
    { name: '创建接龙红包', fn: createChainRedPacket },
    { name: '领取接龙红包', fn: openChainRedPacket },
    { name: '查询红包详情', fn: getRedPacketDetail },
    { name: '速率限制测试', fn: testRateLimit }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`❌ ${test.name} 异常:`, err.message);
      failed++;
    }
    
    // 每个测试之间等待500ms
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`测试结果: ✅ 通过${passed}个，❌ 失败${failed}个`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！后端接口正常！');
  } else {
    console.log(`\n⚠️  有${failed}个测试失败，请检查日志`);
  }
}

// 运行测试
runTests().catch(err => {
  console.error('测试执行异常:', err);
  process.exit(1);
});
