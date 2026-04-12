import { ref } from 'vue'

// 全局 Loading 状态
const loadingVisible = ref(false)
const loadingMessage = ref('加载中...')

// 显示 Loading
export function showLoading(message = '加载中...') {
  loadingMessage.value = message
  loadingVisible.value = true
}

// 隐藏 Loading
export function hideLoading() {
  loadingVisible.value = false
}

// 获取 Loading 状态（用于组件绑定）
export function useLoading() {
  return {
    loadingVisible,
    loadingMessage,
    showLoading,
    hideLoading
  }
}
