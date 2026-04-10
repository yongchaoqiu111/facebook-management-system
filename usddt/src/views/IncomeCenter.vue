<template>
  <div class="income-center-page">
    <!-- 头部导航 -->
    <header class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>收益中心</h1>
      <div class="placeholder"></div>
    </header>

    <!-- 内容区域 -->
    <main class="content">
      <!-- 总览卡片 -->
      <section v-if="!loading && incomeStats" class="overview-card">
        <div class="overview-header">
          <h2>💰 收益总览</h2>
          <span class="update-time">更新于 {{ updateTime }}</span>
        </div>
        
        <div class="overview-stats">
          <div class="stat-item">
            <div class="stat-label">累计收益</div>
            <div class="stat-value primary">{{ incomeStats.totalIncome || 0 }} USDT</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">今日收益</div>
            <div class="stat-value">{{ incomeStats.todayIncome || 0 }} USDT</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">本月收益</div>
            <div class="stat-value">{{ incomeStats.monthIncome || 0 }} USDT</div>
          </div>
        </div>

        <div class="overview-details">
          <div class="detail-row">
            <span>已创建群组</span>
            <strong>{{ incomeStats.groupCount || 0 }} 个</strong>
          </div>
          <div class="detail-row">
            <span>总成员数</span>
            <strong>{{ incomeStats.totalMembers || 0 }} 人</strong>
          </div>
          <div class="detail-row">
            <span>活跃群组</span>
            <strong>{{ incomeStats.activeGroups || 0 }} 个</strong>
          </div>
        </div>
      </section>

      <!-- 我的群组列表 -->
      <section v-if="!loading && myGroups.length > 0" class="groups-section">
        <h2 class="section-title">🐉 我的群组 ({{ myGroups.length }})</h2>
        
        <div 
          v-for="group in myGroups" 
          :key="group._id || group.id"
          class="group-income-card"
          @click="viewGroupDetail(group)"
        >
          <div class="group-header">
            <div class="group-icon">🐉</div>
            <div class="group-info">
              <div class="group-name">{{ group.name }}</div>
              <div class="group-meta">
                <span>👥 {{ group.memberCount || 0 }} 人</span>
                <span>📅 创建于 {{ formatDate(group.createdAt) }}</span>
              </div>
            </div>
            <div class="group-income">
              <div class="income-amount">{{ group.totalIncome || 0 }} USDT</div>
              <div class="income-label">累计收益</div>
            </div>
          </div>

          <div class="group-stats">
            <div class="group-stat-item">
              <span class="label">今日</span>
              <span class="value">{{ group.todayIncome || 0 }}</span>
            </div>
            <div class="group-stat-item">
              <span class="label">本周</span>
              <span class="value">{{ group.weekIncome || 0 }}</span>
            </div>
            <div class="group-stat-item">
              <span class="label">本月</span>
              <span class="value">{{ group.monthIncome || 0 }}</span>
            </div>
            <div class="group-stat-item">
              <span class="label">新成员</span>
              <span class="value">{{ group.newMembers || 0 }}</span>
            </div>
          </div>

          <div class="group-actions">
            <button class="btn-view" @click.stop="viewGroupDetail(group)">查看详情</button>
            <button class="btn-invite" @click.stop="inviteToGroup(group)">邀请好友</button>
          </div>
        </div>
      </section>

      <!-- 收益明细 -->
      <section v-if="!loading && incomeList.length > 0" class="income-list-section">
        <h2 class="section-title">📊 收益明细</h2>
        
        <div 
          v-for="item in incomeList" 
          :key="item._id || item.id"
          class="income-item"
        >
          <div class="income-item-header">
            <div class="income-type">
              <span class="type-icon">💰</span>
              <span class="type-text">{{ getIncomeTypeText(item.type) }}</span>
            </div>
            <div class="income-amount positive">+{{ item.amount || 0 }} USDT</div>
          </div>
          
          <div class="income-item-details">
            <div class="detail-line">
              <span>群组：</span>
              <strong>{{ item.groupName || '未知群组' }}</strong>
            </div>
            <div class="detail-line">
              <span>时间：</span>
              <span>{{ formatDateTime(item.createdAt) }}</span>
            </div>
            <div v-if="item.description" class="detail-line">
              <span>说明：</span>
              <span>{{ item.description }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 空状态 -->
      <div v-if="!loading && myGroups.length === 0" class="empty-state">
        <div class="empty-icon">📈</div>
        <h3>暂无收益数据</h3>
        <p>创建接龙群后，这里会显示您的收益情况</p>
        <button class="btn-create-group" @click="goToCreateGroup">创建接龙群</button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    </main>

    <!-- Toast 提示 -->
    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { chainGroupAPI } from '../api'

const router = useRouter()

// 状态
const loading = ref(false)
const incomeStats = ref(null)
const myGroups = ref([])
const incomeList = ref([])
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// 计算属性
const updateTime = computed(() => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
})

// 返回上一页
const goBack = () => {
  router.back()
}

