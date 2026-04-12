<template>
  <div class="create-chain-group-container">
    <!-- 头部导航 -->
    <header class="header">
      <button class="back-btn" @click="goBack">←</button>
      <h1>创建接龙群</h1>
      <button class="close-btn" @click="goBack">✕</button>
    </header>

    <!-- 内容区域 -->
    <main class="content">
      <form @submit.prevent="handleSubmit" class="form-container">
        <!-- 基本信息 -->
        <section class="form-section">
          <h2 class="section-title">📋 基本信息</h2>
          
          <div class="form-item">
            <label for="groupName">群名称</label>
            <input 
              type="text" 
              id="groupName" 
              v-model="formData.groupName" 
              placeholder="例如：天天接龙红包群"
              required
              maxlength="20"
            />
            <span class="char-count">{{ formData.groupName.length }}/20</span>
          </div>

          <div class="form-item">
            <label for="groupDesc">群描述（可选）</label>
            <textarea 
              id="groupDesc" 
              v-model="formData.groupDesc" 
              placeholder="简单介绍一下你的群..."
              maxlength="100"
              rows="3"
            ></textarea>
            <span class="char-count">{{ formData.groupDesc.length }}/100</span>
          </div>
        </section>

        <!-- 费用配置 -->
        <section class="form-section">
          <h2 class="section-title">💰 费用配置</h2>
          
          <div class="form-item">
            <label for="ticketAmount">门票金额 (USDT)</label>
            <div class="input-with-unit">
              <input 
                type="number" 
                id="ticketAmount" 
                v-model.number="formData.ticketAmount" 
                placeholder="10"
                min="1"
                step="0.01"
                required
              />
              <span class="unit">USDT</span>
            </div>
            <p class="help-text">每个新成员进群需要支付的门票费用</p>
            <p class="platform-fee">⚠️ 平台抽成50%：{{ platformFee }} USDT</p>
          </div>

          <div class="form-item">
            <label for="firstRedPacketAmount">首包金额 (USDT)</label>
            <div class="input-with-unit">
              <input 
                type="number" 
                id="firstRedPacketAmount" 
                v-model.number="formData.firstRedPacketAmount" 
                placeholder="300"
                min="1"
                step="0.01"
                required
              />
              <span class="unit">USDT</span>
            </div>
            <p class="help-text">创建群时发放的第一个红包金额</p>
          </div>

          <div class="fee-summary">
            <div class="summary-item">
              <span>单次进群总费用：</span>
              <span class="highlight">{{ totalEntryFee }} USDT</span>
            </div>
            <p class="summary-note">门票 + 首包 = {{ formData.ticketAmount || 0 }} + {{ formData.firstRedPacketAmount || 0 }}</p>
          </div>
        </section>

        <!-- 规则配置 -->
        <section class="form-section">
          <h2 class="section-title">⚙️ 规则配置</h2>
          
          <div class="form-item">
            <label for="waitHours">等待时间 (小时)</label>
            <div class="input-with-unit">
              <input 
                type="number" 
                id="waitHours" 
                v-model.number="formData.waitHours" 
                placeholder="3"
                min="1"
                max="72"
                required
              />
              <span class="unit">小时</span>
            </div>
            <p class="help-text">新成员进群后需要等待多久才能抢红包</p>
          </div>

          <div class="form-item">
            <label for="kickThreshold">踢出阈值 (USDT)</label>
            <div class="input-with-unit">
              <input 
                type="number" 
                id="kickThreshold" 
                v-model.number="formData.kickThreshold" 
                placeholder="380"
                min="1"
                step="0.01"
                required
              />
              <span class="unit">USDT</span>
            </div>
            <p class="help-text">累计抢到多少金额后自动被踢出群</p>
          </div>

          <div class="rule-preview">
            <h3>📌 规则预览</h3>
            <ul>
              <li>新成员进群需支付 <strong>{{ totalEntryFee }} USDT</strong></li>
              <li>进群后需等待 <strong>{{ formData.waitHours || 0 }} 小时</strong> 才能抢红包</li>
              <li>累计抢到 <strong>{{ formData.kickThreshold || 0 }} USDT</strong> 会被自动踢出</li>
              <li>被踢出后可重新缴费进群</li>
            </ul>
          </div>
        </section>

        <!-- 提交按钮 -->
        <div class="form-actions">
          <button 
            type="submit" 
            class="submit-btn" 
            :disabled="loading || !isFormValid"
          >
            {{ loading ? '创建中...' : '创建接龙群' }}
          </button>
          <p class="cost-notice">
            创建群将立即扣除 <strong>{{ totalEntryFee }} USDT</strong> 作为首包资金
          </p>
        </div>
      </form>
    </main>

    <!-- 成功提示弹窗 -->
    <div v-if="showSuccessModal" class="modal-overlay" @click="closeSuccessModal">
      <div class="success-modal" @click.stop>
        <div class="success-icon">✅</div>
        <h2>创建成功！</h2>
        <p>您的接龙群 "{{ createdGroup?.name }}" 已创建</p>
        <div class="success-details">
          <p>群ID: <code>{{ createdGroup?.id }}</code></p>
          <p>首包金额: {{ createdGroup?.firstRedPacketAmount }} USDT</p>
        </div>
        <div class="success-actions">
          <button class="btn-secondary" @click="goToGroups">查看我的群</button>
          <button class="btn-primary" @click="goToChat">进入群聊</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { chainGroupAPI } from '../api'
