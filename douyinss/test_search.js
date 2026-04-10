const axios = require('axios');

async function testSearch() {
    try {
        const response = await axios.get('http://localhost:3001/api/search-live-rooms', {
            params: {
                keyword: '美容'
            }
        });
        
        console.log('搜索结果:');
        console.log(JSON.stringify(response.data, null, 2));
        
        // 从red.txt中获取的web_rid是 "467135966213"
        const redTxtWebRid = "467135966213";
        console.log('\nred.txt中的web_rid:', redTxtWebRid);
        
        // 检查搜索结果中是否有匹配的web_rid
        if (response.data.success && response.data.data) {
            response.data.data.forEach(room => {
                console.log(`直播间ID: ${room.id}, 标题: ${room.title}`);
                if (room.id === redTxtWebRid) {
                    console.log('✅ 找到匹配的web_rid!');
                }
            });
        }
    } catch (error) {
        console.error('搜索失败:', error.message);
    }
}

testSearch();