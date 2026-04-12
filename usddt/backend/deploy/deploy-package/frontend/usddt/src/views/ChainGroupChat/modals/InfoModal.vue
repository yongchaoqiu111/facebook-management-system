<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>接龙红包说明</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <div class="rule-item">
          <h4>📋 群规则</h4>
          <ul>
            <li>进群需支付门票费用</li>
            <li>进群后自动发送首包红包</li>
            <li>累计领取达到阈值会被踢出</li>
            <li>被踢出后可重新缴费进群</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['close'])
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
  overflow-y: auto;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.rule-item ul {
  padding-left: 20px;
}

.rule-item li {
  margin: 8px 0;
  line-height: 1.6;
}
</style>
