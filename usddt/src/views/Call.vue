<template>
  <div class="call-page" :class="{ 'audio-only': callType === 'audio' }">
    <!-- 远程视频 -->
    <video 
      ref="remoteVideo" 
      autoplay 
      playsinline
      class="remote-video"
      @loadedmetadata="onRemoteVideoLoaded"
    ></video>
    
    <!-- 本地视频（小窗口） -->
    <video 
      ref="localVideo" 
      autoplay 
      muted 
      playsinline
      class="local-video"
      @click="toggleLocalVideoPosition"
    ></video>
    
    <!-- 通话信息 -->
    <div class="call-info">
      <div class="caller-avatar">{{ callerAvatar }}</div>
      <div class="caller-name">{{ callerName }}</div>
      <div class="call-status">{{ callStatusText }}</div>
      <div class="call-duration" v-if="isConnected">{{ formattedDuration }}</div>
    </div>
    
    <!-- 控制按钮 -->
    <div class="controls">
      <!-- 静音 -->
      <button 
        class="control-btn" 
        :class="{ active: isMuted }"
        @click="toggleMute"
      >
        <span class="icon">{{ isMuted ? '🔇' : '🎤' }}</span>
        <span class="label">静音</span>
      </button>
      
      <!-- 切换摄像头 -->
      <button 
        v-if="callType === 'video'"
        class="control-btn"
        @click="switchCamera"
      >
        <span class="icon">🔄</span>
        <span class="label">切换</span>
      </button>
      
      <!-- 挂断 -->
      <button 
        class="control-btn hangup"
        @click="handleHangup"
      >
        <span class="icon">📞</span>
        <span class="label">挂断</span>
      </button>
    </div>
    
    <!-- Toast 提示 -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  getLocalStream, 
  createPeerConnection, 
  createOffer, 
  createAnswer, 
  setRemoteAnswer,
  addIceCandidate,
  hangUp,
  getLocalStreamInstance
} from '@/utils/webrtc'
import { 
  startCall, 
  acceptCall, 
  rejectCall, 
  hangupCall, 
  sendIceCandidate,
  onCallAccepted,
  onCallRejected,
  onCallHangup,
  onIceCandidate,
  onCallError
} from '@/socket'
import Toast from '@/components/Toast.vue'

const route = useRoute()
const router = useRouter()

// 通话参数
const callId = route.query.callId
const callerId = route.query.callerId
const callerName = route.query.callerName || '好友'
const callerAvatar = route.query.callerAvatar || '👤'
const callType = route.query.type || 'video' // video / audio
const isIncoming = route.query.incoming === 'true' // 是否是来电

// 状态
const remoteVideo = ref(null)
const localVideo = ref(null)
const toastRef = ref(null)
const isMuted = ref(false)
const isConnected = ref(false)
const callStartTime = ref(null)
const callDuration = ref(0)
const durationTimer = ref(null)
const peerConnection = ref(null)
const localVideoPosition = ref('right') // left / right

// 计算属性
const callStatusText = computed(() => {
  if (isConnected.value) return '通话中'
  return isIncoming.value ? '来电...' : '呼叫中...'
})

const formattedDuration = computed(() => {
  const seconds = Math.floor(callDuration.value)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// 初始化通话
onMounted(async () => {
  console.log('📞 [CallPage] 通话页面加载', { callId, callerId, callType, isIncoming })
  
  try {
    // 1. 获取本地媒体流
    const stream = await getLocalStream(callType === 'video')
    
    // 2. 显示本地视频
    if (localVideo.value) {
      localVideo.value.srcObject = stream
    }
    
    // 3. 创建 P2P 连接
    peerConnection.value = createPeerConnection((remoteStream) => {
      console.log('📥 [CallPage] 接收到远程流')
      if (remoteVideo.value) {
        remoteVideo.value.srcObject = remoteStream
      }
    })
    
    // 4. 监听 ICE 候选并通过信令发送
    peerConnection.value.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 [CallPage] 发送 ICE Candidate')
        sendIceCandidate({
          to: callerId,
          callId: callId,
          candidate: event.candidate
        })
      }
    }
    
    // 5. 如果是发起方，创建 Offer
    if (!isIncoming.value) {
      const offer = await createOffer()
      startCall({
        to: callerId,
        callId: callId,
        type: callType,
        offer: offer
      })
    }
    
    // 6. 注册 Socket 监听器
    registerSocketListeners()
    
  } catch (error) {
    console.error('❌ [CallPage] 初始化失败:', error)
    if (toastRef.value) {
      toastRef.value.error(error.message || '通话初始化失败')
    }
    setTimeout(() => {
      router.back()
    }, 2000)
  }
})

// 注册 Socket 监听器
const registerSocketListeners = () => {
  // 监听通话被接受
  onCallAccepted(async (data) => {
    console.log('✅ [CallPage] 通话被接受', data)
    if (data.callId === callId) {
      await setRemoteAnswer(data.answer)
    }
  })
  
  // 监听通话被拒绝
  onCallRejected((data) => {
    console.log('❌ [CallPage] 通话被拒绝', data)
    if (data.callId === callId) {
      if (toastRef.value) {
        toastRef.value.error('对方拒绝了通话')
      }
      setTimeout(() => {
        router.back()
      }, 2000)
    }
  })
  
  // 监听通话挂断
  onCallHangup((data) => {
    console.log('📞 [CallPage] 对方挂断', data)
    if (data.callId === callId) {
      handleRemoteHangup()
    }
  })
  
  // 监听 ICE 候选
  onIceCandidate(async (data) => {
    console.log('🧊 [CallPage] 收到 ICE Candidate', data)
    if (data.callId === callId) {
      await addIceCandidate(data.candidate)
    }
  })
  
  // 监听通话错误
  onCallError((data) => {
    console.error('❌ [CallPage] 通话错误', data)
    if (toastRef.value) {
      toastRef.value.error(data.message || '通话出错')
    }
  })
}

