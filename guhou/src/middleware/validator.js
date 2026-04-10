const { COINS } = require('../config');

function validateSymbol(req, res, next) {
  const symbol = req.params.symbol.replace('usd', '').toUpperCase();
  
  // 只允许字母
  if (!/^[A-Z]+$/.test(symbol)) {
    return res.status(400).json({ error: '无效的币种代码' });
  }
  
  // 检查是否在支持的列表中
  const supportedCoins = COINS.map(c => c.symbol);
  if (!supportedCoins.includes(symbol)) {
    return res.status(400).json({ 
      error: '不支持的币种',
      supported: supportedCoins
    });
  }
  
  req.validatedSymbol = symbol;
  next();
}

module.exports = { validateSymbol };