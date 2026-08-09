@echo off
REM panel_app 启动脚本 (Windows)
cd /d "%~dp0\..\..\"
echo Starting AI音乐工程工作台 backend...
echo Python: %PYTHON_EXE%
echo Port: 8000
echo.
REM 优先用 .venv python，否则用系统 python
if exist ".venv\python.exe" (
    set PY=.\.venv\python.exe
) else (
    set PY=python
)
%PY% -m uvicorn backend.app.main:app --reload --port 8000 --host 127.0.0.1
pause
