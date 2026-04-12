$content = Get-Content "d:\weibo\usdchou\services\socketHandlers\privateMessageHandler.js" -Raw
$content = $content -replace "require\('\.\./config/logger'\)", "require('../../config/logger')"
Set-Content "d:\weibo\usdchou\services\socketHandlers\privateMessageHandler.js" -Value $content -NoNewline
Write-Host "Fixed!"
