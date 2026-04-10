/**
 * 从私钥获取 TRON 地址
 */

const TronWeb = require('tronweb');

// 你的私钥
const privateKey = '6e3386cdf5e2f37a2537f7cb008cb094e92634efaee23d37ac988e3a9eaf1c56';

console.log('🔍 从私钥获取地址...\n');

try {
  const tronWeb = new TronWeb.TronWeb({
    fullHost: 'https://api.trongrid.io'
  });

  // 设置私钥
  tronWeb.setPrivateKey(privateKey);

  // 获取地址
  const address = tronWeb.defaultAddress.base58;

  console.log('=' .repeat(60));
  console.log('✅ 成功获取地址！\n');
  console.log('📍 钱包地址：');
  console.log(address);
  console.log('\n🔑 私钥：');
  console.log(privateKey);
  console.log('\n' + '=' .repeat(60));
  console.log('\n💡 请将以下配置添加到 .env 文件：\n');
  console.log(`TRON_PLATFORM_PRIVATE_KEY=${privateKey}`);
  console.log(`TRON_PLATFORM_ADDRESS=${address}`);
  console.log('\n' + '=' .repeat(60));

} catch (error) {
  console.error('❌ 错误:', error.message);
}
