const axios = require('axios');

(async () => {
  const login = await axios.post('http://localhost:5000/api/auth/login', { 
    username: 'testuser', 
    password: '123456' 
  });
  
  const token = login.data.data.token;
  const chats = await axios.get('http://localhost:5000/api/chats', { 
    headers: { Authorization: 'Bearer ' + token } 
  });
  
  console.log('✅ 获取聊天列表成功');
  console.log('群组数量:', chats.data.data.length);
  
  chats.data.data.forEach(chat => {
    console.log(`- ${chat.name} (isChainGroup: ${chat.isChainGroup}, isJoined: ${chat.isJoined})`);
  });
})().catch(err => console.error('❌ 错误:', err.response?.data || err.message));
