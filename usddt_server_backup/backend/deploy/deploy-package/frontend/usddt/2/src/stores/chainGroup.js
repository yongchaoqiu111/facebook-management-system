import { defineStore } from 'pinia'

export const useChainGroupStore = defineStore('chainGroup', {
  state: () => ({
    groupInfo: null,
    myTotalReceived: 0,
    kickThreshold: 380,
    currentUserId: 'user_123' // 模拟当前用户ID
  }),
  
  getters: {
    isKickThresholdReached: (state) => {
      return state.myTotalReceived >= state.kickThreshold
    }
  },
  
  actions: {
    setGroupInfo(info) {
      this.groupInfo = info
      // 从群组信息中提取当前用户的累计领取金额
      if (info?.members) {
        const member = info.members.find(m => m.userId === this.currentUserId)
        this.myTotalReceived = member?.totalReceived || 0
        console.log('累计领取已更新:', this.myTotalReceived)
      }
    },
    
    updateMyTotalReceived(amount) {
      this.myTotalReceived += amount
      console.log('累计领取已更新:', this.myTotalReceived)
    },
    
    resetTotalReceived() {
      this.myTotalReceived = 0
    }
  }
})