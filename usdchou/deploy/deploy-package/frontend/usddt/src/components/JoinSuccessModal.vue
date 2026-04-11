<template>
  <Transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="success-card">
        <!-- 顶部图标 -->
        <div class="card-header">
          <div class="success-icon">🎉</div>
          <h2 class="card-title">进群成功！</h2>
        </div>

        <!-- 玩法介绍 -->
        <div class="card-content">
          <div class="rule-section">
            <h3 class="section-title">📋 群规说明</h3>
            <ul class="rule-list">
              <li>• 门票费用：<strong>{{ settings.ticketAmount }} USDT</strong></li>
              <li>• 首包金额：<strong>{{ settings.firstRedPacketAmount }} USDT</strong></li>
              <li>• 等待时间：<strong>{{ settings.waitHours }} 小时</strong>后自动开奖</li>
              <li>• 出局阈值：累计领取 <strong>{{ settings.kickThreshold }} USDT</strong> 后自动踢出</li>
            </ul>
          </div>

          <div class="rule-section">
            <h3 class="section-title">💡 玩法介绍</h3>
            <p class="rule-text">
              1. 进群后立即发送一个红包（{{ settings.firstRedPacketAmount }} USDT）<br/>
              2. 其他成员抢红包，您获得收益<br/>
              3. 每 {{ settings.waitHours }} 小时自动开奖一次<br/>
              4. 累计领取达到 {{ settings.kickThreshold }} USDT 后自动出局<br/>
              5. 出局后可重新购票进群
            </p>
          </div>

          <div class="tip-box">
            <span class="tip-icon">⚠️</span>
            <span class="tip-text">请遵守群规，违规将被永久封禁</span>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="card-footer">
          <button class="ok-button" @click="handleOk">
            我知道了，开始玩
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: '接龙群'
  },
  settings: {
    type: Object,
    default: () => ({
      ticketAmount: 10,
      firstRedPacketAmount: 300,
      waitHours: 3,
      kickThreshold: 380
    })
  }
})

const emit = defineEmits(['close', 'ok'])

const handleClose = () => {
  emit('close')
}

const handleOk = () => {
  emit('ok')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.success-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.card-header {
  padding: 24px 20px 16px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.success-icon {
  font-size: 48px;
  margin-bottom: 12px;
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.card-title {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  margin: 0;
}

.card-content {
  padding: 20px;
}

.rule-section {
  margin-bottom: 20px;
}

.section-title {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rule-list li {
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;
  line-height: 1.8;
  padding: 4px 0;
}

.rule-list strong {
  color: #ffd700;
  font-weight: bold;
}

.rule-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1.8;
  margin: 0;
}

.tip-box {
  background: rgba(255, 255, 255, 0.15);
  border-left: 4px solid #ffd700;
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip-icon {
  font-size: 18px;
}

.tip-text {
  color: #fff;
  font-size: 13px;
  flex: 1;
}

.card-footer {
  padding: 16px 20px 24px;
}

.ok-button {
  width: 100%;
  padding: 14px;
  background: #fff;
  color: #667eea;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.ok-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.ok-button:active {
  transform: translateY(0);
}

/* 过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .success-card {
  animation: slideUp 0.3s ease-out;
}
</style>