// 显示 Toast
const showToastMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 3000)
}

// 格式化日期（仅日期）
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 格式化日期时间
const formatDateTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 获取收益类型文本
const getIncomeTypeText = (type) => {
  const typeMap = {
    'ticket': '门票收入',
    'redpacket': '红包分成',
    'commission': '佣金',
    'other': '其他'
  }
  return typeMap[type] || '未知类型'
}

// 加载收益统计数据
const loadIncomeStats = async () => {
  try {
    const response = await chainGroupAPI.getMyIncomeStats()
    console.log('✅ 加载收益统计:', response)
    
    if (response.data) {
      incomeStats.value = response.data
    } else if (response) {
      incomeStats.value = response
    }
  } catch (error) {
    console.error('❌ 加载收益统计失败:', error)
  }
}

// 加载我的群组列表
const loadMyGroups = async () => {
  try {
    const response = await chainGroupAPI.getMyCreatedGroups()
    console.log('✅ 加载我的群组:', response)
    
    if (Array.isArray(response)) {
      myGroups.value = response
    } else if (response.data && Array.isArray(response.data)) {
      myGroups.value = response.data
    } else {
      myGroups.value = []
    }
  } catch (error) {
    console.error('❌ 加载我的群组失败:', error)
  }
}

// 加载收益明细列表
const loadIncomeList = async () => {
  try {
    const response = await chainGroupAPI.getIncomeList({ limit: 50 })
    console.log('✅ 加载收益明细:', response)
    
    if (Array.isArray(response)) {
      incomeList.value = response
    } else if (response.data && Array.isArray(response.data)) {
      incomeList.value = response.data
    } else {
      incomeList.value = []
    }
  } catch (error) {
    console.error('❌ 加载收益明细失败:', error)
  }
}

// 查看群组详情
const viewGroupDetail = (group) => {
  const groupId = group._id || group.id
  if (groupId) {
    router.push(`/chat/${groupId}`)
  }
}

// 邀请好友到群组
const inviteToGroup = (group) => {
  const groupId = group._id || group.id
  if (groupId) {
    // 跳转到群聊页面，在那里可以邀请好友
    router.push(`/chat/${groupId}`)
  }
}

// 跳转到创建群组页面
const goToCreateGroup = () => {
  router.push('/create-chain-group')
}

// 生命周期
onMounted(async () => {
  loading.value = true
  
  try {
    await Promise.all([
      loadIncomeStats(),
      loadMyGroups(),
      loadIncomeList()
    ])
  } catch (error) {
    console.error('加载数据失败:', error)
    showToastMessage('加载失败，请稍后重试', 'error')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.income-center-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 头部导航 */
.header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #f5f7fa;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.5rem;
  color: #667eea;
  transition: background-color 0.3s ease;
}

.back-btn:hover {
  background: #e0e0e0;
}

.header h1 {
  color: #333;
  font-size: 1.3rem;
  margin: 0;
}

.placeholder {
  width: 40px;
}

/* 内容区域 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 总览卡片 */
.overview-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  color: white;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.overview-header h2 {
  margin: 0;
  font-size: 1.3rem;
}

.update-time {
  font-size: 12px;
  opacity: 0.8;
}

.overview-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-value.primary {
  font-size: 24px;
}

.stat-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
}

.overview-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.detail-row strong {
  font-weight: 600;
}

/* 群组区块 */
.groups-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 1.1rem;
  color: #333;
  margin: 0 0 16px 0;
  padding-left: 8px;
}

/* 群组收益卡片 */
.group-income-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
}

.group-income-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.group-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-weight: 600;
  color: #333;
  font-size: 16px;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.group-income {
  text-align: right;
  flex-shrink: 0;
}

.income-amount {
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 4px;
}

.income-label {
  font-size: 12px;
  color: #999;
}

.group-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
  margin-bottom: 16px;
}

.group-stat-item {
  text-align: center;
}

.group-stat-item .label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.group-stat-item .value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.group-actions {
  display: flex;
  gap: 12px;
}

.btn-view,
.btn-invite {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-view {
  background: #f5f5f5;
  color: #666;
}

.btn-view:hover {
  background: #e0e0e0;
}

.btn-invite {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-invite:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 收益明细区块 */
.income-list-section {
  margin-bottom: 24px;
}

.income-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.income-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.income-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  font-size: 20px;
}

.type-text {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.income-amount.positive {
  color: #52c41a;
  font-size: 18px;
  font-weight: 700;
}

.income-item-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-line {
  display: flex;
  font-size: 13px;
  color: #666;
}

.detail-line strong {
  color: #333;
  margin-left: 8px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #333;
  margin: 0 0 12px 0;
  font-size: 18px;
}

.empty-state p {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.6;
}

.btn-create-group {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-create-group:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #999;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Toast */
.toast {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  z-index: 2000;
  animation: slideIn 0.3s ease-out;
}

.toast.success {
  background: rgba(0, 0, 0, 0.8);
}

.toast.error {
  background: rgba(255, 0, 0, 0.8);
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
</style>
