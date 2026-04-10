/**
 * 消息更新通知总线
 * 用于 App.vue 通知各个聊天页面有新消息到达
 */
import { ref } from 'vue'

// 消息更新计数器
export const messageUpdated = ref(0)

// 触发消息更新通知
export const triggerMessageUpdate = (chatId) => {
  messageUpdated.value++
  console.log(`🔔 [消息更新] ${chatId} 收到新消息，计数器: ${messageUpdated.value}`)
}
