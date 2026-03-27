const http = require('http');

function request(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data });
        });
      }
    );

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const preview = await request('/workflow/daily/preview', { query: 'AI', size: 3, style: '严肃' });
  const draft = await request('/workflow/daily/publish', { query: 'AI', size: 3, style: '严肃', publish: false });
  console.log(JSON.stringify({ preview, draft }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
