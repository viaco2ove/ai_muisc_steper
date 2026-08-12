"""main.py - FastAPI 入口 + WebSocket 对话 + API路由"""
import json
import uuid
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
from .core.utils.prompt_templates import SYSTEM_PROMPT_AI_ADJUST
from .core import noteconv

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
# 合并扫描 公用(.workbuddy/skills) + 专用(backend/skills) 技能
_tool_registry = ToolRegistry([config.workbuddy_dir / "skills", config.backend_skills_dir])
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
            # P4-1: AI 调整走 WS 对话链路（受限 ReAct + 多步自纠错）
            if msg.get("type") == "ai_adjust":
                await _ws_ai_adjust(ws, msg)
                continue
            if msg.get("type") == "ai_adjust_undo":
                await _ws_ai_adjust_undo(ws, msg)
                continue
            if msg.get("type") == "ai_adjust_apply":
                await _ws_ai_adjust_apply(ws, msg)
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


# ----------------------------------------------------------------- P4-1: AI 调整（受限 ReAct + 备份/回滚）
def _track_json_path(project: str, track: str):
    """定位轨道 JSON 文件（兼容 '01' / '01_吉他' 两种写法）"""
    tdir = config.project_dir / project / "song_engineer" / "track"
    if not tdir.exists():
        return None
    p = tdir / f"{track}.json"
    if p.exists():
        return p
    for f in tdir.glob("*.json"):
        stem = f.stem
        if stem == track or stem.startswith(track + "_") or stem.startswith(track):
            return f
    return None


def _backup_dir():
    d = config.root_dir / "workspace" / ".cache" / "ai_adjust_backup"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _write_backup(project: str, track: str, json_text: str) -> str:
    bid = "adj_" + uuid.uuid4().hex
    payload = {"project": project, "track": track, "json": json_text}
    (_backup_dir() / f"{bid}.json").write_text(
        json.dumps(payload, ensure_ascii=False), encoding="utf-8"
    )
    return bid


def _read_backup(bid: str):
    if not bid:
        return None
    p = _backup_dir() / f"{bid}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def _delete_backup(bid: str):
    if not bid:
        return
    p = _backup_dir() / f"{bid}.json"
    try:
        p.unlink(missing_ok=True)
    except Exception:
        pass


def _note_changed(b: dict, a: dict) -> bool:
    for k in ("midi", "velocity", "startBeat", "durBeats", "lyric"):
        if b.get(k) != a.get(k):
            return True
    return False


def _build_skill_args(mode, project, track, instruction, scope, indices, after_bar, bars, vocal):
    """构造 ai_track_editor / ai_adjust_vocal 的结构化参数（无模型时的兜底直调）"""
    if vocal:
        return {
            "project": project, "track": track,
            "instruction": instruction, "scope": scope,
            "per_note": bool(indices),
        }
    if mode == "insert":
        return {
            "project": project, "track": track, "op": "insert",
            "after_bar": after_bar, "bars": bars, "instruction": instruction,
        }
    return {
        "project": project, "track": track,
        "instruction": instruction, "scope": scope,
    }


