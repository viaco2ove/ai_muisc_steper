#!/usr/bin/env python3
"""clean.py - 清理会话/缓存"""
import sys
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "backend"))


def main():
    import argparse
    p = argparse.ArgumentParser(description="清理会话/缓存")
    p.add_argument("session_id", help="会话ID")
    p.add_argument("--target", default="all", help="清理目标: messages/cache/all")
    args = p.parse_args()

    sid = args.session_id
    target = args.target

    cleared = []

    # 1. 清空消息
    if target in ("messages", "all"):
        from app.core.session_store import save_session_messages
        save_session_messages(sid, [])
        cleared.append(f"messages:session:{sid}")

    # 2. 清理临时缓存
    if target in ("cache", "all"):
        cache_dir = ROOT / ".workbuddy" / "memory" / "cache"
        if cache_dir.exists():
            for f in cache_dir.glob("*.tmp"):
                f.unlink()
                cleared.append(f"cache:{f.name}")

        # 清理过期临时文件（>7天）
        import time
        for sub in [ROOT / ".cache" / "tmp"]:
            if sub.exists():
                for f in sub.rglob("*"):
                    if f.is_file() and (time.time() - f.stat().st_mtime) > 7 * 86400:
                        f.unlink()
                        cleared.append(f"expired:{f.name}")

    result = {
        "status": "ok",
        "session_id": sid,
        "target": target,
        "cleared": cleared,
        "count": len(cleared),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()