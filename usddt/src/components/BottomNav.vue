<template>
  <nav class="bottom-nav">
    <router-link 
      v-for="item in navItems" 
      :key="item.path"
      :to="item.path"
      class="nav-item"
      :class="{ active: $route.path === item.path }"
    >
      <div class="nav-icon">{{ item.icon }}</div>
      <div class="nav-label">{{ item.label }}</div>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 导航菜单配置
const navItems = [
  { path: '/home', icon: '💬', label: '消息' },
  { path: '/contacts', icon: '👥', label: '联系人' },
  { path: '/wallet', icon: '💰', label: '钱包' },
  { path: '/market', icon: '📈', label: '行情' },
  { path: '/profile', icon: '👤', label: '我的' }
]
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 60px;
  background: white;
  border-top: 1px solid #e5e7eb;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
  color: #9ca3af;
  transition: all 0.3s;
  height: 100%;
}

.nav-item.active {
  color: #667eea;
}

.nav-icon {
  font-size: 24px;
  line-height: 1;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
}

.nav-item:active {
  opacity: 0.7;
}
</style>
