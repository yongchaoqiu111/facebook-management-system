<template><div class="profile-page"><div class="profile-header"><h1>我的</h1></div><div class="profile-content"><div class="user-info"><div class="user-avatar">JD</div><div class="user-details"><div class="user-name">Demo User</div><div class="user-id">ID: 12345678</div></div></div><div class="asset-section"><h3>资产</h3><div class="asset-list"><div class="asset-item"><div class="asset-info"><div class="asset-name">USD</div><div class="asset-balance">$10,000.00</div></div><div class="asset-value">$10,000.00</div></div><div class="asset-item"><div class="asset-info"><div class="asset-name">BTC</div><div class="asset-balance">0.0015 BTC</div></div><div class="asset-value">$102.75</div></div><div class="asset-item"><div class="asset-info"><div class="asset-name">ETH</div><div class="asset-balance">0.08 ETH</div></div><div class="asset-value">$280.06</div></div></div><div class="total-asset">总资产: <span>$10,382.81</span></div></div><div class="menu-section"><div class="menu-item"><div class="menu-icon">💰</div><div class="menu-text">充值</div><div class="menu-arrow">›</div></div><div class="menu-item"><div class="menu-icon">📤</div><div class="menu-text">提现</div><div class="menu-arrow">›</div></div><div class="menu-item"><div class="menu-icon">🔒</div><div class="menu-text">安全设置</div><div class="menu-arrow">›</div></div><div class="menu-item"><div class="menu-icon">⚙️</div><div class="menu-text">设置</div><div class="menu-arrow">›</div></div><div class="menu-item"><div class="menu-icon">ℹ️</div><div class="menu-text">关于</div><div class="menu-arrow">›</div></div></div><button class="logout-btn">退出登录</button></div></div></template><script>export default {
  name: 'Profile'
}</script><style scoped>.profile-page {
  min-height: 100vh;
  background: #0a0a0a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 60px;
}

.profile-header {
  padding: 16px 20px;
  background: #111;
  border-bottom: 1px solid #2a2a2a;
}

.profile-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.profile-content {
  padding: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #111;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  margin-bottom: 20px;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2196F3, #1976D2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: white;
}

.user-details {
  flex: 1;
}

.user-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.user-id {
  font-size: 12px;
  color: #666;
}

.asset-section {
  background: #111;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  padding: 20px;
  margin-bottom: 20px;
}

.asset-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.asset-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #2a2a2a;
}

.asset-item:last-child {
  border-bottom: none;
}

.asset-info {
  flex: 1;
}

.asset-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.asset-balance {
  font-size: 12px;
  color: #999;
}

.asset-value {
  font-size: 14px;
  font-weight: 600;
}

.total-asset {
  padding-top: 16px;
  border-top: 1px solid #2a2a2a;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.total-asset span {
  color: #2196F3;
}

.menu-section {
  background: #111;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
  margin-bottom: 20px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a2a;
  cursor: pointer;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #1a1a1a;
}

.menu-icon {
  font-size: 18px;
  margin-right: 12px;
}

.menu-text {
  flex: 1;
  font-size: 14px;
}

.menu-arrow {
  color: #666;
  font-size: 16px;
}

.logout-btn {
  width: 100%;
  padding: 14px;
  background: #F44336;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}</style>