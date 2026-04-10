const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['text', 'image'],
    default: 'text'
  },
  clientMsgId: {
    type: String,
    index: true
  }
}, { timestamps: true });

groupMessageSchema.index({ groupId: 1, createdAt: -1 });
groupMessageSchema.index({ groupId: 1, clientMsgId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
