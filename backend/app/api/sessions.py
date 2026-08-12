"""sessions.py - 会话管理 API"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from ..core.session_store import (
    list_sessions,
    get_session,
    save_session,
    delete_session,
    rename_session,
    get_session_messages,
    save_session_messages,
)
import time

router = APIRouter(prefix="/sessions", tags=["sessions"])


class CreateSessionReq(BaseModel):
    title: str = "新对话"
    id: str = None


class RenameReq(BaseModel):
    title: str


class AddMessageReq(BaseModel):
    role: str
    content: str = ""
    msg: str = ""
    files: list = None


@router.get("")
def list_all():
    """列出所有会话"""
    return list_sessions()


@router.post("")
def create(req: CreateSessionReq):
    """新建会话"""
    sid = req.id or f"s{int(time.time() * 1000)}"
    data = save_session(sid, {"title": req.title, "messages": []})
    return data


@router.get("/{session_id}")
def read(session_id: str):
    """读取会话"""
    data = get_session(session_id)
    if not data:
        raise HTTPException(404, f"会话不存在: {session_id}")
    return data


@router.delete("/{session_id}")
def remove(session_id: str):
    """删除会话"""
    if not delete_session(session_id):
        raise HTTPException(404, f"会话不存在: {session_id}")
    return {"status": "ok", "deleted": session_id}


@router.patch("/{session_id}/title")
def update_title(session_id: str, req: RenameReq):
    """修改标题"""
    data = rename_session(session_id, req.title)
    if not data:
        raise HTTPException(404, f"会话不存在: {session_id}")
    return data


@router.get("/{session_id}/messages")
def list_messages(session_id: str):
    """获取消息列表"""
    return get_session_messages(session_id)


@router.post("/{session_id}/messages")
def add_message(session_id: str, req: AddMessageReq):
    """追加一条消息"""
    msgs = get_session_messages(session_id)
    msgs.append({
        "role": req.role,
        "content": req.content or req.msg,
        "files": req.files,
    })
    save_session_messages(session_id, msgs)
    return {"status": "ok", "count": len(msgs)}


@router.put("/{session_id}/messages")
def replace_messages(session_id: str, messages: List[dict]):
    """替换消息列表"""
    save_session_messages(session_id, messages)
    return {"status": "ok", "count": len(messages)}