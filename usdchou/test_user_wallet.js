/**
 * 测试用户钱包生成功能
 */

const axios = require('axios');

// 先登录获取 token
async function testWalletGeneration() {
  console.log('🔍 测试用户钱包生成功能...\n');
  
  try {
    // 1. 登录（使用测试账号）
    console.log('📋 步骤 1: 登录获取 Token');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      phone: '13800138000',  // 替换为你的测试账号
      password: '123456'
    });
    
    const token = loginRes.data.data.token;
    const userId = loginRes.data.data.user.userId;
    console.log(`✅ 登录成功，用户ID: ${userId}\n`);
    
    // 2. 获取钱包信息（会自动生成充值地址）
    console.log('📋 步骤 2: 获取钱包信息');
    const walletRes = await axios.get('http://localhost:5000/api/wallet/info', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const walletData = walletRes.data.data;
    console.log('✅ 钱包信息：');
    console.log(`   余额: ${walletData.balance} USDT`);
    console.log(`   充值地址: ${walletData.depositAddress}`);
    console.log(`   提示: ${walletData.note}\n`);
    
    // 3. 再次获取（应该返回相同的地址）
    console.log('📋 步骤 3: 再次获取（验证地址不变）');
    const walletRes2 = await axios.get('http://localhost:5000/api/wallet/info', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const walletData2 = walletRes2.data.data;
    if (walletData.depositAddress === walletData2.depositAddress) {
      console.log('✅ 地址保持一致，功能正常！\n');
    } else {
      console.error('❌ 地址不一致，有问题！\n');
    }
    
    console.log('=' .repeat(60));
    console.log('✨ 测试完成！\n');
    console.log('💡 说明：');
    console.log('   - 每个用户有唯一的充值地址');
    console.log('   - 地址由平台生成并保管私钥');
    console.log('   - 用户只能看到公钥地址');
    console.log('   - 充值到该地址会自动更新余额\n');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.error?.message || error.message);
    console.error('\n可能的原因：');
    console.error('   1. 服务未启动');
    console.error('   2. 测试账号不存在');
    console.error('   3. 网络连接问题\n');
  }
}

testWalletGeneration();
