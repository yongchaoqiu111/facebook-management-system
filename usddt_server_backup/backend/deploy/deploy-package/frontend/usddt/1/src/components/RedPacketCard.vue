<template>
  <div class="red-packet-card" @click="handleRedPacketClick">
    <div class="red-packet-header">
      <h3>红包</h3>
      <span class="amount">{{ totalAmount }}</span>
    </div>
    <div class="red-packet-body">
      <p>点击领取红包</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RedPacketCard',
  props: {
    groupId: {
      type: String,
      required: true
    },
    userStatus: {
      type: String,
      required: true
    },
    totalAmount: {
      type: Number,
      default: 0
    }
  },
  emits: ['show-payment'],
  methods: {
    handleRedPacketClick() {
      console.log('用户状态:', this.userStatus)
      
      if (this.userStatus === 'kicked') {
        this.showToast('你已经被踢出群组')
        this.$emit('show-payment')
        console.log('是否显示缴费卡片:', true)
        return
      }
      
      console.log('正常领取红包')
      this.showToast('领取成功')
    },
    showToast(message) {
      alert(message)
    }
  }
}
</script>

<style scoped>
.red-packet-card {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-radius: 12px;
  padding: 20px;
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
}

.red-packet-card:hover {
  transform: translateY(-2px);
}

.red-packet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.red-packet-header h3 {
  font-size: 20px;
  margin: 0;
}

.amount {
  font-size: 24px;
  font-weight: bold;
}

.red-packet-body {
  text-align: center;
}

.red-packet-body p {
  margin: 0;
  font-size: 16px;
}
</style>