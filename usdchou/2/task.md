# 后端员工2 - 任务指令板

## 当前任务：修复接龙群累计领取统计不更新问题（0/380）

### 任务目标
接龙群里的"累计领取"统计一直显示 0/380，没有实时更新。需要检查 Redis 累加逻辑或 MongoDB 字段更新机制，确保每次领取红包后正确累加。

### 涉及文件
- `routes/redPackets.js`（红包领取接口）
- `services/redPacketService.js`（红包服务，如果存在）
- `models/ChainGroup.js`（接龙群模型）
- `utils/redis.js`（Redis 工具，如果使用）

### 具体修改点

#### 1. 检查红包领取后的累加逻辑
**位置**：`POST /api/redpackets/:id/open` 接口中的领取逻辑  
**问题**：领取红包后可能没有更新累计领取金额  
**要求**：
```javascript
// 领取红包成功后，必须更新累计领取金额
// 方式1：使用 Redis 累加（推荐，高性能）
await redisClient.incrBy(`chain_group:${groupId}:user:${userId}:totalReceived`, amount);

// 方式2：直接更新 MongoDB 字段
await ChainGroup.findOneAndUpdate(
  { 
    groupId: groupId,
    'members.userId': userId 
  },
  { 
    $inc: { 'members.$.totalReceived': amount } 
  }
);
```

#### 2. 检查踢出阈值判断
**位置**：领取红包后的踢出判断逻辑  
**要求**：
```javascript
// 获取累计领取金额
const totalReceived = await redisClient.get(`chain_group:${groupId}:user:${userId}:totalReceived`);
const kickThreshold = group.settings.kickThreshold || 380;

// 判断是否达到踢出阈值
if (parseInt(totalReceived) >= kickThreshold) {
  // 标记用户为已踢出
  await ChainGroup.findOneAndUpdate(
    { 
      groupId: groupId,
      'members.userId': userId 
    },
    { 
      'members.$.kicked': true,
      'members.$.kickedAt': new Date()
    }
  );
  
  // 通过 Socket 通知前端
  io.to(groupId).emit('userKicked', {
    userId: userId,
    totalReceived: parseInt(totalReceived),
    kickThreshold: kickThreshold
  });
}
```

#### 3. 检查累计领取查询接口
**位置**：获取群组信息的接口  
**要求**：
- 确认返回的 `totalReceived` 字段正确
- 如果使用 Redis，确认从 Redis 读取数据
- 如果使用 MongoDB，确认字段已更新

### 备份检查项
⚠️ **在执行任何修改前，请先对相关文件或目录进行备份**
- [ ] 备份 `routes/redPackets.js`
- [ ] 备份 `services/redPacketService.js`
- [ ] 备份 `models/ChainGroup.js`
- [ ] 备份 `utils/redis.js`

### 调试要求
1. 在终端打印每次领取后的累计金额：`console.log('用户累计领取:', userId, totalReceived)`
2. 打印 Redis/MongoDB 更新结果：`console.log('累计金额更新成功')`
3. 测试流程：
   - 手动领取一个红包
   - 观察终端输出
   - 查询数据库/Redis 中的累计金额
   - 确认是否正确累加
   - 达到 380 后确认是否触发踢出

### 完成标准
- [ ] 每次领取红包后累计金额正确累加
- [ ] Redis/MongoDB 数据同步正常
- [ ] 达到 380 后正确触发踢出
- [ ] 前端能正确获取累计领取数据
- [ ] 不影响其他正常功能

---

**任务状态**: ✅ 审核通过  
**分配时间**: 2026-04-10 21:15  
**审核时间**: 2026-04-10 21:25  
**执行人**: 后端员工2
