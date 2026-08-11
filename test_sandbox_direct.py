#!/usr/bin/env python3
"""Direct test of SandboxExecutor for song_engineer"""
import sys
import asyncio
sys.path.insert(0, 'backend')

from pathlib import Path
from app.core.tool_registry import ToolRegistry
from app.core.sandbox_executor import SandboxExecutor
from app.core.interrupt_token import InterruptToken

async def test():
    tr = ToolRegistry(Path('.workbuddy/skills'))
    skill = tr.skills.get('song_engineer')

    print(f"Skill: {skill.name}")
    print(f"Entry script: {skill.entry_script}")
    print(f"Executable: {skill.executable}")
    print()

    sandbox = SandboxExecutor(
        workbuddy_dir=Path('.workbuddy'),
        workspace_dir=Path('workspace'),
        python_exe='D:/ProgramData/miniconda3/python.exe',
    )

    # Test args
    args = {"command": "diagnose", "name": "测试LLM工程"}

    print(f"Executing with args: {args}")
    print("-" * 60)

    token = InterruptToken()

    async def on_log(log):
        print(f"[LOG] {log}")

    result = await sandbox.execute(
        skill=skill,
        args=args,
        project_name="测试LLM工程",
        interrupt_token=token,
        on_log=on_log,
    )

    print("-" * 60)
    print(f"Status: {result.status}")
    print(f"Output: {result.output[:500] if result.output else 'None'}")
    print(f"Files: {result.files}")
    if result.error_stack:
        print(f"Error: {result.error_stack[:300]}")

asyncio.run(test())