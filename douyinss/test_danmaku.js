const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testDanmakuCapture() {
    console.log('=== 开始测试弹幕抓取 ===');
    
    try {
        // 启动浏览器
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1920, height: 1080 },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized',
                '--disable-web-security'
            ]
        });
        
        const page = await browser.newPage();
        
        // 访问抖音直播间
        const roomUrl = 'https://live.douyin.com/77994347272';
        console.log(`访问直播间: ${roomUrl}`);
        await page.goto(roomUrl, { waitUntil: 'networkidle2' });
        
        // 等待页面加载完成
        console.log('等待页面加载...');
        await page.waitForSelector('body');
        
        // 注入测试脚本并返回结果
        const testResults = await page.evaluate(() => {
            const results = [];
            
            // 主要选择器
            const selectors = [
                '.webcast-chatroom___item',
                '[class*="chatroom"] [class*="item"]',
                '[data-e2e="chat-item"]',
                '.webcast-chatroom',
                '[class*="chatroom"]',
                '.chat-item',
                '[class*="item"]'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                const result = {
                    selector: selector,
                    count: elements.length,
                    firstElementHtml: elements.length > 0 ? elements[0].outerHTML.substring(0, 500) + '...' : null,
                    firstElementText: elements.length > 0 ? elements[0].innerText : null
                };
                results.push(result);
            }
            
            return results;
        });
        
        // 输出测试结果
        console.log('=== 测试结果 ===');
        testResults.forEach(result => {
            console.log(`选择器 "${result.selector}": ${result.count} 个元素`);
            if (result.firstElementText) {
                console.log(`第一个元素文本: ${result.firstElementText}`);
            }
        });
        
        // 等待一段时间观察弹幕
        console.log('等待30秒观察弹幕...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        await browser.close();
        console.log('=== 测试完成 ===');
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testDanmakuCapture();