import { showToast } from '@/utils/toast'

const router = useRouter()

// 表单数据
const formData = ref({
  groupName: '',
  groupDesc: '',
  ticketAmount: 10,
  firstRedPacketAmount: 300,
  waitHours: 3,
  kickThreshold: 380
})

// 状态管理
const loading = ref(false)
const isSubmitting = ref(false) // 🚫 防止重复提交
const showSuccessModal = ref(false)
const createdGroup = ref(null)

// 计算属性
const totalEntryFee = computed(() => {
  return (formData.value.ticketAmount || 0) + (formData.value.firstRedPacketAmount || 0)
})

const platformFee = computed(() => {
  return ((formData.value.ticketAmount || 0) * 0.5).toFixed(2)
})

const isFormValid = computed(() => {
  return (
    formData.value.groupName.trim().length > 0 &&
    formData.value.ticketAmount > 0 &&
    formData.value.firstRedPacketAmount > 0 &&
    formData.value.waitHours > 0 &&
    formData.value.kickThreshold > 0
  )
})

// 返回上一页
const goBack = () => {
  router.back()
}

// 提交表单
const handleSubmit = async () => {
  // 🚫 防止重复提交
  if (isSubmitting.value) {
    showToast('正在创建中，请勿重复点击', 'warning')
    return
  }
  
  if (!isFormValid.value) {
    showToast('请填写完整信息', 'warning')
    return
  }

  // 确认创建
  const confirmMsg = `确认创建接龙群吗？\n\n将立即扣除 ${totalEntryFee.value} USDT 作为首包资金`
  if (!confirm(confirmMsg)) {
    return
  }

  loading.value = true
  isSubmitting.value = true

  try {
    const response = await chainGroupAPI.createChainGroup({
      name: formData.value.groupName.trim(),
      description: formData.value.groupDesc.trim(),
      ticketAmount: formData.value.ticketAmount,
      firstRedPacketAmount: formData.value.firstRedPacketAmount,
      waitHours: formData.value.waitHours,
      kickThreshold: formData.value.kickThreshold
    })

    console.log('✅ 创建成功:', response)
    
    // 兼容不同的响应格式
    const responseData = response.data || response
    
    // 尝试多种可能的ID路径
    let groupId = null
    if (responseData.group) {
      // 后端返回 {msg: '...', group: {...}}
      groupId = responseData.group._id || responseData.group.id || responseData.group.groupId
    } else {
      // 直接返回群对象或其他格式
      groupId = responseData.groupId || responseData.id || responseData._id
    }
    
    if (!groupId) {
      console.error('❌ 未找到群组ID，完整响应:', response)
      showToast('创建失败：服务器返回数据异常', 'error')
      return
    }
    
    // 保存创建的群信息
    createdGroup.value = {
      id: groupId,
      name: formData.value.groupName.trim(),
      firstRedPacketAmount: formData.value.firstRedPacketAmount
    }

    // 显示成功弹窗
    showSuccessModal.value = true
  } catch (error) {
    console.error('❌ 创建失败:', error)
    
    let errorMsg = '创建失败，请稍后重试'
    if (error.response?.data?.msg) {
      errorMsg = error.response.data.msg
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message
    } else if (error.message) {
      errorMsg = error.message
    }

    // 特殊处理余额不足
    if (errorMsg.includes('balance') || errorMsg.includes('余额')) {
      showToast('❌ 余额不足\n\n创建群需要 ' + totalEntryFee.value + ' USDT\n请先到钱包充值', 'error', 4000)
    } else {
      showToast('❌ ' + errorMsg, 'error')
    }
  } finally {
    loading.value = false
    isSubmitting.value = false // 🚫 释放提交锁
  }
}

