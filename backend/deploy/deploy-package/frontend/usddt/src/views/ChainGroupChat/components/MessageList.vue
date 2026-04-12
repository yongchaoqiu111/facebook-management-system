<template>
  <div class="messages-container" ref="container">
    <div 
      v-for="msg in messages" 
      :key="msg.id || msg.clientMsgId"
      :class="['message-item', isSelfMessage(msg) ? 'self' : 'other']"
    >
      <!-- 别人的消息：头像在左 -->
      <div v-if="!isSelfMessage(msg)" class="message-avatar">👤</div>
      
      <!-- 红包消息 -->
      <div 
        v-if="msg.type === 'redPacket'" 
        :class="[
          'red-packet-card', 
          { 
            'red-packet-opened': msg.opened, 
            'red-packet-expired': msg.expired
          }
        ]"
        @click="!msg.expired && $emit('open-red-packet', msg)"
      >
        <div class="packet-header">
          <span class="icon">🧧</span>
          <span class="title">{{ getPacketTitle(msg) }}</span>
        </div>
        <div class="packet-body">
          {{ msg.expired ? '已过期，无法领取' : '恭喜发财 大吉大利' }}
        </div>
        <div class="packet-footer">
          <span>恭喜发财 大吉大利</span>
          <span>{{ msg.time }}</span>
        </div>
      </div>
      
      <!-- 文本消息 -->
      <div v-else class="text-message">
        <div class="bubble">{{ msg.content }}</div>
        <div class="time">{{ msg.time }}</div>
      </div>
      
      <!-- 自己的消息：头像在右 -->
      <div v-if="isSelfMessage(msg)" class="message-avatar self-avatar">😊</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  messages: {
    type: Array,
    required: true
  }
})

defineEmits(['open-red-packet'])

const container = ref(null)

// 判断是否为自己的消息（兼容旧数据）
const isSelfMessage = (msg) => {
  // 获取当前用户 ID
  const currentUserId = localStorage.getItem('userId')
  
  // 方法1：使用 direction 字段（0=自己, 1=别人）
  if (msg.direction !== undefined && msg.direction !== null) {
    return msg.direction === 0
  }
  
  // 方法2：使用 isSelf 字段
  if (msg.isSelf !== undefined && msg.isSelf !== null) {
    return msg.isSelf === true
  }
  
  // 方法3：通过 senderId 判断（最可靠）
  return msg.senderId === currentUserId
}

// 获取红包标题
const getPacketTitle = (msg) => {
  if (msg.opened) return '已领取'
  return '接龙红包'
}

// 自动滚动到底部
watch(() => props.messages.length, () => {
  setTimeout(() => {
    if (container.value) {
      container.value.scrollTop = container.value.scrollHeight
    }
  }, 100)
})
</script>

<style scoped>
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f7fa;
}

/* 消息项 */
.message-item {
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
}

.message-item.other {
  justify-content: flex-start;
}

.message-item.self {
  justify-content: flex-end;
}

/* 头像样式 */
.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  margin-right: 10px;
}

.message-avatar.self-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  margin-right: 0;
  margin-left: 10px;
}

/* 红包卡片 */
.red-packet-card {
  max-width: 280px;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

/* 自己的红包靠右 */
.message-item.self .red-packet-card {
  margin-left: auto;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
}

/* 别人的红包靠左 */
.message-item.other .red-packet-card {
  margin-right: auto;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
}

.red-packet-card:hover {
  transform: translateY(-2px);
}

/* 已领取红包样式 - 自己的 */
.message-item.self .red-packet-card.red-packet-opened {
  background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
  color: #fff;
  cursor: default;
}

.message-item.self .red-packet-card.red-packet-opened:hover {
  transform: none;
}

/* 已领取红包样式 - 别人的 */
.message-item.other .red-packet-card.red-packet-opened {
  background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
  color: #fff;
  cursor: default;
}

.message-item.other .red-packet-card.red-packet-opened:hover {
  transform: none;
}

/* 已过期红包样式 - 自己的 */
.message-item.self .red-packet-card.red-packet-expired {
  background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
  color: #e0e0e0;
  cursor: not-allowed;
  opacity: 0.7;
}

/* 已过期红包样式 - 别人的 */
.message-item.other .red-packet-card.red-packet-expired {
  background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
  color: #e0e0e0;
  cursor: not-allowed;
  opacity: 0.7;
}

.packet-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.packet-header .icon {
  font-size: 24px;
}

.packet-header .title {
  font-weight: 600;
  font-size: 16px;
}

.packet-body {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin: 12px 0;
}

.packet-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.9;
}

/* 文本消息 */
.text-message {
  display: flex;
  flex-direction: column;
  max-width: 65%;
}

.message-item.self .text-message {
  align-items: flex-end;
}

.message-item.other .text-message {
  align-items: flex-start;
}

.bubble {
  padding: 12px 20px;
  border-radius: 18px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.message-item.self .bubble {
  background: #1890ff;
  color: white;
}

.time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  text-align: center;
}
</style>
