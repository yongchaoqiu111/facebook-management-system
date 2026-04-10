<template>
  <div class="app">
    <ChainGroup />
  </div>
</template>

<script>
import ChainGroup from './views/ChainGroup.vue'

export default {
  name: 'App',
  components: {
    ChainGroup
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
}

.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
</style>