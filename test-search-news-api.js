const axios = require('axios');

// 测试搜索 API，使用 NewsAPI 和 GNews API
async function testSearchAPI() {
    try {
        console.log('测试搜索 API，使用 NewsAPI 和 GNews API...');
        
        const response = await axios.post('http://localhost:3000/api/search', {
            keywords: 'AI',
            platforms: ['newsapi', 'gnews']
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API 调用成功！');
        console.log('响应状态:', response.status);
        console.log('响应数据:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('搜索结果数量:', response.data.results.length);
            if (response.data.results.length > 0) {
                console.log('第一个结果:', response.data.results[0]);
                console.log('第二个结果:', response.data.results[1]);
            }
        } else {
            console.log('搜索失败:', response.data.message);
        }
        
    } catch (error) {
        console.error('API 调用失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

testSearchAPI();
