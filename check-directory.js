const fs = require('fs');
const path = require('path');

const instagramAssetsDir = path.join(__dirname, 'user-config/assets/instgram');

console.log('检查目录:', instagramAssetsDir);

if (fs.existsSync(instagramAssetsDir)) {
  console.log('✓ 目录存在');
  
  const files = fs.readdirSync(instagramAssetsDir);
  console.log('目录中的文件:', files);
  
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  });
  
  console.log('图片文件:', imageFiles);
  
} else {
  console.log('✗ 目录不存在');
  
  // 尝试创建目录
  try {
    fs.mkdirSync(instagramAssetsDir, { recursive: true });
    console.log('✓ 目录已创建');
  } catch (error) {
    console.log('创建目录失败:', error.message);
  }
}
