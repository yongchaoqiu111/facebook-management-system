/**
 * IndexedDB 存储测试脚本
 * 用于验证聊天消息存储功能
 */

import {
  saveMessage,
  saveMessages,
  getMessagesByGroup,
  cleanupOldMessages,
  getMessageCount,
  getDatabaseInfo
} from './src/utils/chatStorage.js'

const LIUHE_GROUP_ID = '69d4ac8de8e03b8ae3397bb7'

async function testIndexedDB() {
  console.log('🧪 开始测试 IndexedDB 存储...\n')
  
  // 1. 获取数据库信息
  console.log('1️⃣ 获取数据库信息...')
  const dbInfo = await getDatabaseInfo()
  console.log('数据库信息:', dbInfo)
  console.log('')
  
  // 2. 保存单条消息
  console.log('2️⃣ 保存单条消息...')
  const testMessage = {
    id: `test_msg_${Date.now()}`,
    type: 'text',
    content: '这是一条测试消息',
    time: new Date().toLocaleTimeString(),
    timestamp: new Date().toISOString(),
    senderId: 'test_user_123',
    groupId: LIUHE_GROUP_ID,
    isSelf: true
  }
  
  await saveMessage(testMessage)
  console.log('✅ 单条消息保存成功\n')
  
  // 3. 批量保存消息
  console.log('3️⃣ 批量保存消息...')
  const testMessages = []
  for (let i = 0; i < 10; i++) {
    testMessages.push({
      id: `batch_msg_${i}_${Date.now()}`,
      type: 'text',
      content: `批量消息 ${i + 1}`,
      time: new Date().toLocaleTimeString(),
      timestamp: new Date().toISOString(),
      senderId: `user_${i}`,
      groupId: LIUHE_GROUP_ID,
      isSelf: i % 2 === 0
    })
  }
  
  await saveMessages(testMessages)
  console.log(`✅ 批量保存 ${testMessages.length} 条消息成功\n`)
  
  // 4. 查询消息
  console.log('4️⃣ 查询群组消息...')
  const messages = await getMessagesByGroup(LIUHE_GROUP_ID, 20)
  console.log(`查询到 ${messages.length} 条消息`)
  console.log('最新消息:', messages[messages.length - 1])
  console.log('')
  
  // 5. 获取消息总数
  console.log('5️⃣ 获取消息总数...')
  const count = await getMessageCount(LIUHE_GROUP_ID)
  console.log(`群组 ${LIUHE_GROUP_ID} 共有 ${count} 条消息\n`)
  
  // 6. 测试清理功能
  console.log('6️⃣ 测试清理旧消息...')
  await cleanupOldMessages(LIUHE_GROUP_ID, 5)
  const countAfterCleanup = await getMessageCount(LIUHE_GROUP_ID)
  console.log(`清理后剩余 ${countAfterCleanup} 条消息\n`)
  
  // 7. 再次获取数据库信息
  console.log('7️⃣ 最终数据库信息...')
  const finalDbInfo = await getDatabaseInfo()
  console.log('数据库信息:', finalDbInfo)
  console.log('')
  
  console.log('✅ 所有测试完成！')
}

// 运行测试
testIndexedDB().catch(error => {
  console.error('❌ 测试失败:', error)
})
