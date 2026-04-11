<template>
  <div class="chain-group">
    <h1>接龙群</h1>
    <div class="group-info">
      <p>群组ID: {{ groupId }}</p>
      <p>累计领取: {{ totalAmount }}</p>
      <p>用户状态: {{ userStatus }}</p>
    </div>
    
    <RedPacketCard 
      :groupId="groupId"
      :userStatus="userStatus"
      :totalAmount="totalAmount"
      @show-payment="handleShowPayment"
    />
    
    <PaymentModal 
      v-if="showPayment"
      :groupId="groupId"
      @close="showPayment = false"
    />
  </div>
</template>

<script>
import RedPacketCard from '../components/RedPacketCard.vue'
import PaymentModal from '../components/PaymentModal.vue'
import { initSocket } from '../socket.js'

export default {
  name: 'ChainGroup',
  components: {
    RedPacketCard,
    PaymentModal
  },
  data() {
    return {
      groupId: 'group123',
      userStatus: 'kicked',
      totalAmount: 400,
      showPayment: false
    }
  },
  mounted() {
    this.initSocketConnection()
  },
  methods: {
    initSocketConnection() {
      const socket = initSocket()
      socket.on('chainGroupKicked', (data) => {
        console.log('收到踢出事件:', data)
        this.userStatus = 'kicked'
        console.log('用户状态:', this.userStatus)
      })
    },
    handleShowPayment() {
      this.showPayment = true
      console.log('是否显示缴费卡片:', this.showPayment)
    }
  }
}
</script>

<style scoped>
.chain-group {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
  color: #333;
  margin-bottom: 20px;
  font-size: 24px;
}

.group-info {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.group-info p {
  margin: 8px 0;
  color: #666;
}
</style>