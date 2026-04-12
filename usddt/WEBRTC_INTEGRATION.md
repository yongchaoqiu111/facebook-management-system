# WebRTC 音视频通话集成说明

## ✅ 已完成的工作

### 1. 前端部分

#### 文件结构
```
usddt/src/
├── utils/
│   └── webrtc.js                    # WebRTC 工具类（P2P连接管理）
├── views/
│   └── Call.vue                     # 通话页面组件
├── socket.js                        # 添加了通话信令方法
├── App.vue                          # 添加了来电弹窗和全局监听
├── views/PrivateChat/index.vue      # 添加了通话按钮
└── main.js                          # 注册了通话路由
```

#### 核心功能
- ✅ WebRTC P2P 连接管理
- ✅ 音视频流获取（摄像头+麦克风）
- ✅ ICE 候选交换
- ✅ 来电弹窗显示
- ✅ 通话控制（静音、切换摄像头、挂断）
- ✅ 通话时长计时

### 2. 后端部分

#### 文件结构
```
backend/services/socketHandlers/
└── callHandler.js                   # 通话信令处理器

backend/services/
└── socketService.js                 # 注册了通话事件监听
```

#### 核心功能
- ✅ 呼叫邀请转发
- ✅ 接听/拒绝信令处理
- ✅ 挂断通知
- ✅ ICE 候选中继

---

## 📋 使用方法

### 发起通话

在私聊页面，点击底部工具栏的：
- 📞 **语音通话** - 纯音频通话
- 📹 **视频通话** - 音视频通话

### 接收来电

当收到来电时，会弹出全屏来电界面：
- 点击 **绿色接听按钮** - 接听通话
- 点击 **红色拒绝按钮** - 拒绝通话

### 通话中操作

- 🔇 **静音** - 关闭/开启麦克风
- 🔄 **切换摄像头** - 前后置摄像头切换（仅视频通话）
- 📞 **挂断** - 结束通话

---

## 🔧 技术细节

### WebRTC 工作流程

```
1. 用户A 点击"视频通话"
   ↓
2. 获取本地媒体流（摄像头+麦克风）
   ↓
3. 创建 RTCPeerConnection
   ↓
4. 创建 Offer (SDP)
   ↓
5. 通过 WebSocket 发送 Offer 给用户B
   ↓
6. 用户B 收到来电弹窗
   ↓
7. 用户B 点击"接听"
   ↓
8. 用户B 创建 Answer (SDP)
   ↓
9. 通过 WebSocket 发送 Answer 给用户A
   ↓
10. 双方交换 ICE Candidates
    ↓
11. P2P 连接建立，开始通话
```

### 信令事件

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `call:start` | Client → Server | 发起通话（携带 Offer） |
| `call:incoming` | Server → Client | 来电通知 |
| `call:accept` | Client → Server | 接听通话（携带 Answer） |
| `call:accepted` | Server → Client | 通话被接受 |
| `call:reject` | Client → Server | 拒绝通话 |
| `call:rejected` | Server → Client | 通话被拒绝 |
| `call:hangup` | Client → Server | 挂断通话 |
| `call:ice-candidate` | Client ↔ Server | ICE 候选交换 |

### STUN 服务器

使用 Google 免费 STUN 服务器：
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

> ⚠️ **注意**：STUN 只用于获取外网 IP，不中转音视频数据。

---

## 🌐 网络要求

### 端对端通信条件

✅ **可以直接 P2P 的情况**：
- 双方都在同一局域网
- 双方都有公网 IP
- NAT 类型支持打洞（大多数家用路由器）

❌ **需要 TURN 服务器的情况**：
- 对称型 NAT（企业网络常见）
- 防火墙严格限制
- 移动端 4G/5G 网络

### 添加 TURN 服务器（可选）

如果需要在复杂网络环境下工作，可以配置 TURN 服务器：

编辑 `usddt/src/utils/webrtc.js`：

```javascript
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:your-turn-server.com:3478',
      username: 'your-username',
      credential: 'your-password'
    }
  ]
}
```

