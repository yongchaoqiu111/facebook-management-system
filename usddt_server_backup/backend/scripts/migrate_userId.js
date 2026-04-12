/**
 * 数据迁移脚本：为已有用户生成纯数字 userId
 * 
 * 使用方法：
 * node scripts/migrate_userId.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 导入 User 模型
const User = require('../models/User');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 生成唯一的 8 位数字 userId
async function generateUniqueUserId() {
  let userId;
  let exists = true;
  let retries = 0;
  
  while (exists && retries < 10) {
    // 生成 8 位随机数字
    userId = String(Math.floor(10000000 + Math.random() * 90000000));
    
    // 检查是否已存在
    const user = await User.findOne({ userId });
    exists = !!user;
    
    if (!exists) {
      return userId;
    }
    
    retries++;
  }
  
  throw new Error('生成唯一 userId 失败（重试次数过多）');
}

// 主迁移函数
async function migrate() {
  console.log('🚀 开始迁移用户 ID...\n');
  
  try {
    // 查找所有没有 userId 的用户
    const usersWithoutId = await User.find({ 
      $or: [
        { userId: { $exists: false } },
        { userId: '' },
        { userId: null }
      ]
    });
    
    console.log(`📊 找到 ${usersWithoutId.length} 个需要迁移的用户\n`);
    
    if (usersWithoutId.length === 0) {
      console.log('✅ 所有用户都已有 userId，无需迁移');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // 逐个处理用户
    for (let i = 0; i < usersWithoutId.length; i++) {
      const user = usersWithoutId[i];
      
      try {
        // 生成唯一 userId
        const userId = await generateUniqueUserId();
        
        // 更新用户
        user.userId = userId;
        await user.save();
        
        successCount++;
        console.log(`[${i + 1}/${usersWithoutId.length}] ✅ ${user.username} -> ${userId}`);
        
        // 避免请求过快
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        failCount++;
        console.error(`[${i + 1}/${usersWithoutId.length}] ❌ ${user.username} 失败:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 迁移完成统计：');
    console.log(`   总数: ${usersWithoutId.length}`);
    console.log(`   成功: ${successCount}`);
    console.log(`   失败: ${failCount}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ 迁移过程出错:', error);
    throw error;
  }
}

// 执行迁移
async function main() {
  console.log('⚠️  警告：此操作将修改数据库，请确保已备份！\n');
  
  // 询问确认（简单实现）
  const shouldContinue = process.argv.includes('--yes') || process.argv.includes('-y');
  
  if (!shouldContinue) {
    console.log('如需执行迁移，请运行：node scripts/migrate_userId.js --yes\n');
    console.log('按 Ctrl+C 取消，或等待 5 秒后自动继续...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  await connectDB();
  await migrate();
  
  console.log('\n✅ 迁移完成！');
  process.exit(0);
}

// 运行
main().catch(error => {
  console.error('\n💥 致命错误:', error);
  process.exit(1);
});
