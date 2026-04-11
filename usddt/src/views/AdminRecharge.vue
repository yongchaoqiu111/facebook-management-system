<template>
  <div class="admin-recharge">
    <h2>💰 管理员充值</h2>
    
    <div class="form">
      <div class="field">
        <label>会员ID</label>
        <input v-model="userId" placeholder="输入用户ID" />
      </div>
      
      <div class="field">
        <label>金额 (USDT)</label>
        <input v-model.number="amount" type="number" step="0.01" placeholder="输入金额" />
      </div>
      
      <button @click="recharge" :disabled="loading">
        {{ loading ? '处理中...' : '充值' }}
      </button>
      
      <div v-if="message" :class="['result', success ? 'success' : 'error']">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '../api'  // ✅ 使用封装的 axios 实例

const userId = ref('')
const amount = ref(null)
const loading = ref(false)
const message = ref('')
const success = ref(false)

const recharge = async () => {
  if (!userId.value || !amount.value) {
    message.value = '请填写完整信息'
    success.value = false
    return
  }

  loading.value = true
  message.value = ''
  
  try {
    const res = await api.post('/wallet/admin/adjust-balance', {
      userId: userId.value,
      amount: amount.value,
      type: 'recharge',
      reason: '管理员手动充值'
    })

    message.value = `充值成功！当前余额: ${res.balance} USDT`
    success.value = true
    userId.value = ''
    amount.value = null
  } catch (err) {
    message.value = err.response?.data?.message || '充值失败'
    success.value = false
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.admin-recharge {
  max-width: 500px;
  margin: 50px auto;
  padding: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-weight: 500;
  color: #555;
  font-size: 14px;
}

.field input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.field input:focus {
  outline: none;
  border-color: #667eea;
}

button {
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.3s;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result {
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
}

.result.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.result.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>
