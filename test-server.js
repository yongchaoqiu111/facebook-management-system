const express = require('express');
const app = express();
const port = 3000;

// 静态文件服务
app.use(express.static('public'));

// 解析 JSON 请求体
app.use(express.json());

// 测试 API
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: '服务器运行正常' });
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});