@echo off
REM panel_app 启动脚本 (Windows)
cd /d "%~dp0\..\..\"
echo Starting AI音乐工程工作台 backend...
echo.
REM 查找并关闭已占用端口 8120 的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8120 ^| findstr LISTENING') do (
    echo Killing process %%a on port 8120...
    taskkill //F //PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
REM 使用 miniconda3 python (有 fastapi)
set PY=D:\ProgramData\miniconda3\python.exe
echo Python: %PY%
echo Port: 8120
echo.
%PY% -X utf8 -m uvicorn backend.app.main:app --port 8120 --host 127.0.0.1
pause
