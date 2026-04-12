<template>
  <div class="chain-status-bar">
    <div class="status-info">
      <span class="label">🐉 累计领取:</span>
      <span 
        class="amount" 
        :class="{ 'warning': (chainGroupInfo?.memberInfo?.totalReceived || 0) >= (chainGroupInfo?.kickThreshold || 380) * 0.8 }"
      >
        {{ chainGroupInfo?.memberInfo?.totalReceived || 0 }} / {{ chainGroupInfo?.kickThreshold || 380 }} USDT
      </span>
    </div>
    <div v-if="waitCountdown && waitCountdown !== '可以抢红包了！'" class="countdown">
      ⏰ {{ waitCountdown }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  chainGroupInfo: {
    type: Object,
    default: null
  },
  waitCountdown: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.chain-status-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 14px;
}

.amount {
  font-weight: 600;
  font-size: 16px;
}

.amount.warning {
  color: #ffeb3b;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.countdown {
  font-size: 14px;
  background: rgba(255,255,255,0.2);
  padding: 4px 12px;
  border-radius: 12px;
}
</style>
