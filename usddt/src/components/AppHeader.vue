<template>
  <header class="app-header">
    <div class="header-left">
      <slot name="left"></slot>
    </div>
    
    <h1 class="header-title">
      <slot name="title">{{ title }}</slot>
    </h1>
    
    <div class="header-right">
      <slot name="right"></slot>
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  padding-top: env(safe-area-inset-top);
  background: white;
  border-bottom: 1px solid #e5e7eb;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.header-left,
.header-right {
  flex: 1;
  display: flex;
  align-items: center;
}

.header-right {
  justify-content: flex-end;
}

.header-title {
  flex: 2;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
</style>