推荐的免费 TURN 服务：
- [coturn](https://github.com/coturn/coturn) - 自建
- [Twilio Network Traversal Service](https://www.twilio.com/stun-turn) - 付费但稳定

---

## 📱 浏览器兼容性

✅ **完全支持**：
- Chrome 60+
- Firefox 60+
- Safari 11+ (iOS)
- Edge 79+
- Android WebView
- iOS WKWebView

⚠️ **需要注意**：
- iOS Safari 需要用户交互才能播放音频
- 某些安卓浏览器可能需要 HTTPS
- 微信内置浏览器可能有限制

---

## 🔒 安全性

### 隐私保护

✅ **端对端加密**：
- 音视频流直接在浏览器之间传输
- 服务器只转发信令（几百字节）
- 服务器无法查看或存储通话内容

✅ **权限控制**：
- 需要用户明确授权摄像头/麦克风
- 可以随时关闭权限
- 通话结束后自动释放设备

### 建议的安全措施

1. **使用 HTTPS** - 生产环境必须使用 HTTPS
2. **Token 验证** - 确保只有认证用户可以通话
3. **速率限制** - 防止恶意呼叫
4. **黑名单** - 允许用户屏蔽骚扰电话

---

## 🐛 常见问题

### Q1: 为什么对方听不到我的声音？

**检查清单**：
1. 浏览器是否授予麦克风权限？
2. 系统音量是否正常？
3. 是否误触了静音按钮？
4. 防火墙是否阻止了 UDP 端口？

### Q2: 视频画面卡顿怎么办？

**解决方案**：
1. 检查网络带宽（建议上行 > 1Mbps）
2. 降低视频分辨率（修改 `webrtc.js` 中的 `getUserMedia` 参数）
3. 切换到语音通话模式

### Q3: 为什么连接失败？

**可能原因**：
1. 对方不在线
2. NAT 类型不支持 P2P（需要 TURN 服务器）
3. 防火墙阻止了 UDP 流量
4. STUN 服务器不可达

**调试方法**：
打开浏览器控制台，查看 `[WebRTC]` 日志。

### Q4: iOS 上无法播放声音？

**解决方案**：
iOS 需要用户交互才能播放音频，确保：
1. 用户点击了"接听"按钮
2. 不要自动播放声音
3. 使用 `playsinline` 属性（已添加）

---

## 🚀 性能优化建议

### 1. 降低视频质量（节省带宽）

```javascript
// usddt/src/utils/webrtc.js
localStream = await navigator.mediaDevices.getUserMedia({
  video: { 
    width: { ideal: 640 },  // 从 1280 降到 640
    height: { ideal: 480 }, // 从 720 降到 480
    frameRate: { ideal: 15 } // 限制帧率
  },
  audio: true
})
```

### 2. 添加重连机制

```javascript
// 监听连接断开
peerConnection.onconnectionstatechange = () => {
  if (peerConnection.connectionState === 'disconnected') {
    console.log('🔄 尝试重新连接...')
    // 实现重连逻辑
  }
}
```

### 3. 后台运行检测

```javascript
// 检测页面是否可见
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 页面隐藏时降低视频质量或暂停视频
  }
})
```

---

## 📊 监控和统计

建议添加以下监控指标：

1. **通话成功率** - Offer/Answer 交换成功率
2. **平均通话时长** - 用户使用情况
3. **连接建立时间** - 从呼叫到接通的时间
4. **掉线率** - 异常断开的比例
5. **网络质量** - ICE 连接类型（host/srflx/relay）

---

## 🎯 下一步优化方向

### 短期优化
- [ ] 添加通话录音功能
- [ ] 支持多人会议（Mesh/SFU 架构）
- [ ] 屏幕共享功能
- [ ] 通话历史记录

### 长期优化
- [ ] 集成 SFU 服务器（mediasoup/janus）支持大规模会议
- [ ] 添加 AI 降噪（RNNoise）
- [ ] 虚拟背景功能
- [ ] 实时字幕/翻译

---

## 📞 技术支持

如有问题，请检查：
1. 浏览器控制台日志（F12）
2. 后端日志文件
3. 网络连接状态
4. 防火墙/代理设置

---

**集成完成时间**: 2026-04-11  
**版本**: v1.0.0  
**作者**: AI Assistant
