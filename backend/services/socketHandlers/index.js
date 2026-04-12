/**
 * Socket事件处理器索�?
 */

const PrivateMessageHandler = require('./privateMessageHandler');
const GroupMessageHandler = require('./groupMessageHandler');
const CallHandler = require('./callHandler');

module.exports = {
  PrivateMessageHandler,
  GroupMessageHandler,
  CallHandler
};
