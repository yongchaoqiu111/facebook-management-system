const fs = require('fs');
const path = require('path');

async function testFacebookRealPost() {
  console.log('Testing Facebook real post with image...');
  
  // 构建请求数据
  const postData = {
    text: '测试 Facebook 真实发图片功能',
    imagePaths: ['images/1.png'],
    publish: false
  };
  
  console.log('Post data:', postData);
  
  // 检查图片文件是否存在
  const imagePath = path.join(__dirname, 'images', '1.png');
  if (fs.existsSync(imagePath)) {
    console.log('✓ Image file exists:', imagePath);
  } else {
    console.log('✗ Image file not found:', imagePath);
    return;
  }
  
  // 发送请求到 Facebook 发帖 API
  try {
    const response = await fetch('http://localhost:3000/facebook/post/headed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    
    const result = await response.json();
    console.log('API response:', result);
    
    if (result.ok) {
      console.log('✓ Facebook post API called successfully');
      console.log('Post ID:', result.result.data.postId);
      console.log('Post status:', result.result.data.status);
    } else {
      console.log('✗ Facebook post API failed:', result.error);
    }
  } catch (error) {
    console.log('✗ Error calling Facebook post API:', error.message);
  }
}

testFacebookRealPost().catch(console.error);
