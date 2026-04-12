# 任务 B：WSS 事件监听

**负责人**：开发人员 B（中级前端）  
**预计工时**：2-3 小时  
**难度**：⭐⭐  
**依赖**：任务 A 完成 50%（至少完成了 Step 1-2）

---

## 📋 任务目标

在接龙群组件中添加 4 个红包 WSS 事件监听器，实现：
- ✅ 接龙进度实时更新
- ✅ 红包账单实时追加
- ✅ 红包状态实时更新
- ✅ 抢红包结果弹窗显示

---

## 📁 需要修改的文件

### 1. `src/views/ChainGroupChat/index.vue`
**修改量**：约 80-100 行  
**难度**：⭐⭐

---

## 🔧 实施步骤

### Step 1: 导入 Socket 和状态（15 分钟）

**文件**：`src/views/ChainGroupChat/index.vue`

```javascript
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSocket, joinGroup, leaveGroup } from '@/socket'
import { useMessageCenter } from '@/composables/useMessageCenter'

// ... 其他导入

const route = useRoute()
const chatId = route.params.id
const socket = getSocket()

// ✅ 添加红包相关状态
const chainProgress = ref({
  totalClaimed: 0,
  threshold: 380,
  entryFee: 310,
  remainToThreshold: 380,
  isExceeded: false,
  status: 'active',
  topClaimers: []
})

const redPacketBill = ref([])  // 红包账单列表
const showResultModal = ref(false)  // 结果弹窗
const resultData = ref({
  amount: 0,
  message: '',
  from: '',
  balance: 0
})
</script>
```

**检查点**：
- [ ] 导入成功，无报错
- [ ] 可以在模板中使用这些状态

---

### Step 2: 添加 4 个 WSS 监听器（1 小时）

**文件**：`src/views/ChainGroupChat/index.vue`

```javascript
onMounted(() => {
  // 初始化消息中心
  initSocketListeners()
  loadHistory(`group_${chatId}`)
  joinGroup(chatId)
  
  // ✅ 添加 4 个 WSS 监听器
  
  // 1. 接龙进度更新
  socket.on('chainRedPacketProgress', (data) => {
    console.log('📊 接龙进度更新:', data)
    updateChainProgress(data)
  })
  
  // 2. 红包领取明细
  socket.on('redPacketClaimed', (data) => {
    console.log('💰 有人领取红包:', data)
    updateRedPacketBill(data)
  })
  
  // 3. 红包状态更新
  socket.on('redPacketStatusUpdate', (data) => {
    console.log('🔄 红包状态变更:', data)
    updateRedPacketStatus(data)
  })
  
  // 4. 我的抢红包结果
  socket.on('myRedPacketResult', (data) => {
    console.log('🎉 我抢到了红包:', data)
    showMyResult(data)
  })
})

onUnmounted(() => {
  leaveGroup(chatId)
  
  // ✅ 移除监听器（防止内存泄漏）
  socket.off('chainRedPacketProgress')
  socket.off('redPacketClaimed')
  socket.off('redPacketStatusUpdate')
  socket.off('myRedPacketResult')
})
```

**关键点**：
- 在 `onMounted` 中注册监听器
- 在 `onUnmounted` 中移除监听器
- 使用 `socket.off()` 避免内存泄漏

**检查点**：
- [ ] 页面加载时，控制台看到监听器注册日志
- [ ] 页面销毁时，监听器被移除

---

### Step 3: 实现 updateChainProgress 函数（30 分钟）

**文件**：`src/views/ChainGroupChat/index.vue`

```javascript
// ✅ 更新接龙进度
function updateChainProgress(data) {
  chainProgress.value = {
    totalClaimed: data.totalClaimed,
    threshold: data.threshold,
    entryFee: data.entryFee,
    remainToThreshold: data.remainToThreshold,
    isExceeded: data.isExceeded,
    status: data.status,
    topClaimers: data.topClaimers || []
  }
  
  console.log(`进度更新: ${data.totalClaimed} / ${data.threshold} USDT`)
  
  // 如果超过阈值，显示警告
  if (data.isExceeded) {
    alert(`⚠️ 累计领取 ${data.totalClaimed} USDT，已超过阈值 ${data.threshold} USDT，禁止继续领取！`)
  }
}
```

**用途**：
- 更新进度条显示（379.5 / 380）
- 显示距离阈值还剩多少
- 超过阈值时禁用领取按钮

**检查点**：
- [ ] 有人领取红包后，进度条实时更新
- [ ] 超过阈值时，弹出警告

---

### Step 4: 实现 updateRedPacketBill 函数（30 分钟）

**文件**：`src/views/ChainGroupChat/index.vue`

```javascript
// ✅ 更新红包账单
function updateRedPacketBill(data) {
  const billItem = {
    id: `bill_${Date.now()}`,
    claimer: data.claimer,  // { _id, username, avatar }
    amount: data.amount,
    timestamp: data.timestamp
  }
  
  // 添加到账单列表（最新在前）
  redPacketBill.value.unshift(billItem)
  
  console.log(`${data.claimer.username} 领取了 ${data.amount} USDT`)
}
```

**用途**：
- 实时更新红包账单列表
- 显示"李四 领取了 20 USDT"
- 显示剩余数量和金额

**检查点**：
- [ ] 有人领取红包后，账单列表实时追加
- [ ] 账单按时间倒序排列（最新的在上面）

---

### Step 5: 实现 updateRedPacketStatus 函数（15 分钟）

