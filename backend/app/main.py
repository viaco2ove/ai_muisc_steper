"""main.py - FastAPI 入口 + WebSocket 对话 + API路由"""
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import config
from .api.router import router as api_router
from .core.agent_core import AgentCore
from .core.project_manager import ProjectManager
from .core.llm_agent import LLMAgent
from .core.tool_registry import ToolRegistry
from .core.sandbox_executor import SandboxExecutor
from .core.context_manager import ContextManager
from .core.llm_client import get_llm
from .core.interrupt_token import InterruptToken
from .core.agent_loop import AgentLoop

logger = logging.getLogger(__name__)

app = FastAPI(title="AI音乐工程工作台", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

# 单例
_pm = ProjectManager()
_core = AgentCore()

# v2: ReAct AgentLoop (Native Tool Calling)
_tool_registry = ToolRegistry(config.workbuddy_dir / "skills")
_sandbox_executor = SandboxExecutor(
    config.workbuddy_dir,
    config.workspace_dir,
    config.python_exe,
)
_context_manager = ContextManager(_pm)
_llm_client = get_llm("skill_ai")
_agent_loop = AgentLoop(
    tool_registry=_tool_registry,
    sandbox_executor=_sandbox_executor,
    context_manager=_context_manager,
    llm_client=_llm_client,
    max_steps=15,
)

# v1: 兼容旧逻辑
_agent = LLMAgent(_core, _pm)


@app.get("/")
def root():
    return {"name": "AI音乐工程工作台", "status": "running",
            "skills": len(_core.list_skills())}


@app.get("/api/health")
def health():
    return {"ok": True, "skills": len(_core.list_skills()),
            "projects": len(_pm.list_projects())}


@app.websocket("/ws/chat")
async def ws_chat(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                await ws.send_json({"type": "error", "msg": "非JSON消息"})
                continue
            if msg.get("type") == "ping":
                await ws.send_json({"type": "pong"})
                continue
            if msg.get("type") != "chat":
                continue
            user_msg = msg.get("msg", "")
            project = msg.get("project")
            audio_path = msg.get("audio_path")
            history = msg.get("history", [])

            async def ws_send(obj):
                await ws.send_json(obj)

            await ws.send_json({"type": "text", "msg": f"🧑 {user_msg}",
                                "stream": False, "role": "user_echo"})

            # 使用 v2 ReAct AgentLoop (Native Tool Calling)
            try:
                token = InterruptToken()
                await _agent_loop.run_task(
                    user_prompt=user_msg,
                    project_name=project or "",
                    history=history,
                    interrupt_token=token,
                    ws_send=ws_send,
                )
            except Exception as e:
                logger.exception("AgentLoop failed, fallback to v1")
                await _agent.handle(user_msg, project, history, audio_path, ws_send)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws.send_json({"type": "error", "msg": f"服务异常: {e}"})
        except Exception:
            pass
