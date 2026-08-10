"""events.py - Agent 事件类型定义"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional


class EventType(str, Enum):
    THOUGHT = "thought"          # 模型思考过程 (reasoning_content)
    ACTION = "action"            # 模型决定调用工具
    LOG = "log"                  # 工具执行实时日志
    OBSERVATION = "observation"  # 工具执行结果
    TEXT = "text"                # 正文回复
    ARTIFACT = "artifact"        # 产物通知
    ERROR = "error"              # 异常事件
    CHAIN_START = "chain_start"  # 任务链开始 (兼容 v1)
    CHAIN_DONE = "chain_done"    # 任务链结束 (兼容 v1)


@dataclass
class AgentEvent:
    type: EventType
    payload: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {"type": self.type.value, **self.payload}


# 兼容旧 WS 事件类型映射
LEGACY_TYPE_MAP = {
    EventType.THOUGHT: "reasoning",
    EventType.TEXT: "text",
    EventType.LOG: "log",
    EventType.OBSERVATION: "observation",
    EventType.ACTION: "skill_done",
    EventType.ARTIFACT: "skill_done",
    EventType.ERROR: "error",
}