<template>
  <div class="chat-container">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <button @click="goBack" class="back-btn">←</button>
      <div class="header-info">
        <h2>{{ currentContact?.name || '接龙群' }}</h2>
      </div>
      <div class="header-actions">
        <button @click="showInfoModal = true">ℹ️</button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list">
      <div 
        v-for="message in messages" 
        :key="message.id"
        :class="['message', message.isSelf ? 'message-self' : 'message-other']"
      >
        <div class="message-content">
          {{ message.content }}
        </div>
        <div class="message-time">{{ message.time }}</div>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="chat-input">
      <input
        v-model="messageInput"
        placeholder="输入消息..."
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage">发送</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useChainGroupChat } from './composables/useChainGroupChat'
import { useMessageCenter } from '@/composables/useMessageCenter'

// 模拟 chatId
const chatId = '123'

// 使用 composable
const {
  currentContact,
  messages,
  messageInput,
  showInfoModal,
  goBack,
  sendMessage,
  init,
  cleanup
} = useChainGroupChat(chatId)

// 初始化消息中心
const { initSocketListeners } = useMessageCenter()

onMounted(() => {
  initSocketListeners()
  init()
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.back-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  margin-right: 16px;
}

.header-info h2 {
  margin: 0;
  font-size: 18px;
}

.header-actions {
  margin-left: auto;
}

.header-actions button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  margin-left: 16px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  margin-bottom: 16px;
  max-width: 70%;
}

.message-self {
  margin-left: auto;
}

.message-other {
  margin-right: auto;
}

.message-content {
  padding: 12px 16px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.message-self .message-content {
  background: #007aff;
  color: #fff;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  text-align: right;
}

.message-other .message-time {
  text-align: left;
}

.chat-input {
  display: flex;
  padding: 16px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

.chat-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  margin-right: 12px;
  font-size: 16px;
}

.chat-input button {
  padding: 12px 24px;
  background: #007aff;
  color: #fff;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}
</style>
