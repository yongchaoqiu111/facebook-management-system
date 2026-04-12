import { ref } from 'vue'

// 全局 Toast 实例
const toastRef = ref(null)

// 设置 Toast 引用
export const setToastRef = (ref) => {
  toastRef.value = ref
}

// 显示 Toast 的通用方法
export const showToast = (message, type = 'info', duration = 2000) => {
  if (toastRef.value && toastRef.value.show) {
    toastRef.value.show(message, type, duration)
  } else {
    // 备用方案：如果 Toast 组件未初始化，使用 console
    console.log(`[${type.toUpperCase()}] ${message}`)
  }
}

// 快捷方法
export const showSuccess = (message, duration) => showToast(message, 'success', duration)
export const showError = (message, duration) => showToast(message, 'error', duration)
export const showWarning = (message, duration) => showToast(message, 'warning', duration)
export const showInfo = (message, duration) => showToast(message, 'info', duration)