async def _ws_ai_adjust(ws: WebSocket, msg: dict):
    """P4-1: 受限 ReAct 跑 AI 调整，过程中实时推送 reasoning/工具/观察；结束后回读 before/after 供前端可回滚预览。"""
    ws_send = lambda o: ws.send_json(o)
    project = msg.get("project", "")
    track = msg.get("track", "")
    instruction = (msg.get("instruction") or "").strip()
    mode = msg.get("mode", "track")  # track | insert | note
    indices = msg.get("indices") or []
    vocal = bool(msg.get("vocal", False))
    after_bar = msg.get("after_bar")
    bars = msg.get("bars")

    tj_path = _track_json_path(project, track)
    if not tj_path:
        await ws_send({"type": "error", "msg": f"找不到轨道 JSON: {project}/{track}"})
        return
    try:
        before_text = tj_path.read_text(encoding="utf-8")
        before_json = json.loads(before_text)
    except Exception as e:
        await ws_send({"type": "error", "msg": f"读取轨道失败: {e}"})
        return

    backup_id = _write_backup(project, track, before_text)
    before_fe = noteconv.canonical_to_fe(before_json.get("notes", []))

    skill = "ai_adjust_vocal" if vocal else "ai_track_editor"
    if mode == "note" and indices:
        scope = "indices:" + ",".join(str(i) for i in indices)
        indices_line = f"- 选中音符下标: {indices}"
    elif mode == "insert":
        scope = "all"
        indices_line = f"- 插入位置: 第 {after_bar} 小节后插入 {bars} 小节"
    else:
        scope = "all"
        indices_line = "- 作用域: 整轨"
    if not instruction and mode == "insert":
        instruction = f"在第{after_bar}小节后插入{bars}小节（复制前段模式）"

    fe = before_fe
    midis = [n.get("midi", 60) for n in fe] or [60]
    vels = [n.get("velocity", 80) for n in fe] or [80]
    midi_min, midi_max = min(midis), max(midis)
    vel_min, vel_max = min(vels), max(vels)

    sys_extra = SYSTEM_PROMPT_AI_ADJUST.format(
        skill=skill, project=project, track=track, vocal=vocal,
        instruction=instruction or "(自由发挥，依据轨道风格做合理优化)",
        scope=scope, indices_line=indices_line,
        count=len(fe), midi_min=midi_min, midi_max=midi_max,
        vel_min=vel_min, vel_max=vel_max,
    )
    user_prompt = f"请对轨道「{track}」执行 AI 调整：{instruction}"
    if mode == "insert":
        user_prompt += f"（在第 {after_bar} 小节后插入 {bars} 小节）"

    await ws_send({"type": "text", "msg": f"🧑 {instruction or 'AI 调整'}",
                   "stream": False, "role": "user_echo"})

    try:
        token = InterruptToken()
        await _agent_loop.run_task(
            user_prompt=user_prompt, project_name=project, history=[],
            interrupt_token=token, ws_send=ws_send,
            extra_system=sys_extra, tool_names=[skill],
        )
    except Exception as e:
        logger.exception("ai_adjust ReAct failed")
        await ws_send({"type": "error", "msg": f"ReAct 执行异常: {e}"})

    # 回读 after
    try:
        after_json = json.loads(tj_path.read_text(encoding="utf-8"))
    except Exception:
        after_json = before_json
    after_fe = noteconv.canonical_to_fe(after_json.get("notes", []))

    # 无变化 → 直调技能兜底（不依赖模型 function calling 能力）
    before_key = json.dumps(before_fe, ensure_ascii=False, sort_keys=True)
    after_key = json.dumps(after_fe, ensure_ascii=False, sort_keys=True)
    if before_key == after_key:
        await ws_send({"type": "log", "tool": skill,
                       "msg": "模型未产生变化，改用结构化参数直接执行技能…"})
        args = _build_skill_args(mode, project, track, instruction, scope, indices, after_bar, bars, vocal)
        _core.run_skill(skill, args)
        try:
            after_json = json.loads(tj_path.read_text(encoding="utf-8"))
            after_fe = noteconv.canonical_to_fe(after_json.get("notes", []))
            after_key = json.dumps(after_fe, ensure_ascii=False, sort_keys=True)
        except Exception:
            pass

    changed = sum(1 for a in after_fe if any(_note_changed(b, a) for b in before_fe if b.get("id") == a.get("id")))
    added = sum(1 for a in after_fe if not any(b.get("id") == a.get("id") for b in before_fe))
    removed = sum(1 for b in before_fe if not any(a.get("id") == b.get("id") for a in after_fe))
    summary = f"AI 调整完成（{skill}）：改 {changed} / 增 {added} / 删 {removed} 个音符"

    await ws_send({
        "type": "ai_adjust_result", "project": project, "track": track,
        "isVocal": vocal, "backupId": backup_id,
        "before": before_fe, "after": after_fe, "message": summary,
    })


