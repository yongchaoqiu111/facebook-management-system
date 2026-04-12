# 创建数据目录
if (!(Test-Path "C:\data\db")) {
    New-Item -ItemType Directory -Force -Path "C:\data\db"
    Write-Host "已创建数据目录: C:\data\db"
}

if (!(Test-Path "C:\data\log")) {
    New-Item -ItemType Directory -Force -Path "C:\data\log"
    Write-Host "已创建日志目录: C:\data\log"
}

# 尝试启动 MongoDB
$mongodPath = "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
if (Test-Path $mongodPath) {
    Write-Host "正在启动 MongoDB..."
    Start-Process -FilePath $mongodPath -ArgumentList "--dbpath", "C:\data\db", "--logpath", "C:\data\log\mongod.log", "--bind_ip", "127.0.0.1" -WindowStyle Hidden
    Write-Host "MongoDB 已在后台启动"
    Start-Sleep -Seconds 3
    Write-Host "请检查后端是否恢复正常"
} else {
    Write-Host "错误: 找不到 mongod.exe"
    Write-Host "请检查 MongoDB 是否已安装，或手动启动 MongoDB 服务"
}
