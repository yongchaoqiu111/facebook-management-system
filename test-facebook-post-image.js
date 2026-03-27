const { postToFacebookReal } = require('./skills/facebook/facebook-post-real');
const path = require('path');

async function testFacebookPostWithImage() {
  console.log('开始测试 Facebook 发帖带图片功能...');
  
  try {
    // 选择一张测试图片
    const imagePath = path.join(__dirname, 'images', '1.png');
    console.log('测试图片路径:', imagePath);
    
    const result = await postToFacebookReal({
      text: '测试 Facebook 发帖带图片功能 - 单独测试',
      imagePaths: [imagePath],
      publish: true
    });
    
    console.log('发帖结果:', result);
    
    if (result.code === 0) {
      console.log('发帖成功！');
    } else {
      console.log('发帖失败，错误码:', result.code);
    }
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  }
}

testFacebookPostWithImage();