// 接听通话（来电时调用）
const handleAccept = async () => {
  try {
    console.log('📞 [CallPage] 接听通话')
    const answer = await createAnswer(route.query.offer)
    acceptCall({
      to: callerId,
      callId: callId,
      answer: answer
    })
  } catch (error) {
    console.error('❌ [CallPage] 接听失败:', error)
    if (toastRef.value) {
      toastRef.value.error('接听失败')
    }
  }
}

// 拒绝通话
const handleReject = () => {
  console.log('📞 [CallPage] 拒绝通话')
  rejectCall({
    to: callerId,
    callId: callId
  })
  router.back()
}

// 挂断通话
const handleHangup = () => {
  console.log('📞 [CallPage] 主动挂断')
  hangupCall({
    to: callerId,
    callId: callId
  })
  cleanupAndExit()
}

// 对方挂断
const handleRemoteHangup = () => {
  console.log('📞 [CallPage] 对方挂断')
  if (toastRef.value) {
    toastRef.value.info('通话已结束')
  }
  setTimeout(() => {
    cleanupAndExit()
  }, 2000)
}

// 清理并退出
const cleanupAndExit = () => {
  // 停止计时器
  if (durationTimer.value) {
    clearInterval(durationTimer.value)
    durationTimer.value = null
  }
  
  // 关闭 WebRTC 连接
  hangUp()
  
  // 返回上一页
  setTimeout(() => {
    router.back()
  }, 500)
}

// 远程视频加载完成
const onRemoteVideoLoaded = () => {
  console.log('✅ [CallPage] 远程视频已加载')
  isConnected.value = true
  callStartTime.value = Date.now()
  
  // 开始计时
  durationTimer.value = setInterval(() => {
    if (callStartTime.value) {
      callDuration.value = (Date.now() - callStartTime.value) / 1000
    }
  }, 1000)
}

// 切换静音
const toggleMute = () => {
  const stream = getLocalStreamInstance()
  if (stream) {
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      isMuted.value = !audioTrack.enabled
      console.log('🎤 [CallPage] 静音状态:', isMuted.value)
    }
  }
}

// 切换摄像头（前后置）
const switchCamera = async () => {
  try {
    const stream = getLocalStreamInstance()
    if (!stream) return
    
    const videoTrack = stream.getVideoTracks()[0]
    if (!videoTrack) return
    
    // 获取当前摄像头的 facingMode
    const constraints = videoTrack.getSettings()
    const currentFacing = constraints.facingMode || 'user'
    const newFacing = currentFacing === 'user' ? 'environment' : 'user'
    
    // 停止旧轨道
    videoTrack.stop()
    
    // 获取新轨道
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacing },
      audio: false
    })
    
    const newVideoTrack = newStream.getVideoTracks()[0]
    
    // 替换轨道
    const sender = peerConnection.value.getSenders().find(s => s.track.kind === 'video')
    if (sender) {
      await sender.replaceTrack(newVideoTrack)
    }
    
    // 更新本地视频
    if (localVideo.value) {
      localVideo.value.srcObject = newStream
    }
    
    console.log('🔄 [CallPage] 摄像头已切换:', newFacing)
  } catch (error) {
    console.error('❌ [CallPage] 切换摄像头失败:', error)
    if (toastRef.value) {
      toastRef.value.error('切换摄像头失败')
    }
  }
}

// 切换本地视频位置
const toggleLocalVideoPosition = () => {
  localVideoPosition.value = localVideoPosition.value === 'left' ? 'right' : 'left'
}

// 组件卸载
onUnmounted(() => {
  console.log('📞 [CallPage] 页面卸载')
  cleanupAndExit()
})

// 暴露方法给父组件（如果是来电模式）
defineExpose({
  handleAccept,
  handleReject
})
</script>

<style scoped>
.call-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  display: flex;
  flex-direction: column;
  z-index: 9999;
}

/* 远程视频 */
.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #1a1a1a;
}

/* 本地视频（小窗口） */
.local-video {
  position: absolute;
  width: 120px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.local-video.left {
  left: 20px;
  top: 100px;
}

.local-video.right {
  right: 20px;
  top: 100px;
}

/* 纯语音模式 */
.call-page.audio-only .remote-video {
  display: none;
}

.call-page.audio-only {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 通话信息 */
.call-info {
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  text-align: center;
  color: white;
  z-index: 5;
}

.caller-avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
}

.caller-name {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.call-status {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.call-duration {
  font-size: 16px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* 控制按钮 */
.controls {
  position: absolute;
  bottom: 40px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 0 20px;
  z-index: 5;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.control-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}

.control-btn.active {
  background: rgba(255, 255, 255, 0.4);
}

.control-btn.hangup {
  background: #ff3b30;
}

.control-btn.hangup:active {
  background: #e6352b;
}

.control-btn .icon {
  font-size: 24px;
}

.control-btn .label {
  font-size: 12px;
  color: white;
}

/* 安全区适配 */
@supports (padding-top: env(safe-area-inset-top)) {
  .call-info {
    top: calc(60px + env(safe-area-inset-top));
  }
  
  .controls {
    bottom: calc(40px + env(safe-area-inset-bottom));
  }
}
</style>