// 关闭成功弹窗
const closeSuccessModal = () => {
  showSuccessModal.value = false
  createdGroup.value = null
}

// 跳转到群列表
const goToGroups = () => {
  closeSuccessModal()
  router.push('/chain-groups')
}

// 跳转到群聊
const goToChat = () => {
  if (createdGroup.value?.id) {
    closeSuccessModal()
    router.push(`/chat/${createdGroup.value.id}`)
  }
}

// 初始化默认值（可以从 Pinia 或 localStorage 读取用户偏好）
onMounted(() => {
  // 这里可以加载用户的上次配置
  const savedConfig = localStorage.getItem('chainGroupConfig')
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig)
      formData.value = { ...formData.value, ...config }
    } catch (e) {
      console.warn('读取配置失败', e)
    }
  }
})
</script>

<style scoped>
.create-chain-group-container {
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

.form-container {
  max-width: 600px;
  margin: 0 auto;
}

/* 表单区块 */
.form-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 1.1rem;
  color: #333;
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

/* 表单项 */
.form-item {
  margin-bottom: 20px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
  font-size: 0.95rem;
}

.form-item input[type="text"],
.form-item input[type="number"],
.form-item textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-item input:focus,
.form-item textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-item textarea {
  resize: vertical;
  font-family: inherit;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 0.8rem;
  color: #999;
  margin-top: 4px;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-with-unit input {
  flex: 1;
}

.input-with-unit .unit {
  font-weight: 600;
  color: #667eea;
  min-width: 50px;
}

.help-text {
  font-size: 0.85rem;
  color: #999;
  margin-top: 6px;
  line-height: 1.4;
}

.platform-fee {
  font-size: 0.85rem;
  color: #ff4757;
  margin-top: 6px;
  font-weight: 600;
}

/* 费用汇总 */
.fee-summary {
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border: 2px solid #667eea30;
  border-radius: 10px;
  padding: 16px;
  margin-top: 15px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
  margin-bottom: 8px;
}

.summary-item .highlight {
  color: #ff4757;
  font-weight: 700;
  font-size: 1.3rem;
}

.summary-note {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
}

/* 规则预览 */
.rule-preview {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  border-radius: 8px;
  padding: 16px;
  margin-top: 15px;
}

.rule-preview h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #333;
}

.rule-preview ul {
  margin: 0;
  padding-left: 20px;
}

.rule-preview li {
  margin: 8px 0;
  font-size: 0.9rem;
  color: #555;
  line-height: 1.5;
}

.rule-preview strong {
  color: #667eea;
}

/* 表单操作区 */
.form-actions {
  margin-top: 30px;
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cost-notice {
  margin-top: 12px;
  font-size: 0.9rem;
  color: #666;
}

.cost-notice strong {
  color: #ff4757;
}

/* 成功弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.success-modal {
  background: white;
  border-radius: 16px;
  padding: 40px 30px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.success-modal h2 {
  color: #333;
  margin: 0 0 10px 0;
  font-size: 1.5rem;
}

.success-modal p {
  color: #666;
  margin: 0 0 20px 0;
}

.success-details {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 25px;
  text-align: left;
}

.success-details p {
  margin: 8px 0;
  font-size: 0.9rem;
  color: #555;
}

.success-details code {
  background: #e0e0e0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
  word-break: break-all;
}

.success-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>
