const fs = require('fs');
const path = require('path');

// 备份browser-automation.js文件
const sourceFile = path.join(__dirname, 'douyin-barrage-node', 'browser-automation.js');
const backupFile = path.join(__dirname, 'douyin-barrage-node', 'browser-automation_备份.js');

try {
    const content = fs.readFileSync(sourceFile, 'utf8');
    fs.writeFileSync(backupFile, content);
    console.log('✅ 备份成功！');
    console.log(`源文件: ${sourceFile}`);
    console.log(`备份文件: ${backupFile}`);
} catch (error) {
    console.error('备份失败:', error.message);
}
