<template>
  <div class="app">
    <h1>抢红包结果弹窗演示</h1>
    <button class="test-btn" @click="showTestResult">测试弹窗</button>
    
    <!-- 抢红包结果弹窗 -->
    <div v-if="showResultModal" class="modal-overlay" @click="closeResultModal">
      <div class="result-modal" @click.stop>
        <div class="result-header">
          <div class="result-icon">🧧</div>
          <h3>恭喜抢到红包！</h3>
        </div>
        
        <div class="result-body">
          <div class="result-amount">
            <span class="amount-value">{{ resultData.amount }}</span>
            <span class="amount-unit">USDT</span>
          </div>
          
          <div class="result-message">{{ resultData.message }}</div>
          <div class="result-from">来自 {{ resultData.from }}</div>
          <div class="result-balance">当前余额: {{ resultData.balance }} USDT</div>
        </div>
        
        <button class="result-close-btn" @click="closeResultModal">开心收下</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 弹窗状态
const showResultModal = ref(false)

// 结果数据
const resultData = ref({
  amount: 0,
  message: '',
  from: '',
  balance: 0
})

// 显示结果函数
function showMyResult(data) {
  resultData.value = {
    amount: data.amount,
    message: data.message,
    from: data.from,
    balance: data.balance
  }
  
  // 显示弹窗
  showResultModal.value = true
}

// 关闭弹窗函数
function closeResultModal() {
  showResultModal.value = false
}

// 测试函数
function showTestResult() {
  showMyResult({
    amount: 88.88,
    message: '手气最佳！',
    from: '张三',
    balance: 1234.56
  })
}
</script>

<style scoped>
.app {
  text-align: center;
  padding: 50px;
}

.test-btn {
  padding: 12px 24px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
}

.test-btn:hover {
  background: #40a9ff;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.result-modal {
  background: white;
  border-radius: 16px;
  padding: 30px;
  max-width: 400px;
  text-align: center;
  animation: slideUp 0.3s ease;
}

.result-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.result-amount {
  margin: 20px 0;
}

.amount-value {
  font-size: 48px;
  font-weight: bold;
  color: #ff4d4f;
}

.amount-unit {
  font-size: 20px;
  color: #ff4d4f;
  margin-left: 8px;
}

.result-message {
  font-size: 16px;
  color: #666;
  margin: 16px 0;
}

.result-from {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.result-balance {
  font-size: 14px;
  color: #52c41a;
  font-weight: bold;
  margin-top: 16px;
}

.result-close-btn {
  margin-top: 24px;
  padding: 12px 32px;
  background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.result-close-btn:hover {
  opacity: 0.9;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>