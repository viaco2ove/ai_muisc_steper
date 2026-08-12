"""agent_core.py - 简化版 WorkBuddy：扫描/校验/执行 .workbuddy 技能

参数传递: 通过 Python -c import 脚本模块，绕过 Windows 命令行 UTF-8 编码问题。
零 AI 逻辑，只接收结构化参数，subprocess 调技能脚本，捕获日志，返回产物。
"""

import os
import re
import sys
import json
import subprocess
from pathlib import Path
from typing import Callable, Optional

from ..config import config


def _parse_frontmatter(text: str) -> dict:
    """解析 SKILL.md 的 YAML frontmatter（用 yaml 库，正确处理引号/多行）"""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        return {}
    import yaml
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except Exception:
        # 降级：逐行裸解析
        meta = {}
        for line in m.group(1).splitlines():
            if ":" in line:
                k, _, v = line.partition(":")
                meta[k.strip()] = v.strip()
    # params 字段若是 str 转 dict
    if "params" in meta and isinstance(meta["params"], str):
        try:
            import json
            meta["params"] = json.loads(meta["params"])
        except Exception:
            pass
    if "executable" in meta:
        meta["executable"] = bool(meta["executable"])
    else:
        meta["executable"] = False
    return meta


class AgentCore:
    def __init__(self, workbuddy_dir: Path = None, workspace_dir: Path = None,
                 backend_skills_dir: Path = None):
        self.wb_dir = Path(workbuddy_dir or config.workbuddy_dir)
        self.ws_dir = Path(workspace_dir or config.workspace_dir)
        self.skills_dir = self.wb_dir / "skills"           # 公用技能
        self.backend_skills_dir = Path(backend_skills_dir or config.backend_skills_dir)  # 专用技能
        self.skills: dict = {}
        self.scan()

    # ---------------------------------------------------------------- 扫描
    def scan(self) -> dict:
        """扫描 .workbuddy/skills（公用）与 backend/skills（专用），读 frontmatter。
        专用技能标记 dedicated=True，默认不进 list_skills（技能面板）。"""
        self.skills = {}
        shared_dirs = {self.skills_dir.resolve()}
        for skills_dir, is_dedicated in (
            (self.skills_dir, False),
            (self.backend_skills_dir, True),
        ):
            if not skills_dir.exists():
                continue
            for sd in sorted(skills_dir.iterdir()):
                if not sd.is_dir():
                    continue
                sm = sd / "SKILL.md"
                if not sm.exists():
                    continue
                try:
                    text = sm.read_text(encoding="utf-8")
                except Exception:
                    continue
                meta = _parse_frontmatter(text)
                name = meta.get("name", sd.name)
                scripts_dir = sd / "scripts"
                scripts = [s.name for s in scripts_dir.glob("*.py")] if scripts_dir.exists() else []
                self.skills[name] = {
                    "name": name,
                    "description": meta.get("description", "").strip('"').strip("'"),
                    "triggers": meta.get("触发词", ""),
                    "entry_script": meta.get("entry_script", "").strip('"').strip("'"),
                    "params": meta.get("params", {}) if isinstance(meta.get("params"), dict) else {},
                    "executable": meta.get("executable", False),
                    "dir": str(sd),
                    "scripts": scripts,
                    "dedicated": is_dedicated and sd.resolve() not in shared_dirs,
                }
        return self.skills

    def list_skills(self, exclude_dedicated: bool = True) -> list:
        """技能面板用：默认排除专用技能。run_skill/get_skill 仍可按名取到专用技能。"""
        return [
            s for s in self.skills.values()
            if not (exclude_dedicated and s.get("dedicated"))
        ]

    def get_skill(self, name: str) -> Optional[dict]:
        return self.skills.get(name)

    # ---------------------------------------------------------------- 执行
    def run_skill(self, tool: str, args: dict,
                  on_log: Callable[[str], None] = None,
                  timeout: int = 1800) -> dict:
        """执行单技能。返回 {status, files, logs, error}"""
        result = {"status": "running", "files": [], "logs": [], "error": None, "tool": tool}
        if tool not in self.skills:
            result["status"] = "error"
            result["error"] = f"未知技能: {tool}"
            return result
        skill = self.skills[tool]
        if not skill.get("executable"):
            result["status"] = "error"
            result["error"] = f"技能 {tool} 为纯提示词技能(executable=false)，需 LLM 按 SKILL.md 执行，不能直接 subprocess 调用"
            return result

        entry = skill.get("entry_script")
        if not entry:
            if skill.get("scripts"):
                entry = "scripts/" + skill["scripts"][0]
            else:
                result["status"] = "error"
                result["error"] = f"技能 {tool} 无 entry_script 且无 scripts"
                return result

        script_path = Path(skill["dir"]) / entry
        if not script_path.exists():
            result["status"] = "error"
            result["error"] = f"入口脚本不存在: {script_path}"
            return result

        # project_name 从 args 里提取
        project_name = args.get("project") or args.get("--project") or args.get("title") or args.get("--title")
        snap_before = self._snapshot_project(project_name) if project_name else set()

        # 写临时 JSON 参数文件 + wrapper 脚本，绕过 Windows 命令行 UTF-8 编码问题
        import tempfile
        args_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json',
                                                encoding='utf-8', delete=False, dir='.')
        json.dump(args, args_file, ensure_ascii=False)
        args_file.close()

        wrapper = tempfile.NamedTemporaryFile(mode='w', suffix='_wrapper.py',
                                            encoding='utf-8', delete=False, dir='.')
        wrapper.write(f"""
import sys, json, importlib.util, os, inspect
sys.path.insert(0, os.getcwd())

# 从 JSON 文件加载 args，避免命令行编码问题
with open(r'{args_file.name}', encoding='utf-8') as f:
    kw = json.load(f)

# 重建 sys.argv，让脚本内部的 argparse.parse_args() 能读到正确参数
sys.argv = ['{script_path.name}']
for k, v in kw.items():
    if v is None or v is False:
        continue
    sys.argv.append('--' + k.lstrip('-'))
    if v is not True:
        sys.argv.append(str(v))

# 加载脚本模块
script = r'{script_path.as_posix()}'
spec = importlib.util.spec_from_file_location('__skill__', script)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# 调用 main：检查签名决定传参方式
if hasattr(mod, 'main'):
    try:
        sig = inspect.signature(mod.main)
        params = list(sig.parameters.keys())
        if params:
            # main(kwargs) 形式
            mod.main(kw)
        else:
            # main() 无参数形式（内部用 argparse）
            mod.main()
    except SystemExit as e:
        sys.exit(0 if e.code is None else e.code)
    except Exception:
        pass
""")
        wrapper.close()
        cmd = [config.python_exe, "-X", "utf8", wrapper.name]
        result["logs"].append(f"$ {script_path.name} [args via json-file]")
        result["_wrapper"] = wrapper.name
        result["_args_file"] = args_file.name

        try:
            env = dict(os.environ)
            env["PYTHONIOENCODING"] = "utf-8"
            proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                cwd=str(self.wb_dir.parent), text=True,
                encoding="utf-8", errors="replace", bufsize=1,
                env=env,
            )
            try:
                for line in iter(proc.stdout.readline, ""):
                    line = line.rstrip()
                    if line:
                        result["logs"].append(line)
                        if on_log:
                            try: on_log(line)
                            except Exception: pass
            except Exception as e:
                result["logs"].append(f"[read-err] {e}")
            proc.wait(timeout=timeout)
            rc = proc.returncode
        except subprocess.TimeoutExpired:
            proc.kill()
            result["status"] = "error"
            result["error"] = f"技能 {tool} 执行超时({timeout}s)"
        except FileNotFoundError as e:
            result["status"] = "error"
            result["error"] = f"执行失败(解释器或脚本找不到): {e}"

        if rc != 0:
            result["status"] = "error"
            result["error"] = f"技能 {tool} 退出码 {rc}"
        else:
            result["status"] = "ok"

        result["files"] = self._collect_outputs(project_name, snap_before)

        # 清理 temp 文件
        for key in ("_wrapper", "_args_file"):
            f = result.pop(key, None)
            if f:
                try:
                    Path(f).unlink(missing_ok=True)
                except Exception:
                    pass
        return result

    def _snapshot_project(self, project_name: str) -> set:
        pdir = config.project_dir / project_name
        if not pdir.exists():
            return set()
        return {str(f) for f in pdir.rglob("*") if f.is_file()}

    def _collect_outputs(self, project_name: str, snap_before: set) -> list:
        if not project_name:
            return []
        pdir = config.project_dir / project_name
        if not pdir.exists():
            return []
        after = {str(f) for f in pdir.rglob("*") if f.is_file()}
        new = sorted(after - snap_before)
        # 转相对路径
        return [str(Path(f).relative_to(config.project_dir)) for f in new]
