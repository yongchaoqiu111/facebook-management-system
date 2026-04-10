const express = require('express');
const klineService = require('../services/klineService');
const { validateSymbol } = require('../middleware/validator');
const rateLimiter = require('../middleware/rateLimiter');
const { RATE_LIMIT_CONFIG } = require('../config');

const router = express.Router();

router.get('/:symbol', 
  rateLimiter(RATE_LIMIT_CONFIG.ohlc),
  validateSymbol,
  (req, res) => {
    const symbol = req.validatedSymbol;
    const step = parseInt(req.query.step) || 900;
    const limit = parseInt(req.query.limit) || 50;
    const start = parseInt(req.query.start) || Math.floor(Date.now() / 1000) - step * limit;
    
    try {
      const data = klineService.getKlineData(symbol, step, limit, start);
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: '获取K线数据失败' });
    }
  }
);

module.exports = router;