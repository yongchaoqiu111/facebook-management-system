const axios = require('axios');

async function testSearchDifferentKeywords() {
  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 10000
  });
  
  try {
    // 登录
    const loginResponse = await api.post('/auth/login', {
      username: 'testuser',
      password: '123456'
    });
    
    const token = loginResponse.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    console.log('✅ 已登录，用户ID: 100583\n');
    
    // 测试不同的搜索关键词
    const keywords = [
      '100583',      // 自己的userId（纯数字）
      'testuser',    // 自己的username
      'test',        // 部分用户名
      '10058',       // 部分userId
    ];
    
    for (const keyword of keywords) {
      console.log(`\n🔍 搜索关键词: "${keyword}"`);
      
      try {
        const response = await api.get('/friends/search', {
          params: { keyword }
        });
        
        const results = response.data.data || [];
        console.log(`   结果数量: ${results.length}`);
        
        if (results.length > 0) {
          results.forEach(user => {
            console.log(`   - ${user.username} (ID: ${user.userId})`);
          });
        }
      } catch (error) {
        console.error(`   ❌ 错误: ${error.response?.data?.error?.message || error.message}`);
      }
    }
    
    console.log('\n\n💡 结论:');
    console.log('   如果所有搜索都返回空数组，说明后端搜索功能有问题');
    console.log('   需要检查后端的 /friends/search 接口实现');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testSearchDifferentKeywords();
