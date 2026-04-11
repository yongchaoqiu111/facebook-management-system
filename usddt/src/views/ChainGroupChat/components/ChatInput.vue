<template>
  <footer class="chat-footer">
    <!-- 输入框区域 -->
    <div class="chat-input-area">
      <div class="input-wrapper">
        <label for="chat-message-input" class="sr-only">输入消息</label>
        <input 
          id="chat-message-input"
          name="message"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          @keyup.enter="$emit('send')"
          placeholder="输入消息..."
          class="message-input"
          autocomplete="off"
          @focus="handleFocus"
        />
        <button class="send-btn" @click="$emit('send')" aria-label="发送消息">发送</button>
      </div>
    </div>
  </footer>

  <!-- 底部工具栏（透明，在 footer 外面） -->
  <div class="toolbar">
    <button class="tool-icon" @click="$emit('show-red-packet')" title="红包">🧧</button>
    <button class="tool-icon" title="图片">🖼️</button>
    <button class="tool-icon" title="拍照">📷</button>
    <button class="tool-icon" title="表情">😎</button>
    <button class="tool-icon" title="更多">➕</button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'send', 'show-red-packet'])

// ✅ iOS 键盘适配：focus 时滚动到可视区
const handleFocus = (e) => {
  setTimeout(() => {
    e.target.scrollIntoView({
      behavior: 'smooth',
      block: 'end',  // 改 end，确保输入框在底部可见
      inline: 'nearest'
    })
  }, 500)  // 延迟增加到 500ms
}
</script>

<style scoped>
/* 屏幕阅读器专用样式 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.chat-input-area {
  display: flex;
  padding: 12px;
  background: white;
  gap: 8px;
}

.tools {
  display: flex;
  align-items: center;
}

.tool-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.tool-btn:hover {
  background: #f5f5f5;
}

.input-wrapper {
  flex: 1;
  display: flex;
  gap: 8px;
}

.message-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 20px;
  outline: none;
  font-size: 16px; /* 防止 iOS 自动缩放 */
}

.message-input:focus {
  border-color: #1890ff;
}

.send-btn {
  padding: 10px 24px;
  min-width: 70px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  transition: background 0.2s;
}

.send-btn:hover {
  background: #40a9ff;
}

/* ✅ 底部 Footer 容器 */
.chat-footer {
  background: white;
  flex-shrink: 0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

/* ✅ 底部工具栏（透明背景，在 footer 外面） */
.toolbar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  background: transparent; /* ✅ 完全透明 */
  flex-shrink: 0;
}

.tool-icon {
  background: rgba(255, 255, 255, 0.8); /* ✅ 半透明白色背景 */
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 12px;
  border-radius: 50%;
  transition: all 0.2s;
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  backdrop-filter: blur(10px); /* ✅ 毛玻璃效果 */
}

.tool-icon:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.tool-icon:active {
  background: rgba(240, 240, 240, 0.9);
  transform: scale(0.95);
}
</style>
