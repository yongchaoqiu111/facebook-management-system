<template>
  <div class="app">
    <h1>接龙群系统</h1>
    <ChainGroup />
  </div>
</template>

<script setup>
import ChainGroup from './views/ChainGroup.vue'
</script>

<style>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #333;
}
</style>