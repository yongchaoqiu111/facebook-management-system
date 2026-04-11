<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>🧧 发送接龙红包</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <!-- 固定配置提示 -->
        <div class="fixed-config-notice">
          <div class="notice-icon">ℹ️</div>
          <div class="notice-text">
            <div class="notice-title">接龙群固定配置</div>
            <div class="notice-detail">总金额: 300 USDT | 30个红包 | 每个10 USDT</div>
          </div>
        </div>
        
        <div class="form-item">
          <label>祝福语（可选）</label>
          <input 
            type="text" 
            v-model="formData.message" 
            placeholder="接龙红包"
            maxlength="50"
          />
        </div>
        
        <div class="summary">
          <div class="summary-row">
            <span>总金额:</span>
            <span class="amount">300 USDT</span>
          </div>
          <div class="summary-row">
            <span>红包数:</span>
            <span>30 个</span>
          </div>
          <div class="summary-row">
            <span>每个金额:</span>
            <span>10 USDT</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')">取消</button>
        <button class="send-btn" @click="handleSend">
          发送红包
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'send'])

const formData = ref({
  message: '恭喜发财 大吉大利'
})

const handleSend = () => {
  emit('send', {
    message: formData.value.message || '恭喜发财 大吉大利'
  })
  
  // 发送成功后自动关闭弹窗
  emit('close')
}
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
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  line-height: 1;
}

.modal-body {
  padding: 20px;
}

.fixed-config-notice {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  border: 2px solid #ff6b6b;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.notice-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.notice-text {
  flex: 1;
}

.notice-title {
  font-size: 14px;
  font-weight: 600;
  color: #ff6b6b;
  margin-bottom: 4px;
}

.notice-detail {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.form-item input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-item input:focus {
  outline: none;
  border-color: #ff6b6b;
  box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.1);
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.summary {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  margin-top: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #666;
}

.summary-row .amount {
  color: #ff6b6b;
  font-weight: 600;
  font-size: 16px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.cancel-btn,
.send-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background: #e8e8e8;
}

.send-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  color: white;
  font-weight: 600;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