async def _ws_ai_adjust_undo(ws: WebSocket, msg: dict):
    """P4-1: 撤销 AI 调整，从备份恢复轨道 JSON"""
    bid = msg.get("backupId") or msg.get("backup_id")
    b = _read_backup(bid) if bid else None
    if not b:
        await ws.send_json({"type": "error", "msg": "备份不存在或已过期"})
        return
    tj_path = _track_json_path(b["project"], b["track"])
    if not tj_path:
        await ws.send_json({"type": "error", "msg": "轨道不存在，无法恢复"})
        return
    tj_path.write_text(b["json"], encoding="utf-8")
    await ws.send_json({"type": "ai_adjust_undone", "project": b["project"],
                        "track": b["track"], "backupId": bid})
    await ws.send_json({"type": "log", "tool": b["track"], "msg": "已撤销 AI 调整（恢复备份）"})
    await ws.send_json({"type": "project_updated", "project": b["project"]})


async def _ws_ai_adjust_apply(ws: WebSocket, msg: dict):
    """P4-1: 确认应用 AI 调整，清理备份"""
    bid = msg.get("backupId") or msg.get("backup_id")
    _delete_backup(bid)
    await ws.send_json({"type": "ai_adjust_applied", "backupId": bid})


# ---------------------------------------------------------------- AI 协助路由（D5）
class AiTrackEditReq(BaseModel):
    project: str
    track: str
    instruction: str
    scope: str = "all"  # all | bars:A-B | indices:i,j


class AiInsertReq(BaseModel):
    project: str
    track: str
    after_bar: int
    bars: int
    instruction: str = ""


class AiNoteEditReq(BaseModel):
    project: str
    track: str
    instruction: str
    indices: list  # 选中音符下标
    vocal: bool = False


def _run_ai_skill(skill: str, args: dict) -> dict:
    """经 AgentCore 执行技能，解析 stdout JSON，回读并转换音符为前端格式"""
    res = _core.run_skill(skill, args)
    if res.get("status") != "ok":
        raise HTTPException(500, f"技能执行失败: {res.get('error')}")
    # 从日志中取技能打印的 JSON 结果
    skill_out = None
    for line in res.get("logs", []):
        try:
            obj = json.loads(line)
            if isinstance(obj, dict) and "status" in obj:
                skill_out = obj
                break
        except Exception:
            continue
    # 回读轨道 JSON -> 前端格式
    tj = _pm.get_track(args["project"], args["track"]).get("json", {})
    notes_fe = noteconv.canonical_to_fe(tj.get("notes", []))
    return {
        "notes": notes_fe,
        "source": "backend",
        "skill": skill_out or {"status": "ok"},
    }


@app.post("/api/ai/track-edit")
def ai_track_edit(req: AiTrackEditReq):
    """整轨/小节 AI 调整（ai_track_editor）"""
    return _run_ai_skill("ai_track_editor", {
        "project": req.project, "track": req.track,
        "instruction": req.instruction, "scope": req.scope,
    })


@app.post("/api/ai/insert-section")
def ai_insert_section(req: AiInsertReq):
    """在第 N 小节后插入 M 小节（ai_track_editor op=insert）"""
    return _run_ai_skill("ai_track_editor", {
        "project": req.project, "track": req.track, "op": "insert",
        "after_bar": req.after_bar, "bars": req.bars, "instruction": req.instruction,
    })


@app.post("/api/ai/note-edit")
def ai_note_edit(req: AiNoteEditReq):
    """选中音符 AI 调整：人声轨走 ai_adjust_vocal，其余走 ai_track_editor"""
    skill = "ai_adjust_vocal" if req.vocal else "ai_track_editor"
    scope = "indices:" + ",".join(str(i) for i in req.indices)
    return _run_ai_skill(skill, {
        "project": req.project, "track": req.track,
        "instruction": req.instruction, "scope": scope,
    })
