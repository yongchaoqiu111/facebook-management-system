/**
 * WebRTC 音视频通话工具类
 * 端对端 P2P 通信，不经过服务器中转
 */

let localStream = null // 本地音视频流
let peerConnection = null // P2P 连接
let remoteStream = null // 远程音视频流

// STUN 服务器配置（免费，用于获取外网 IP，不中转数据）
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

/**
 * 1. 打开摄像头 + 麦克风
 * @param {boolean} hasVideo - 是否开启视频（false=纯语音）
 * @returns {Promise<MediaStream>} 本地媒体流
 */
export async function getLocalStream(hasVideo = true) {
  try {
    console.log('📹 [WebRTC] 请求媒体权限, video:', hasVideo)
    
    localStream = await navigator.mediaDevices.getUserMedia({
      video: hasVideo ? { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user' // 前置摄像头
      } : false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })
    
    console.log('✅ [WebRTC] 获取本地媒体流成功')
    return localStream
  } catch (error) {
    console.error('❌ [WebRTC] 获取媒体流失败:', error)
    throw new Error(error.name === 'NotAllowedError' ? '用户拒绝授权' : '无法访问摄像头/麦克风')
  }
}

/**
 * 2. 创建 P2P 连接
 * @param {Function} onTrack - 接收到远程流的回调
 * @returns {RTCPeerConnection}
 */
export function createPeerConnection(onTrack) {
  console.log('🔗 [WebRTC] 创建 P2P 连接')
  
  peerConnection = new RTCPeerConnection(ICE_CONFIG)
  
  // 把本地音视频轨道添加到连接
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream)
      console.log('➕ [WebRTC] 添加本地轨道:', track.kind)
    })
  }
  
  // 监听远程流
  peerConnection.ontrack = (event) => {
    console.log('📥 [WebRTC] 接收到远程流')
    remoteStream = event.streams[0]
    if (onTrack) {
      onTrack(remoteStream)
    }
  }
  
  // 监听 ICE 候选
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('🧊 [WebRTC] ICE Candidate:', event.candidate)
      // 这里会通过信令通道发送给对方
      return event.candidate
    }
  }
  
  // 监听连接状态
  peerConnection.onconnectionstatechange = () => {
    console.log('📡 [WebRTC] 连接状态:', peerConnection.connectionState)
  }
  
  peerConnection.oniceconnectionstatechange = () => {
    console.log('🧊 [WebRTC] ICE 状态:', peerConnection.iceConnectionState)
  }
  
  return peerConnection
}

/**
 * 3. 发起方：创建通话邀请（Offer）
 * @returns {Promise<RTCSessionDescription>}
 */
export async function createOffer() {
  if (!peerConnection) {
    throw new Error('PeerConnection 未初始化')
  }
  
  console.log('📤 [WebRTC] 创建 Offer')
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  })
  
  await peerConnection.setLocalDescription(offer)
  console.log('✅ [WebRTC] Offer 已设置')
  
  return offer
}

/**
 * 4. 接收方：回复邀请（Answer）
 * @param {RTCSessionDescription} offer - 对方的 Offer
 * @returns {Promise<RTCSessionDescription>}
 */
export async function createAnswer(offer) {
  if (!peerConnection) {
    throw new Error('PeerConnection 未初始化')
  }
  
  console.log('📥 [WebRTC] 处理 Offer，创建 Answer')
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
  
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)
  
  console.log('✅ [WebRTC] Answer 已设置')
  return answer
}

/**
 * 5. 发起方：接收对方的 Answer
 * @param {RTCSessionDescription} answer - 对方的 Answer
 */
export async function setRemoteAnswer(answer) {
  if (!peerConnection) {
    throw new Error('PeerConnection 未初始化')
  }
  
  console.log('📥 [WebRTC] 设置远程 Answer')
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  console.log('✅ [WebRTC] 远程 Answer 已设置')
}

/**
 * 6. 添加 ICE 候选
 * @param {RTCIceCandidate} candidate
 */
export async function addIceCandidate(candidate) {
  if (!peerConnection) {
    throw new Error('PeerConnection 未初始化')
  }
  
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    console.log('🧊 [WebRTC] ICE Candidate 已添加')
  } catch (error) {
    console.error('❌ [WebRTC] 添加 ICE Candidate 失败:', error)
  }
}

/**
 * 7. 挂断通话
 */
export function hangUp() {
  console.log('📞 [WebRTC] 挂断通话')
  
  // 停止本地媒体流
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      track.stop()
      console.log('⏹️ [WebRTC] 停止本地轨道:', track.kind)
    })
    localStream = null
  }
  
  // 关闭 P2P 连接
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
    console.log('🔒 [WebRTC] P2P 连接已关闭')
  }
  
  remoteStream = null
}

/**
 * 获取本地流
 */
export function getLocalStreamInstance() {
  return localStream
}

/**
 * 获取远程流
 */
export function getRemoteStreamInstance() {
  return remoteStream
}

/**
 * 检查是否有活跃连接
 */
export function hasActiveConnection() {
  return peerConnection !== null && peerConnection.connectionState === 'connected'
}
