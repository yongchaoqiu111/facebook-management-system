const axios = require('axios');

async function testSearchUser() {
  // 从 localStorage 模拟获取 token（需要你先登录）
  const token = process.argv[2];
  
  if (!token) {
    console.error('❌ 请提供 token 参数');
    console.log('使用方法: node test-search-user.cjs YOUR_TOKEN_HERE');
    console.log('或者先运行登录获取token');
    return;
  }
  
  try {
    console.log('🔍 测试搜索用户接口...');
    console.log('📡 请求地址: http://localhost:5000/api/friends/search?keyword=test');
    
    const response = await axios.get('http://localhost:5000/api/friends/search', {
      params: {
        keyword: 'test'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✅ 接口调用成功');
    console.log('📊 HTTP状态码:', response.status);
    console.log('📦 完整响应:', JSON.stringify(response.data, null, 2));
    
    // 模拟前端 API 拦截器的处理逻辑
    let processedData = response.data;
    if (response.data.success !== undefined) {
      processedData = response.data.data;
      console.log('\n🔄 经过拦截器处理后的数据:', JSON.stringify(processedData, null, 2));
    }
    
    // 测试前端代码的 map 操作
    if (Array.isArray(processedData)) {
      console.log('\n✅ 数据是数组，可以进行 .map() 操作');
      const mapped = processedData.map(user => ({
        id: user.userId || user._id,
        name: user.username,
        avatar: user.avatar || user.username.substring(0, 2).toUpperCase()
      }));
      console.log('🎯 Map 后的结果:', JSON.stringify(mapped, null, 2));
    } else {
      console.error('\n❌ 数据不是数组，无法进行 .map() 操作');
      console.log('数据类型:', typeof processedData);
    }
    
  } catch (error) {
    console.error('\n❌ 接口调用失败');
    if (error.response) {
      console.error('🔴 状态码:', error.response.status);
      console.error('🔴 错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('🔴 错误:', error.message);
    }
  }
}

testSearchUser();
