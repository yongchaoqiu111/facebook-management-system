const { chromium } = require('playwright');

async function closeFacebookWindow() {
    console.log('启动关闭浏览器窗口技能...');
    
    try {
        console.log('检查是否有打开的浏览器窗口...');
        
        // 使用系统命令关闭所有Chrome和Edge浏览器进程
        const { exec } = require('child_process');
        
        // 关闭Chrome浏览器
        console.log('关闭Chrome浏览器进程...');
        exec('taskkill /F /IM chrome.exe', (error, stdout, stderr) => {
            if (error) {
                console.log('没有找到Chrome进程或关闭失败');
            } else {
                console.log('Chrome浏览器已关闭');
            }
        });
        
        // 关闭Edge浏览器
        console.log('关闭Edge浏览器进程...');
        exec('taskkill /F /IM msedge.exe', (error, stdout, stderr) => {
            if (error) {
                console.log('没有找到Edge进程或关闭失败');
            } else {
                console.log('Edge浏览器已关闭');
            }
        });
        
        console.log('关闭浏览器窗口操作已执行');
        
        return {
            code: 0,
            data: {
                status: 'success',
                message: '浏览器窗口关闭操作已执行'
            }
        };
        
    } catch (error) {
        console.error('关闭浏览器窗口失败:', error.message);
        return {
            code: 500,
            data: {
                status: 'failed',
                message: '关闭浏览器窗口失败'
            }
        };
    }
}

module.exports = { closeFacebookWindow };
