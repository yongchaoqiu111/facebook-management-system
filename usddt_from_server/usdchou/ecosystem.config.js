module.exports = {
  apps: [
    {
      name: 'usdchou',              // 应用名称
      script: './server.js',        // 启动文件
      
      // 集群模式配置
      instances: 'max',             // 使用所有CPU核心（也可以写数字，如4）
      exec_mode: 'cluster',         // 集群模式
      
      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      
      // 生产环境变量（如果需要）
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      
      // 自动重启配置
      watch: false,                 // 不监听文件变化（生产环境关闭）
      max_memory_restart: '500M',   // 内存超过500MB自动重启
      
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      
      // 优雅关闭
      kill_timeout: 5000,           // 等待5秒再强制关闭
      listen_timeout: 10000         // 启动超时时间
    }
  ]
};
