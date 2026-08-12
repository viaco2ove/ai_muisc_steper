"""agent_loop.py - ReAct 状态机主循环

驱动整个自主智能体:
  Step 1: ContextManager 组装消息
  Step 2: LLMClient 流式调用 (Native Tool Calling)
  Step 3: 收到 tool_calls → SandboxExecutor 执行
  Step 4: 观察结果 (stdout/files/error) → 追加 role=tool 消息
  Step 5: 再次调用 LLM → 直到无 tool_calls
  错误: Traceback 自动回传 LLM 实现自纠错
"""
import json
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional

from .schemas.events import AgentEvent, EventType
from .schemas.tools import FunctionCallSpec
from .schemas.agent_state import TaskState, LoopStatus, StepResult
from .tool_registry import ToolRegistry
from .sandbox_executor import SandboxExecutor
from .context_manager import ContextManager
from .llm_client import LLMClient
from .interrupt_token import InterruptToken

logger = logging.getLogger(__name__)


class AgentLoop:
    def __init__(
        self,
        tool_registry: ToolRegistry,
        sandbox_executor: SandboxExecutor,
        context_manager: ContextManager,
        llm_client: LLMClient,
        max_steps: int = 15,
    ):
        self.registry = tool_registry
        self.sandbox = sandbox_executor
        self.context_mgr = context_manager
        self.llm = llm_client
        self.max_steps = max_steps

    async def run_task(
        self,
        user_prompt: str,
        project_name: str = "",
        history: List[Dict[str, Any]] = None,
        interrupt_token: InterruptToken = None,
        ws_send=None,  # 兼容旧接口
        extra_system: str = "",  # P4-1: 额外系统提示（如 AI 调整专用引导）
        tool_names: Optional[List[str]] = None,  # P4-1: 受限工具集（仅暴露指定技能）
    ) -> None:
        """执行 ReAct 自主循环, 通过 ws_send 推送事件到前端"""

        async def emit(event: AgentEvent):
            payload = event.payload
            # 兼容 v1 协议: type 字段映射
            legacy_type = {
                "thought": "reasoning",
                "text": "text",
                "log": "log",
                "action": "skill_done",
                "observation": "observation",
                "artifact": "skill_done",
                "error": "error",
            }.get(event.type.value, event.type.value)
            ws_msg = {"type": legacy_type, **payload}
            if event.type == EventType.TEXT:
                ws_msg["stream"] = True
            if event.type == EventType.THOUGHT:
                ws_msg.setdefault("done", False)
            if ws_send:
                await ws_send(ws_msg)

        task_state = TaskState()
        token = interrupt_token or InterruptToken()

        # 1. 初始化上下文
        messages = self.context_mgr.build_initial_messages(
            user_prompt, project_name, history or []
        )
        # P4-1: 注入 AI 调整专用系统提示（作为独立的 system 消息插在末尾）
        if extra_system:
            messages.append({"role": "system", "content": extra_system})

        # 工具集：默认全部，受限模式只暴露指定技能
        if tool_names:
            tools = [
                s.to_openai_function_schema()
                for s in (self.registry.get(n) for n in tool_names)
                if s is not None
            ]
        else:
            tools = self.registry.get_openai_tools_schema()

        await emit(AgentEvent(type=EventType.CHAIN_START, payload={
            "tools": [t["function"]["name"] for t in tools]
        }))

        while task_state.step < self.max_steps:
            task_state.increment_step()

            if token.is_cancelled:
                await emit(AgentEvent(type=EventType.ERROR, payload={
                    "msg": "任务已取消"
                }))
                task_state.status = LoopStatus.CANCELLED
                break

            # 2. LLM 流式调用
            tool_calls: List[Dict[str, Any]] = []
            assistant_msg_content = ""

            try:
                async for kind, payload in self.llm.chat_stream(messages, tools=tools):
                    if token.is_cancelled:
                        break

                    if kind == "reasoning":
                        await emit(AgentEvent(type=EventType.THOUGHT, payload={
                            "msg": payload, "done": False
                        }))
                    elif kind == "content":
                        assistant_msg_content += payload
                        await emit(AgentEvent(type=EventType.TEXT, payload={
                            "msg": payload, "done": False
                        }))
                    elif kind == "tool_calls":
                        # 累积所有 tool_calls（LLM 可能一次返回多个）
                        if not tool_calls:
                            tool_calls = payload
                        else:
                            tool_calls.extend(payload)
            except Exception as e:
                await emit(AgentEvent(type=EventType.ERROR, payload={
                    "msg": f"LLM调用失败: {e}"
                }))
                task_state.status = LoopStatus.ERROR
                break

            # 3. 收尾流式事件
            await emit(AgentEvent(type=EventType.THOUGHT, payload={
                "msg": "", "done": True
            }))

            # 4. 无工具调用 → 任务结束
            if not tool_calls:
                await emit(AgentEvent(type=EventType.TEXT, payload={
                    "msg": "", "done": True
                }))
                task_state.status = LoopStatus.SUCCESS
                break

            # 5. 追加 assistant 消息 (含 tool_calls)
            messages.append({
                "role": "assistant",
                "content": assistant_msg_content or None,
                "tool_calls": [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": tc["function"],
                    }
                    for tc in tool_calls
                ],
            })

            # 6. 串行执行每个工具
            for tc in tool_calls:
                if token.is_cancelled:
                    break

                call = FunctionCallSpec.from_openai(tc)
                task_state.record_tool_call(call.tool_name)

                # 死循环检测
                if task_state.detect_loop():
                    await emit(AgentEvent(type=EventType.ERROR, payload={
                        "msg": f"检测到重复调用 {call.tool_name}, 自动停止"
                    }))
                    task_state.status = LoopStatus.ERROR
                    break

                # 7. 分发到沙盒执行
                skill = self.registry.get(call.tool_name)
                await emit(AgentEvent(type=EventType.ACTION, payload={
                    "tool": call.tool_name, "args": call.arguments,
                    "call_id": call.call_id
                }))

                if not skill:
                    result = StepResult(
                        status="error",
                        error_stack=f"未知技能: {call.tool_name}",
                    )
                elif not skill.executable:
                    # 纯提示词技能: 委托给 llm_agent 旧逻辑 (跳过, 用 LLM 自然回答)
                    result = StepResult(
                        status="ok",
                        output=f"提示词技能 {call.tool_name} 由 LLM 上下文执行",
                        files=[],
                    )
                else:
                    async def on_log(log: str):
                        await emit(AgentEvent(type=EventType.LOG, payload={
                            "tool": call.tool_name, "msg": log
                        }))

                    result = await self.sandbox.execute(
                        skill=skill,
                        args=call.arguments,
                        project_name=project_name,
                        interrupt_token=token,
                        on_log=on_log,
                    )

                # 8. 观察结果 → role=tool 消息
                tool_msg = result.to_tool_message(call.call_id)
                messages.append(tool_msg)

                await emit(AgentEvent(type=EventType.OBSERVATION, payload={
                    "call_id": call.call_id,
                    "tool": call.tool_name,
                    "status": result.status,
                    "output": result.output[-200:] if result.output else "",
                    "files": result.files,
                }))

                if result.files:
                    await emit(AgentEvent(type=EventType.ARTIFACT, payload={
                        "files": result.files, "project": project_name
                    }))

                if result.status == "ok":
                    await emit(AgentEvent(type=EventType.ACTION, payload={
                        "tool": call.tool_name, "status": "ok", "files": result.files
                    }))
                else:
                    await emit(AgentEvent(type=EventType.ACTION, payload={
                        "tool": call.tool_name, "status": "error",
                        "error": result.error_stack[:200]
                    }))

            # 死循环 break 后退出外层
            if task_state.status == LoopStatus.ERROR:
                break

        # 超过最大步数
        if task_state.step >= self.max_steps and task_state.status == LoopStatus.RUNNING:
            await emit(AgentEvent(type=EventType.ERROR, payload={
                "msg": f"达到最大 ReAct 迭代步数 ({self.max_steps})"
            }))
            task_state.status = LoopStatus.MAX_STEPS

        await emit(AgentEvent(type=EventType.CHAIN_DONE, payload={
            "total": task_state.step, "ok": 1 if task_state.status == LoopStatus.SUCCESS else 0,
            "fail": 1 if task_state.status != LoopStatus.SUCCESS else 0,
        }))

        if project_name:
            await emit(AgentEvent(type=EventType.ACTION, payload={
                "project": project_name  # 触发前端 project_updated
            }))