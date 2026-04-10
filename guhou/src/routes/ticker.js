const express = require('express');
const priceService = require('../services/priceService');
const { validateSymbol } = require('../middleware/validator');
const rateLimiter = require('../middleware/rateLimiter');
const { RATE_LIMIT_CONFIG } = require('../config');

const router = express.Router();

router.get('/:symbol', 
  rateLimiter(RATE_LIMIT_CONFIG.ticker),
  validateSymbol,
  async (req, res) => {
    const symbol = req.validatedSymbol;
    
    try {
      const priceData = await priceService.getPrice(symbol);
      res.json(priceData);
    } catch (error) {
      res.status(500).json({ error: '获取价格失败' });
    }
  }
);

module.exports = router;