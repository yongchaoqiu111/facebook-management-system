/**
 * 检查用户充值地址状态
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function checkUserAddresses() {
  console.log('🔍 检查用户充值地址状态...\n');
  
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 数据库连接成功\n');
    
    // 查询所有用户
    const users = await User.find({}).select('_id username userId depositAddress');
    
    console.log(`📊 总用户数: ${users.length}\n`);
    
    let withAddress = 0;
    let withoutAddress = 0;
    
    console.log('用户列表：');
    console.log('-'.repeat(80));
    console.log('用户名\t\t用户ID\t\t充值地址\t\t\t状态');
    console.log('-'.repeat(80));
    
    users.forEach(user => {
      const hasAddress = user.depositAddress && user.depositAddress !== '';
      const status = hasAddress ? '✅ 已有' : '❌ 无';
      
      if (hasAddress) {
        withAddress++;
      } else {
        withoutAddress++;
      }
      
      console.log(`${user.username}\t\t${user.userId}\t${user.depositAddress || '(无)'}\t${status}`);
    });
    
    console.log('-'.repeat(80));
    console.log(`\n📈 统计：`);
    console.log(`   已有地址: ${withAddress} 人`);
    console.log(`   未有地址: ${withoutAddress} 人`);
    
    if (withoutAddress > 0) {
      console.log('\n💡 提示：');
      console.log('   - 这些用户首次访问 /api/wallet/info 时会自动生成地址');
      console.log('   - 或者运行批量迁移脚本一次性生成\n');
    } else {
      console.log('\n✅ 所有用户都已有充值地址！\n');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

checkUserAddresses();
