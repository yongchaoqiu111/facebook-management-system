const express = require('express');
const auth = require('../middlewares/auth');
const UserSettings = require('../models/UserSettings');
const logger = require('../config/logger');

const router = express.Router();

// 获取用户设置
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let settings = await UserSettings.findOne({ userId });
    
    // 如果不存在，创建默认设置
    if (!settings) {
      settings = new UserSettings({ userId });
      await settings.save();
    }
    
    logger.info(`User ${userId} fetched settings`);
    res.json(settings);
  } catch (err) {
    logger.error('Error getting user settings:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 更新用户设置
router.put('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      settings = new UserSettings({ userId, ...updates });
    } else {
      Object.assign(settings, updates);
      settings.updatedAt = Date.now();
    }
    
    await settings.save();
    
    logger.info(`User ${userId} updated settings`);
    res.json({ msg: 'Settings updated successfully', settings });
  } catch (err) {
    logger.error('Error updating user settings:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 更新通知设置
router.put('/notifications', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationSettings = req.body;
    
    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      settings = new UserSettings({ 
        userId,
        notifications: notificationSettings
      });
    } else {
      settings.notifications = { ...settings.notifications, ...notificationSettings };
      settings.updatedAt = Date.now();
    }
    
    await settings.save();
    
    logger.info(`User ${userId} updated notification settings`);
    res.json({ msg: 'Notification settings updated', settings });
  } catch (err) {
    logger.error('Error updating notification settings:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 更新隐私设置
router.put('/privacy', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const privacySettings = req.body;
    
    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      settings = new UserSettings({ 
        userId,
        privacy: privacySettings
      });
    } else {
      settings.privacy = { ...settings.privacy, ...privacySettings };
      settings.updatedAt = Date.now();
    }
    
    await settings.save();
    
    logger.info(`User ${userId} updated privacy settings`);
    res.json({ msg: 'Privacy settings updated', settings });
  } catch (err) {
    logger.error('Error updating privacy settings:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// 更新聊天设置
router.put('/chat', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatSettings = req.body;
    
    let settings = await UserSettings.findOne({ userId });
    
    if (!settings) {
      settings = new UserSettings({ 
        userId,
        chat: chatSettings
      });
    } else {
      settings.chat = { ...settings.chat, ...chatSettings };
      settings.updatedAt = Date.now();
    }
    
    await settings.save();
    
    logger.info(`User ${userId} updated chat settings`);
    res.json({ msg: 'Chat settings updated', settings });
  } catch (err) {
    logger.error('Error updating chat settings:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
