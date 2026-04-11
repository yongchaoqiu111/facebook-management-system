import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import { getSocket } from './socket'

// 导入页面组件
import Login from './views/Login.vue'
import Register from './views/Register.vue'
import Home from './views/Home.vue'
import Contacts from './views/Contacts.vue'
import Profile from './views/Profile.vue'
import Wallet from './views/Wallet.vue'
import PrivateChat from './views/PrivateChat/index.vue' // 📱 私聊（轻量）
import LiuHe from './views/LiuHe.vue' // 🎰 六合天下（独立）
import ChainGroups from './views/ChainGroups.vue'
import CreateChainGroup from './views/CreateChainGroup.vue'
import ChainGroupChat from './views/ChainGroupChat/index.vue' // 🐉 接龙群（独立）
import MyInvitations from './views/MyInvitations.vue'
import IncomeCenter from './views/IncomeCenter.vue'
import ContactDetail from './views/ContactDetail.vue' // 👤 联系人详情
import AdminRecharge from './views/AdminRecharge.vue' // 💰 管理员充值

// 路由配置
const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/home', component: Home },
  { path: '/contacts', component: Contacts },
  { path: '/wallet', component: Wallet },
  { path: '/profile', component: Profile },
  { path: '/liuhe', component: LiuHe }, // 🎰 六合天下
  { path: '/chain-groups', component: ChainGroups },
  { path: '/create-chain-group', component: CreateChainGroup },
  { path: '/chain-group/:id', component: ChainGroupChat }, // 🐉 接龙群
  { path: '/my-invitations', component: MyInvitations },
  { path: '/income-center', component: IncomeCenter },
  { path: '/contact/:id', component: ContactDetail }, // 👤 联系人详情
  { path: '/chat/:id', component: PrivateChat }, // 📱 私聊
  { path: '/admin/recharge', component: AdminRecharge } // 💰 管理员充值
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：检查token是否过期
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const tokenExpiresAt = localStorage.getItem('tokenExpiresAt')
  const now = new Date().getTime()
  
  // 需要登录的路由
  const requiresAuth = ['/home', '/contacts', '/wallet', '/profile', '/chat', '/chain-groups', '/liuhe']
  
  if (requiresAuth.includes(to.path)) {
    if (!token || !tokenExpiresAt) {
      // 没有token，跳转到登录页
      next('/login')
      return
    }
    
    if (now > parseInt(tokenExpiresAt)) {
      // token已过期，清除本地存储并跳转到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userId')
      localStorage.removeItem('tokenExpiresAt')
      next('/login')
      return
    }
  }
  
  next()
})

const app = createApp(App)

// 使用插件
app.use(createPinia())
app.use(router)

// ⚠️ 不在这里初始化 Socket，等用户登录后再初始化
// window.socket = getSocket()
console.log('✅ App 已挂载，等待用户登录')

app.mount('#app')
