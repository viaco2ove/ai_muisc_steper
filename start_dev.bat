@echo off
REM AI音乐工程工作台 开发环境启动脚本
REM 启动后端 (9120) 和前端热更新开发服务器 (5183)

echo ========================================
echo   AI音乐工程工作台 - 开发环境
echo ========================================
echo.

REM 启动后端
echo [1/2] 启动后端 (端口 9120)...
start "Backend" cmd /k "cd /d %~dp0 && D:\ProgramData\miniconda3\python.exe -X utf8 -m uvicorn backend.app.main:app --port 9120 --host 127.0.0.1"

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端热更新开发服务器
echo [2/2] 启动前端热更新服务器 (端口 5183)...
start "Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo ========================================
echo   启动完成！
echo   后端: http://127.0.0.1:9120
echo   前端: http://localhost:5183
echo ========================================
echo.
pause
