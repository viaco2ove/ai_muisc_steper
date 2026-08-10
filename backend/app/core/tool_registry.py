"""tool_registry.py - 工具注册中心

扫描 .workbuddy/skills/*/SKILL.md, 动态编译为 OpenAI Function Calling Tools Schema。
不硬编码任何技能名/参数 - 完全从 SKILL.md 读取。
"""
from pathlib import Path
from typing import Dict, List, Optional

from .schemas.tools import SkillMeta, FunctionCallSpec
from .utils.frontmatter_parser import parse_skill_frontmatter


class ToolRegistry:
    def __init__(self, skills_dir: Path):
        self.skills_dir = Path(skills_dir)
        self.skills: Dict[str, SkillMeta] = {}
        self.scan()

    def scan(self) -> Dict[str, SkillMeta]:
        """扫描 skills_dir 下所有 SKILL.md, 加载为注册表"""
        self.skills.clear()
        if not self.skills_dir.exists():
            return self.skills

        for skill_folder in sorted(self.skills_dir.iterdir()):
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

            self.skills[name] = SkillMeta(
                name=name,
                description=meta.get("description", "").strip().strip('"').strip("'"),
                entry_script=meta.get("entry_script", "").strip().strip('"').strip("'"),
                parameters=params,
                executable=bool(meta.get("executable", False)),
                skill_dir=skill_folder,
                scripts=scripts,
                triggers=meta.get("触发词", ""),
            )
        return self.skills

    def get(self, name: str) -> Optional[SkillMeta]:
        return self.skills.get(name)

    def list_all(self) -> List[SkillMeta]:
        return list(self.skills.values())

    def get_openai_tools_schema(self) -> List[dict]:
        """生成 OpenAI Function Calling 的 tools 数组"""
        return [s.to_openai_function_schema() for s in self.skills.values()]

    def get_executable_tools_schema(self) -> List[dict]:
        """只返回可执行技能 (供 ReAct 优先使用)"""
        return [
            s.to_openai_function_schema()
            for s in self.skills.values()
            if s.executable
        ]