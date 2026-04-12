const mongoose = require('mongoose');

const groupInvitationSchema = new mongoose.Schema({
  // 群组
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  
  // 邀请人（可以是群主或管理员）
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 被邀请人
  invitee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 邀请码（唯一）
  invitationCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 邀请状态
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending'
  },
  
  // 过期时间（默认7天）
  expiresAt: {
    type: Date,
    required: true
  },
  
  // 接受时间
  acceptedAt: {
    type: Date
  },
  
  // 拒绝时间
  rejectedAt: {
    type: Date
  },
  
  // 拒绝原因
  rejectReason: {
    type: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 索引
groupInvitationSchema.index({ group: 1, status: 1 });
groupInvitationSchema.index({ invitee: 1, status: 1 });
groupInvitationSchema.index({ invitationCode: 1 }, { unique: true });
groupInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL索引，自动删除过期记录

module.exports = mongoose.model('GroupInvitation', groupInvitationSchema);
