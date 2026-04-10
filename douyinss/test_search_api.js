const axios = require('axios');

async function testSearchApi() {
    try {
        console.log('正在测试搜索API...');
        
        const keyword = '多多姐';
        const url = `http://localhost:3001/api/search-live-rooms?keyword=${encodeURIComponent(keyword)}`;
        
        const response = await axios.get(url);
        
        console.log('搜索API返回结果:');
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('搜索测试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testSearchApi();