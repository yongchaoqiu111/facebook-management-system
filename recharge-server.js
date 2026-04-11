const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// MongoDB 连接配置
const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'usdchou';

let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('✅ 数据库连接成功');
}

// 充值接口
app.post('/recharge', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    
    const result = await db.collection('users').updateOne(
      { userId: userId },
      { $inc: { balance: parseFloat(amount) } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 获取更新后的余额
    const user = await db.collection('users').findOne({ userId: userId });
    
    res.json({ 
      success: true, 
      message: '充值成功',
      balance: user.balance
    });
  } catch (err) {
    console.error('充值失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 启动服务
connectDB().then(() => {
  app.listen(3001, () => {
    console.log('🚀 充值服务运行在 http://localhost:3001');
  });
});
