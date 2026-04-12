<template>
  <div class="app">
    <TradeDetail />
  </div>
</template>

<script>
import TradeDetail from './views/TradeDetail.vue'

export default {
  name: 'App',
  components: {
    TradeDetail
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