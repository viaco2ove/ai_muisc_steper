"""tool_registry.py - 工具注册中心

扫描 .workbuddy/skills/*/SKILL.md, 动态编译为 OpenAI Function Calling Tools Schema。
不硬编码任何技能名/参数 - 完全从 SKILL.md 读取。
"""
from pathlib import Path
from typing import Dict, List, Optional

from .schemas.tools import SkillMeta, FunctionCallSpec
from .utils.frontmatter_parser import parse_skill_frontmatter


class ToolRegistry:
    def __init__(self, skills_dirs):
        # 支持单个 Path 或 Path 列表（多个技能目录合并扫描）
        if isinstance(skills_dirs, (list, tuple, set)):
            self.skills_dirs = [Path(d) for d in skills_dirs]
        else:
            self.skills_dirs = [Path(skills_dirs)]
        self.skills: Dict[str, SkillMeta] = {}
        self.scan()

    def scan(self) -> Dict[str, SkillMeta]:
        """扫描所有 skills_dir 下 SKILL.md, 加载为注册表。
        位于 .workbuddy/skills 的为公用技能；位于 backend/skills 的标记为 dedicated=True（专用）。"""
        self.skills.clear()
        # 公用技能目录（含 .workbuddy 的 skills）不标记 dedicated
        shared_dirs = {
            d.resolve() for d in self.skills_dirs
            if "workbuddy" in str(d.resolve())
        }
        for skills_dir in self.skills_dirs:
            if not skills_dir.exists():
                continue
            for skill_folder in sorted(skills_dir.iterdir()):
                if not skill_folder.is_dir():
                    continue
                skill_md = skill_folder / "SKILL.md"
                if not skill_md.exists():
                    continue
                try:
                    text = skill_md.read_text(encoding="utf-8")
                except Exception:
                    continue

                meta = parse_skill_frontmatter(text)
                name = meta.get("name", skill_folder.name)

                # 提取 params (dict 格式), 否则空 dict
                params = meta.get("params", {})
                if not isinstance(params, dict):
                    params = {}

                # scripts 列表
                scripts_dir = skill_folder / "scripts"
                scripts = [s.name for s in scripts_dir.glob("*.py")] if scripts_dir.exists() else []

                dedicated = skill_folder.resolve() not in shared_dirs

                self.skills[name] = SkillMeta(
                    name=name,
                    description=meta.get("description", "").strip().strip('"').strip("'"),
                    entry_script=meta.get("entry_script", "").strip().strip('"').strip("'"),
                    parameters=params,
                    executable=bool(meta.get("executable", False)),
                    skill_dir=skill_folder,
                    scripts=scripts,
                    triggers=meta.get("触发词", ""),
                    dedicated=dedicated,
                )
        return self.skills

    def get(self, name: str) -> Optional[SkillMeta]:
        return self.skills.get(name)

    def list_all(self) -> List[SkillMeta]:
        return list(self.skills.values())

    def get_openai_tools_schema(self, include_dedicated: bool = False) -> List[dict]:
        """生成 OpenAI Function Calling 的 tools 数组。
        include_dedicated=False（默认）只暴露公用技能，专用技能需经 tool_names 显式调用。"""
        return [
            s.to_openai_function_schema()
            for s in self.skills.values()
            if include_dedicated or not s.dedicated
        ]

    def get_executable_tools_schema(self, include_dedicated: bool = False) -> List[dict]:
        """只返回可执行技能 (供 ReAct 优先使用)"""
        return [
            s.to_openai_function_schema()
            for s in self.skills.values()
            if s.executable and (include_dedicated or not s.dedicated)
        ]