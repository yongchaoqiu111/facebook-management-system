const axios = require('axios');

async function testLiveRoom(roomId) {
    try {
        console.log(`正在测试直播间ID: ${roomId}`);
        
        // 使用抖音的直播间信息API
        const url = `https://www.douyin.com/webcast/room/web/enter/`;
        
        const response = await axios.post(url, {
            room_id: roomId,
            room_id_str: roomId.toString(),
            live_id: 0,
            live_id_str: "0",
            device_platform: "webapp",
            aid: 6383,
            channel: "channel_pc_web",
            search_channel: "aweme_live",
            search_source: "normal_search",
            query_correct_type: 1,
            is_filter_search: 0,
            from_group_id: "",
            disable_rs: 0,
            offset: 0,
            count: 15,
            need_filter_settings: 1,
            list_type: "single",
            pc_search_top_1_params: "{\"enable_ai_search_top_1\":1}",
            update_version_code: 170400,
            pc_client_type: 1,
            pc_libra_divert: "Windows",
            support_h265: 1,
            support_dash: 1,
            cpu_core_num: 20,
            version_code: 170400,
            version_name: "17.4.0",
            cookie_enabled: true,
            screen_width: 3440,
            screen_height: 1440,
            browser_language: "zh-CN",
            browser_platform: "Win32",
            browser_name: "Chrome",
            browser_version: "146.0.0.0",
            browser_online: true,
            engine_name: "Blink",
            engine_version: "146.0.0.0",
            os_name: "Windows",
            os_version: "10",
            device_memory: 8,
            platform: "PC",
            downlink: 10,
            effective_type: "4g",
            round_trip_time: 50,
            webid: "7622711207275120191"
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Referer': 'https://www.douyin.com/search/%E5%81%A5%E8%BA%AB?type=live',
                'Cookie': '',
                'Content-Type': 'application/json',
                'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin'
            }
        });
        
        console.log('API返回数据:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('测试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// 使用red.txt中的web_rid进行测试
testLiveRoom("467135966213");