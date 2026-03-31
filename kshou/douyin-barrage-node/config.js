// 配置文件
module.exports = {
    // 代理服务器配置
    proxy: {
        httpPort: 3005,
        httpsPort: 3006,
        allowedHosts: [
            'live.kuaishou.com',
            'kuaishou.com',
            'kuaishou.cn',
            'localhost',
            '127.0.0.1'
        ]
    },
    
    // WebSocket服务器配置
    websocket: {
        port: 8889,
        maxConnections: 100
    },
    
    // 进程过滤配置
    processFilter: {
        enabled: true,
        allowedProcesses: [
            'chrome.exe',
            'msedge.exe',
            'firefox.exe',
            'douyin.exe',
            'LiveCompanion.exe'
        ]
    },
    
    // 消息类型配置
    messageTypes: {
        DANMU: 1,      // 弹幕消息
        LIKE: 2,        // 点赞消息
        ENTER: 3,       // 进入直播间
        FOLLOW: 4,      // 关注消息
        GIFT: 5,        // 礼物消息
        STATISTICS: 6,  // 统计消息
        FANS_CLUB: 7,   // 粉丝团消息
        SHARE: 8,       // 直播间分享
        EXIT: 9         // 下播
    },
    
    // 日志配置
    logging: {
        enabled: true,
        level: 'info',
        file: './logs/barrage.log'
    },
    
    // 证书配置
    certificate: {
        commonName: 'KuaishouBarrageProxy',
        organization: 'Developer',
        country: 'CN',
        state: 'Beijing',
        locality: 'Beijing',
        validityDays: 365
    }
};