**文件**：`src/views/ChainGroupChat/index.vue`

```javascript
// ✅ 更新红包状态
function updateRedPacketStatus(data) {
  console.log(`红包状态: ${data.status}`)
  
  if (data.status === 'exceeded') {
    // 超过阈值
    alert(`红包已达到阈值：${data.reason}`)
  } else if (data.status === 'finished') {
    // 已领完
    alert('红包已领完')
  } else if (data.status === 'expired') {
    // 已过期
    alert('红包已过期')
  }
  
  // 更新 UI 状态（禁用领取按钮等）
  // TODO: 根据实际需求更新 UI
}
```

**用途**：
- 红包领完时提示用户
- 红包过期时提示用户
- 超过阈值时提示用户

**检查点**：
- [ ] 红包状态变更时，弹出相应提示

---

### Step 6: 实现 showMyResult 函数（30 分钟）

**文件**：`src/views/ChainGroupChat/index.vue`

```javascript
// ✅ 显示我的抢红包结果
function showMyResult(data) {
  resultData.value = {
    amount: data.amount,
    message: data.message,
    from: data.from,
    balance: data.balance
  }
  
  // 显示结果弹窗
  showResultModal.value = true
  
  console.log(`我抢到了 ${data.amount} USDT，余额: ${data.balance}`)
}

// ✅ 关闭结果弹窗
function closeResultModal() {
  showResultModal.value = false
}
```

**用途**：
- 立即显示抢红包结果弹窗
- 显示领取金额、祝福语、发送者
- 更新钱包余额

**检查点**：
- [ ] 点击领取红包后，立即弹出结果弹窗
- [ ] 弹窗显示正确的金额和信息

---

### Step 7: 添加结果弹窗 UI（30 分钟）

**文件**：`src/views/ChainGroupChat/index.vue`

在 `<template>` 中添加：

```vue
<!-- ✅ 抢红包结果弹窗 -->
<div v-if="showResultModal" class="modal-overlay" @click="closeResultModal">
  <div class="result-modal" @click.stop>
    <div class="result-header">
      <div class="result-icon">🧧</div>
      <h3>恭喜抢到红包！</h3>
    </div>
    
    <div class="result-body">
      <div class="result-amount">
        <span class="amount-value">{{ resultData.amount }}</span>
        <span class="amount-unit">USDT</span>
      </div>
      
      <div class="result-message">{{ resultData.message }}</div>
      <div class="result-from">来自 {{ resultData.from }}</div>
      <div class="result-balance">当前余额: {{ resultData.balance }} USDT</div>
    </div>
    
    <button class="result-close-btn" @click="closeResultModal">开心收下</button>
  </div>
</div>
```

**样式**（在 `<style scoped>` 中添加）：

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.result-modal {
  background: white;
  border-radius: 16px;
  padding: 30px;
  max-width: 400px;
  text-align: center;
}

.result-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.result-amount {
  margin: 20px 0;
}

.amount-value {
  font-size: 48px;
  font-weight: bold;
  color: #ff4d4f;
}

.amount-unit {
  font-size: 20px;
  color: #ff4d4f;
  margin-left: 8px;
}

.result-message {
  font-size: 16px;
  color: #666;
  margin: 16px 0;
}

.result-from {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.result-balance {
  font-size: 14px;
  color: #52c41a;
  font-weight: bold;
  margin-top: 16px;
}

.result-close-btn {
  margin-top: 24px;
  padding: 12px 32px;
  background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

.result-close-btn:hover {
  opacity: 0.9;
}
```

**检查点**：
- [ ] 弹窗样式美观
- [ ] 点击遮罩层或按钮可以关闭弹窗

---

## ✅ 验收标准

### 功能测试
- [ ] **接龙进度**：有人领取红包后，进度条实时更新
- [ ] **红包账单**：账单列表实时追加，显示领取者和金额
- [ ] **状态更新**：红包领完/过期/超过阈值时，弹出提示
- [ ] **结果弹窗**：点击领取后，立即显示结果弹窗
- [ ] **余额更新**：弹窗中显示正确的余额

### 代码质量
- [ ] 无 ESLint 错误
- [ ] 无控制台报错
- [ ] 监听器正确移除（无内存泄漏）
- [ ] 代码注释清晰

### 性能测试
- [ ] WSS 事件响应延迟 < 50ms
- [ ] 弹窗动画流畅
- [ ] 多次领取不卡顿

---

## 🐛 常见问题

### Q1: WSS 事件不触发？
**检查**：
1. Socket 是否连接成功？
2. 事件名是否正确？
3. 后端是否推送了事件？

**解决**：
```javascript
console.log('Socket connected:', socket.connected)
console.log('Socket ID:', socket.id)
```

### Q2: 弹窗不显示？
**检查**：
1. `showResultModal.value` 是否为 `true`？
2. `v-if` 条件是否正确？

**解决**：
```javascript
console.log('showResultModal:', showResultModal.value)
```

### Q3: 数据不更新？
**检查**：
1. 是否使用了 `.value`？
2. 是否是响应式对象？

**解决**：
```javascript
// ❌ 错误
chainProgress.totalClaimed = data.totalClaimed

// ✅ 正确
chainProgress.value.totalClaimed = data.totalClaimed
```

---

## 📞 需要帮助？

遇到问题立即联系：
- **AI 助手**：代码审查 + 问题解决
- **开发人员 A**：协调任务 A 的进度
- **后端团队**：WSS 事件问题

**不要卡住超过 30 分钟！**
