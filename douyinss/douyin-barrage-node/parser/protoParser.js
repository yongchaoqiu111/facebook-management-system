const protobuf = require('protobufjs');
const fs = require('fs');
const path = require('path');

class ProtoParser {
    constructor() {
        this.root = null;
        this.messageTypes = {};
        this.protoFiles = [];
    }
    
    async loadProtoFiles() {
        try {
            // 加载ProtoBuf定义文件
            const protoDir = path.join(__dirname, '../proto');
            
            if (fs.existsSync(protoDir)) {
                const protoFiles = fs.readdirSync(protoDir).filter(file => file.endsWith('.proto'));
                
                for (const file of protoFiles) {
                    const filePath = path.join(protoDir, file);
                    const root = await protobuf.load(filePath);
                    
                    if (!this.root) {
                        this.root = root;
                    } else {
                        // 合并多个Proto文件
                        root.nested.forEach((value, key) => {
                            this.root.define(key, value);
                        });
                    }
                    
                    this.protoFiles.push(file);
                }
            }
            
            if (this.root) {
                // 获取所有消息类型
                this.extractMessageTypes(this.root);
                console.log(`已加载 ${this.protoFiles.length} 个Proto文件，发现 ${Object.keys(this.messageTypes).length} 种消息类型`);
            } else {
                console.warn('未找到Proto文件，使用默认解析方式');
            }
            
        } catch (error) {
            console.error('加载Proto文件失败:', error);
        }
    }
    
    extractMessageTypes(root, prefix = '') {
        root.nested.forEach((value, key) => {
            const fullName = prefix ? `${prefix}.${key}` : key;
            
            if (value.fields) {
                // 这是一个消息类型
                this.messageTypes[fullName] = value;
            } else if (value.nested) {
                // 这是一个命名空间
                this.extractMessageTypes(value, fullName);
            }
        });
    }
    
    parse(data, messageType) {
        try {
            if (!this.root) {
                // 如果没有加载Proto文件，尝试直接解析
                return this.parseWithoutProto(data);
            }
            
            const message = this.root.lookupType(messageType);
            if (!message) {
                console.warn(`未找到消息类型: ${messageType}`);
                return this.parseWithoutProto(data);
            }
            
            // 解码二进制数据
            const decoded = message.decode(data);
            return decoded.toJSON();
            
        } catch (error) {
            console.error(`解析ProtoBuf数据失败: ${error.message}`);
            return this.parseWithoutProto(data);
        }
    }
    
    parseWithoutProto(data) {
        // 尝试多种解析方式
        try {
            // 尝试UTF-8字符串
            const str = data.toString('utf8');
            if (str.trim()) {
                try {
                    return JSON.parse(str);
                } catch (e) {
                    return { text: str };
                }
            }
        } catch (error) {
            console.error('字符串解析失败:', error);
        }
        
        // 返回十六进制表示
        return {
            hex: data.toString('hex'),
            length: data.length
        };
    }
    
    identifyMessageType(data) {
        // 尝试根据数据特征识别消息类型
        if (data.length < 4) return null;
        
        // 检查常见的消息标识
        const firstByte = data[0];
        
        switch (firstByte) {
            case 0x01: // 弹幕消息
                return 'DanmakuMessage';
            case 0x02: // 点赞消息
                return 'LikeMessage';
            case 0x03: // 进入直播间
                return 'EnterRoomMessage';
            case 0x04: // 关注消息
                return 'FollowMessage';
            case 0x05: // 礼物消息
                return 'GiftMessage';
            case 0x06: // 统计消息
                return 'StatisticsMessage';
            default:
                return null;
        }
    }
    
    // 抖音特定的消息解析
    parseDouyinMessage(data) {
        try {
            // 抖音的WebSocket消息格式通常是：[操作码][数据长度][数据]
            if (data.length < 8) {
                return null;
            }
            
            const opcode = data.readUInt32BE(0);
            const length = data.readUInt32BE(4);
            
            if (length + 8 > data.length) {
                return null;
            }
            
            const payload = data.slice(8, 8 + length);
            
            // 根据操作码识别消息类型
            switch (opcode) {
                case 0x0001: // 弹幕消息
                    return this.parseDanmaku(payload);
                case 0x0002: // 点赞消息
                    return this.parseLike(payload);
                case 0x0003: // 进入直播间
                    return this.parseEnterRoom(payload);
                case 0x0004: // 关注消息
                    return this.parseFollow(payload);
                case 0x0005: // 礼物消息
                    return this.parseGift(payload);
                case 0x0006: // 统计消息
                    return this.parseStatistics(payload);
                default:
                    console.log(`未知操作码: ${opcode.toString(16)}`);
                    return { opcode, data: payload.toString('hex') };
            }
            
        } catch (error) {
            console.error('解析抖音消息失败:', error);
            return null;
        }
    }
    
    parseDanmaku(data) {
        try {
            const jsonStr = data.toString('utf8');
            const jsonData = JSON.parse(jsonStr);
            
            return {
                type: 'danmaku',
                user: jsonData.user,
                content: jsonData.content,
                timestamp: jsonData.timestamp
            };
        } catch (error) {
            console.error('解析弹幕消息失败:', error);
            return null;
        }
    }
    
    parseLike(data) {
        try {
            const jsonStr = data.toString('utf8');
            const jsonData = JSON.parse(jsonStr);
            
            return {
                type: 'like',
                user: jsonData.user,
                count: jsonData.count,
                total: jsonData.total
            };
        } catch (error) {
            console.error('解析点赞消息失败:', error);
            return null;
        }
    }
    
    parseEnterRoom(data) {
        try {
            const jsonStr = data.toString('utf8');
            const jsonData = JSON.parse(jsonStr);
            
            return {
                type: 'enter_room',
                user: jsonData.user,
                roomId: jsonData.room_id
            };
        } catch (error) {
            console.error('解析进入直播间消息失败:', error);
            return null;
        }
    }
    
    parseFollow(data) {
        try {
            const jsonStr = data.toString('utf8');
            const jsonData = JSON.parse(jsonStr);
            
            return {
                type: 'follow',
                user: jsonData.user,
                isFollow: jsonData.is_follow
            };
        } catch (error) {
            console.error('解析关注消息失败:', error);
            return null;
        }
    }
    
    parseGift(data) {
        try {
            const jsonStr = data.toString('utf8');
            const jsonData = JSON.parse(jsonStr);
            
            return {
                type: 'gift',
                user: jsonData.user,
                gift: jsonData.gift,
                count: jsonData.count,
                value: jsonData.value
            };
        } catch (error) {
            console.error('解析礼物消息失败:', error);
            return null;
        }
    }
    
    parseStatistics(data) {
        try {
            const jsonStr = data.toString('utf8');
            const jsonData = JSON.parse(jsonStr);
            
            return {
                type: 'statistics',
                onlineCount: jsonData.online_count,
                totalCount: jsonData.total_count,
                likeCount: jsonData.like_count
            };
        } catch (error) {
            console.error('解析统计消息失败:', error);
            return null;
        }
    }
}

// 导出单例
const protoParser = new ProtoParser();

// 预加载Proto文件
protoParser.loadProtoFiles();

module.exports = protoParser;