<template>
  <Transition name="toast">
    <div v-if="visible" class="toast-container" :class="type">
      <div class="toast-icon">{{ icon }}</div>
      <div class="toast-message">{{ message }}</div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue'

const visible = ref(false)
const message = ref('')
const type = ref('info') // success, error, warning, info

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}

const icon = computed(() => icons[type.value])

let timer = null

const show = (msg, toastType = 'info', duration = 2000) => {
  // 清除之前的定时器
  if (timer) {
    clearTimeout(timer)
  }
  
  message.value = msg
  type.value = toastType
  visible.value = true
  
  timer = setTimeout(() => {
    visible.value = false
  }, duration)
}

// 暴露方法给父组件
defineExpose({
  show,
  success: (msg, duration) => show(msg, 'success', duration),
  error: (msg, duration) => show(msg, 'error', duration),
  warning: (msg, duration) => show(msg, 'warning', duration),
  info: (msg, duration) => show(msg, 'info', duration)
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 80%;
  word-break: break-word;
}

.toast-container.success {
  background: rgba(46, 213, 115, 0.95);
}

.toast-container.error {
  background: rgba(255, 71, 87, 0.95);
}

.toast-container.warning {
  background: rgba(255, 165, 2, 0.95);
}

.toast-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.toast-message {
  font-size: 0.95rem;
  line-height: 1.4;
}

/* 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
