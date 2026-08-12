"""session_store.py - 会话持久化存储"""
import json
import time
from pathlib import Path
from typing import Dict, List, Optional

ROOT = Path(__file__).resolve().parents[3]
SESSION_DIR = ROOT / ".workbuddy" / "memory" / "sessions"
SESSION_DIR.mkdir(parents=True, exist_ok=True)


def _session_path(session_id: str) -> Path:
    return SESSION_DIR / f"{session_id}.json"


def list_sessions() -> List[Dict]:
    """列出所有会话（按更新时间倒序）"""
    sessions = []
    for f in SESSION_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            sessions.append({
                "id": data.get("id", f.stem),
                "title": data.get("title", "未命名对话"),
                "created": data.get("created", 0),
                "updated": data.get("updated", 0),
                "message_count": len(data.get("messages", [])),
            })
        except Exception:
            pass
    return sorted(sessions, key=lambda x: x["updated"], reverse=True)


def get_session(session_id: str) -> Optional[Dict]:
    """读取整个会话"""
    p = _session_path(session_id)
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def save_session(session_id: str, data: Dict) -> Dict:
    """保存会话"""
    data["id"] = session_id
    data["updated"] = int(time.time() * 1000)
    if "created" not in data:
        data["created"] = data["updated"]
    p = _session_path(session_id)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return data


def delete_session(session_id: str) -> bool:
    """删除会话"""
    p = _session_path(session_id)
    if p.exists():
        p.unlink()
        return True
    return False


def rename_session(session_id: str, title: str) -> Optional[Dict]:
    """重命名会话"""
    data = get_session(session_id)
    if not data:
        return None
    data["title"] = title
    save_session(session_id, data)
    return data


def get_session_messages(session_id: str) -> List[Dict]:
    """获取会话消息"""
    data = get_session(session_id)
    if not data:
        return []
    return data.get("messages", [])


def save_session_messages(session_id: str, messages: List[Dict]) -> Dict:
    """保存会话消息"""
    data = get_session(session_id) or {
        "id": session_id,
        "title": "未命名对话",
        "created": int(time.time() * 1000),
    }
    data["messages"] = messages
    return save_session(session_id, data)