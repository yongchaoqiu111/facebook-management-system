<template>
  <Transition name="loading-fade">
    <div v-if="visible" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner-circle"></div>
        <p v-if="message" class="loading-message">{{ message }}</p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: '加载中...'
  }
})
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner-circle {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-message {
  color: #fff;
  font-size: 14px;
  margin: 0;
  text-align: center;
}

/* 过渡动画 */
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.3s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>
