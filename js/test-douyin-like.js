const http = require('http');

function testDouyinLike(action = 'like') {
  const postData = JSON.stringify({
    action: action,
    params: {}
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/douyin/like',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('测试抖音点赞功能...');
  console.log('操作类型:', action);
  console.log('数据:', postData);

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
      console.log('测试完成！');
    });
  });

  req.on('error', (e) => {
    console.error(`请求失败: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

// 测试启动抖音
testDouyinLike('start');

// 3秒后测试点赞
setTimeout(() => {
  testDouyinLike('like');
}, 3000);