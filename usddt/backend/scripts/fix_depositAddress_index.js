/**
 * 修复 depositAddress 唯一索引问题
 * 
 * 问题：多个用户的 depositAddress 为空字符串 ""，违反唯一性约束
 * 解决：删除旧索引，将空字符串改为 null，重建索引
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/usdchou');
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

async function fixDepositAddressIndex() {
  console.log('🔧 开始修复 depositAddress 索引...\n');
  
  try {
    const collection = mongoose.connection.collection('users');
    
    // 1. 删除旧的 depositAddress 索引
    console.log('📋 步骤 1: 删除旧的 depositAddress 唯一索引');
    try {
      await collection.dropIndex('depositAddress_1');
      console.log('✅ 旧索引已删除\n');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('⚠️  索引不存在，跳过删除\n');
      } else {
        throw error;
      }
    }
    
    // 2. 将所有空字符串改为 null
    console.log('📋 步骤 2: 将空字符串 depositAddress 改为 null');
    const result = await collection.updateMany(
      { depositAddress: '' },
      { $set: { depositAddress: null } }
    );
    console.log(`✅ 更新了 ${result.modifiedCount} 条记录\n`);
    
    // 3. 重建稀疏唯一索引
    console.log('📋 步骤 3: 重建稀疏唯一索引');
    await collection.createIndex(
      { depositAddress: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'depositAddress_1'
      }
    );
    console.log('✅ 新索引已创建\n');
    
    console.log('✨ 修复完成！');
    console.log('\n说明：');
    console.log('- sparse: true 表示只索引非 null 值');
    console.log('- 多个用户的 depositAddress 可以是 null');
    console.log('- 但有值的 depositAddress 必须唯一\n');
    
  } catch (error) {
    console.error('\n❌ 修复失败:', error);
    throw error;
  }
}

async function main() {
  console.log('⚠️  警告：此操作将修改数据库索引和数据！\n');
  
  const shouldContinue = process.argv.includes('--yes') || process.argv.includes('-y');
  
  if (!shouldContinue) {
    console.log('如需执行修复，请运行：node scripts/fix_depositAddress_index.js --yes\n');
    console.log('按 Ctrl+C 取消，或等待 5 秒后自动继续...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  await connectDB();
  await fixDepositAddressIndex();
  
  console.log('\n✅ 所有修复完成！');
  process.exit(0);
}

main().catch(error => {
  console.error('\n💥 致命错误:', error);
  process.exit(1);
});
