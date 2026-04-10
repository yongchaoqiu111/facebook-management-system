const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testPublicGroups() {
  try {
    await mongoose.connect('mongodb://localhost:27017/usdchou');
    
    // 获取一个用户
    const user = await User.findOne();
    if (!user) {
      console.log('❌ 没有用户');
      return;
    }
    
    console.log('测试用户:', user.username);
    
    // 生成 token
    const token = jwt.sign(
      { user: { id: user._id } }, 
      process.env.JWT_SECRET || 'your-secret-key', 
      { expiresIn: '7d' }
    );
    
    // 调用 API
    const response = await axios.get('http://localhost:5000/api/groups', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    console.log('\n✅ API 返回群组数量:', response.data.length);
    console.log('\n群组列表:');
    response.data.forEach((g, index) => {
      console.log(`${index + 1}. ${g.name} (isPublic: ${g.isPublic}, 成员: ${g.memberCount})`);
    });
    
    // 检查公共群是否在列表中
    const publicGroups = response.data.filter(g => g.isPublic);
    console.log('\n🌐 公共群数量:', publicGroups.length);
    publicGroups.forEach(g => {
      console.log('  -', g.name);
    });
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
    if (err.response) {
      console.error('响应状态:', err.response.status);
      console.error('响应数据:', err.response.data);
    }
  } finally {
    process.exit();
  }
}

testPublicGroups();
