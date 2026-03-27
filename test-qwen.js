const axios = require('axios');

async function testQwen() {
    const apiKey = 'sk-sp-e81ff7e4ffd8476e92e26b40dd036df4';
    const baseUrl = 'https://coding.dashscope.aliyuncs.com/v1';
    
    try {
        console.log('测试千问API调用...');
        
        const response = await axios.post(`${baseUrl}/chat/completions`, {
            model: 'qwen3.5-plus',
            messages: [
                {
                    role: 'user',
                    content: '你好，请回复"测试成功"'
                }
            ],
            max_tokens: 100,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        console.log('✅ API调用成功！');
        console.log('响应:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ API调用失败:', error.message);
        if (error.response) {
            console.log('状态码:', error.response.status);
            console.log('响应体:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testQwen();
