/**
 * 清空所有用户数据
 * 
 * ⚠️ 警告：此操作不可恢复！
 * 
 * 使用方法：
 * node scripts/clear_all_users.js --yes
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const UserFriends = require('../models/UserFriends');
const Message = require('../models/Message');
const RedPacket = require('../models/RedPacket');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 数据库连接成功\n');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

async function clearAllData() {
  console.log('⚠️  警告：即将删除所有用户数据！\n');
  console.log('将删除以下内容：');
  console.log('  - 所有用户账户');
  console.log('  - 所有交易记录');
  console.log('  - 所有好友关系');
  console.log('  - 所有消息记录');
  console.log('  - 所有红包记录\n');
  
  try {
    // 统计当前数据
    const userCount = await User.countDocuments();
    const transactionCount = await Transaction.countDocuments();
    const friendCount = await UserFriends.countDocuments();
    const messageCount = await Message.countDocuments();
    const redPacketCount = await RedPacket.countDocuments();
    
    console.log('📊 当前数据统计：');
    console.log(`   用户: ${userCount} 人`);
    console.log(`   交易: ${transactionCount} 条`);
    console.log(`   好友关系: ${friendCount} 条`);
    console.log(`   消息: ${messageCount} 条`);
    console.log(`   红包: ${redPacketCount} 个\n`);
    
    if (userCount === 0) {
      console.log('✅ 数据库已经是空的，无需清理\n');
      return;
    }
    
    // 确认删除
    console.log('开始删除...\n');
    
    // 删除所有数据
    await User.deleteMany({});
    console.log('✅ 已删除所有用户');
    
    await Transaction.deleteMany({});
    console.log('✅ 已删除所有交易记录');
    
    await UserFriends.deleteMany({});
    console.log('✅ 已删除所有好友关系');
    
    await Message.deleteMany({});
    console.log('✅ 已删除所有消息记录');
    
    await RedPacket.deleteMany({});
    console.log('✅ 已删除所有红包记录\n');
    
    console.log('=' .repeat(60));
    console.log('✨ 清理完成！\n');
    console.log('💡 提示：');
    console.log('   - 现在可以重新注册用户');
    console.log('   - 新用户注册时会自动生成充值地址');
    console.log('   - 建议重启服务以确保缓存清空\n');
    
  } catch (error) {
    console.error('\n❌ 清理失败:', error);
    throw error;
  }
}

async function main() {
  const shouldContinue = process.argv.includes('--yes') || process.argv.includes('-y');
  
  if (!shouldContinue) {
    console.log('如需执行清理，请运行：node scripts/clear_all_users.js --yes\n');
    console.log('按 Ctrl+C 取消，或等待 5 秒后自动继续...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  await connectDB();
  await clearAllData();
  
  process.exit(0);
}

main().catch(error => {
  console.error('\n💥 致命错误:', error);
  process.exit(1);
});
