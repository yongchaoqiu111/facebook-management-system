import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { chainGroupAPI } from '@/api'
import { redPacketAPI } from '@/api'
import { joinGroup, leaveGroup, sendGroupMessage } from '@/socket'
import { getSocket } from '@/socket'
import { useMessageCenter } from '@/composables/useMessageCenter'
import { isRedPacketOpened, markRedPacketOpened } from '@/utils/storage'

/**
 * 接龙群聊天逻辑 Composable
 */
export function useChainGroupChat(chatId, toastRef = null) {
  const router = useRouter()
  
  // 使用消息中心
  const { 
    getMessages, 
    sendMessage: sendMsg, 
    loadHistory,
    initSocketListeners,
    userBalance,  // ✅ 导入 userBalance
    onMyRedPacketResult,  // ✅ 导入红包领取结果回调
    onGroupInfo,  // ✅ 导入群组信息广播回调
    onMemberTotalReceivedUpdated,  // ✅ 导入成员累计领取更新回调
    onMemberKicked  // ✅ 导入成员被踢出回调
  } = useMessageCenter()
  
  // 状态
  const currentContact = ref(null)
  const chainGroupInfo = ref(null)
  const messageInput = ref('')
  const showInviteModal = ref(false)
  const showInfoModal = ref(false)
  const showRedPacketModalVisible = ref(false)
  const showRedPacketResultModal = ref(false)
  const redPacketResult = ref({
    amount: 0,
    message: '',
    from: '',
    totalReceived: null
  })
  const chainWaitCountdown = ref('')
  const messagesContainer = ref(null)
  
  const currentUserId = computed(() => localStorage.getItem('userId'))
  
  // 从消息中心获取消息（computed）
  const messages = computed(() => {
    return getMessages(`group_${chatId}`)
  })

  // 显示提示的辅助函数
  const showToast = (msg, type = 'info') => {
    if (toastRef && toastRef.value) {
      toastRef.value[type](msg)
    } else {
      console.log(`[${type.toUpperCase()}] ${msg}`)
    }
  }

  // 返回
  const goBack = () => {
    router.push('/home')
  }

  // 分享群组
  const shareGroup = async () => {
    try {
      if (!chainGroupInfo.value) {
        showToast('当前不是接龙群', 'warning')
        return
      }
      
      const groupName = currentContact.value?.name || '接龙群'
      const groupId = currentContact.value?.id
      
      const inviteLink = `${window.location.origin}/invite?group=${groupId}`
      
      if (navigator.share) {
        await navigator.share({
          title: `加入${groupName}`,
          text: `邀请你加入${groupName}，一起参与接龙红包游戏！`,
          url: inviteLink
        })
      } else {
        await navigator.clipboard.writeText(inviteLink)
        showToast('邀请链接已复制到剪贴板', 'success')
      }
    } catch (error) {
      console.error('分享失败:', error)
      showToast('分享失败，请重试', 'error')
    }
  }

  // 加载接龙群信息
  const loadChainGroupInfo = async (groupId) => {
    try {
      const response = await chainGroupAPI.getChainInfo(groupId)
      if (response && response.data) {
        chainGroupInfo.value = response.data
      }
    } catch (error) {
      console.error('加载接龙群信息失败:', error)
    }
  }

  // 加载聊天记录
  const loadChatHistory = async () => {
    // ✅ 使用消息中心的 loadHistory
    await loadHistory(`group_${chatId}`)
    console.log('历史消息加载完成')
  }

  // 发送消息
  const sendMessage = async () => {
    console.log('📤 [sendMessage] 触发发送消息')
    console.log('📤 [sendMessage] messageInput:', messageInput.value)
    console.log('📤 [sendMessage] chatId:', chatId)
    
    if (!messageInput.value.trim()) {
      console.log('⚠️ [sendMessage] 消息为空，不发送')
      return
    }
    
    try {
      // ✅ 新标准：通过 WebSocket 发送消息（msgType=1）
      const socket = getSocket()
      socket.emit('chat:message', {
        msgType: 1,  // 聊天消息
        senderId: localStorage.getItem('userId'),
        groupId: chatId,
        content: {
          type: 'text',
          text: messageInput.value.trim()
        }
      })
      
      console.log('✅ 消息已通过 WSS 发送，等待广播...')
      
      // 清空输入框
      messageInput.value = ''
      
    } catch (error) {
      console.error('❌ [sendMessage] 发送消息失败:', error)
      showToast('发送失败，请重试', 'error')
    }
  }

  // 打开红包
  const openRedPacket = async (message) => {
    console.log('🔴 点击红包:', message)
    
    try {
      // 🚫 不能抢自己的红包
      if (message.isSelf) {
        showToast('不能领取自己的红包', 'warning')
        return
      }
      
      // 🐉 检查是否已过期
      if (message.expired) {
        showToast('该红包已过期，无法领取', 'warning')
        return
      }
      
      if (message.opened) {
        // 显示红包账单
        showRedPacketBill(message)
        return
      }
      
      console.log('📦 准备打开红包:', message.redPacketId)
      
      // 创建红包封面弹窗（带“开”按钮）
      const redPacketCoverModal = document.createElement('div')
      redPacketCoverModal.className = 'red-packet-modal'
      
      // 添加微信红包封面样式
      redPacketCoverModal.innerHTML = `
        <div class="red-packet-modal-content">
          <div class="red-packet-cover">
            <div class="red-packet-cover-header">
              <span class="red-packet-icon">🧧</span>
            </div>
            <div class="red-packet-cover-title">${message.message || '恭喜发财，大吉大利'}</div>
            <div class="red-packet-open-btn" id="openRedPacketBtn">开</div>
          </div>
        </div>
      `
      
      // 添加到body
      document.body.appendChild(redPacketCoverModal)
      
      // 触发动画
      setTimeout(() => {
        redPacketCoverModal.classList.add('show')
      }, 10)
      
      // 绑定点击外部关闭
      redPacketCoverModal.addEventListener('click', (e) => {
        if (e.target === redPacketCoverModal) {
          redPacketCoverModal.classList.remove('show')
          setTimeout(() => {
            document.body.removeChild(redPacketCoverModal)
          }, 300)
        }
      })
      
      // 绑定“开”按钮点击事件
      setTimeout(() => {
        const openBtn = document.getElementById('openRedPacketBtn')
        if (openBtn) {
          openBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
                
            // 🐉 如果是接龙群，首先检查等待期
            if (chainGroupInfo.value && chainGroupInfo.value.memberInfo) {
              const canGrabAfter = new Date(chainGroupInfo.value.memberInfo.canGrabAfter)
              const now = new Date()
                  
              if (now < canGrabAfter) {
                const waitMinutes = Math.ceil((canGrabAfter - now) / 60000)
                showToast(`还需等待 ${waitMinutes} 分钟才能抢红包`, 'warning')
                redPacketCoverModal.classList.remove('show')
                setTimeout(() => {
                  document.body.removeChild(redPacketCoverModal)
                }, 300)
                return
              }
            }
                
            // ✅ 检查是否已领取
            if (message.redPacketId && message.redPacketId.startsWith('mock_')) {
              showToast('这是一个测试红包，无法在后端领取。', 'info')
              redPacketCoverModal.classList.remove('show')
              setTimeout(() => {
                document.body.removeChild(redPacketCoverModal)
              }, 300)
              return
            }
                          
            if (isRedPacketOpened(message.redPacketId)) {
              showToast('你已经领取过这个红包了！', 'warning')
              redPacketCoverModal.classList.remove('show')
              setTimeout(() => {
                document.body.removeChild(redPacketCoverModal)
              }, 300)
              return
            }
                              
            try {
              // 🐉 检查是否有红包ID
              if (!message.redPacketId) {
                console.error('❌ 红包缺少 redPacketId:', message)
                showToast('红包数据异常，请重试', 'error')
                redPacketCoverModal.classList.remove('show')
                setTimeout(() => {
                  if (redPacketCoverModal.parentNode) {
                    document.body.removeChild(redPacketCoverModal)
                  }
                }, 300)
                return
              }
              
              // ✅ 新标准：通过 WebSocket 领取红包
              console.log('🧧 正在尝试抢红包，ID:', message.redPacketId, 'Group:', chatId)
              const socket = getSocket()
              socket.emit('chat:redPacketOpen', {
                redPacketId: message.redPacketId,
                userId: localStorage.getItem('userId'),
                groupId: chatId  // ✅ 必须携带 groupId 供后端校验成员资格
              })
              
              console.log('⏳ 等待 WebSocket 事件...')
              
              // 关闭红包封面弹窗
              redPacketCoverModal.classList.remove('show')
              setTimeout(() => {
                if (redPacketCoverModal.parentNode) {
                  document.body.removeChild(redPacketCoverModal)
                }
              }, 300)
              
              return  // 等待 WebSocket 事件处理
              
            } catch (error) {
              console.error('❌ 抢红包失败:', error)
              showToast(error.response?.data?.message || '抢红包失败，请重试', 'error')
                            
              // 关闭弹窗
              redPacketCoverModal.classList.remove('show')
              setTimeout(() => {
                if (redPacketCoverModal.parentNode) {
                  document.body.removeChild(redPacketCoverModal)
                }
              }, 300)
            }
          })
        }
      }, 100)
      
    } catch (error) {
      console.error('打开红包失败:', error)
      showToast('打开红包失败，请重试', 'error')
    }
  }

  // 显示红包账单
  const showRedPacketBill = async (message) => {
    console.log('📊 显示红包账单:', message)
    console.log('🔍 [调试] message.claimRecords:', message.claimRecords)
    console.log('🔍 [调试] message.redPacketId:', message.redPacketId)
    
    // ✅ 如果 claimRecords 为空，调用接口获取
    let claimRecords = message.claimRecords
    if (!claimRecords || claimRecords.length === 0) {
      try {
        console.log('🔍 从后端获取红包领取记录...')
        const response = await redPacketAPI.getRedPacketDetail(message.redPacketId)
        console.log('📦 红包详情响应:', response)
        
        // 兼容不同的响应格式
        const detailData = response?.data?.data || response?.data || response
        if (detailData && detailData.claims) {
          claimRecords = detailData.claims.map(claim => ({
            userId: claim.userId,
            username: claim.username || '用户' + String(claim.userId).substr(-4),
            amount: claim.amount,
            time: new Date(claim.claimedAt || claim.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          }))
          console.log('✅ 获取到领取记录:', claimRecords)
        }
      } catch (error) {
        console.error('❌ 获取红包详情失败:', error)
      }
    }
    
    // 获取当前用户名
    const userData = localStorage.getItem('user')
    const currentUsername = userData ? JSON.parse(userData).username || '用户' : '用户'
    
    // 构建账单HTML
    let billHtml = `
      <div class="red-packet-bill">
        <div class="red-packet-bill-header">
          <span class="red-packet-icon">💰</span>
          <span class="red-packet-title">红包账单</span>
        </div>
        <div class="red-packet-bill-info">
          <div class="red-packet-bill-item">
            <span>${message.isSelf ? '你发出的红包' : currentUsername + '发出的红包'}</span>
          </div>
          <div class="red-packet-bill-item">
            <span>${message.message || '恭喜发财，大吉大利'}</span>
          </div>
          <div class="red-packet-bill-item">
            <span>总金额:</span>
            <span>¥${message.amount || 300}</span>
          </div>
          <div class="red-packet-bill-item">
            <span>红包个数:</span>
            <span>${message.count || 30}个</span>
          </div>
        </div>
        <div class="red-packet-bill-summary">
          <span>已领取${claimRecords ? claimRecords.length : 0}/${message.count || 30}个，共¥${message.amount || 300}</span>
        </div>
        <div class="red-packet-bill-list">
          <div class="red-packet-bill-list-title">领取记录</div>
    `
    
    // ✅ 使用真实领取记录
    if (claimRecords && claimRecords.length > 0) {
      claimRecords.forEach(record => {
        billHtml += `
          <div class="red-packet-bill-list-item">
            <div class="red-packet-bill-user-info">
              <span class="red-packet-bill-user">${record.username}</span>
              <span class="red-packet-bill-time">${record.time}</span>
            </div>
            <span class="red-packet-bill-amount">¥${record.amount}</span>
          </div>
        `
      })
    } else {
      // 暂无记录
      billHtml += `
        <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.6);">
          暂无领取记录
        </div>
      `
    }
    
    billHtml += `
        </div>
      </div>
    `
    
    // 创建账单弹窗
    const redPacketBillModal = document.createElement('div')
    redPacketBillModal.className = 'red-packet-modal'
    redPacketBillModal.innerHTML = `
      <div class="red-packet-modal-content">
        ${billHtml}
      </div>
    `
    
    document.body.appendChild(redPacketBillModal)
    
    setTimeout(() => {
      redPacketBillModal.classList.add('show')
    }, 10)
    
    // 绑定点击外部关闭
    redPacketBillModal.addEventListener('click', (e) => {
      if (e.target === redPacketBillModal) {
        redPacketBillModal.classList.remove('show')
        setTimeout(() => {
          document.body.removeChild(redPacketBillModal)
        }, 300)
      }
    })
  }

  // 处理发送红包
  const handleSendRedPacket = async (redPacketData) => {
    try {
      console.log('🧧 发送接龙红包:', redPacketData)
      
      // ✅ 从群组配置中读取固定金额和数量
      const perAmount = chainGroupInfo.value?.settings?.chainRedPacketPerAmount || 10
      const count = chainGroupInfo.value?.settings?.chainRedPacketCount || 30
      
      console.log('💰 红包配置:', { perAmount, count, source: '群组配置' })
      
      // ✅ 新标准：通过 WebSocket 发送红包（msgType=2）
      const socket = getSocket()
      socket.emit('chat:message', {
        msgType: 2,  // 红包消息
        senderId: localStorage.getItem('userId'),
        groupId: chatId,
        content: {
          type: 'chainRedpacket',  // 接龙红包类型
          message: redPacketData.message || '恭喜发财 大吉大利'
          // 注意：perAmount、count、redPacketId 由后端从群组配置中读取并生成
        }
      })
      
      console.log('✅ 红包消息已通过 WSS 发送')
      
      // 显示成功弹窗（WebSocket 发送没有返回值，显示固定金额）
      const totalAmount = perAmount * count
      const successModal = document.createElement('div')
      successModal.className = 'red-packet-success-modal'
      successModal.innerHTML = `
        <div class="success-content">
          <div class="success-icon">✅</div>
          <div class="success-title">红包发送成功！</div>
          <div class="success-amount">总金额：${totalAmount} USDT</div>
          <div class="success-count">数量：${count} 个（每个 ${perAmount} USDT）</div>
          <button class="success-btn" id="closeSuccessModal">确定</button>
        </div>
      `
      
      document.body.appendChild(successModal)
      
      setTimeout(() => {
        successModal.classList.add('show')
      }, 10)
      
      // 绑定关闭按钮
      setTimeout(() => {
        const closeBtn = document.getElementById('closeSuccessModal')
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            successModal.classList.remove('show')
            setTimeout(() => {
              if (successModal.parentNode) {
                document.body.removeChild(successModal)
              }
            }, 300)
          })
        }
      }, 100)
      
      // 注意：红包消息会通过 Socket 推送自动添加到消息列表
      // 不需要手动添加
      
    } catch (error) {
      console.error('❌ 发送红包失败:', error)
      // 返回错误信息，由调用者显示提示
      throw error
    }
  }

  // 清理（离开聊天页面时调用）
  const cleanup = () => {
    // 🐉 注意：不调用 leaveGroup()，保持全局 Socket 连接
    // 这样即使离开聊天页面，也能收到群广播（红包、接龙进度等）
    // 重新进入时会自动加载最新状态
    console.log('🔌 清理聊天页面，但保持 Socket 连接')
    
    // ✅ 调试：检查 Socket 状态
    const socket = getSocket()
    if (socket) {
      console.log('✅ Socket 仍然连接，ID:', socket.id)
      console.log('✅ Socket connected:', socket.connected)
    } else {
      console.error('❌ Socket 未初始化！')
    }
  }

  // 加载聊天数据
  const init = async () => {
    console.log('🚀 [init] 开始初始化接龙群页面, chatId:', chatId)
    
    // ✅ 从 SessionStorage 读取进群时保存的数据
    const justJoinedData = sessionStorage.getItem('justJoinedChainGroup')
    console.log('📦 [init] SessionStorage 中的数据:', justJoinedData ? '存在' : '不存在')
    
    if (justJoinedData) {
      try {
        const data = JSON.parse(justJoinedData)
        console.log('📥 [init] 从 SessionStorage 读取进群数据:', data)
        
        // 设置接龙群信息
        if (data.groupInfo) {
          console.log('✅ [init] 设置 chainGroupInfo:', data.groupInfo)
          chainGroupInfo.value = data.groupInfo
        } else {
          console.warn('⚠️ [init] SessionStorage 中没有 groupInfo')
        }
        
        // 清除 SessionStorage（只读一次）
        sessionStorage.removeItem('justJoinedChainGroup')
      } catch (error) {
        console.error('解析 SessionStorage 数据失败:', error)
      }
    }
    
    // 初始化联系人
    currentContact.value = {
      id: chatId,
      name: '接龙群',
      avatar: '🐉',
      isGroup: true
    }
    
    // ✅ 加入群组 Socket 房间（确保能收到群消息和红包广播）
    console.log('🔑 尝试加入群组 Socket 房间:', chatId)
    joinGroup(chatId)
    console.log('✅ joinGroup 已调用')
    
    // ❌ 不再调用 getChainInfo API（后端接口不存在，会超时）
    // await loadChainGroupInfo(chatId)
    
    // 加载聊天记录
    await loadChatHistory()
    
    // ✅ 初始化消息中心（全局只调用一次，包含 Socket 监听）
    initSocketListeners()
    
    // ✅ 注册群组列表更新回调（后端推送）
    const unsubscribeGroupInfo = onGroupInfo((data) => {
      console.log('📋 [useChainGroupChat] 收到群组列表更新:', data)
      
      // 从 groups 数组中找到当前群组
      if (data.groups && Array.isArray(data.groups)) {
        const currentGroup = data.groups.find(g => g._id === chatId || g.id === chatId)
        
        if (currentGroup) {
          console.log('✅ 找到当前群组信息:', currentGroup)
          
          // 转换为 chainGroupInfo 格式
          chainGroupInfo.value = {
            id: currentGroup._id || currentGroup.id,
            name: currentGroup.name,
            avatar: currentGroup.avatar,
            description: currentGroup.description,
            memberCount: currentGroup.memberCount,
            kickThreshold: currentGroup.settings?.kickThreshold || 380,  // ✅ 从 settings 中获取踢出阈值
            settings: currentGroup.settings || {},
            memberInfo: {
              totalReceived: currentGroup.memberInfo?.totalReceived || 0,  // ✅ 使用后端返回的累计领取金额
              canGrabAfter: new Date()  // 初始值，后端应该返回
            }
          }
          
          console.log('✅ 更新 chainGroupInfo:', chainGroupInfo.value)
        } else {
          // ⚠️ 未在群组列表中找到当前群组，说明被踢出了
          console.warn('⚠️ 被踢出群组:', chatId)
          
          // ✅ 触发自定义事件，由组件层处理跳转
          window.dispatchEvent(new CustomEvent('kickedFromGroup', { 
            detail: { groupId: chatId } 
          }))
        }
      }
    })
    
    // 保存取消订阅函数
    window._unsubscribeGroupInfo = unsubscribeGroupInfo
    
    // ✅ 注册红包领取结果回调（WebSocket 事件）
    const unsubscribe = onMyRedPacketResult(async (data) => {
      console.log('🎉 [useChainGroupChat] 收到红包领取结果:', data)
      
      // 标记红包已领取
      if (data.redPacketId) {
        markRedPacketOpened(data.redPacketId)
        
        // ✅ 更新消息列表中的红包状态（变色）
        // ⚠️ 接龙红包不应该在这里变色，等待 chainRedPacketProgress (status='completed') 时才变色
        const messagesList = getMessages(`group_${chatId}`)
        const targetMsg = messagesList.find(m => m.redPacketId === data.redPacketId)
        if (targetMsg) {
          // ✅ 接龙红包：不立即变色，只记录领取结果
          console.log('⏭️ [useChainGroupChat] 跳过接龙红包变色，等待接龙完成')
          
          // ✅ 保存到 LocalStorage（不修改 opened 状态）
          const { saveChatHistory } = await import('@/utils/storage')
          saveChatHistory(chatId, messagesList)
        }
      }
      
      // 更新累计领取金额（后端计算，前端只展示）
      if (chainGroupInfo.value) {
        if (!chainGroupInfo.value.memberInfo) {
          chainGroupInfo.value.memberInfo = {}
        }
        
        if (data.totalReceived !== undefined && data.totalReceived !== null) {
          chainGroupInfo.value.memberInfo.totalReceived = Number(data.totalReceived)
          console.log('📊 更新累计领取金额（WebSocket）:', data.totalReceived)
        }
        
        // 强制触发 Vue 响应式更新
        chainGroupInfo.value = { ...chainGroupInfo.value }
      }
      
      // 显示领取结果弹窗
      showRedPacketResultModal.value = true
      redPacketResult.value = {
        amount: data.amount || 0,
        message: '恭喜发财，大吉大利',
        from: '好友',
        totalReceived: data.totalReceived || null
      }
      
      // 如果被踢出群组
      if (data.wasKicked) {
        console.log('⚠️ 用户被踢出，立即更新缓存')
        const cacheKey = `joined_${currentUserId.value}_${chatId}`
        localStorage.setItem(cacheKey, '0')  // 设置为 0 表示未加入
        
        setTimeout(() => {
          showToast(`你已被移出群组\n原因：${data.kickReason || '达到领取上限'}`, 'error')
          goBack()
        }, 500)
      }
    })
    
    // 保存取消订阅函数（cleanup 时调用）
    window._unsubscribeRedPacketResult = unsubscribe
    
    // ✅ 监听成员累计领取更新（后端广播）
    const unsubscribeTotalReceived = onMemberTotalReceivedUpdated((data) => {
      console.log('💰 [useChainGroupChat] 收到累计领取更新:', data)
      console.log('🔍 [调试] chainGroupInfo.value:', chainGroupInfo.value)
      console.log('🔍 [调试] localStorage userId:', localStorage.getItem('userId'))
      console.log('🔍 [调试] data.userId:', data.userId)
      
      // 只处理当前用户的更新
      const currentUserId = localStorage.getItem('userId')
      if (data.userId === currentUserId) {
        console.log('✅ userId 匹配，开始更新')
        
        // ✅ 如果 chainGroupInfo 还没初始化，先初始化
        if (!chainGroupInfo.value) {
          console.log('⚠️ chainGroupInfo 未初始化，创建默认对象')
          chainGroupInfo.value = {
            id: chatId,
            name: '接龙群',
            avatar: '🐉',
            kickThreshold: 380,
            memberInfo: {
              totalReceived: 0
            }
          }
        }
        
        if (!chainGroupInfo.value.memberInfo) {
          chainGroupInfo.value.memberInfo = {}
        }
        
        chainGroupInfo.value.memberInfo.totalReceived = Number(data.totalReceived)
        // 强制触发响应式更新
        chainGroupInfo.value = { ...chainGroupInfo.value }
        console.log('📊 更新累计领取金额（广播）:', data.totalReceived)
        console.log('📊 [调试] 更新后 chainGroupInfo.value:', chainGroupInfo.value)
      } else {
        console.warn('⚠️ userId 不匹配，未执行更新')
        console.warn('⚠️ data.userId:', data.userId, 'currentUserId:', currentUserId)
      }
    })
    
    window._unsubscribeTotalReceived = unsubscribeTotalReceived
    
    // ✅ 监听成员被踢出（后端广播）
    const unsubscribeKicked = onMemberKicked((data) => {
      console.log('👢 [useChainGroupChat] 收到踢出通知:', data)
      
      // 判断是否是自己被踢
      const currentUserId = localStorage.getItem('userId')
      console.log('🔍 [调试] data.userId:', data.userId, 'currentUserId:', currentUserId)
      console.log('🔍 [调试] 是否匹配:', String(data.userId) === String(currentUserId))
      
      if (String(data.userId) === String(currentUserId)) {
        console.log('✅ 自己被踢出，显示提示并返回')
        
        // ✅ 防止重复提示（检查是否已经显示过）
        if (!window._kickedToastShown) {
          window._kickedToastShown = true
          
          // ✅ 清除群组成员缓存，防止再次进入
          const currentUserId = localStorage.getItem('userId')
          const cacheKey = `joined_${currentUserId}_${chatId}`
          localStorage.setItem(cacheKey, '0')
          console.log('🔄 已更新群组成员状态:', cacheKey, '= 0')
          
          showToast(`你已被移出群组\n原因：${data.reason || '达到领取上限'}`, 'error')
          setTimeout(() => {
            console.log('⏰ 1.5秒后执行 goBack()')
            window._kickedToastShown = false
            goBack()
          }, 1500)
        } else {
          console.warn('⚠️ 已显示过提示，跳过')
        }
      } else {
        console.warn('⚠️ userId 不匹配，不是自己被踢出')
      }
    })
    
    window._unsubscribeKicked = unsubscribeKicked
  }
  
  // ✅ 组件卸载时清理监听器（必须在 setup 顶层调用）
  onUnmounted(() => {
    console.log('🧹 [useChainGroupChat] 组件卸载，清理监听器')
    
    if (window._unsubscribeTotalReceived) {
      window._unsubscribeTotalReceived()
      delete window._unsubscribeTotalReceived
    }
    
    if (window._unsubscribeKicked) {
      window._unsubscribeKicked()
      delete window._unsubscribeKicked
    }
    
    if (window._unsubscribeRedPacketResult) {
      window._unsubscribeRedPacketResult()
      delete window._unsubscribeRedPacketResult
    }
  })

  return {
    currentContact,
    chainGroupInfo,
    messages,
    messageInput,
    showInviteModal,
    showInfoModal,
    showRedPacketModalVisible,
    showRedPacketResultModal,
    redPacketResult,
    chainWaitCountdown,
    goBack,
    shareGroup,
    openRedPacket,
    sendMessage,
    handleSendRedPacket,
    init,
    cleanup
  }
}
