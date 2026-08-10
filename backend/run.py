# -*- coding: utf-8 -*-
"""run.py - 读取 backend/.env 启动后端"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 读取 backend/.env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

import uvicorn
from app.config import config

if __name__ == "__main__":
    print(f"Backend: {config.host}:{config.port}")
    print(f"Workspace: {config.workspace_dir}")
    print(f"Skills: {len(config.models_config.get('models', []))}")
    uvicorn.run(
        "app.main:app",
        host=config.host,
        port=config.port,
        reload=True,
        reload_dirs=[str(Path(__file__).resolve().parent)],
    )
