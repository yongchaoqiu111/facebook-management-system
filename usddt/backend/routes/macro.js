const express = require('express');
const router = express.Router();
const macroDataService = require('../services/macroDataService');

// 获取宏观数据
router.get('/', async (req, res) => {
  try {
    const data = await macroDataService.getMacroData();
    res.json({
      success: true,
      data,
      message: '获取成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取宏观数据失败'
    });
  }
});

module.exports = router;
