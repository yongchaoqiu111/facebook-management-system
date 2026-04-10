const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 支持两种 token 传递方式
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-auth-token');
  
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};