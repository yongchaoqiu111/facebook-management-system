const axios = require('axios');

async function loginAndTestSearch() {
  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 10000
  });
  
  try {
    console.log('📝 步骤1: 尝试登录...\n');
    
    // 尝试登录（使用常见测试账号）
    const loginResponse = await api.post('/auth/login', {
      username: 'testuser',
      password: '123456'
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ 登录失败:', loginResponse.data);
      console.log('\n💡 提示: 如果账号不存在，请先注册');
      return;
    }
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    
    console.log('✅ 登录成功');
    console.log('👤 用户ID:', user.userId);
    console.log('👤 用户名:', user.username);
    console.log('🔑 Token:', token.substring(0, 20) + '...');
    
    // 设置 token
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('\n\n📝 步骤2: 测试搜索用户接口...\n');
    
    // 测试搜索（搜索自己）
    const searchKeyword = user.userId;
    console.log(`🔍 搜索关键词: ${searchKeyword}`);
    
    const searchResponse = await api.get('/friends/search', {
      params: {
        keyword: searchKeyword
      }
    });
    
    console.log('\n✅ 搜索接口调用成功');
    console.log('📊 HTTP状态码:', searchResponse.status);
    console.log('📦 后端原始响应:', JSON.stringify(searchResponse.data, null, 2));
    
    // 模拟前端 API 拦截器的处理
    let processedData = searchResponse.data;
    if (searchResponse.data.success !== undefined) {
      processedData = searchResponse.data.data;
      console.log('\n🔄 经过拦截器处理后的数据:', JSON.stringify(processedData, null, 2));
    }
    
    // 测试前端代码逻辑
    console.log('\n\n📝 步骤3: 验证前端代码逻辑...\n');
    
    if (Array.isArray(processedData)) {
      console.log('✅ 数据是数组，可以进行 .map() 操作');
      console.log('📊 数组长度:', processedData.length);
      
      if (processedData.length > 0) {
        const mapped = processedData.map(user => ({
          id: user.userId || user._id,
          name: user.username,
          avatar: user.avatar || user.username.substring(0, 2).toUpperCase()
        }));
        
        console.log('\n🎯 Map 转换后的结果:');
        console.log(JSON.stringify(mapped, null, 2));
        
        console.log('\n✅✅✅ 结论: 搜索功能代码逻辑正确！');
        console.log('💡 如果前端搜索没反应，可能是以下原因:');
        console.log('   1. 没有输入搜索关键词');
        console.log('   2. 网络请求失败（检查控制台错误）');
        console.log('   3. 返回结果为空数组（没有匹配的用户）');
      } else {
        console.log('⚠️  返回空数组，没有找到匹配的用户');
        console.log('💡 建议: 尝试搜索其他用户的 ID 或用户名');
      }
    } else {
      console.error('❌ 数据不是数组，前端代码会报错！');
      console.log('数据类型:', typeof processedData);
      console.log('数据内容:', processedData);
    }
    
  } catch (error) {
    console.error('\n❌ 操作失败');
    if (error.response) {
      console.error('🔴 状态码:', error.response.status);
      console.error('🔴 错误信息:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log('\n💡 提示: 认证失败，请检查账号密码或先注册');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔴 无法连接到后端服务器');
      console.log('💡 提示: 请确保后端服务已启动 (http://localhost:5000)');
    } else {
      console.error('🔴 错误:', error.message);
    }
  }
}

loginAndTestSearch();
