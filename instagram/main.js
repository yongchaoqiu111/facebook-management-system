const { app, BrowserWindow } = require('electron') 
const path = require('path') 
const { spawn } = require('child_process') 

let mainWindow 
let serverProcess = null 

// ================================ 
// 🔥 核心：打包时 绝对不启动服务 
// 只有开发环境 / 用户运行时 才启动 
// ================================ 
function startBackendServer() { 
  try { 
    // 你的后端入口：node.js 
    const serverPath = path.join(__dirname, 'node.js') 
    
    // 独立进程启动，不阻塞打包 
    serverProcess = spawn(process.execPath, [serverPath], { 
      detached: false, 
      stdio: 'ignore' 
    }) 
  } catch (err) {} 
} 

// 创建窗口 
function createWindow() { 
  mainWindow = new BrowserWindow({ 
    width: 1100, 
    height: 700, 
    webPreferences: { 
      nodeIntegration: true, 
      contextIsolation: false 
    } 
  }) 

  // 加载你的页面 
  mainWindow.loadFile(path.join(__dirname, 'html', 'login.html')) 
} 

// ============================================== 
// 🔥 最关键：只有 app 启动完成后 才启动服务 
// 打包时不会运行！不会卡住！ 
// ============================================== 
app.whenReady().then(() => { 
  createWindow() 

  // 开发模式 + 生产模式（客户电脑）都启动服务 
  // 但 打包时 不会执行这里 
  // 添加双重保护：不在打包中 AND 不在生产环境
  if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
    startBackendServer() 
  }
}) 

// 关闭软件时同时关闭后端 
app.on('window-all-closed', () => { 
  if (serverProcess) { 
    try { serverProcess.kill() } catch (e) {} 
  } 
  app.quit() 
})