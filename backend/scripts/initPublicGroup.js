/**
 * 初始化公共群
 * 系统启动时自动执行，确保公共群存在
 */
const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const IdGenerator = require('../services/idGenerator');
const logger = require('../config/logger');

async function initializePublicGroups() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usdchou');
    logger.info('Connected to MongoDB for public group initialization');

    // 🌟 定义所有公共群配置
    const publicGroupConfigs = [
      {
        name: '六合天下',
        groupId: '1000001',  // 🔥 7位纯数字群组ID
        avatar: '🌐',
        description: '欢迎所有会员！在这里大家可以自由交流、分享心得。',
        maxMembers: 10000,
        settings: {
          allowMemberInvite: false,
          allowMemberPost: true,
          needApproval: false
        }
      },
      {
        name: '红包接龙',
        groupId: '1000002',  // 🔥 7位纯数字群组ID
        avatar: '🧧',
        description: '红包接龙游戏区，大家一起来玩红包接龙！',
        maxMembers: 5000,
        settings: {
          allowMemberInvite: false,
          allowMemberPost: true,
          needApproval: false,
          isChainRedPacket: true,  // 🔥 接龙群标识
          ticketAmount: 10,
          firstRedPacketAmount: 300,
          redPacketCount: 30,
          redPacketPerAmount: 10,
          kickThreshold: 50,
          waitHours: 3
        }
      }
    ];

    // 查找第一个用户作为群主
    const firstUser = await User.findOne().sort({ createdAt: 'asc' });
    if (!firstUser) {
      logger.warn('No users found, skipping public group creation');
      return [];
    }

    const createdGroups = [];

    // 遍历创建或更新每个公共群
    for (const config of publicGroupConfigs) {
      let publicGroup = await Group.findOne({ 
        isPublic: true, 
        name: config.name 
      });

      if (publicGroup) {
        logger.info(`Public group already exists: ${publicGroup.name}`);
        
        // 🔥 只有非接龙群才自动加入所有用户
        if (!publicGroup.settings.isChainRedPacket) {
          // 将所有现有用户加入（如果还没加入）
          const users = await User.find();
          let addedCount = 0;
          
          for (const user of users) {
            const isMember = publicGroup.members.some(
              m => m.userId.toString() === user._id.toString()
            );
            
            if (!isMember) {
              publicGroup.members.push({
                userId: user._id,
                role: 'member',
                joinedAt: new Date()
              });
              addedCount++;
            }
          }
          
          if (addedCount > 0) {
            publicGroup.memberCount = publicGroup.members.length;
            await publicGroup.save();
            logger.info(`Added ${addedCount} users to ${publicGroup.name}`);
          }
        } else {
          logger.info(`⚠️ 接龙群 ${publicGroup.name} 不自动拉人，需用户主动加入`);
        }
      } else {
        // 创建新的公共群
        logger.info(`Creating public group: ${config.name}...`);
        
        publicGroup = new Group({
          _id: config.groupId,  // 🔥 设置 7位纯数字群组ID
          name: config.name,
          avatar: config.avatar,
          description: config.description,
          owner: firstUser._id,
          members: [
            {
              userId: firstUser._id,
              role: 'owner',
              joinedAt: new Date()
            }
          ],
          memberCount: 1,
          maxMembers: config.maxMembers,
          isPublic: true,
          settings: config.settings
        });

        await publicGroup.save();
        logger.info(`✅ Public group created: ${publicGroup.name} (ID: ${publicGroup._id})`);

        // 🔥 只有非接龙群才自动加入所有用户
        if (!publicGroup.settings.isChainRedPacket) {
          // 将所有现有用户加入新群
          const allUsers = await User.find({ _id: { $ne: firstUser._id } });
          
          for (const user of allUsers) {
            publicGroup.members.push({
              userId: user._id,
              role: 'member',
              joinedAt: new Date()
            });
          }
          
          publicGroup.memberCount = publicGroup.members.length;
          await publicGroup.save();
          
          logger.info(`✅ Added ${allUsers.length} users to ${publicGroup.name}`);
        } else {
          logger.info(`⚠️ 接龙群 ${publicGroup.name} 不自动拉人，需用户主动加入`);
        }
      }

      createdGroups.push(publicGroup);
    }

    logger.info(`✅ Total ${createdGroups.length} public groups initialized`);
    return createdGroups;
  } catch (err) {
    logger.error('Error initializing public groups:', err);
    throw err;
  } finally {
    // 保持连接，不要关闭
    // await mongoose.disconnect();
  }
}

// 导出函数
module.exports = initializePublicGroups;

// 如果直接运行此脚本
if (require.main === module) {
  initializePublicGroups()
    .then(() => {
      logger.info('Public group initialization completed');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Initialization failed:', err);
      process.exit(1);
    });
}
