<template>
  <div class="login-container">
    <div class="login-box">
      <h2>新华通讯</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">用户名/手机号</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            placeholder="请输入用户名或手机号" 
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
            placeholder="请输入密码" 
            required
            :disabled="loading"
          >
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <div class="auth-links">
          <a href="#" @click.prevent="showRegister">注册账号</a>
          <a href="#">忘记密码</a>
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
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入账号和密码'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await userAPI.login({
      username: username.value.trim(),
      password: password.value
    })
    
    if (response) {
      console.log('✅ 登录成功，用户数据:', response.user)
      
      // ✅ 新标准：确保 userId 是纯数字字符串
      const userId = response.user.userId || response.user.id || response.user._id
      console.log('💾 提取的 userId:', userId, '类型:', typeof userId)
      
      // 转换为字符串（确保是纯数字字符串）
      const userIdStr = String(userId)
      console.log('💾 转换后的 userId:', userIdStr)
      
      // 设置token和过期时间（24小时）
      const now = new Date()
      const expiresAt = now.getTime() + 24 * 60 * 60 * 1000
      
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      localStorage.setItem('userId', userIdStr)  // ✅ 保存纯数字字符串
      localStorage.setItem('tokenExpiresAt', expiresAt.toString())
      
      console.log('✅ localStorage userId:', localStorage.getItem('userId'))
      
      router.push('/home')
    } else {
      error.value = '用户名或密码错误'
    }
  } catch (err) {
    console.error('登录错误:', err)
    // 显示具体的错误信息
    if (err.response) {
      const errorMessage = err.response.data.msg || err.response.data.message || '登录失败，请稍后重试'
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

const showRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  background: white;
  border-radius: 20px;
  padding: 40px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.login-box h2 {
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
}

.login-btn {
  width: 100%;
  padding: 15px;
  background: #667eea;
  color: white;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.login-btn:hover {
  background: #5a6fd8;
}

.auth-links {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  font-size: 0.9rem;
  color: #666;
}

.auth-links a {
  color: #667eea;
  text-decoration: none;
}

.error-message {
  background: #ffe8e8;
  color: #f44336;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
}
</style>
