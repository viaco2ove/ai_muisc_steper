#!/bin/bash
# panel_app 启动脚本 (Linux/Mac)
cd "$(dirname "$0")/../../"
echo "Starting AI音乐工程工作台 backend..."
PYTHON=${PYTHON_EXE:-python}
$PYTHON -m uvicorn backend.app.main:app --reload --port 8000 --host 127.0.0.1
