/**
 * TRON 钱包配置测试脚本
 * 
 * 使用方法：
 * node test_wallet.js
 */

require('dotenv').config();
const TronWeb = require('tronweb');

async function testWallet() {
  console.log('🔍 测试 TRON 钱包配置...\n');
  console.log('=' .repeat(60));
  
  // 检查环境变量
  console.log('\n📋 步骤 1: 检查环境变量');
  
  if (!process.env.TRON_PLATFORM_PRIVATE_KEY || process.env.TRON_PLATFORM_PRIVATE_KEY === 'your_platform_private_key_here') {
    console.error('❌ 错误：未配置 TRON_PLATFORM_PRIVATE_KEY');
    console.log('\n请先在 .env 文件中配置你的钱包私钥');
    console.log('参考文档：TRON_WALLET_SETUP_GUIDE.md\n');
    return;
  }
  
  if (!process.env.TRON_PLATFORM_ADDRESS || process.env.TRON_PLATFORM_ADDRESS === 'TYourPlatformAddressHere') {
    console.error('❌ 错误：未配置 TRON_PLATFORM_ADDRESS');
    console.log('\n请先在 .env 文件中配置你的钱包地址\n');
    return;
  }
  
  console.log('✅ 私钥已配置');
  console.log('✅ 地址已配置\n');
  
  // 初始化 TronWeb
  console.log('📋 步骤 2: 初始化 TronWeb');
  
  try {
    const tronWeb = new TronWeb.TronWeb({
      fullHost: process.env.TRON_FULL_HOST || 'https://api.trongrid.io',
      solidityHost: process.env.TRON_SOLIDITY_HOST || 'https://api.trongrid.io',
      eventServer: process.env.TRON_EVENT_HOST || 'https://api.trongrid.io'
    });
    
    // 设置私钥
    tronWeb.setPrivateKey(process.env.TRON_PLATFORM_PRIVATE_KEY);
    console.log('✅ TronWeb 初始化成功\n');
    
    // 验证地址
    console.log('📋 步骤 3: 验证钱包地址');
    const address = tronWeb.defaultAddress.base58;
    console.log('   配置的地址:', process.env.TRON_PLATFORM_ADDRESS);
    console.log('   实际的地址:', address);
    
    if (address !== process.env.TRON_PLATFORM_ADDRESS) {
      console.warn('⚠️  警告：地址不匹配！请检查 .env 配置\n');
    } else {
      console.log('✅ 地址验证通过\n');
    }
    
    // 查询 TRX 余额
    console.log('📋 步骤 4: 查询 TRX 余额');
    const balance = await tronWeb.trx.getBalance(address);
    const balanceInTRX = tronWeb.fromSun(balance);
    console.log(`   余额: ${balanceInTRX} TRX`);
    
    if (balanceInTRX < 100) {
      console.warn('⚠️  警告：TRX 余额不足！');
      console.warn('   建议充值至少 100 TRX 用于支付 Gas 费\n');
    } else if (balanceInTRX < 500) {
      console.log('⚠️  提示：TRX 余额较低，建议充值更多\n');
    } else {
      console.log('✅ TRX 余额充足\n');
    }
    
    // 查询 USDT 余额
    console.log('📋 步骤 5: 查询 USDT 余额');
    try {
      const contract = await tronWeb.contract().at(process.env.USDT_CONTRACT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
      const usdtBalance = await contract.balanceOf(address).call();
      
      // USDT 精度为 6 位小数
      let usdtInUSDT;
      if (typeof usdtBalance === 'object' && usdtBalance._hex) {
        usdtInUSDT = parseInt(usdtBalance._hex) / 1000000;
      } else {
        usdtInUSDT = parseInt(usdtBalance) / 1000000;
      }
      
      console.log(`   余额: ${usdtInUSDT} USDT`);
      
      if (usdtInUSDT < 100) {
        console.warn('⚠️  警告：USDT 余额较低');
        console.warn('   建议充值足够的 USDT 用于用户提现\n');
      } else {
        console.log('✅ USDT 余额充足\n');
      }
    } catch (error) {
      console.error('❌ 查询 USDT 余额失败:', error.message);
      console.log('   可能是网络问题或合约地址错误\n');
    }
    
    // 查询资源
    console.log('📋 步骤 6: 查询账户资源');
    try {
      const resources = await tronWeb.trx.getAccountResource(address);
      const energy = resources.energy || 0;
      const bandwidth = (resources.freeNetLimit || 0) - (resources.freeNetUsed || 0);
      
      console.log(`   Energy: ${energy}`);
      console.log(`   Bandwidth: ${bandwidth}`);
      
      if (energy < 15000) {
        console.warn('⚠️  Energy 不足，USDT 转账将消耗 TRX');
        console.warn('   建议质押 TRX 获取 Energy 以降低手续费\n');
      } else {
        console.log('✅ Energy 充足，USDT 转账可能免费\n');
      }
      
      if (bandwidth < 500) {
        console.warn('⚠️  Bandwidth 不足\n');
      } else {
        console.log('✅ Bandwidth 充足\n');
      }
    } catch (error) {
      console.error('❌ 查询资源失败:', error.message, '\n');
    }
    
    // 总结
    console.log('=' .repeat(60));
    console.log('\n✨ 测试完成！\n');
    
    console.log('📊 配置摘要：');
    console.log(`   网络: ${process.env.TRON_NETWORK || 'mainnet'}`);
    console.log(`   地址: ${address}`);
    console.log(`   TRX: ${balanceInTRX}`);
    console.log(`   USDT: ${usdtInUSDT || '未知'}`);
    
    console.log('\n💡 下一步：');
    console.log('   1. 如果余额不足，请充值');
    console.log('   2. 重启后端服务: npm run dev');
    console.log('   3. 测试充值和提现功能\n');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n可能的原因：');
    console.error('   1. 私钥格式不正确');
    console.error('   2. 网络连接问题');
    console.error('   3. TRON API 服务不可用\n');
  }
}

// 运行测试
testWallet();
