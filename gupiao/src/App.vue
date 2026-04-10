<script setup>
import BottomNav from './components/layout/BottomNav.vue'
</script>

<template>
  <div class="app-container">
    <router-view />
    <BottomNav />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0a0a;
  color: #ffffff;
}

.app-container {
  min-height: 100vh;
  padding-bottom: 60px;
}
</style>
