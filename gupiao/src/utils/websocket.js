import { WS_CONFIG } from '../constants/market'

class SmartWebSocket {
  constructor(url, options = {}) {
    this.url = url
    this.maxRetries = options.maxRetries || WS_CONFIG.MAX_RETRIES
    this.baseDelay = options.baseDelay || WS_CONFIG.BASE_DELAY
    this.maxDelay = options.maxDelay || WS_CONFIG.MAX_DELAY
    this.retries = 0
    this.ws = null
    this.handlers = {}
    this.reconnectTimeout = null
  }
  
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    
    this.ws = new WebSocket(this.url)
    
    this.ws.onopen = () => {
      console.log('WebSocket 连接成功')
      this.retries = 0
      this.emit('open')
    }
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.emit('message', data)
      } catch (error) {
        console.error('解析WebSocket消息失败:', error)
        this.emit('error', error)
      }
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error)
      this.emit('error', error)
    }
    
    this.ws.onclose = (event) => {
      console.log('WebSocket 连接关闭', event.code, event.reason)
      this.emit('close', event)
      
      if (!event.wasClean && this.retries < this.maxRetries) {
        this.scheduleReconnect()
      } else if (this.retries >= this.maxRetries) {
        console.error('达到最大重试次数，停止重连')
        this.emit('maxRetriesExceeded')
      }
    }
  }
  
  scheduleReconnect() {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.retries),
      this.maxDelay
    )
    
    console.log(`${delay}ms 后第 ${this.retries + 1} 次重连...`)
    
    this.reconnectTimeout = setTimeout(() => {
      this.retries++
      this.connect()
    }, delay)
  }
  
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = []
    }
    this.handlers[event].push(handler)
  }
  
  off(event, handler) {
    if (this.handlers[event]) {
      this.handlers[event] = this.handlers[event].filter(h => h !== handler)
    }
  }
  
  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`执行事件处理器失败 [${event}]:`, error)
        }
      })
    }
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(typeof data === 'string' ? data : JSON.stringify(data))
        return true
      } catch (error) {
        console.error('发送WebSocket消息失败:', error)
        return false
      }
    } else {
      console.warn('WebSocket未连接，消息发送失败')
      return false
    }
  }
  
  close(code = 1000, reason = 'Normal closure') {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    
    if (this.ws) {
      this.ws.close(code, reason)
      this.ws = null
    }
    
    this.handlers = {}
    this.retries = this.maxRetries // 阻止重连
  }
  
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }
}

export default SmartWebSocket