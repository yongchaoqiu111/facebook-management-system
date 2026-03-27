@echo off
taskkill /f /im node.exe >nul 2>&1
start /b node js/login.js
start http://localhost:3002/login.html
