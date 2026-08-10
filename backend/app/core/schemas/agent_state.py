"""agent_state.py - Agent 状态机定义"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class LoopStatus(str, Enum):
    RUNNING = "running"
    SUCCESS = "success"
    CANCELLED = "cancelled"
    ERROR = "error"
    MAX_STEPS = "max_steps"


@dataclass
class StepResult:
    """单步工具执行结果"""
    status: str  # "ok" | "error"
    output: str = ""                # stdout / 最终摘要
    files: List[str] = field(default_factory=list)  # 新生成的文件路径
    error_stack: str = ""            # 完整 traceback (用于自纠错)
    duration_ms: int = 0

    def to_tool_message(self, call_id: str) -> Dict[str, Any]:
        """转换为 OpenAI role=tool 消息"""
        if self.status == "ok":
            content = self.output or "(无输出)"
            if self.files:
                content += "\n\n生成文件:\n" + "\n".join(self.files)
            return {"role": "tool", "tool_call_id": call_id, "content": content}
        else:
            content = f"工具执行报错 (Exit Code != 0):\n{self.error_stack or self.output}"
            return {"role": "tool", "tool_call_id": call_id, "content": content}


@dataclass
class TaskState:
    """ReAct 循环状态"""
    step: int = 0
    status: LoopStatus = LoopStatus.RUNNING
    tool_call_history: List[str] = field(default_factory=list)  # 用于检测死循环
    error_count: int = 0

    def increment_step(self):
        self.step += 1

    def detect_loop(self) -> bool:
        """检测是否在循环调用同一工具"""
        if len(self.tool_call_history) < 3:
            return False
        # 最近 3 次都调同一工具 → 视为死循环
        recent = self.tool_call_history[-3:]
        return len(set(recent)) == 1

    def record_tool_call(self, tool_name: str):
        self.tool_call_history.append(tool_name)