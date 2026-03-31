const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// 弹幕数据文件路径
const BARRAGE_FILE = path.join(path.dirname(__dirname), "json", "直播间弹幕.json");

// 创建WebSocket客户端连接
function connectBarrageWebSocket() {
    const ws = new WebSocket('ws://127.0.0.1:8888');
    
    ws.on('open', () => {
        console.log('✅ 已连接到弹幕WebSocket服务器');
    });
    
    ws.on('message', (data) => {
        try {
            const barrageData = JSON.parse(data);
            
            // 只处理普通弹幕消息（类型1）
            if (barrageData.msg_type === 'live_comment' || barrageData.type === 1) {
                const commentData = {
                    timestamp: new Date().toISOString(),
                    user: {
                        nickname: barrageData.nickname || barrageData.user?.nickname || '未知用户',
                        sec_openid: barrageData.sec_openid || barrageData.user?.sec_openid || '未知ID'
                    },
                    content: barrageData.content || barrageData.msg || '',
                    room_id: barrageData.room_id || barrageData.roomid || ''
                };
                
                console.log(`📝 [${commentData.user.nickname}]: ${commentData.content}`);
                
                // 保存到文件
                saveBarrageData(commentData);
            }
        } catch (error) {
            console.error('❌ 解析弹幕数据失败:', error);
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket连接错误:', error);
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket连接已关闭');
        // 尝试重连
        setTimeout(() => {
            console.log('🔄 尝试重新连接...');
            connectBarrageWebSocket();
        }, 5000);
    });
    
    return ws;
}

// 保存弹幕数据到文件
function saveBarrageData(barrage) {
    try {
        let existingData = [];
        
        // 读取现有数据
        if (fs.existsSync(BARRAGE_FILE)) {
            const data = fs.readFileSync(BARRAGE_FILE, 'utf8');
            existingData = JSON.parse(data);
        }
        
        // 添加新数据
        existingData.push(barrage);
        
        // 保存文件
        fs.writeFileSync(BARRAGE_FILE, JSON.stringify(existingData, null, 2));
        
        console.log(`💾 弹幕数据已保存，当前共 ${existingData.length} 条`);
    } catch (error) {
        console.error('❌ 保存弹幕数据失败:', error);
    }
}

// 启动弹幕监听
function startBarrageMonitor() {
    console.log('🚀 正在启动弹幕监听...');
    console.log('📡 连接到 ws://127.0.0.1:8888');
    console.log('💡 请确保DouyinBarrageGrab已启动并运行在8888端口');
    
    const ws = connectBarrageWebSocket();
    
    return ws;
}

// 如果直接运行此脚本
if (require.main === module) {
    startBarrageMonitor();
}

module.exports = {
    startBarrageMonitor,
    saveBarrageData
};