// 自动登录脚本 - 在浏览器控制台执行

(async function autoLogin() {
  console.log('🔐 开始自动登录...\n');
  
  try {
    // 调用登录 API
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: '888888',
        password: '123456'
      })
    });
    
    const data = await response.json();
    console.log('登录响应:', data);
    
    if (data.success && data.data) {
      // 保存 token 和用户信息
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('userId', data.data.user.id || data.data.user._id);
      
      console.log('\n✅ 登录成功！');
      console.log('用户ID:', data.data.user.id || data.data.user._id);
      console.log('用户名:', data.data.user.username);
      console.log('Token:', data.data.token.substring(0, 20) + '...');
      
      // 刷新页面以应用登录状态
      console.log('\n🔄 3秒后自动刷新页面...');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } else {
      console.error('❌ 登录失败:', data.error || data.message);
    }
    
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
  }
})();
