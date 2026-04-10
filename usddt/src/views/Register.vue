<template>
  <div class="register-container">
    <div class="register-box">
      <h2>新华通讯</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">用户名</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            placeholder="请输入用户名" 
            required
            :disabled="loading"
          >
        </div>
        <div class="form-group">
          <label for="phone">手机号</label>
          <input 
            type="tel" 
            id="phone" 
            v-model="phone" 
            placeholder="请输入手机号" 
            required
            :disabled="loading"
          >
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="请输入密码（至少6位）" 
            required
            :disabled="loading"
          >
        </div>
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="confirmPassword" 
            placeholder="请再次输入密码" 
            required
            :disabled="loading"
          >
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
        <button type="submit" class="register-btn" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
        <div class="auth-links">
          <span>已有账号？</span>
          <a href="#" @click.prevent="goToLogin">立即登录</a>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { userAPI } from '../api'

const router = useRouter()
const username = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

const handleRegister = async () => {
  // 表单验证
  if (!username.value.trim()) {
    error.value = '请输入用户名'
    return
  }
  
  if (!phone.value.trim()) {
    error.value = '请输入手机号'
    return
  }
  
  // 手机号格式验证（中国大陆手机号）
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(phone.value.trim())) {
    error.value = '手机号格式不正确'
    return
  }
  
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  
  if (password.value.length < 6) {
    error.value = '密码长度至少6位'
    return
  }
  
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await userAPI.register({
      username: username.value.trim(),
      phone: phone.value.trim(),
      password: password.value
    })
    
    if (response) {
      console.log('✅ 注册成功，用户数据:', response.user)
      
      // ✅ 新标准：确保 userId 是纯数字字符串
      const userId = response.user.userId || response.user.id || response.user._id
      console.log('💾 提取的 userId:', userId, '类型:', typeof userId)
      
      // 转换为字符串（确保是纯数字字符串）
      const userIdStr = String(userId)
      console.log('💾 转换后的 userId:', userIdStr)
      
      // 保存用户信息
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      localStorage.setItem('userId', userIdStr)  // ✅ 保存纯数字字符串
      
      console.log('✅ localStorage userId:', localStorage.getItem('userId'))
      
      alert('注册成功！')
      router.push('/home')
    } else {
      error.value = '注册失败'
    }
  } catch (err) {
    console.error('注册错误:', err)
    // 显示具体的错误信息
    if (err.response) {
      // 正确读取后端返回的错误信息
      const errorMessage = err.response.data.error?.message || err.response.data.msg || err.response.data.message || '注册失败，请稍后重试'
      error.value = errorMessage
      alert(errorMessage)
    } else {
      error.value = '网络错误，请检查网络连接'
      alert('网络错误，请检查网络连接')
    }
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-box {
  background: white;
  border-radius: 20px;
  padding: 40px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.register-box h2 {
  color: #667eea;
  text-align: center;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
}

.form-group input:focus {
  border-color: #667eea;
  outline: none;
}

.error-message {
  background: #ffe8e8;
  color: #f44336;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.register-btn {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.register-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.register-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.auth-links {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  font-size: 0.9rem;
  color: #666;
}

.auth-links a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.auth-links a:hover {
  text-decoration: underline;
}
</style>
