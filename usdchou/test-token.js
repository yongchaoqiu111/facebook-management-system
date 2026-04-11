const jwt = require('jsonwebtoken');

const secret = 'usdchou_secret_key_2026_production';
const userId = '10000002';

const token = jwt.sign(
  { user: { id: userId } },
  secret,
  { expiresIn: '7d' }
);

console.log('Generated token:', token);

// 验证
try {
  const decoded = jwt.verify(token, secret);
  console.log('Decoded:', decoded);
} catch (err) {
  console.error('Verification failed:', err.message);
}
