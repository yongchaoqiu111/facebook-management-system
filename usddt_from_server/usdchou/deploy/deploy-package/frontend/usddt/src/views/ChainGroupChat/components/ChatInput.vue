<template>
  <div class="chat-input-area">
    <div class="tools">
      <button class="tool-btn" @click="$emit('show-red-packet')" title="发红包" aria-label="发红包">🧧</button>
    </div>
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
      />
      <button class="send-btn" @click="$emit('send')" aria-label="发送消息">发送</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue', 'send', 'show-red-packet'])
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
  border-top: 1px solid #e8e8e8;
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
  font-size: 14px;
}

.message-input:focus {
  border-color: #1890ff;
}

.send-btn {
  padding: 10px 20px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.send-btn:hover {
  background: #40a9ff;
}
</style>
