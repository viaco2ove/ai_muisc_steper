"""sandbox_executor.py - 异步沙盒隔离执行器

将 SKILL.md 的 entry_script 通过 subprocess 隔离运行:
- args 写入临时 JSON 文件绕过 Windows CMD UTF-8 编码破坏
- 生成 wrapper.py import 脚本重建 sys.argv
- 异步捕获 stdout/stderr, 支持 InterruptToken SIGKILL
- 返回 StepResult 含 status/output/files/error_stack
"""
import os
import sys
import json
import asyncio
import tempfile
import time
from pathlib import Path
from typing import Optional, Callable, Awaitable

from ..config import config
from .schemas.agent_state import StepResult
from .schemas.tools import SkillMeta
from .interrupt_token import InterruptToken
from .utils.process_helpers import make_wrapper_script


class SandboxExecutor:
    def __init__(self, workbuddy_dir: Path, workspace_dir: Path, python_exe: str):
        self.wb_dir = Path(workbuddy_dir).resolve()
        self.ws_dir = Path(workspace_dir).resolve()
        # 兼容 MSYS/Git Bash 风格路径 /d/...
        py = python_exe
        if py.startswith("/") and len(py) > 2 and py[2] == "/":
            py = py[1] + ":\\" + py[3:].replace("/", "\\")
        self.python_exe = py

    async def execute(
        self,
        skill: SkillMeta,
        args: dict,
        project_name: str,
        interrupt_token: Optional[InterruptToken] = None,
        on_log: Optional[Callable[[str], Awaitable[None]]] = None,
        timeout: int = 1800,
    ) -> StepResult:
        """异步沙盒执行技能"""
        if not skill.executable:
            # 纯提示词技能 (返回占位, 真实执行由 LLM 处理)
            return StepResult(
                status="ok",
                output=f"纯提示词技能 {skill.name}, 需 LLM 按 SKILL.md 执行",
                files=[],
            )

        entry = skill.entry_script or (f"scripts/{skill.scripts[0]}" if skill.scripts else None)
        if not entry:
            return StepResult(status="error", error_stack=f"技能 {skill.name} 无 entry_script")

        script_path = Path(skill.skill_dir) / entry
        if not script_path.exists():
            return StepResult(status="error", error_stack=f"入口脚本不存在: {script_path}")
        # 使用绝对路径，避免 cwd 切换导致相对路径失效
        script_path = script_path.resolve()

        # 1. args → 临时 JSON 文件 (与 wrapper 同目录, 保证相对路径能找到)
        tmp_dir = tempfile.mkdtemp(prefix='sandbox/panel_sandbox_', dir='.')
        args_basename = 'args.json'
        args_path = os.path.join(tmp_dir, args_basename)
        with open(args_path, 'w', encoding='utf-8') as f:
            json.dump(args, f, ensure_ascii=False)

        # 2. wrapper.py 重建 sys.argv (同目录, 用 basename 引用 args)
        wrapper = tempfile.NamedTemporaryFile(
            mode='w', suffix='_wrapper.py', encoding='utf-8',
            delete=False, dir=tmp_dir,
        )
        wrapper.write(make_wrapper_script(str(script_path), args_basename))
        wrapper.close()
        wrapper_path = wrapper.name

        # 3. subprocess 启动
        cmd = [self.python_exe, '-X', 'utf8', wrapper_path]
        env = dict(os.environ)
        env["PYTHONIOENCODING"] = "utf-8"

        logs: list[str] = []
        process = None
        start = time.time()
        cwd = str(self.wb_dir.parent)
        process = None
        try:
            try:
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                    cwd=cwd,
                    env=env,
                )
            except FileNotFoundError as e:
                return StepResult(
                    status="error",
                    error_stack=f"找不到文件: {e}\ncmd={cmd}\nwrapper={wrapper_path}\npython={self.python_exe}",
                )

            # 注册 InterruptToken 取消 → SIGKILL
            if interrupt_token:
                interrupt_token.register_callback(lambda: process.kill())

            # 4. 实时日志读取
            while True:
                if interrupt_token and interrupt_token.is_cancelled:
                    process.kill()
                    return StepResult(
                        status="error",
                        output="\n".join(logs),
                        error_stack="任务已被用户取消",
                    )
                try:
                    line = await asyncio.wait_for(process.stdout.readline(), timeout=1.0)
                except asyncio.TimeoutError:
                    if process.returncode is not None:
                        break
                    continue
                if not line:
                    break
                decoded = line.decode('utf-8', errors='replace').rstrip()
                if decoded:
                    logs.append(decoded)
                    if on_log:
                        try:
                            await on_log(decoded)
                        except Exception:
                            pass

            await process.wait()
            duration = int((time.time() - start) * 1000)

            # 5. 检测新增文件
            new_files = self._detect_new_files(project_name) if project_name else []

            if process.returncode != 0:
                error_stack = (
                    f"Subprocess 退出码 {process.returncode}\n"
                    f"--- 最近日志 ---\n" + "\n".join(logs[-15:])
                )
                return StepResult(
                    status="error",
                    output="\n".join(logs),
                    error_stack=error_stack,
                    duration_ms=duration,
                )
            return StepResult(
                status="ok",
                output="\n".join(logs[-30:]),  # 最后 30 行
                files=new_files,
                duration_ms=duration,
            )

        except Exception as e:
            return StepResult(status="error", output="", error_stack=f"执行异常: {e}")
        finally:
            # 清理临时目录
            import shutil
            try:
                shutil.rmtree(tmp_dir, ignore_errors=True)
            except Exception:
                pass

    def _detect_new_files(self, project_name: str) -> list[str]:
        """扫描工程目录, 返回文件路径列表"""
        if not project_name:
            return []
        pdir = self.ws_dir / "project" / project_name
        if not pdir.exists():
            pdir = self.ws_dir / project_name
        if not pdir.exists():
            return []
        files = []
        for ext in (".md", ".mid", ".wav", ".mscx", ".txt", ".json"):
            files.extend([str(p) for p in pdir.rglob(f"*{ext}")])
        return files[-20:]