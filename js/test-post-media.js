const http = require('http');

const data = JSON.stringify({
  text: '测试微博发图 - 登录状态检测',
  imagePaths: ['images/1.png'],
  publish: false
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/weibo/post/media/headed',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`Response Body: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
