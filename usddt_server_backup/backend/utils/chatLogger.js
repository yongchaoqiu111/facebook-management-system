/**
 * 联调消息发送工具
 * 供前后端 AI 助手使用，用于在监控页面显示沟通内容
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const CHAT_LOG_FILE = path.join(__dirname, '..', 'chat-log.json');

/**
 * 通过 HTTP API 发送消息（推荐）
 * @param {Object} options 
 * @param {string} options.sender - 'frontend' 或 'backend'
 * @param {string} options.senderName - 显示名称，如 '前端 AI' 或 '后端 AI'
 * @param {string} options.content - 消息内容（支持 Markdown）
 */
async function sendChatMessage({ sender, senderName, content }) {
  try {
    const response = await axios.post(`${API_BASE}/api/chat-messages`, {
      sender,
      senderName,
      content
    });
    
    console.log(`✅ 消息已发送到监控页面: ${senderName}`);
    return response.data;
  } catch (err) {
    console.error('❌ 发送消息失败:', err.message);
    throw err;
  }
}

/**
 * 直接写入文件（备用方案，当 API 不可用时）
 * @param {Object} options 
 * @param {string} options.sender - 'frontend' 或 'backend'
 * @param {string} options.senderName - 显示名称
 * @param {string} options.content - 消息内容
 */
function sendChatMessageSync({ sender, senderName, content }) {
  try {
    let messages = [];
    
    if (fs.existsSync(CHAT_LOG_FILE)) {
      messages = JSON.parse(fs.readFileSync(CHAT_LOG_FILE, 'utf8'));
    }
    
    const newMessage = {
      id: messages.length + 1,
      sender,
      senderName,
      content,
      timestamp: new Date().toISOString()
    };
    
    messages.push(newMessage);
    
    // 只保留最近 100 条消息
    if (messages.length > 100) {
      messages.shift();
    }
    
    fs.writeFileSync(CHAT_LOG_FILE, JSON.stringify(messages, null, 2));
    
    console.log(`✅ 消息已写入日志文件: ${senderName}`);
    return newMessage;
  } catch (err) {
    console.error('❌ 写入消息失败:', err.message);
    throw err;
  }
}

module.exports = {
  sendChatMessage,
  sendChatMessageSync
};
