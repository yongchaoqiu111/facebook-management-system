const config = require('../config');
const protoParser = require('./protoParser');

class MessageHandler {
    constructor() {
        this.messageCallbacks = new Map();
        this.stats = {
            totalMessages: 0,
            messageTypes: {}
        };
    }
    
    registerCallback(messageType, callback) {
        if (!this.messageCallbacks.has(messageType)) {
            this.messageCallbacks.set(messageType, []);
        }
        this.messageCallbacks.get(messageType).push(callback);
    }
    
    unregisterCallback(messageType, callback) {
        if (this.messageCallbacks.has(messageType)) {
            const callbacks = this.messageCallbacks.get(messageType);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    handleMessage(rawData, source) {
        try {
            this.stats.totalMessages++;
            
            // 使用ProtoParser解析消息
            const parsedMessage = protoParser.parseKuaishouMessage(rawData);
            
            if (!parsedMessage) {
                return;
            }
            
            // 更新统计信息
            const type = parsedMessage.type;
            if (!this.stats.messageTypes[type]) {
                this.stats.messageTypes[type] = 0;
            }
            this.stats.messageTypes[type]++;
            
            // 创建标准化的消息对象
            const message = this.createStandardMessage(parsedMessage, source);
            
            // 触发回调
            this.notifyCallbacks(message);
            
            return message;
            
        } catch (error) {
            console.error('处理消息失败:', error);
            return null;
        }
    }
    
    createStandardMessage(parsedMessage, source) {
        const message = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            source: source,
            type: this.getMessageTypeCode(parsedMessage.type),
            data: parsedMessage
        };
        
        return message;
    }
    
    getMessageTypeCode(type) {
        switch (type) {
            case 'danmaku':
                return config.messageTypes.DANMU;
            case 'like':
                return config.messageTypes.LIKE;
            case 'enter_room':
                return config.messageTypes.ENTER;
            case 'follow':
                return config.messageTypes.FOLLOW;
            case 'gift':
                return config.messageTypes.GIFT;
            case 'statistics':
                return config.messageTypes.STATISTICS;
            default:
                return 0; // 未知类型
        }
    }
    
    notifyCallbacks(message) {
        const callbacks = this.messageCallbacks.get(message.type) || [];
        
        callbacks.forEach(callback => {
            try {
                callback(message);
            } catch (error) {
                console.error('执行回调失败:', error);
            }
        });
        
        // 也触发通用回调
        const allCallbacks = this.messageCallbacks.get('*') || [];
        allCallbacks.forEach(callback => {
            try {
                callback(message);
            } catch (error) {
                console.error('执行通用回调失败:', error);
            }
        });
    }
    
    // 处理弹幕消息
    handleDanmaku(data) {
        return {
            type: 'danmaku',
            user: {
                id: data.user?.id || '',
                nickname: data.user?.nickname || '',
                avatar: data.user?.avatar || ''
            },
            content: data.content || '',
            timestamp: data.timestamp || Date.now()
        };
    }
    
    // 处理点赞消息
    handleLike(data) {
        return {
            type: 'like',
            user: {
                id: data.user?.id || '',
                nickname: data.user?.nickname || ''
            },
            count: data.count || 1,
            total: data.total || 0
        };
    }
    
    // 处理进入直播间消息
    handleEnterRoom(data) {
        return {
            type: 'enter_room',
            user: {
                id: data.user?.id || '',
                nickname: data.user?.nickname || ''
            },
            roomId: data.roomId || '',
            timestamp: Date.now()
        };
    }
    
    // 处理关注消息
    handleFollow(data) {
        return {
            type: 'follow',
            user: {
                id: data.user?.id || '',
                nickname: data.user?.nickname || ''
            },
            isFollow: data.isFollow || false,
            timestamp: Date.now()
        };
    }
    
    // 处理礼物消息
    handleGift(data) {
        return {
            type: 'gift',
            user: {
                id: data.user?.id || '',
                nickname: data.user?.nickname || ''
            },
            gift: {
                id: data.gift?.id || '',
                name: data.gift?.name || '',
                image: data.gift?.image || ''
            },
            count: data.count || 1,
            value: data.value || 0,
            timestamp: Date.now()
        };
    }
    
    // 处理统计消息
    handleStatistics(data) {
        return {
            type: 'statistics',
            onlineCount: data.onlineCount || 0,
            totalCount: data.totalCount || 0,
            likeCount: data.likeCount || 0,
            timestamp: Date.now()
        };
    }
    
    // 获取统计信息
    getStats() {
        return { ...this.stats };
    }
    
    // 重置统计信息
    resetStats() {
        this.stats = {
            totalMessages: 0,
            messageTypes: {}
        };
    }
}

// 导出单例
const messageHandler = new MessageHandler();

module.exports = messageHandler;