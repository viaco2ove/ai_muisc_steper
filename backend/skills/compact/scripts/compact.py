#!/usr/bin/env python3
"""compact.py - 压缩会话上下文"""
import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "backend"))


def main():
    import argparse
    p = argparse.ArgumentParser(description="压缩会话上下文")
    p.add_argument("session_id", help="会话ID")
    p.add_argument("--keep-last", type=int, default=10, help="保留最后N条")
    args = p.parse_args()

    sid = args.session_id
    keep = args.keep_last

    # 读取会话历史（基于后端 session 存储）
    from app.core.session_store import get_session_messages, save_session_messages

    msgs = get_session_messages(sid)
    before_count = len(msgs)

    if before_count <= keep:
        result = {
            "status": "ok",
            "summary": None,
            "before_count": before_count,
            "after_count": before_count,
            "saved_tokens": 0,
            "message": "消息数量未超过阈值，无需压缩"
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    # 简单压缩策略：拼接前面消息生成摘要
    old_msgs = msgs[:-keep]
    summary_parts = []
    for m in old_msgs:
        role = m.get("role", "unknown")
        content = m.get("content", "") or m.get("msg", "")
        summary_parts.append(f"[{role}] {content[:200]}")

    summary = "\n".join(summary_parts[:50])  # 最多 50 条
    summary = f"[已压缩 {len(old_msgs)} 条早期消息]\n{summary}\n[压缩摘要结束]"

    # 替换：保留最近 keep 条 + 占位摘要
    new_msgs = [{"role": "system", "content": summary}] + msgs[-keep:]
    save_session_messages(sid, new_msgs)

    after_count = len(new_msgs)
    saved = sum(len(json.dumps(m, ensure_ascii=False)) for m in old_msgs)

    result = {
        "status": "ok",
        "summary": summary[:500],
        "before_count": before_count,
        "after_count": after_count,
        "saved_tokens": saved // 4,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()