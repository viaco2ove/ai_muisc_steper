#!/usr/bin/env python3
"""project_manage.py - 项目管理：删除/重命名"""
import argparse
import json
import sys
import shutil
from pathlib import Path

# BACKEND = 上一级(scripts) → project_manage → skills → .workbuddy → 项目根目录
ROOT = Path(__file__).resolve().parents[4]
BACKEND = ROOT / "backend"
WORKSPACE = ROOT / "workspace"
sys.path.insert(0, str(BACKEND))


def cmd_delete(name: str) -> dict:
    """删除工程"""
    pdir = WORKSPACE / "project" / name
    if not pdir.exists():
        return {"status": "error", "message": f"工程不存在: {name}"}

    # 计算大小
    total_size = sum(f.stat().st_size for f in pdir.rglob("*") if f.is_file())

    shutil.rmtree(pdir)
    return {
        "status": "ok",
        "message": f"已删除工程: {name}",
        "size_freed": total_size
    }


def cmd_rename(name: str, new_name: str) -> dict:
    """重命名工程"""
    old_dir = WORKSPACE / "project" / name
    new_dir = WORKSPACE / "project" / new_name

    if not old_dir.exists():
        return {"status": "error", "message": f"工程不存在: {name}"}

    if new_dir.exists():
        return {"status": "error", "message": f"目标名称已存在: {new_name}"}

    old_dir.rename(new_dir)
    return {
        "status": "ok",
        "message": f"已将工程 [{name}] 重命名为 [{new_name}]",
        "old_name": name,
        "new_name": new_name
    }


def cmd_list() -> dict:
    """列出所有工程"""
    project_dir = WORKSPACE / "project"
    if not project_dir.exists():
        return {"status": "ok", "projects": []}

    projects = []
    for d in sorted(project_dir.iterdir()):
        if not d.is_dir():
            continue
        has_engineer = (d / "song_engineer" / "song_engineer.json").exists()
        tracks = list((d / "song_engineer" / "track").glob("*.json"))
        size = sum(f.stat().st_size for f in d.rglob("*") if f.is_file())
        projects.append({
            "name": d.name,
            "has_engineer": has_engineer,
            "tracks_count": len(tracks),
            "size_mb": round(size / 1024 / 1024, 2)
        })

    return {"status": "ok", "projects": projects}


def main():
    parser = argparse.ArgumentParser(description="项目管理：删除/重命名/列表")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # delete 命令
    p_del = subparsers.add_parser("delete", help="删除工程")
    p_del.add_argument("name", help="工程名称")

    # rename 命令
    p_ren = subparsers.add_parser("rename", help="重命名工程")
    p_ren.add_argument("name", help="当前工程名称")
    p_ren.add_argument("new_name", help="新工程名称")

    # list 命令
    subparsers.add_parser("list", help="列出所有工程")

    args = parser.parse_args()

    if args.command == "delete":
        result = cmd_delete(args.name)
    elif args.command == "rename":
        result = cmd_rename(args.name, args.new_name)
    elif args.command == "list":
        result = cmd_list()
    else:
        parser.print_help()
        return 1

    print("\n--- RESULT JSON ---")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
