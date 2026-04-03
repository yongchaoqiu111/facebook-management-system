const { app, BrowserWindow } = require('electron');
const path = require('path');
const cp = require('child_process');

let mainWindow;

// ==========================================
// 🔥 打包过程中直接退出，不执行任何逻辑
// ==========================================
// 检查是否在打包过程中：
// 1. npm run dist命令：process.env.npm_lifecycle_event === 'dist'
if (process.env.npm_lifecycle_event === 'dist') {
  // 打包时直接退出，不启动任何服务
  console.log('检测到打包环境，直接退出...');
  app.exit();
}

// ==========================================
// 下面只有【客户运行exe】才会执行！
// ==========================================
app.whenReady().then(() => {
  // 启动服务
  let nodePath;
  if (app.isPackaged) {
    // 打包环境：从resources目录启动
    nodePath = path.join(process.resourcesPath, 'node.js');
  } else {
    // 开发环境：从项目根目录启动
    nodePath = path.join(__dirname, 'node.js');
  }
  
  cp.spawn('node', [nodePath], {
    stdio: 'ignore',
    detached: true
  });

  // 打开界面
  createWindow();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3003/login.html');
  }, 2000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => app.quit());