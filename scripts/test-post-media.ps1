$body = @{
    text = "测试微博发图 - 登录状态检测"
    imagePaths = @("images/1.png")
    publish = $false
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/weibo/post/media/headed" -Method POST -Body $body -ContentType "application/json"
