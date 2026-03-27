const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const COOKIE_FILE = path.join(__dirname, "cookie.txt");

async function loginWithCookie() {
    console.log("正在携带Cookie登录...");
    
    if (!fs.existsSync(COOKIE_FILE)) {
        console.error("Cookie文件不存在，请先保存Cookie");
        return false;
    }
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"]
    });
    
    const page = await browser.newPage();
    
    try {
        // 加载Cookies
        const cookieContent = fs.readFileSync(COOKIE_FILE, "utf8");
        let cookies = [];
        
        // 检查是否是JSON格式
        if (cookieContent.trim().startsWith("[")) {
            // JSON格式
            cookies = JSON.parse(cookieContent);
        } else {
            // 浏览器导出格式
            const lines = cookieContent.trim().split("\n");
            for (const line of lines) {
                if (line.trim() && !line.startsWith("#")) {
                    const parts = line.split("\t");
                    if (parts.length >= 7) {
                        const [domain, flag, path, secure, expires, name, value] = parts;
                        cookies.push({
                            name: name.trim(),
                            value: value.trim(),
                            domain: domain.trim(),
                            path: path.trim(),
                            secure: secure.trim() === "✓",
                            httpOnly: false,
                            sameSite: "Lax"
                        });
                    }
                }
            }
        }
        
        // 设置Cookies
        await page.setCookie(...cookies);
        
        // 打开抖音
        await page.goto("https://www.douyin.com", {
            waitUntil: "networkidle2",
            timeout: 60000
        });
        
        console.log("已携带Cookie登录抖音");
        console.log("按Ctrl+C退出");
        
        // 保持浏览器打开
        await new Promise(() => {});
    } catch (error) {
        console.error("携带Cookie登录失败:", error);
        await browser.close();
        throw error;
    }
}

// 执行登录
loginWithCookie();
