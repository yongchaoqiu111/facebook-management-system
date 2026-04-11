<template>
  <div class="chat-container">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <button class="action-btn back-btn" @click="goBack">←</button>
      <div class="chat-title">
        <div class="chat-avatar">👥</div>
        <div class="chat-name">{{ currentContact?.name || '六合天下' }}</div>
      </div>
      <div class="chat-actions">
        <button class="action-btn live-btn" @click="showLiveCard = true">📺</button>
        <button class="action-btn bill-btn" @click="showBillCard = true">💰</button>
        <button class="action-btn more-btn" @click="showMoreMenu = !showMoreMenu">⋮</button>
      </div>
      
      <!-- 更多选项菜单 -->
      <div v-if="showMoreMenu" class="more-menu">
        <div class="menu-item" @click="clearChatHistory">
          <span class="menu-icon">🗑️</span>
          <span class="menu-text">清空聊天记录</span>
        </div>
      </div>
    </div>

    <!-- 开奖结果跑马灯 -->
    <div class="marquee-container">
      <div class="marquee-content">
        <span class="marquee-text">
          {{ marqueeText }}
        </span>
      </div>
    </div>

    <!-- 聊天内容区域 -->
    <div class="chat-messages" ref="messagesContainer">
      <template v-for="msg in chatMessages" :key="msg.id">
        <!-- 红包消息（带头像） -->
        <div v-if="msg.type === 'redPacket'" :class="['message-item', msg.direction === 0 ? 'self' : 'other']">
          <template v-if="msg.direction === 1">
            <div class="message-avatar">👤</div>
          </template>
          <div class="red-packet" @click="!msg.opened && openRedPacket(msg)">
            <div v-if="!msg.opened" class="red-packet-header">
              <span>🧧</span>
              <span class="red-packet-title">{{ 
                msg.redPacketType === 'lucky' ? '拼手气红包' : 
                msg.redPacketType === 'liuhe' ? '六合红包' : '普通红包' 
              }}</span>
            </div>
            <div v-else class="red-packet-header">
              <span>💰</span>
              <span class="red-packet-title">已领取</span>
            </div>
            <div class="red-packet-amount">¥{{ msg.opened ? msg.openedAmount : msg.amount.toFixed(2) }}</div>
            <div class="red-packet-footer">
              <span>{{ msg.count }}个红包</span>
              <span>{{ msg.time }}</span>
            </div>
          </div>
          <template v-if="msg.direction === 0">
            <div class="message-avatar self-avatar">😊</div>
          </template>
        </div>
        <!-- 系统消息 -->
        <div v-else-if="msg.type === 'system'" class="system-message">
          <div class="system-content">{{ msg.content }}</div>
          <div class="message-time">{{ msg.time }}</div>
        </div>
        <!-- 文本消息 -->
        <div v-else :class="['message-item', msg.direction === 0 ? 'self' : 'other']">
          <template v-if="msg.direction === 1">
            <div class="message-avatar">👤</div>
          </template>
          <div class="message-bubble">
            <div>{{ msg.content }}</div>
            <div class="message-time">{{ msg.time }}</div>
          </div>
          <template v-if="msg.direction === 0">
            <div class="message-avatar self-avatar">😊</div>
          </template>
        </div>
      </template>
    </div>

    <!-- 底部输入框 -->
    <div class="chat-input">
      <div class="chat-tools">
        <button class="tool-btn" @click="handleSendRedPacket">🧧</button>
      </div>
      <div class="input-container">
        <input 
          type="text" 
          v-model="messageInput" 
          placeholder="输入消息..." 
          class="message-input"
          @keyup.enter="sendMessage"
        />
        <button class="send-btn" @click="sendMessage">发送</button>
      </div>
    </div>

    <!-- 开奖直播卡片 -->
    <div v-if="showLiveCard" class="modal-overlay" @click="showLiveCard = false">
      <div class="live-card" @click.stop>
        <div class="live-card-header">
          <h3>📺 开奖直播</h3>
          <button class="close-btn" @click="showLiveCard = false">✕</button>
        </div>
        <div class="live-card-body">
          <video
            ref="videoPlayer"
            class="video-js vjs-default-skin"
            controls
            preload="auto"
            width="100%"
            height="auto"
          >
            <source src="https://live-macaujc.com/live/livestream/new.m3u8" type="application/x-mpegURL" />
          </video>
          
          <div class="live-status">
            <span :class="['status-dot', { 'live': isLive }]"></span>
            <span>{{ isLive ? '直播中' : '距离开奖: ' + drawCountdownText }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 账单卡片 -->
    <div v-if="showBillCard" class="modal-overlay" @click="showBillCard = false">
      <div class="bill-card" @click.stop>
        <div class="bill-card-header">
          <h3>💰 我的账单</h3>
          <button class="close-btn" @click="showBillCard = false">✕</button>
        </div>
        <div class="bill-card-body">
          <!-- 加载状态 -->
          <div v-if="billLoading" class="bill-loading">加载中...</div>
          
          <template v-else-if="billData">
            <!-- 选项卡 -->
            <div class="bill-tabs">
              <button :class="['tab-btn', { active: billActiveTab === 'stats' }]" @click="billActiveTab = 'stats'">📊 统计</button>
              <button :class="['tab-btn', { active: billActiveTab === 'banker' }]" @click="billActiveTab = 'banker'">🏦 庄家记录</button>
              <button :class="['tab-btn', { active: billActiveTab === 'player' }]" @click="billActiveTab = 'player'">🎯 投注记录</button>
            </div>

            <!-- 统计面板 -->
            <div v-if="billActiveTab === 'stats'" class="bill-panel">
              <div class="stats-section">
                <h4>🏦 庄家统计</h4>
                <div class="stats-grid">
                  <div class="stat-item"><span>发红包数</span><strong>{{ billData.stats.bankerStats.totalPackets }}</strong></div>
                  <div class="stat-item"><span>总奖池</span><strong>{{ billData.stats.bankerStats.totalPrizePool }} USDT</strong></div>
                  <div class="stat-item"><span>进行中</span><strong>{{ billData.stats.bankerStats.openPackets }}</strong></div>
                  <div class="stat-item"><span>已结算</span><strong>{{ billData.stats.bankerStats.settledPackets }}</strong></div>
                  <div class="stat-item"><span>已退款</span><strong>{{ billData.stats.bankerStats.refundedPackets }}</strong></div>
                  <div class="stat-item profit"><span>总盈利</span><strong class="profit-text">+{{ billData.stats.bankerStats.totalProfit }} USDT</strong></div>
                </div>
              </div>
              <div class="stats-section">
                <h4>🎯 玩家统计</h4>
                <div class="stats-grid">
                  <div class="stat-item"><span>投注次数</span><strong>{{ billData.stats.playerStats.totalBets }}</strong></div>
                  <div class="stat-item"><span>总投注</span><strong>{{ billData.stats.playerStats.totalBetAmount }} USDT</strong></div>
                  <div class="stat-item"><span>中奖次数</span><strong>{{ billData.stats.playerStats.wonBets }}</strong></div>
                  <div class="stat-item"><span>未中奖</span><strong>{{ billData.stats.playerStats.lostBets }}</strong></div>
                  <div class="stat-item"><span>待开奖</span><strong>{{ billData.stats.playerStats.pendingBets }}</strong></div>
                  <div class="stat-item"><span>总奖金</span><strong class="profit-text">+{{ billData.stats.playerStats.totalWon }} USDT</strong></div>
                  <div class="stat-item"><span>总亏损</span><strong class="loss-text">-{{ billData.stats.playerStats.totalLost }} USDT</strong></div>
                </div>
              </div>
            </div>

            <!-- 庄家记录 -->
            <div v-if="billActiveTab === 'banker'" class="bill-panel">
              <div v-if="billData.bankerRecords.length === 0" class="empty-tip">暂无庄家记录</div>
              <div v-else class="record-list">
                <div v-for="record in billData.bankerRecords" :key="record._id" class="record-item banker-record">
                  <div class="record-header">
                    <span class="record-period">第{{ record.lotteryPeriod }}期</span>
                    <span :class="['record-status', record.status]">{{ record.status === 'settled' ? '已结算' : record.status === 'open' ? '进行中' : '已退款' }}</span>
                  </div>
                  
                  <!-- 基本信息 -->
                  <div class="record-details basic-info">
                    <div>奖池: {{ record.prizePool }} USDT</div>
                    <div>盈利: <span :class="record.betsSummary?.profit >= 0 ? 'profit-text' : 'loss-text'">{{ record.betsSummary?.profit >= 0 ? '+' : '' }}{{ record.betsSummary?.profit || record.bankerProfit || 0 }} USDT</span></div>
                    <div>开奖号: {{ record.winningNumbers?.join(', ') || '-' }}</div>
                    <div>时间: {{ new Date(record.createdAt).toLocaleString('zh-CN') }}</div>
                  </div>

                  <!-- 投注汇总 -->
                  <div v-if="record.betsSummary" class="bets-summary-section">
                    <h5>📊 投注汇总</h5>
                    <div class="summary-grid">
                      <div class="summary-item"><span>总注数</span><strong>{{ record.betsSummary.totalBets }}</strong></div>
                      <div class="summary-item"><span>总投注额</span><strong>{{ record.betsSummary.totalBetAmount }} USDT</strong></div>
                      <div class="summary-item"><span>不同号码</span><strong>{{ record.betsSummary.uniqueNumbers }} 个</strong></div>
                      <div class="summary-item"><span>总赔付</span><strong>{{ record.betsSummary.totalPayout }} USDT</strong></div>
                    </div>
                    
                    <!-- 按号码统计 -->
                    <div v-if="Object.keys(record.betsSummary.betsByNumber || {}).length > 0" class="number-stats">
                      <h6>🎯 各号码投注详情</h6>
                      <div class="number-stat-list">
                        <div v-for="(stat, num) in record.betsSummary.betsByNumber" :key="num" class="number-stat-item">
                          <span class="number-badge">{{ num }}</span>
                          <span class="stat-info">{{ stat.count }}注 / {{ stat.amount }} USDT</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 投注明细 -->
                  <div v-if="record.betList && record.betList.length > 0" class="bet-list-section">
                    <h5>📝 投注明细 ({{ record.betList.length }}条)</h5>
                    <div class="bet-list">
                      <div v-for="bet in record.betList" :key="bet._id" class="bet-item">
                        <div class="bet-user">
                          <span class="user-avatar">👤</span>
                          <span class="username">{{ bet.user?.username || '未知用户' }}</span>
                        </div>
                        <div class="bet-info">
                          <div class="bet-numbers">号码: {{ bet.numbers?.join(', ') }}</div>
                          <div class="bet-amounts">
                            每号: {{ bet.amountPerNumber }} USDT × {{ bet.numbers?.length || 0 }} = <strong>{{ bet.totalAmount }} USDT</strong>
                          </div>
                          <div class="bet-time">{{ new Date(bet.createdAt).toLocaleString('zh-CN') }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 投注记录 -->
            <div v-if="billActiveTab === 'player'" class="bill-panel">
              <div v-if="billData.betRecords.length === 0" class="empty-tip">暂无投注记录</div>
              <div v-else class="record-list">
                <div v-for="record in billData.betRecords" :key="record._id" class="record-item">
                  <div class="record-header">
                    <span class="record-period">第{{ getNextLotteryPeriod(record) }}期</span>
                    <span :class="['record-status', record.status]">{{ record.status === 'won' ? '中奖' : record.status === 'lost' ? '未中奖' : '待开奖' }}</span>
                  </div>
                  <div class="record-details">
                    <div>投注号码: {{ record.numbers?.join(', ') }}</div>
                    <div>每号投注: {{ record.amountPerNumber }} USDT × {{ record.numbers?.length || 0 }} = {{ record.totalAmount }} USDT</div>
                    <div v-if="record.status === 'pending'" class="pending-info">
                      <div>📅 预计开奖: {{ getEstimatedDrawTime(record) }}</div>
                      <div>💰 中奖金额: <strong class="profit-text">+{{ calculateExpectedPayout(record) }} USDT</strong></div>
                    </div>
                    <div v-if="record.matchedNumbers?.length">中奖号码: {{ record.matchedNumbers.join(', ') }}</div>
                    <div v-if="record.status === 'won'">税前奖金: {{ record.grossPayout }} USDT | 平台抽成: {{ record.platformFee }} USDT | 实得: <strong class="profit-text">+{{ record.netPayout }} USDT</strong></div>
                    <div>时间: {{ new Date(record.createdAt).toLocaleString('zh-CN') }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          
          <div v-else class="empty-tip">无账单数据</div>
        </div>
      </div>
    </div>

    <!-- 投注面板弹窗 -->
    <div v-if="showBetPanel" class="bet-panel-overlay">
      <div class="bet-panel">
        <div class="panel-header">
          <h3>🎯 选择{{ showZodiacMode ? '生肖' : '号码' }}</h3>
          <div style="display: flex; align-items: center; gap: 12px;">
            <label class="switch small">
              <input type="checkbox" v-model="showZodiacMode">
              <span class="slider round"></span>
            </label>
            <button class="close-btn" @click="showBetPanel = false">✕</button>
          </div>
        </div>
        
        <!-- 切换开关（已移到标题行） -->
        
        <!-- 生肖选择 -->
        <div v-if="showZodiacMode" class="zodiac-section">
          <div class="zodiac-grid">
            <div 
              v-for="zodiac in zodiacs" 
              :key="zodiac.id"
              class="zodiac-cell"
              :class="{ 'selected': selectedZodiacs.includes(zodiac.id) }"
              @click="selectZodiac(zodiac.id)"
            >
              <div class="zodiac-icon">{{ zodiac.icon }}</div>
              <div class="zodiac-name">{{ zodiac.name }}</div>
            </div>
          </div>
        </div>
        
        <!-- 号码网格 -->
        <div v-if="!showZodiacMode" class="number-grid">
          <div 
            v-for="num in 49" 
            :key="num"
            class="number-cell"
            :class="{ 
              'selected': selectedNumbers.includes(num),
              'full': getRemainingAmount(num)<= 0,
              'zodiac-highlight': isZodiacNumber(num)
            }"
            @click="toggleNumber(num)"
          >
            <div class="number">{{ num }}</div>
            <div class="number-zodiac">{{ getZodiacName(num) }}</div>
          </div>
        </div>
        
        <!-- 投注统计 -->
        <div class="bet-summary">
          <div class="summary-row">
            <span>选择号码</span>
            <span>{{ selectedNumbers.length }} 个</span>
          </div>
          <div class="summary-row">
            <span>每个号码</span>
            <span>10 USDT</span>
          </div>
          <div class="summary-row total">
            <span>总投注</span>
            <span>{{ totalBet }} USDT</span>
          </div>
        </div>
        
        <!-- 提交按钮 -->
        <button 
          class="submit-btn"
          :disabled="!canSubmit"
          @click="submitBet"
        >
          {{ canSubmit ? '确认投注' : '请选择号码并输入金额' }}
        </button>
      </div>
    </div>

    <!-- 发送六合红包弹窗 -->
    <div v-if="showCreateRedPacketModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>🧧 发送六合红包</h3>
          <button class="close-btn" @click="showCreateRedPacketModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>奖池金额（USDT）</label>
            <input 
              v-model.number="redPacketAmount"
              type="number"
              :min="490"
              step="0.01"
              placeholder="最少490 USDT"
            />
            <div class="amount-hint">
              最小奖池: 490 USDT
            </div>
          </div>
          <div class="info-box">
            <div class="info-item">
              <span class="info-label">投注时段:</span>
              <span class="info-value">00:00 - 20:32</span>
            </div>
            <div class="info-item">
              <span class="info-label">赔率:</span>
              <span class="info-value">48倍（平台抽成1倍）</span>
            </div>
            <div class="info-item">
              <span class="info-label">最小投注:</span>
              <span class="info-value">10 USDT/号码</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreateRedPacketModal = false">取消</button>
          <button class="btn-confirm" @click="sendLiuheRedPacket">确认发送</button>
        </div>
      </div>
    </div>
    
    <!-- 成功提示Toast -->
    <div v-if="showSuccessToast" class="success-toast">
      <div class="toast-content">
        <div class="toast-icon">✅</div>
        <div class="toast-text">六合红包发送成功！</div>
      </div>
    </div>
    
    <!-- 通知提示Toast -->
    <div v-if="showNotificationToast" class="notification-toast">
      <div class="toast-content">
        <div class="toast-icon">🧧</div>
        <div class="toast-text">{{ showToastMessage }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import './LiuHe.css'  // 引入独立样式文件
import {
  sendRedPacket as sendSocketRedPacket,
  onGroupMessage,
  onGroupRedPacket,
  onNewLiuheRedPacket,
  joinGroup,  // 使用 joinGroup 而不是 joinRoom
  initSocket,
  getSocket
} from '../socket'
import {
  saveMessage,
  saveMessages,
  getMessagesByChatId,
  cleanupOldMessages,
  getMessageCount,
  clearGroupMessages,
  parseMessage  // 统一消息解析器
} from '../utils/chatStorage'
// ✅ 导入消息更新通知总线
import { messageUpdated } from '../utils/messageBus'

const router = useRouter()

// 状态管理
const loading = ref(true)
const redPackets = ref([])
const showBetPanel = ref(false)
const selectedNumbers = ref([])
const amountPerNumber = ref(10)
const currentRedPacket = ref(null)
const limits = ref({ maxPerNumber: 10.21, availableByNumber: {} })
const selectedZodiacs = ref([])
const showZodiacMode = ref(true)  // true=生肖模式, false=独立号码模式
const showSuccessToast = ref(false)
const showToastMessage = ref('')
const showNotificationToast = ref(false)

// 直播卡片和账单卡片
const showLiveCard = ref(false)
const showBillCard = ref(false)
const showMoreMenu = ref(false)  // 更多选项菜单
const billData = ref(null)
const billLoading = ref(false)
const billActiveTab = ref('stats') // stats | banker | player

// 聊天相关状态
const messagesContainer = ref(null)
const currentContact = ref({ id: LIUHE_GROUP_ID, name: '六合天下', avatar: '👥' })
const messageInput = ref('')
const chatMessages = ref([])
const currentUserId = localStorage.getItem('userId')

// 发送六合红包相关
const showCreateRedPacketModal = ref(false)
const redPacketAmount = ref(490) // 默认最小奖池

// 直播相关
const videoPlayer = ref(null)
const isLive = ref(false)
let player = null

// 倒计时
const countdownText = ref('')
const drawCountdownText = ref('')
let timer = null

// 最新开奖结果（用于跑马灯）
const latestLotteryResult = ref(null)

// 跑马灯文本
const marqueeText = computed(() => {
  if (!latestLotteryResult.value) {
    return '🎉 欢迎使用六合天下 - 实时开奖直播'
  }
  
  // 直接使用后端返回的格式化消息
  return latestLotteryResult.value.formattedMessage || '🎉 欢迎使用六合天下 - 实时开奖直播'
})

// 获取下一期期号
const getNextLotteryPeriod = (record) => {
  // 1. 如果已有红包期号，直接返回
  if (record.redPacket?.lotteryPeriod) {
    return record.redPacket.lotteryPeriod
  }
  
  // 2. 如果记录本身有期号（后端返回的），直接返回
  if (record.lotteryPeriod) {
    return record.lotteryPeriod
  }
  
  // 3. 使用 localStorage 中保存的最新期号 + 1
  const latestPeriod = localStorage.getItem('latestLotteryPeriod')
  if (latestPeriod) {
    const nextPeriod = parseInt(latestPeriod) + 1
    return nextPeriod.toString()
  }
  
  return '-'
}

// 获取预计开奖时间
const getEstimatedDrawTime = (record) => {
  // 如果有红包的投注截止时间，使用它
  if (record.redPacket?.bettingDeadline) {
    return new Date(record.redPacket.bettingDeadline).toLocaleString('zh-CN')
  }
  
  // 否则默认每天21:30开奖
  const now = new Date()
  const drawTime = new Date(now)
  drawTime.setHours(21, 30, 0, 0)
  
  // 如果已经过了今天的开奖时间，就是明天
  if (now > drawTime) {
    drawTime.setDate(drawTime.getDate() + 1)
  }
  
  return drawTime.toLocaleString('zh-CN')
}

// 计算中奖金额（前端根据赔率公式计算）
const calculateExpectedPayout = (record) => {
  if (!record.numbers || !record.amountPerNumber) return 0
  
  const amountPerNumber = record.amountPerNumber
  
  // 六合彩赔率规则：
  // 总奖金 = 每注金额 × 49
  // 平台佣金 = 每注金额 × 1
  // 实得 = 总奖金 - 平台佣金（不扣除投注本金）
  
  const grossPayout = amountPerNumber * 49
  const platformFee = amountPerNumber * 1
  const netPayout = grossPayout - platformFee
  
  return netPayout
}

// 加载账单数据
const loadBillData = async () => {
  billLoading.value = true
  billData.value = null
  
  try {
    // 请求账单数据
    const response = await axios.get('http://localhost:5000/api/liuhe/my-bills', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.data.success && response.data.data) {
      billData.value = response.data.data
      console.log('💰 账单数据加载成功:', billData.value)
    } else {
      billData.value = null
      console.log('💰 无账单数据')
    }
  } catch (error) {
    console.error('💰 加载账单失败:', error)
    billData.value = null
  } finally {
    billLoading.value = false
  }
}

// 监听 showBillCard 变化，打开时加载数据
watch(showBillCard, (newVal) => {
  if (newVal) {
    loadBillData()
  }
})

// 六合天下群信息（固定ID）
const LIUHE_GROUP_ID = '1000001'
const LIUHE_GROUP_NAME = '六合天下'

// 生肖数据（今年马年，1号=马）
const zodiacs = [
  { id: 'horse', name: '马', icon: '🐴', numbers: [1, 13, 25, 37, 49] },
  { id: 'sheep', name: '羊', icon: '🐑', numbers: [2, 14, 26, 38] },
  { id: 'monkey', name: '猴', icon: '🐵', numbers: [3, 15, 27, 39] },
  { id: 'rooster', name: '鸡', icon: '🐔', numbers: [4, 16, 28, 40] },
  { id: 'dog', name: '狗', icon: '🐶', numbers: [5, 17, 29, 41] },
  { id: 'pig', name: '猪', icon: '🐷', numbers: [6, 18, 30, 42] },
  { id: 'rat', name: '鼠', icon: '🐭', numbers: [7, 19, 31, 43] },
  { id: 'ox', name: '牛', icon: '🐂', numbers: [8, 20, 32, 44] },
  { id: 'tiger', name: '虎', icon: '🐯', numbers: [9, 21, 33, 45] },
  { id: 'rabbit', name: '兔', icon: '🐇', numbers: [10, 22, 34, 46] },
  { id: 'dragon', name: '龙', icon: '🐲', numbers: [11, 23, 35, 47] },
  { id: 'snake', name: '蛇', icon: '🐍', numbers: [12, 24, 36, 48] }
]

// 计算当前时间段状态
const periodStatus = computed(() => {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentTime = hours * 60 + minutes
  
  if (currentTime <= 20 * 60 + 32) {
    return {
      status: 'betting',
      text: '投注中',
      time: '00:00 - 20:32',
      icon: '🟢'
    }
  } else if (currentTime <= 21 * 60 + 32) {
    return {
      status: 'waiting',
      text: '等待开奖',
      time: '20:33 - 21:32',
      icon: '🟡'
    }
  } else {
    return {
      status: 'settling',
      text: '结算中',
      time: '21:33 - 23:59',
      icon: '🔵'
    }
  }
})

// 计算最大投注金额
const maxBetAmount = computed(() => {
  if (selectedNumbers.value.length === 0) return 10.21
  
  return Math.min(
    ...selectedNumbers.value.map(num => 
      limits.value.availableByNumber[num] || limits.value.maxPerNumber || 10.21
    )
  )
})

// 计算总投注金额
const totalBet = computed(() => {
  return selectedNumbers.value.length * amountPerNumber.value
})

// 判断是否可以提交
const canSubmit = computed(() => {
  const result = selectedNumbers.value.length > 0 && 
         amountPerNumber.value >= 10 &&
         amountPerNumber.value <= maxBetAmount.value
  
  console.log('🔍 canSubmit检查:', {
    selectedNumbersLength: selectedNumbers.value.length,
    amountPerNumber: amountPerNumber.value,
    maxBetAmount: maxBetAmount.value,
    result: result
  })
  
  return result
})

// 获取红包状态文本
const getStatusText = (status) => {
  const map = {
    open: '投注中',
    closed: '已截止',
    settled: '已结算',
    refunded: '已退款'
  }
  return map[status] || ''
}

// 判断是否可以投注
const canBet = (redPacket) => {
  return redPacket.status === 'open' && periodStatus.value.status === 'betting'
}

// 判断是否可以查看
const canView = (redPacket) => {
  return redPacket.status === 'closed' || redPacket.status === 'settled'
}

// 获取倒计时
const getCountdown = (deadline) => {
  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diff = deadlineDate - now
  
  if (diff <= 0) {
    return '已截止'
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 更新全局倒计时
const updateCountdown = () => {
  const now = new Date()
  
  // 投注截止时间：20:32
  const betDeadline = new Date()
  betDeadline.setHours(20, 32, 0, 0)
  
  if (now > betDeadline) {
    betDeadline.setDate(betDeadline.getDate() + 1)
  }
  
  const betDiff = betDeadline - now
  const betHours = Math.floor(betDiff / (1000 * 60 * 60))
  const betMinutes = Math.floor((betDiff % (1000 * 60 * 60)) / (1000 * 60))
  const betSeconds = Math.floor((betDiff % (1000 * 60)) / 1000)
  
  countdownText.value = `${betHours.toString().padStart(2, '0')}:${betMinutes.toString().padStart(2, '0')}:${betSeconds.toString().padStart(2, '0')}`
  
  // 开奖时间：21:32
  const drawDeadline = new Date()
  drawDeadline.setHours(21, 32, 0, 0)
  
  if (now > drawDeadline) {
    drawDeadline.setDate(drawDeadline.getDate() + 1)
  }
  
  const drawDiff = drawDeadline - now
  const drawHours = Math.floor(drawDiff / (1000 * 60 * 60))
  const drawMinutes = Math.floor((drawDiff % (1000 * 60 * 60)) / (1000 * 60))
  const drawSeconds = Math.floor((drawDiff % (1000 * 60)) / 1000)
  
  drawCountdownText.value = `${drawHours.toString().padStart(2, '0')}:${drawMinutes.toString().padStart(2, '0')}:${drawSeconds.toString().padStart(2, '0')}`
}

// 加载红包列表
const loadRedPackets = async () => {
  loading.value = true
  try {
    const response = await axios.get('http://localhost:5000/api/liuhe/group/' + LIUHE_GROUP_ID, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.data.success) {
      redPackets.value = response.data.data
    }
  } catch (error) {
    console.error('加载红包列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 打开投注面板
const openBetPanel = async (redPacket) => {
  currentRedPacket.value = redPacket
  selectedNumbers.value = []
  amountPerNumber.value = 10
  
  // 加载号码剩余额度
  try {
    const response = await axios.get(`http://localhost:5000/api/liuhe/${redPacket._id}/limits`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.data.success) {
      limits.value = response.data.data
    }
  } catch (error) {
    console.error('加载额度失败:', error)
  }
  
  showBetPanel.value = true
}

// 查看详情
const viewDetails = (redPacket) => {
  console.log('查看红包详情:', redPacket)
  // 这里可以跳转到详情页面或显示弹窗
}

// 切换号码选择
const toggleNumber = (num) => {
  const index = selectedNumbers.value.indexOf(num)
  if (index > -1) {
    selectedNumbers.value.splice(index, 1)
  } else {
    selectedNumbers.value.push(num)
  }
}

// 选择生肖
const selectZodiac = (zodiacId) => {
  const index = selectedZodiacs.value.indexOf(zodiacId)
  
  if (index > -1) {
    // 取消选择该生肖
    selectedZodiacs.value.splice(index, 1)
  } else {
    // 添加选择该生肖
    selectedZodiacs.value.push(zodiacId)
  }
  
  // 更新选中的号码
  updateSelectedNumbers()
  
  // 如果有选中的生肖，设置每个号码10 USDT
  if (selectedZodiacs.value.length > 0) {
    amountPerNumber.value = 10
  }
}

// 更新选中的号码（根据选中的生肖）
const updateSelectedNumbers = () => {
  if (selectedZodiacs.value.length === 0) {
    // 如果没有选中任何生肖，清空号码选择
    selectedNumbers.value = []
    return
  }
  
  // 获取所有选中生肖的号码
  const allNumbers = []
  selectedZodiacs.value.forEach(zodiacId => {
    const zodiac = zodiacs.find(z => z.id === zodiacId)
    if (zodiac) {
      zodiac.numbers.forEach(num => {
        if (!allNumbers.includes(num)) {
          allNumbers.push(num)
        }
      })
    }
  })
  
  // 更新选中号码
  selectedNumbers.value = allNumbers
}

// 判断号码是否属于当前选中生肖
const isZodiacNumber = (num) => {
  if (selectedZodiacs.value.length === 0) return false
  
  for (const zodiacId of selectedZodiacs.value) {
    const zodiac = zodiacs.find(z => z.id === zodiacId)
    if (zodiac && zodiac.numbers.includes(num)) {
      return true
    }
  }
  return false
}

// 获取号码对应的生肖名称
const getZodiacName = (num) => {
  const zodiac = zodiacs.find(z => z.numbers.includes(num))
  return zodiac ? zodiac.name : ''
}

// 获取号码剩余额度
const getRemainingAmount = (num) => {
  return limits.value.availableByNumber[num] || 0
}

// 提交投注
const submitBet = async () => {
  try {
    // 检查是否在投注时间段
    if (!checkBettingTime()) {
      return
    }
    
    const response = await axios.post(
      `http://localhost:5000/api/liuhe/${currentRedPacket.value._id}/bet`,
      {
        numbers: selectedNumbers.value,
        amountPerNumber: amountPerNumber.value
      },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    )
    
    if (response.data.success) {
      showToast('投注成功！')
      showBetPanel.value = false
      loadRedPackets() // 刷新红包列表
    }
  } catch (error) {
    showToast(error.response?.data?.error || '投注失败')
  }
}

// 发送六合红包
const sendLiuheRedPacket = async () => {
  if (redPacketAmount.value< 490) {
    showToast('六合红包最小奖池为490 USDT')
    return
  }
  
  try {
    const currentUserId = localStorage.getItem('userId')
    
    // 准备红包数据（固定使用六合天下群ID）
    // 根据当前时段计算投注时长
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const currentTime = hours * 60 + minutes
    
    // 投注截止时间是20:32
    const betDeadline = 20 * 60 + 32
    let bettingDuration = 0
    
    if (currentTime <= betDeadline) {
      // 投注中，计算剩余时间（分钟）
      bettingDuration = betDeadline - currentTime
      // 确保至少为1分钟
      if (bettingDuration < 1) {
        bettingDuration = 1
      }
    } else {
      // 等待开奖或结算中，不允许发红包
      console.warn('⚠️ 当前已过投注截止时间（20:32），无法发送红包')
      showToast('当前已过投注截止时间（20:32），请明天再来')
      return
    }
    
    console.log('📤 当前时间:', `${hours}:${minutes < 10 ? '0' : ''}${minutes}`)
    console.log('📤 投注截止时间: 20:32')
    console.log('📤 计算的投注时长:', bettingDuration, '分钟')
    console.log('📤 bettingDuration类型:', typeof bettingDuration)
    
    const redPacketData = {
      prizePool: Number(redPacketAmount.value),
      groupId: LIUHE_GROUP_ID,
      bettingDuration: Number(bettingDuration)
    }
    
    console.log('📤 发送六合红包请求:', redPacketData)
    console.log('📤 请求数据类型检查:')
    console.log('  - prizePool:', typeof redPacketData.prizePool, redPacketData.prizePool)
    console.log('  - groupId:', typeof redPacketData.groupId, redPacketData.groupId)
    console.log('  - bettingDuration:', typeof redPacketData.bettingDuration, redPacketData.bettingDuration)
    console.log('📤 当前用户ID:', currentUserId)
    console.log('📤 群组ID:', LIUHE_GROUP_ID)
    console.log('📤 Socket连接状态:', getSocket().connected)
    console.log('📤 Socket ID:', getSocket().id)
    
    // 直接调用API发送红包，获取真实的红包ID
    const response = await axios.post('http://localhost:5000/api/liuhe/create', redPacketData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    console.log('📤 发送六合红包响应:', response.data)
    
    if (response.data.success) {
      const createdRedPacket = response.data.data
      console.log('📤 创建的红包:', createdRedPacket)
      
      // 使用后端返回的真实红包ID
      const now = new Date()
      const time = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()
      
      const newRedPacketMessage = {
        id: createdRedPacket._id,
        type: 'redPacket',
        chatId: LIUHE_GROUP_ID,  // ✅ 添加 chatId
        direction: 0,  // ✅ 0=自己的消息（右侧）
        redPacketType: 'liuhe',
        amount: redPacketAmount.value,
        count: 1,
        message: '恭喜发财，大吉大利',
        time: time,
        timestamp: new Date().toISOString(),  // ✅ 添加 timestamp
        opened: false,
        redPacketId: createdRedPacket._id, // 使用真实的MongoDB ObjectId
        clientMsgId: createdRedPacket._id,
        senderId: currentUserId,
        groupId: LIUHE_GROUP_ID,
        isSelf: true,
        status: 'active'
      }
      
      console.log('📤 发送六合红包，添加到列表:', newRedPacketMessage)
      
      // 添加到聊天消息流
      chatMessages.value.push(newRedPacketMessage)
      
      // 保存到本地存储
      saveChatToStorage(LIUHE_GROUP_ID, chatMessages.value)
      
      showCreateRedPacketModal.value = false
      redPacketAmount.value = 490
      
      // 显示自定义成功提示
      showSuccessToast.value = true
      setTimeout(() => {
        showSuccessToast.value = false
      }, 3000)
    } else {
      console.error('发送六合红包失败:', response.data.error)
      console.error('发送六合红包错误详情:', response.data.errors || response.data)
      showToast('发送六合红包失败: ' + (response.data.error || '未知错误'))
    }
  } catch (error) {
    console.error('发送六合红包失败:', error)
    console.error('错误详情:', error.response?.data || error.message)
    console.error('完整错误信息:', JSON.stringify(error.response?.data, null, 2))
    showToast('发送六合红包失败，请稍后重试')
  }
}

// 加载聊天记录
const loadChatHistory = async () => {
  try {
    console.log('📜 开始加载聊天记录...')
    
    // 从 IndexedDB 加载消息（唯一数据源）
    const storedMessages = await loadChatFromStorage(LIUHE_GROUP_ID)
    
    if (storedMessages && storedMessages.length > 0) {
      chatMessages.value = storedMessages
      console.log(`✅ 从 IndexedDB 加载了 ${storedMessages.length} 条消息`)
      
      // 滚动到底部
      setTimeout(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
          console.log('📜 从 IndexedDB 加载消息后滚动到底部')
        }
      }, 100)
    } else {
      console.log('ℹ️ IndexedDB 中没有历史消息（首次进入或已清空）')
      chatMessages.value = []
    }
  } catch (error) {
    console.error('加载聊天记录失败:', error)
    chatMessages.value = []
  }
}

// 保存聊天记录到 IndexedDB
const saveChatToStorage = async (groupId, messages) => {
  try {
    // 批量保存消息（不清理，保留所有历史记录）
    await saveMessages(messages)
    
    console.log('✅ 聊天记录已保存到 IndexedDB')
  } catch (error) {
    console.error('❌ 保存聊天记录失败:', error)
  }
}

// 从 IndexedDB 加载聊天记录
const loadChatFromStorage = async (groupId) => {
  try {
    // ✅ 使用 chatId 加载消息（群聊的 chatId = groupId）
    const messages = await getMessagesByChatId(groupId, 500)
    console.log(`✅ 从 IndexedDB 加载了 ${messages.length} 条消息`)
    
    // ✅ 打印第一条消息的 direction
    if (messages.length > 0) {
      console.log('📦 第一条消息:', messages[0])
      console.log('🔍 direction:', messages[0].direction, 'isSelf:', messages[0].isSelf)
    }
    
    return messages
  } catch (error) {
    console.error('❌ 加载聊天记录失败:', error)
    return []
  }
}

// 导航到六合天下群
const navigateToGroup = () => {
  router.push(`/chat/${LIUHE_GROUP_ID}`)
}

// 返回上一页
const goBack = () => {
  router.push('/home')
}

// 清空聊天记录
const clearChatHistory = async () => {
  if (!confirm('确定要清空所有聊天记录吗？此操作不可恢复！')) {
    return
  }
  
  try {
    // 从 IndexedDB 中删除该群组的所有消息
    await clearGroupMessages(LIUHE_GROUP_ID)
    
    // 清空本地数组
    chatMessages.value = []
    
    // 关闭菜单
    showMoreMenu.value = false
    
    showToast('聊天记录已清空')
    console.log('✅ 聊天记录已清空')
  } catch (error) {
    console.error('❌ 清空聊天记录失败:', error)
    showToast('清空失败，请稍后重试')
  }
}

// 获取当前时间（用于消息时间戳）
const getCurrentTime = () => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 显示Toast提示
const showToast = (message) => {
  showToastMessage.value = message
  showNotificationToast.value = true
  setTimeout(() => {
    showNotificationToast.value = false
  }, 3000)
}

// 检查是否在投注时间段（返回 true 表示可以操作，false 表示不可操作）
const checkBettingTime = () => {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentTime = hours * 60 + minutes
  
  // 投注截止时间是20:32
  const betDeadline = 20 * 60 + 32
  
  if (currentTime > betDeadline) {
    // 不在投注时间段
    console.log('⚠️ 当前时间不在投注时间段内')
    showToast('当前为结算时间，无法使用该功能，请在投注时间（每天00:00-20:32）内操作')
    return false
  }
  
  return true
}

// 处理发红包按钮点击（先判断时间）
const handleSendRedPacket = () => {
  // 检查是否在投注时间段
  if (!checkBettingTime()) {
    return
  }
  
  // 在投注时间段，显示发红包弹窗
  showCreateRedPacketModal.value = true
}

// 发送消息
const sendMessage = async () => {
  const content = messageInput.value.trim()
  if (!content) return
  
  const socket = getSocket()
  if (!socket || !socket.connected) {
    console.error('❌ Socket未连接')
    showToast('网络连接失败，请稍后重试')
    return
  }
  
  const currentUserId = localStorage.getItem('userId')
  
  console.log('📤 ========== 发送消息开始 ==========')
  console.log('📤 消息内容:', content)
  console.log('👤 currentUserId:', currentUserId)
  console.log('🎯 groupId:', LIUHE_GROUP_ID)
  console.log('🔌 Socket连接状态:', socket.connected)
  console.log('🔌 Socket ID:', socket.id)
  
  // 构建发送的数据
  const sendData = {
    groupId: LIUHE_GROUP_ID,
    content: content
  }
  console.log('📦 发送给后端的数据:', JSON.stringify(sendData, null, 2))
  
  // ✅ 乐观更新：先保存到 IndexedDB
  const tempMsg = {
    id: `liuhe_${Date.now()}`,
    type: 'text',
    content: content,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    isSelf: true,
    chatId: LIUHE_GROUP_ID,
    timestamp: Date.now(),
    senderId: currentUserId,
    groupId: LIUHE_GROUP_ID,
    direction: 0  // 自己发的消息
  }
  
  try {
    await saveMessages([tempMsg])
    console.log('💾 [LiuHe] 已保存到 IndexedDB')
  } catch (error) {
    console.error('❌ [LiuHe] 保存失败:', error)
  }
  
  // 发送群聊消息
  socket.emit('chat:groupMessage', sendData)
  
  console.log('✅ 消息已发送，等待 WSS 推送')
  console.log('📤 ========== 发送消息结束 ==========')
  
  // 清空输入框
  messageInput.value = ''
}

// ✅ 删除：跑马灯组件已经显示开奖结果，不需要在聊天消息中显示
// const getLatestLotteryResult = async () => {
//   ...
// }

// ✅ 获取最新开奖结果（跑马灯显示 + 保存期号）
const fetchLatestLotteryResult = async () => {
  try {
    // ✅ 检查是否是今天的缓存
    const cachedPeriod = localStorage.getItem('latestLotteryPeriod')
    const cachedDate = localStorage.getItem('latestLotteryPeriodDate')
    const today = new Date().toDateString()
    
    // 如果今天是同一天的缓存，直接使用
    if (cachedPeriod && cachedDate === today) {
      console.log('✅ 使用今天的缓存，不请求后端')
      
      // 从第1条 localStorage 恢复跑马灯数据
      const cachedFormatted = localStorage.getItem('latestLotteryResultCache')
      if (cachedFormatted) {
        latestLotteryResult.value = { formattedMessage: cachedFormatted }
        console.log('🎰 跑马灯从缓存恢复成功')
      }
      
      console.log('🔍 [调试] localStorage 中的期号:', cachedPeriod)
      return
    }
    
    // ✅ 直接 GET 请求，不检查缓存
    console.log('🔍 [调试] 开始 GET 请求开奖结果...')
    const response = await axios.get('http://localhost:5000/api/lottery/latest', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    console.log('🔍 [调试] 后端返回的完整数据:', JSON.stringify(response.data, null, 2))
    
    if (response.data.success && response.data.data) {
      // ✅ 第1条：保存 formatted 的值（在根级别）
      const formatted = response.data.formatted
      if (formatted) {
        localStorage.setItem('latestLotteryResultCache', formatted)
        console.log('💾 [第1条] formatted 已保存到 localStorage:', formatted)
        
        // 设置跑马灯显示
        latestLotteryResult.value = { formattedMessage: formatted }
        console.log('🎰 跑马灯设置成功')
      } else {
        console.error('❌ 后端返回的数据中没有 formatted 字段！')
      }
      
      // ✅ 第2条：保存 period 的值（期号，在 data.period）
      const period = response.data.data.period || response.data.data.rawData?.expect
      if (period) {
        localStorage.setItem('latestLotteryPeriod', period)
        console.log('💾 [第2条] period 已单独保存到 localStorage:', period)
        
        // 保存日期
        const today = new Date().toDateString()
        localStorage.setItem('latestLotteryPeriodDate', today)
        console.log('💾 [第2条] 日期已保存到 localStorage:', today)
      } else {
        console.error('❌ 后端返回的数据中没有 period 字段！')
        console.error('🔍 data.period:', response.data.data.period)
        console.error('🔍 rawData.expect:', response.data.data.rawData?.expect)
      }
    } else {
      console.error('❌ 后端返回数据格式错误:', response.data)
    }
  } catch (error) {
    console.error('❌ 获取开奖结果失败:', error)
  }
}

// 打开红包
const openRedPacket = async (msg) => {
  try {
    console.log('🧧 打开红包:', msg)
    
    // ✅ 仅六合红包：检查是否是自己的红包
    if (msg.redPacketType === 'liuhe' && msg.direction === 0) {
      console.log('⚠️ 不能投注自己的六合红包')
      showToast('不能投注自己发的六合红包')
      return
    }
    
    // 检查是否在投注时间段
    if (!checkBettingTime()) {
      return
    }
    
    // 创建临时红包对象用于投注（使用真实的红包ID）
    const tempRedPacket = {
      _id: msg.redPacketId || msg.id,
      prizePool: msg.amount,
      status: 'open',
      bettingDeadline: new Date(Date.now() + 3600000).toISOString() // 1小时后截止
    }
    
    // 直接打开投注面板（余额检查在投注时进行）
    await openBetPanel(tempRedPacket)
    
  } catch (error) {
    console.error('打开红包失败:', error)
    showToast('打开红包失败，请稍后重试')
  }
}

// 通用导航
const navigate = (path) => {
  router.push(path)
}

// 初始化视频播放器
const initVideoPlayer = () => {
  if (videoPlayer.value) {
    player = videojs(videoPlayer.value, {
      autoplay: false,
      controls: true,
      liveui: true,
      fluid: true
    })
    
    player.on('playing', () => {
      isLive.value = true
    })
    
    player.on('waiting', () => {
      isLive.value = false
    })
  }
}

// Socket 监听器引用（用于清理）
let groupMessageHandler = null
let groupRedPacketHandler = null
let newLiuheRedPacketHandler = null

// 生命周期
onMounted(async () => {
  updateCountdown()
  timer = setInterval(updateCountdown, 1000)
  
  // 初始化Socket连接
  initSocket()
  
  // 加入六合天下群房间（使用 joinGroup 配合后端）
  joinGroup(LIUHE_GROUP_ID)
  
  // 加载聊天记录
  await loadChatHistory()
  
  // ✅ 获取最新开奖结果（跑马灯显示 + 保存期号到 localStorage）
  await fetchLatestLotteryResult()
  
  // 确保无论如何都滚动到底部（如果loadChatHistory没有触发滚动）
  setTimeout(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      console.log('📜 进群后滚动到底部')
    }
  }, 200)
  
  // ✅ 移除本地 Socket 监听器，统一由 App.vue 全局监听
  // 消息通过 IndexedDB 加载，App.vue 负责接收和保存
  console.log('✅ Socket 监听器已交由 App.vue 统一管理')
  
  // 如果需要实时接收新消息，应该通过 App.vue 的消息队列获取
  // TODO: 实现 App.vue 到 LiuHe.vue 的响应式消息传递
  
  // 初始化视频播放器（需要安装 video.js）
  // initVideoPlayer()
})

// ✅ 监听消息更新通知，实时追加新消息
watch(messageUpdated, async (newCount) => {
  console.log(`🔔 [LiuHe] 收到消息更新通知，计数器: ${newCount}`)
  
  // ✅ 直接从 IndexedDB 获取最新消息（不重新加载全部）
  const allMessages = await getMessagesByChatId(LIUHE_GROUP_ID, 500)
  
  // 去重：只添加不存在的新消息
  let newMessageCount = 0
  allMessages.forEach(msg => {
    // ✅ 关键：通过 id 去重（避免重复添加）
    const existsIndex = chatMessages.value.findIndex(m => m.id === msg.id)
    
    if (existsIndex !== -1) {
      // 消息已存在，更新它（保留 direction 等字段）
      console.log(`🔄 更新已存在消息: ${msg.id}`)
      chatMessages.value[existsIndex] = { ...chatMessages.value[existsIndex], ...msg }
    } else {
      // 新消息，添加
      chatMessages.value.push(msg)
      newMessageCount++
      console.log(`➕ 添加新消息:`, msg)
    }
  })
  
  if (newMessageCount > 0) {
    console.log(`✅ [LiuHe] 追加了 ${newMessageCount} 条新消息`)
    
    // 滚动到底部
    setTimeout(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        console.log('📜 新消息到达，滚动到底部')
      }
    }, 100)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (player) player.dispose()
  
  // ⚠️ 不清理 Socket 监听器（已移至 App.vue 全局监听）
  // WSS 连接保持，消息继续接收并保存到 IndexedDB
  
  console.log('✅ LiuHe 页面卸载，但 Socket 监听保持')
})
</script>

<style scoped>
/* 聊天容器样式 */
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 成功提示Toast */
.success-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.toast-content {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.toast-icon {
  font-size: 24px;
}

.toast-text {
  font-size: 16px;
  font-weight: 500;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* 通知提示Toast */
.notification-toast {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.notification-toast .toast-content {
  background: rgba(255, 187, 0, 0.9);
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* 聊天头部 */
.chat-header {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s;
}

.action-btn:hover {
  background-color: #f0f0f0;
}

.back-btn {
  margin-right: 16px;
}

.chat-title {
  flex: 1;
  display: flex;
  align-items: center;
}

.chat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1890ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-right: 12px;
}

.chat-name {
  font-weight: bold;
  color: #333;
}

.chat-actions {
  display: flex;
  gap: 8px;
  position: relative;
}

/* 更多选项菜单 */
.more-menu {
  position: absolute;
  top: 50px;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 1000;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-icon {
  font-size: 18px;
}

.menu-text {
  font-size: 14px;
  color: #333;
}

/* 聊天内容区域 */
.chat-messages {
  flex: 1;
  padding: 16px 16px;
  overflow-y: auto;
  background: #f5f7fa;
}

/* 消息样式 */
/* 消息项 */
.message-item {
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
}

.message-item.other {
  justify-content: flex-start;
}

.message-item.self {
  justify-content: flex-end;
}

.system-message {
  background: #f5f5f5;
  padding: 12px 16px;
  border-radius: 12px;
  max-width: 80%;
  text-align: center;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.system-content {
  white-space: pre-wrap;
}

.message.self {
  align-items: flex-end;
}

.message:not(.self):not(.system) {
  align-items: flex-start;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 18px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.message-bubble {
  max-width: 65%;
  padding: 12px 20px;
  border-radius: 18px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.message-item.self .message-bubble {
  background: #1890ff;
  color: white;
}

.message-item.self .message-time {
  text-align: right;
}

/* 头像样式 */
.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  margin-right: 10px;
}

.message-avatar.self-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  margin-right: 0;
  margin-left: 10px;
}

.message-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

/* 红包样式 */
.red-packet {
  min-width: 240px;
  max-width: 280px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  border-radius: 12px;
  padding: 20px;
  color: white;
  cursor: pointer;
  transition: transform 0.3s;
  align-self: flex-start;
}

.message-item.self .red-packet {
  align-self: flex-end;
}

.red-packet:hover {
  transform: translateY(-2px);
}

.red-packet-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.red-packet-title {
  font-weight: bold;
}

.red-packet-amount {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 12px;
}

.red-packet-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.8;
}

/* 状态区域 */
.status-section {
  margin-bottom: 16px;
}

.period-status {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
  padding: 12px;
  border-radius: 8px;
}

.period-status.betting {
  background: #e8f5e9;
}

.period-status.waiting {
  background: #fff3e0;
}

.period-status.settling {
  background: #e3f2fd;
}

.status-icon {
  font-size: 1.5rem;
}

.status-info {
  flex: 1;
}

.status-text {
  font-size: 1.2rem;
  font-weight: bold;
}

.status-time {
  font-size: 0.9rem;
  color: #666;
}

.countdown-section {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.countdown-title {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 8px;
}

.countdown-timer {
  font-size: 2rem;
  font-weight: bold;
  font-family: monospace;
  color: #ff6b6b;
}

/* 红包列表 */
.redpackets-section {
  margin-bottom: 20px;
}

.redpackets-section h2 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.2rem;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #ff6b6b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.empty-text {
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 0.9rem;
}

.redpackets-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.liuhe-redpacket-card {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  border-radius: 12px;
  padding: 16px;
  color: white;
  box-shadow: 0 4px 12px rgba(238, 90, 36, 0.3);
}

.liuhe-redpacket-card.status-closed {
  background: linear-gradient(135deg, #ffb74d, #ffa726);
}

.liuhe-redpacket-card.status-settled {
  background: linear-gradient(135deg, #4fc3f7, #29b6f6);
}

.liuhe-redpacket-card.status-refunded {
  background: linear-gradient(135deg, #a1887f, #8d6e63);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.card-header .icon {
  font-size: 24px;
}

.card-header .title {
  font-size: 18px;
  font-weight: bold;
  flex: 1;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.2);
}

.card-body {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-row .label {
  opacity: 0.9;
}

.info-row .value {
  font-weight: bold;
}

.info-row .prize-pool {
  font-size: 18px;
  color: #ffd700;
}

.info-row .countdown {
  font-family: monospace;
  font-size: 16px;
}

.card-footer {
  margin-top: 12px;
  text-align: center;
}

.btn-bet, .btn-view {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-bet {
  background: white;
  color: #ee5a24;
}

.btn-bet:hover {
  background: #f8f8f8;
  transform: translateY(-2px);
}

.btn-view {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
}

.status-text {
  opacity: 0.8;
}

/* 直播区域 */
.live-section {
  margin-bottom: 16px;
}

.live-section h2 {
  color: #ff6b6b;
  margin-bottom: 15px;
  font-size: 1.2rem;
  text-align: center;
}

.live-container {
  position: relative;
}

.video-js {
  width: 100%;
  height: auto;
  border-radius: 8px;
}

.live-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
}

.status-dot.live {
  background: #ff4444;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 底部导航 */
.bottom-nav {
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 15px 10px;
  display: flex;
  justify-content: space-around;
  position: sticky;
  bottom: 0;
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: #666;
  transition: color 0.3s ease;
}

.nav-item.active {
  color: #ff6b6b;
}

.nav-icon {
  font-size: 1.3rem;
}

.nav-label {
  font-size: 0.7rem;
}

/* 投注面板 */
.bet-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.bet-panel {
  background: white;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.zodiac-section {
  margin-bottom: 20px;
}

.zodiac-section h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.zodiac-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.zodiac-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  padding: 8px;
}

.zodiac-cell:hover {
  border-color: #ff6b6b;
  background: #fff5f5;
}

.zodiac-cell.selected {
  background: #ff6b6b;
  border-color: #ff6b6b;
  color: white;
}

.zodiac-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.zodiac-name {
  font-size: 12px;
  font-weight: bold;
}

.number-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.number-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.number-cell:hover {
  border-color: #ff6b6b;
}

.number-cell.selected {
  background: #ff6b6b;
  border-color: #ff6b6b;
  color: white;
}

.number-cell.zodiac-highlight {
  background: #fff3cd;
  border-color: #ffeaa7;
}

.number-cell.full {
  opacity: 0.3;
  cursor: not-allowed;
}

.number {
  font-size: 18px;
  font-weight: bold;
}

.remaining {
  font-size: 10px;
  opacity: 0.7;
}

.bet-amount-section {
  margin-bottom: 20px;
}

.bet-amount-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.bet-amount-section input {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.amount-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.bet-summary {
  padding: 16px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.summary-row.total {
  font-size: 18px;
  font-weight: bold;
  color: #ff6b6b;
  border-top: 2px solid #ddd;
  padding-top: 8px;
  margin-top: 8px;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):hover {
  background: #ee5a24;
  transform: translateY(-2px);
}

/* 发送六合红包弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.3rem;
}

.modal-body {
  margin-bottom: 20px;
}

.info-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #666;
}

.info-value {
  font-weight: bold;
  color: #333;
}

.modal-footer {
  display: flex;
  gap: 12px;
}

.btn-cancel, .btn-confirm {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: #f0f0f0;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-confirm {
  background: #ff6b6b;
  color: white;
}

.btn-confirm:hover {
  background: #ee5a24;
  transform: translateY(-2px);
}

/* 聊天输入框 */
.chat-input {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-tools {
  display: flex;
  gap: 8px;
}

.tool-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s;
}

.tool-btn:hover {
  background-color: #f0f0f0;
}

.input-container {
  flex: 1;
  display: flex;
  gap: 8px;
}

.message-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 16px;
  outline: none;
}

.message-input:focus {
  border-color: #1890ff;
}

.send-btn {
  padding: 10px 24px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.send-btn:hover {
  background: #40a9ff;
}
</style>
