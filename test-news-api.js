const axios = require('axios');

// 测试 NewsAPI
async function testNewsAPI() {
    try {
        console.log('测试 NewsAPI...');
        const apiKey = '05a90af01d3040b793f74d6e41c5ea72';
        const keywords = 'AI';
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&language=zh&sortBy=publishedAt&apiKey=${apiKey}`;
        
        const response = await axios.get(url);
        console.log('NewsAPI 响应状态:', response.status);
        console.log('NewsAPI 响应数据:', JSON.stringify(response.data, null, 2));
        
        if (response.data.articles && response.data.articles.length > 0) {
            console.log('NewsAPI 搜索结果数量:', response.data.articles.length);
            console.log('第一个结果:', response.data.articles[0]);
        } else {
            console.log('NewsAPI 没有返回结果');
        }
        
    } catch (error) {
        console.error('NewsAPI 调用失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

// 测试 GNews API
async function testGNewsAPI() {
    try {
        console.log('\n测试 GNews API...');
        const apiKey = 'ef01dbeea077f62ff84ad01421baf4af';
        const keywords = 'AI';
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(keywords)}&lang=zh&max=10&apikey=${apiKey}`;
        
        const response = await axios.get(url);
        console.log('GNews API 响应状态:', response.status);
        console.log('GNews API 响应数据:', JSON.stringify(response.data, null, 2));
        
        if (response.data.articles && response.data.articles.length > 0) {
            console.log('GNews API 搜索结果数量:', response.data.articles.length);
            console.log('第一个结果:', response.data.articles[0]);
        } else {
            console.log('GNews API 没有返回结果');
        }
        
    } catch (error) {
        console.error('GNews API 调用失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

// 运行测试
async function runTests() {
    await testNewsAPI();
    await testGNewsAPI();
}

runTests();
