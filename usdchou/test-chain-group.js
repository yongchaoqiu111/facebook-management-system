/**
 * 接龙群红包功能测试脚本
 * 
 * 使用前请确保：
 * 1. MongoDB 已启动
 * 2. Redis 已启动
 * 3. 服务器正在运行
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 测试配置
const TEST_CONFIG = {
  username: 'testuser1',
  phone: '13800138001',
  password: '123456'
};

let token = '';
let userId = '';
let chainGroupId = '';
let redPacketId = '';

// 辅助函数：登录获取token
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      phone: TEST_CONFIG.phone,
      password: TEST_CONFIG.password
    });
    
    token = response.data.token;
    userId = response.data.user.id;
    console.log('✅ 登录成功');
    console.log('Token:', token);
    console.log('User ID:', userId);
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试1：创建接龙群
async function testCreateChainGroup() {
  console.log('\n📝 测试1：创建接龙群');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/chain-groups`,
      {
        name: '测试接龙群',
        description: '这是一个测试接龙群',
        ticketAmount: 10,
        firstRedPacketAmount: 300,
        kickThreshold: 380,
        waitHours: 3
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    chainGroupId = response.data.group._id;
    console.log('✅ 接龙群创建成功');
    console.log('群ID:', chainGroupId);
    console.log('群名称:', response.data.group.name);
  } catch (error) {
    console.error('❌ 创建接龙群失败:', error.response?.data || error.message);
    throw error;
  }
}

// 测试2：获取接龙群列表
async function testGetChainGroups() {
  console.log('\n📝 测试2：获取接龙群列表');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/chain-groups/list`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ 获取接龙群列表成功');
    console.log('群数量:', response.data.data.length);
  } catch (error) {
    console.error('❌ 获取接龙群列表失败:', error.response?.data || error.message);
  }
}

// 测试3：加入接龙群（需要确保用户余额充足）
async function testJoinChainGroup() {
  console.log('\n📝 测试3：加入接龙群');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/groups/${chainGroupId}/join-chain`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ 加入接龙群成功');
    console.log('剩余余额:', response.data.data.remainingBalance);
    console.log('可抢红包时间:', response.data.data.canGrabAfter);
    console.log('首包红包ID:', response.data.data.redPacket.id);
    
    redPacketId = response.data.data.redPacket.id;
  } catch (error) {
    console.error('❌ 加入接龙群失败:', error.response?.data || error.message);
    if (error.response?.data?.msg?.includes('Insufficient balance')) {
      console.log('💡 提示：请先为用户充值，确保余额 >= 310 USDT');
    }
  }
}

// 测试4：获取接龙群个人信息
async function testGetChainGroupInfo() {
  console.log('\n📝 测试4：获取接龙群个人信息');
  
  try {
    const response = await axios.get(
      `${BASE_URL}/groups/${chainGroupId}/chain-info`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ 获取接龙群信息成功');
    console.log('群名称:', response.data.data.groupName);
    console.log('累计领取:', response.data.data.memberInfo.totalReceived, 'USDT');
    console.log('是否被踢出:', response.data.data.memberInfo.kickedOut);
    console.log('可抢红包时间:', response.data.data.memberInfo.canGrabAfter);
  } catch (error) {
    console.error('❌ 获取接龙群信息失败:', error.response?.data || error.message);
  }
}

// 测试5：尝试抢红包（应该在等待期内失败）
async function testOpenRedPacket() {
  console.log('\n📝 测试5：尝试抢红包');
  
  if (!redPacketId) {
    console.log('⚠️ 跳过：没有可用的红包ID');
    return;
  }
  
  try {
    const response = await axios.post(
      `${BASE_URL}/redpackets/${redPacketId}/open`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ 抢红包成功');
    console.log('抢到金额:', response.data.data.amount, 'USDT');
    console.log('新余额:', response.data.data.newBalance, 'USDT');
    console.log('累计领取:', response.data.data.totalReceived, 'USDT');
    console.log('是否被踢出:', response.data.data.wasKicked);
  } catch (error) {
    console.error('❌ 抢红包失败:', error.response?.data || error.message);
    if (error.response?.data?.message?.includes('wait')) {
      console.log('💡 这是预期的：还在等待期内');
    } else if (error.response?.data?.message?.includes('Cannot open your own')) {
      console.log('💡 这是预期的：不能抢自己的红包');
    }
  }
}

// 主测试流程
async function runTests() {
  console.log('🚀 开始接龙群红包功能测试\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. 登录
    await login();
    
    // 2. 创建接龙群
    await testCreateChainGroup();
    
    // 3. 获取接龙群列表
    await testGetChainGroups();
    
    // 4. 加入接龙群
    await testJoinChainGroup();
    
    // 5. 获取接龙群信息
    await testGetChainGroupInfo();
    
    // 6. 尝试抢红包
    await testOpenRedPacket();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 所有测试完成！\n');
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误');
    console.error(error);
  }
}

// 运行测试
runTests();
