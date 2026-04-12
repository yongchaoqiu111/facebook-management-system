const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // 通知设置
  notifications: {
    // 私聊消息通知
    privateMessage: {
      type: Boolean,
      default: true
    },
    // 群聊消息通知
    groupMessage: {
      type: Boolean,
      default: true
    },
    // 好友请求通知
    friendRequest: {
      type: Boolean,
      default: true
    },
    // 红包通知
    redPacket: {
      type: Boolean,
      default: true
    },
    // 声音通知
    soundEnabled: {
      type: Boolean,
      default: true
    },
    // 桌面通知
    desktopNotification: {
      type: Boolean,
      default: false
    }
  },
  // 隐私设置
  privacy: {
    // 允许陌生人添加好友
    allowFriendRequest: {
      type: Boolean,
      default: true
    },
    // 显示在线状态
    showOnlineStatus: {
      type: Boolean,
      default: true
    },
    // 显示最后在线时间
    showLastSeen: {
      type: Boolean,
      default: true
    },
    // 允许被拉入群聊
    allowGroupInvite: {
      type: Boolean,
      default: true
    }
  },
  // 聊天设置
  chat: {
    // 自动下载媒体文件
    autoDownloadMedia: {
      type: Boolean,
      default: true
    },
    // 显示图片预览
    showImagePreview: {
      type: Boolean,
      default: true
    },
    // 消息气泡样式
    bubbleStyle: {
      type: String,
      enum: ['default', 'modern', 'classic'],
      default: 'default'
    },
    // 字体大小
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    },
    // 主题
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    }
  },
  // 语言设置
  language: {
    type: String,
    default: 'zh-CN'
  },
  // 时区
  timezone: {
    type: String,
    default: 'Asia/Shanghai'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 索引优化
userSettingsSchema.index({ userId: 1 });

module.exports = mongoose.model('UserSettings', userSettingsSchema);
