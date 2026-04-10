const express = require('express');
const router = express.Router();
const RedPacketService = require('../services/redPacketService');

router.post('/:id/open', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, groupId } = req.body;

    if (!userId || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'userId和groupId不能为空'
      });
    }

    const result = await RedPacketService.openRedPacket(id, userId, groupId);
    
    res.json(result);
  } catch (error) {
    console.error('领取红包接口错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '领取红包失败'
    });
  }
});

router.get('/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const groupInfo = await RedPacketService.getGroupInfo(groupId);
    
    res.json({
      success: true,
      data: groupInfo
    });
  } catch (error) {
    console.error('获取群组信息接口错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取群组信息失败'
    });
  }
});

module.exports = router;