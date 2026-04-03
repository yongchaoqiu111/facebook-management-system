const { app, BrowserWindow } = require('electron')
const cp = require('child_process')
const path = require('path')

app.whenReady().then(() => {
  // 只开一个空窗口，不加载页面
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false
  })

  // 重点：启动你的原来脚本，但打包时不会跑！
  if (!app.isPackaged) {
    cp.spawn(process.execPath, [path.join(__dirname, 'node.js')], {
      stdio: 'inherit'
    })
  }
})