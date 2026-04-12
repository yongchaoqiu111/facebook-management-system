<template>
  <div class="payment-modal-overlay" @click="handleOverlayClick">
    <div class="payment-modal" @click.stop>
      <div class="modal-header">
        <h3>重新进群缴费</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <p>群组ID: {{ groupId }}</p>
        <div class="payment-amount">
          <span class="label">缴费金额:</span>
          <span class="amount">¥99.00</span>
        </div>
        <p class="payment-note">缴费后即可重新加入群组继续参与接龙</p>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" @click="$emit('close')">取消</button>
        <button class="confirm-btn" @click="handlePayment">确认缴费</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaymentModal',
  props: {
    groupId: {
      type: String,
      required: true
    }
  },
  emits: ['close'],
  methods: {
    handleOverlayClick() {
      this.$emit('close')
    },
    handlePayment() {
      alert('缴费成功！')
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.payment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.payment-modal {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
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

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin: 10px 0;
  color: #666;
}

.payment-amount {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0;
}

.payment-amount .label {
  font-size: 16px;
  color: #666;
}

.payment-amount .amount {
  font-size: 28px;
  font-weight: bold;
  color: #ff6b6b;
}

.payment-note {
  font-size: 14px;
  color: #999;
  text-align: center;
  margin-top: 20px;
}

.modal-footer {
  display: flex;
  padding: 20px;
  border-top: 1px solid #eee;
  gap: 10px;
}

.cancel-btn {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  color: #666;
}

.confirm-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background-color: #ff6b6b;
  color: white;
  cursor: pointer;
  font-weight: bold;
}
</style>