"""diagnose_fix - 诊断并(可选)优化工程（agent core 专用）

委派 .workbuddy/skills/song_engineer/scripts/song_engineer.py 的
cmd_diagnose / cmd_optimize。
用法：main(kwargs) 或 main() + argparse；kwargs: {project, target?}
"""
import os
import sys
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
SONG_ENGINEER = ROOT / ".workbuddy" / "skills" / "song_engineer" / "scripts" / "song_engineer.py"


def main(kwargs: dict = None):
    if kwargs:
        project = kwargs.get("project") or kwargs.get("--project")
        target = kwargs.get("target") or kwargs.get("--target")
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument("--project", required=True)
        ap.add_argument("--target", default=None)
        ns = ap.parse_args()
        project, target = ns.project, ns.target

    if not project:
        print("ERROR: 缺少 project", file=sys.stderr)
        sys.exit(1)
    if not SONG_ENGINEER.exists():
        print(f"ERROR: song_engineer 脚本不存在: {SONG_ENGINEER}", file=sys.stderr)
        sys.exit(1)

    sys.path.insert(0, str(SONG_ENGINEER.parent))
    try:
        import song_engineer as se
    except Exception as e:
        print(f"ERROR: 导入 song_engineer 失败: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"=== 诊断工程: {project} ===")
    try:
        diag = se.cmd_diagnose(project)
    except Exception as e:
        print(f"ERROR: 诊断失败: {e}", file=sys.stderr)
        sys.exit(1)
    if isinstance(diag, str):
        print(diag)
    elif diag:
        print(str(diag)[:2000])

    if target:
        valid = {"chords", "lyrics", "structure", "track"}
        if target not in valid:
            print(f"WARN: --target 必须为 {sorted(valid)} 之一，忽略优化步骤")
        else:
            print(f"\n=== 优化工程: {project} / {target} ===")
            try:
                res = se.cmd_optimize(project, target)
            except Exception as e:
                print(f"ERROR: 优化失败: {e}", file=sys.stderr)
                sys.exit(1)
            if isinstance(res, str):
                print(res)
            elif res:
                print(str(res)[:2000])
    else:
        print("\n(未指定 --target，仅诊断不优化)")

    print("\nDONE")
    sys.exit(0)


if __name__ == "__main__":
    main()
