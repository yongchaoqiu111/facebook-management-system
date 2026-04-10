<template><div class="bottom-nav"><router-link to="/" class="nav-item"><div class="nav-icon">📈</div><div class="nav-text">行情</div></router-link><router-link to="/trade" class="nav-item"><div class="nav-icon">⚖️</div><div class="nav-text">交易</div></router-link><router-link to="/orders" class="nav-item"><div class="nav-icon">📋</div><div class="nav-text">记录</div></router-link><router-link to="/profile" class="nav-item"><div class="nav-icon">👤</div><div class="nav-text">我的</div></router-link></div></template><script>export default {
  name: 'BottomNav'
}</script><style scoped>.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #111;
  border-top: 1px solid #2a2a2a;
  z-index: 1000;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  color: #999;
  text-decoration: none;
  transition: all 0.3s ease;
}

.nav-item:hover {
  color: #2196F3;
}

.nav-item.router-link-active {
  color: #2196F3;
}

.nav-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.nav-text {
  font-size: 12px;
}</style>