const axios = require('axios');

async function testBills() {
  try {
    // 用户 1234567 的 token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjlkNGIxMWYyYjY1NzczN2QyMjA2YmU3In0sImlhdCI6MTc3NTU0NjY1NywiZXhwIjoxNzc2MTUxNDU3fQ.kFsaGCAkfeccyla-n9CzQ-WgGeBQdErTic6m1akj64Y';
    
    const response = await axios.get('http://localhost:5000/api/liuhe/my-bills', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ 请求成功！');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ 请求失败:', error.response?.data || error.message);
  }
}

testBills();
