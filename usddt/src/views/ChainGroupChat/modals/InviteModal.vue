<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>👥 邀请好友</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="invite-info">
          <p>选择要邀请的好友，他们将收到加入接龙群的邀请</p>
        </div>
        
        <div class="friends-list">
          <div 
            v-for="friend in friends"
            :key="friend._id || friend.id"
            :class="['friend-item', { selected: selectedFriends.includes(friend._id || friend.id) }]"
            @click="toggleFriend(friend._id || friend.id)"
          >
            <div class="friend-avatar">
              {{ (friend.username || friend.name || 'F').charAt(0).toUpperCase() }}
            </div>
            <div class="friend-info">
              <div class="friend-name">{{ friend.username || friend.name }}</div>
              <div class="friend-id">ID: {{ friend.userId || friend.id }}</div>
            </div>
            <div class="friend-checkbox" :class="{ checked: selectedFriends.includes(friend._id || friend.id) }">
              {{ selectedFriends.includes(friend._id || friend.id) ? '✓' : '' }}
            </div>
          </div>
          <div v-if="friends.length === 0" class="empty-friends">
            <p>暂无好友可邀请</p>
          </div>
        </div>
        
        <div class="selected-count">
          已选择 {{ selectedFriends.length }} 位好友
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">取消</button>
        <button 
          class="btn-confirm" 
          @click="sendInvitations" 
          :disabled="sending || selectedFriends.length === 0"
        >
          {{ sending ? '发送中...' : '发送邀请' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// ✅ API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const props = defineProps({
  groupId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

const friends = ref([])
const selectedFriends = ref([])
const sending = ref(false)

// 加载好友列表
const loadFriends = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_BASE_URL}/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    friends.value = response.data.data || []
  } catch (error) {
    console.error('加载好友失败:', error)
  }
}

// 切换选择
const toggleFriend = (friendId) => {
  const index = selectedFriends.value.indexOf(friendId)
  if (index > -1) {
    selectedFriends.value.splice(index, 1)
  } else {
    selectedFriends.value.push(friendId)
  }
}

// 发送邀请
const sendInvitations = async () => {
  if (selectedFriends.value.length === 0) return
  
  sending.value = true
  try {
    const token = localStorage.getItem('token')
    await axios.post(`${API_BASE_URL}/chain-groups/invite`, {
      groupId: props.groupId,
      inviteeIds: selectedFriends.value,
      expireDays: 7
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    alert(`✅ 成功邀请 ${selectedFriends.value.length} 位好友`)
    emit('close')
  } catch (error) {
    console.error('发送邀请失败:', error)
    alert('❌ 发送邀请失败：' + (error.response?.data?.msg || error.message))
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  loadFriends()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e8e8e8;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.invite-info {
  margin-bottom: 16px;
  color: #666;
  font-size: 14px;
}

.friends-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
}

.friend-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.friend-item:last-child {
  border-bottom: none;
}

.friend-item:hover {
  background: #f5f5f5;
}

.friend-item.selected {
  background: #e6f7ff;
}

.friend-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
}

.friend-info {
  flex: 1;
}

.friend-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.friend-id {
  font-size: 12px;
  color: #999;
}

.friend-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid #d9d9d9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  transition: all 0.2s;
}

.friend-checkbox.checked {
  background: #1890ff;
  border-color: #1890ff;
}

.empty-friends {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.selected-count {
  margin-top: 16px;
  text-align: right;
  color: #666;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e8e8e8;
}

.btn-confirm {
  background: #1890ff;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-confirm:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}
</style>
