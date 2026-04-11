# 前端员工2 - 任务指令板

## 当前任务：修复接龙群累计领取显示不更新问题（0/380）

### 任务目标
接龙群里的"累计领取"统计一直显示 0/380，没有实时更新。需要检查前端获取累计领取数据的逻辑，确保正确从后端获取并展示。

### 涉及文件
- `src/views/ChainGroup.vue`（接龙群主页面）
- `src/api.js`（API 接口调用）
- `src/socket.js`（Socket 事件监听）
- `src/stores/chainGroup.js`（Pinia 状态管理，如果存在）

### 具体修改点

#### 1. 检查累计领取数据获取
**位置**：获取群组信息的 API 调用  
**问题**：可能没有正确请求或解析 `totalReceived` 字段  
**要求**：
```javascript
// 检查 API 响应中是否包含累计领取数据
const groupInfo = await chainGroupAPI.getChainGroupDetail(groupId);
console.log('群组信息:', groupInfo);

// 确认数据结构
const member = groupInfo.members.find(m => m.userId === currentUserId);
console.log('我的累计领取:', member?.totalReceived || 0);
```

#### 2. 检查 Pinia 状态管理
**位置**：`src/stores/chainGroup.js` 或类似 Store  
**要求**：
- 确认 `totalReceived` 已添加到 state
- 确认有正确的 mutation/action 更新该字段
- 确认组件正确引用了 store 中的数据

```javascript
// Pinia Store 示例
export const useChainGroupStore = defineStore('chainGroup', {
  state: () => ({
    groupInfo: null,
    myTotalReceived: 0  // ✅ 确保有这个字段
  }),
  actions: {
    updateMyTotalReceived(amount) {
      this.myTotalReceived += amount;
    }
  }
});
```

#### 3. 检查 Socket 事件监听
**位置**：`src/socket.js` 或组件内的 socket.on  
**要求**：
- 监听 `redPacketOpened` 或 `userKicked` 事件
- 收到事件后更新本地累计领取数据
- 触发 UI 刷新

```javascript
// Socket 事件监听示例
socket.on('redPacketOpened', (data) => {
  if (data.userId === currentUserId) {
    // 更新累计领取
    chainGroupStore.updateMyTotalReceived(data.amount);
    console.log('累计领取已更新:', chainGroupStore.myTotalReceived);
  }
});
```

#### 4. 检查 UI 展示
**位置**：模板中的累计领取显示部分  
**要求**：
- 确认绑定的变量正确
- 确认格式化显示（如 `0/380`）
- 确认达到阈值后有视觉提示

```vue
<!-- 模板示例 -->
<div class="stats">
  <span>累计领取: {{ myTotalReceived }}/{{ kickThreshold }}</span>
  <span v-if="myTotalReceived >= kickThreshold" class="warning">
    已达到上限，请重新缴费进群
  </span>
</div>
```

### 备份检查项
⚠️ **在执行任何修改前，请先对相关文件或目录进行备份**
- [ ] 备份 `src/views/ChainGroup.vue`
- [ ] 备份 `src/stores/chainGroup.js`
- [ ] 备份 `src/socket.js`

### 调试要求
1. 在浏览器控制台打印累计领取数据：`console.log('累计领取:', myTotalReceived)`
2. 打印 API 响应：`console.log('群组信息:', groupInfo)`
3. 测试流程：
   - 进入接龙群
   - 观察初始累计领取值
   - 手动领取一个红包
   - 观察数值是否更新
   - 确认显示格式正确

### 完成标准
- [ ] 累计领取数据能正确从后端获取
- [ ] 领取红包后数值实时更新
- [ ] 显示格式正确（如 `50/380`）
- [ ] 达到 380 后有明确提示
- [ ] 不影响其他正常功能

---

**任务状态**: ✅ 审核通过  
**分配时间**: 2026-04-10 21:15  
**审核时间**: 2026-04-10 21:25  
**执行人**: 前端员工2
