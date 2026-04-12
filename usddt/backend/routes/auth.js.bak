const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const Group = require('../models/Group');
const redisClient = require('../config/redis');
const { sendError, sendSuccess, isValidPhone, validatePassword, ERROR_CODES } = require('../utils/responseHelper');

const router = express.Router();

router.post('/register', [
  check('username', 'Username is required').not().isEmpty(),
  check('phone', 'Please include a valid phone number').isLength({ min: 11 }),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(ERROR_CODES.VALIDATION_ERROR, res, { data: errors.array() });
  }

  const { username, phone, password } = req.body;

  try {
    // 🛡️ Redis 防重提交：检查是否正在处理相同的注册请求
    const registerLockKey = `register_lock:${phone}`;
    const existingLock = await redisClient.get(registerLockKey);
    if (existingLock) {
      return sendError(ERROR_CODES.PHONE_EXISTS, res, { 
        message: '该手机号正在注册中，请勿重复提交' 
      });
    }

    // 设置锁，5分钟过期
    await redisClient.set(registerLockKey, 'processing', { EX: 300 });

    try {
      // 🚀 Redis 缓存检查：先查 Redis，再查 MongoDB（减少数据库压力）
      const cachedUsername = await redisClient.get(`user_username:${username}`);
      if (cachedUsername) {
        throw new Error('USERNAME_EXISTS');
      }
      
      const cachedPhone = await redisClient.get(`user_phone:${phone}`);
      if (cachedPhone) {
        throw new Error('PHONE_EXISTS');
      }

      // 验证手机号格式
      if (!isValidPhone(phone)) {
        throw new Error('INVALID_PHONE_FORMAT');
      }

      // 验证密码强度
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error('PASSWORD_TOO_SHORT');
      }

      // 检查用户名是否已存在（数据库层面最终确认）
      const existingUserByUsername = await User.findOne({ username });
      if (existingUserByUsername) {
        throw new Error('USERNAME_EXISTS');
      }

      // 检查手机号是否已注册（数据库层面最终确认）
      const existingUserByPhone = await User.findOne({ phone });
      if (existingUserByPhone) {
        throw new Error('PHONE_EXISTS');
      }

      // 🔥 生成 8 位纯数字 userId（从 10000000 开始）
      const IdGenerator = require('../services/idGenerator');
      const finalUserId = await IdGenerator.generateUserId();
      console.log(`Generated userId for ${username}: ${finalUserId}`);
      
      // 加密密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const user = new User({
        _id: finalUserId,  // 🔥 设置 _id 为 8位纯数字
        username,
        userId: finalUserId,
        phone,
        password: hashedPassword
      });

      await user.save();
      console.log(`Successfully created user ${username} with userId: ${finalUserId}`);
      
      // 🌟 新用户自动加入公共群（不包括接龙群）
      try {
        const publicGroups = await Group.find({ isPublic: true });
        for (const publicGroup of publicGroups) {
          // ⚠️ 接龙群不自动加入，必须通过 join-chain 接口缴费
          if (publicGroup.settings.isChainRedPacket) {
            console.log(`Skipping auto-join for chain group: ${publicGroup.name}`);
            continue;
          }
          
          // 检查是否已经是成员
          const isMember = publicGroup.members.some(
            m => m.userId === user._id
          );
          
          if (!isMember) {
            publicGroup.members.push({
              userId: user._id,
              role: 'member',
              joinedAt: new Date()
            });
            publicGroup.memberCount += 1;
            await publicGroup.save();
            console.log(`User ${username} auto-joined public group: ${publicGroup.name}`);
          }
        }
      } catch (groupErr) {
        console.error('Failed to add user to public groups:', groupErr);
      }
      
      // 🚀 注册成功后，将用户名和手机号写入 Redis 缓存（1小时过期）
      await redisClient.set(`user_username:${username}`, '1', { EX: 3600 });
      await redisClient.set(`user_phone:${phone}`, '1', { EX: 3600 });

      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
        if (err) throw err;
        
        // ✅ 注册成功，释放 Redis 锁
        redisClient.del(registerLockKey).catch(lockErr => {
          console.error('Failed to release register lock:', lockErr);
        });
        
        sendSuccess(res, { 
          token, 
          user: { 
            id: user.id,
            userId: user.userId,
            username: user.username, 
            phone: user.phone, 
            balance: user.balance 
          } 
        }, '注册成功');
      });
    } catch (err) {
      // ❌ 发生错误，释放 Redis 锁
      redisClient.del(registerLockKey).catch(lockErr => {
        console.error('Failed to release register lock on error:', lockErr);
      });
      
      // 根据错误类型返回不同的错误码
      switch (err.message) {
        case 'USERNAME_EXISTS':
          return sendError(ERROR_CODES.USERNAME_EXISTS, res);
        case 'PHONE_EXISTS':
          return sendError(ERROR_CODES.PHONE_EXISTS, res);
        case 'INVALID_PHONE_FORMAT':
          return sendError(ERROR_CODES.INVALID_PHONE_FORMAT, res);
        case 'PASSWORD_TOO_SHORT':
          return sendError(ERROR_CODES.PASSWORD_TOO_SHORT, res);
        case 'USERID_GENERATION_FAILED':
          return sendError(ERROR_CODES.INTERNAL_ERROR, res, { 
            message: '生成用户ID失败，请稍后重试' 
          });
        default:
          console.error(err.message);
          return sendError(ERROR_CODES.INTERNAL_ERROR, res);
      }
    }
  } catch (err) {
    // 捕获未预期的错误
    console.error('Unexpected error during registration:', err);
    return sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

router.post('/login', [
  check('username', 'Username is required').not().isEmpty(),
  check('password', 'Password is required').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(ERROR_CODES.VALIDATION_ERROR, res, { data: errors.array() });
  }

  const { username, password } = req.body;

  try {
    let user = await User.findOne({ $or: [{ username }, { phone: username }] });
    if (!user) {
      return sendError(ERROR_CODES.INVALID_CREDENTIALS, res);
    }

    // 检查账号状态（如果将来添加封禁功能）
    // if (user.isBanned) {
    //   return sendError(ERROR_CODES.ACCOUNT_BANNED, res);
    // }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(ERROR_CODES.INVALID_CREDENTIALS, res);
    }

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      sendSuccess(res, { 
        token, 
        user: { 
          id: user.id,
          userId: user.userId,
          username: user.username, 
          phone: user.phone,
          avatar: user.avatar,
          balance: user.balance,
          depositAddress: user.depositAddress
        } 
      }, '登录成功');
    });
  } catch (err) {
    console.error(err.message);
    sendError(ERROR_CODES.INTERNAL_ERROR, res);
  }
});

module.exports = router;