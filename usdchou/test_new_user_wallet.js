/**
 * 测试新用户注册和钱包地址生成
 */

const axios = require('axios');

async function testNewUserWallet() {
  console.log('🔍 测试新用户注册和钱包地址生成...\n');
  
  try {
    // 1. 注册新用户
    console.log('📋 步骤 1: 注册新用户');
    const randomPhone = '139' + String(Math.floor(10000000 + Math.random() * 90000000));
    
    const registerRes = await axios.post('http://localhost:5000/api/auth/register', {
      username: '测试用户',
      phone: randomPhone,
      password: '123456'
    });
    
    console.log('✅ 注册成功');
    console.log(`   用户ID: ${registerRes.data.data.user.userId}`);
    console.log(`   用户名: ${registerRes.data.data.user.username}\n`);
    
    const token = registerRes.data.data.token;
    
    // 2. 获取用户信息（检查是否有充值地址）
    console.log('📋 步骤 2: 获取用户信息');
    const userRes = await axios.get('http://localhost:5000/api/users/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ 用户信息：');
    console.log(`   userId: ${userRes.data.data.userId}`);
    console.log(`   depositAddress: ${userRes.data.data.depositAddress || '(无)'}\n`);
    
    // 3. 获取钱包信息（应该会自动生成地址）
    console.log('📋 步骤 3: 获取钱包信息（触发生成地址）');
    const walletRes = await axios.get('http://localhost:5000/api/wallet/info', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ 钱包信息：');
    console.log(`   余额: ${walletRes.data.data.balance} USDT`);
    console.log(`   充值地址: ${walletRes.data.data.depositAddress}`);
    console.log(`   提示: ${walletRes.data.data.note}\n`);
    
    // 4. 再次获取用户信息（验证地址已保存）
    console.log('📋 步骤 4: 再次获取用户信息（验证地址已保存）');
    const userRes2 = await axios.get('http://localhost:5000/api/users/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ 用户信息：');
    console.log(`   depositAddress: ${userRes2.data.data.depositAddress || '(无)'}\n`);
    
    if (userRes2.data.data.depositAddress) {
      console.log('=' .repeat(60));
      console.log('✨ 测试成功！\n');
      console.log('💡 说明：');
      console.log('   - 注册时不会生成充值地址');
      console.log('   - 首次访问 /api/wallet/info 时自动生成');
      console.log('   - 生成后保存到数据库，后续访问返回相同地址\n');
    } else {
      console.error('❌ 测试失败：没有生成充值地址\n');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.error?.message || error.message);
    console.error('\n可能的原因：');
    console.error('   1. 服务未启动');
    console.error('   2. 手机号已注册');
    console.error('   3. 网络连接问题\n');
  }
}

testNewUserWallet();
