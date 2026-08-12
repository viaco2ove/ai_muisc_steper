"""tools.py - 工具 / Skill 数据类型定义"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class SkillMeta:
    """从 SKILL.md 解析的技能元数据"""
    name: str
    description: str = ""
    entry_script: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)  # {param_name: {type, description, required}}
    executable: bool = False
    skill_dir: Optional[Path] = None
    scripts: List[str] = field(default_factory=list)
    triggers: str = ""
    dedicated: bool = False  # True=agent core 专用（backend/skills），不进 技能面板

    def to_openai_function_schema(self) -> Dict[str, Any]:
        """编译为 OpenAI Function Calling 格式"""
        properties = {}
        required = []

        for param_name, param_info in self.parameters.items():
            if isinstance(param_info, str):
                p_type = "string"
                p_desc = param_info
                p_req = False
            elif isinstance(param_info, dict):
                p_type = param_info.get("type", "string")
                p_desc = param_info.get("description", "")
                p_req = param_info.get("required", False)
            else:
                p_type = "string"
                p_desc = str(param_info)
                p_req = False

            properties[param_name] = {
                "type": p_type,
                "description": p_desc,
            }
            if p_req:
                required.append(param_name)

        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description or f"执行 {self.name} 技能",
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                },
            },
        }


@dataclass
class FunctionCallSpec:
    """模型发起的工具调用"""
    call_id: str
    tool_name: str
    arguments: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_openai(cls, tool_call: Dict[str, Any]) -> "FunctionCallSpec":
        import json
        fn = tool_call.get("function", {})
        args_raw = fn.get("arguments", "{}")

        # 解析参数，处理各种边缘情况
        args = {}
        try:
            if isinstance(args_raw, str):
                args_raw = args_raw.strip()
                # 情况1: 正常 JSON
                args = json.loads(args_raw)
            else:
                args = args_raw

            # 情况2: 嵌套 JSON 字符串（如 '{"key": "{\"nested\": \"value\"}"}'）
            # 如果解析结果是单字符串键且值是 JSON 字符串，尝试二次解析
            if isinstance(args, dict):
                for k, v in args.items():
                    if isinstance(v, str) and v.startswith('{') and v.endswith('}'):
                        try:
                            args[k] = json.loads(v)
                        except Exception:
                            pass  # 不是有效的 JSON，保持原值
        except json.JSONDecodeError as e:
            # 尝试清理常见的格式问题
            cleaned = args_raw.replace('\\"', '"').replace('""', '"')
            try:
                args = json.loads(cleaned)
            except Exception:
                # 最后尝试提取 JSON 对象
                import re
                match = re.search(r'\{[^{}]*\}', args_raw)
                if match:
                    try:
                        args = json.loads(match.group())
                    except Exception:
                        args = {}
                else:
                    args = {}

        return cls(
            call_id=tool_call.get("id", ""),
            tool_name=fn.get("name", ""),
            arguments=args or {},
        )


@dataclass
class ToolSpec:
    """统一对外的工具描述"""
    name: str
    description: str
    parameters: Dict[str, Any]
    executable: bool
    entry_script: Optional[str] = None