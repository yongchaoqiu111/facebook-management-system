<template>
  <div class="chat-header">
    <button class="action-btn back-btn" @click="$emit('back')">←</button>
    <div class="chat-title">
      <div class="chat-avatar">{{ contact?.avatar || '👤' }}</div>
      <div class="chat-name">{{ contact?.name || '聊天' }}</div>
    </div>
    <div class="chat-actions">
      <button 
        class="action-btn invite-btn" 
        @click="$emit('invite')" 
        title="邀请好友"
      >
        👥
      </button>
      <button 
        class="action-btn share-btn" 
        @click="$emit('share')" 
        title="分享群组"
      >
        🔗
      </button>
      <button 
        class="action-btn info-btn" 
        @click="$emit('info')" 
        title="接龙红包说明"
      >
        📖
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  contact: {
    type: Object,
    default: null
  },
  chainGroupInfo: {
    type: Object,
    default: null
  }
})

defineEmits(['back', 'invite', 'share', 'info'])
</script>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.back-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  margin-right: 8px;
}

.chat-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.chat-name {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s;
}

.action-btn:hover {
  background: #f5f5f5;
}

.invite-btn {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%) !important;
  color: white !important;
}

.invite-btn:hover {
  background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%) !important;
}

.share-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%) !important;
  color: white !important;
}

.share-btn:hover {
  background: linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%) !important;
}

.info-btn {
  background: linear-gradient(135deg, #faad14 0%, #d48806 100%) !important;
  color: white !important;
}

.info-btn:hover {
  background: linear-gradient(135deg, #ffc53d 0%, #faad14 100%) !important;
}
</style>
