"""render_mscx - 调用 MuseScore CLI 把 mscx 渲染为音频（agent core 专用）

用法（参数经 wrapper 注入，无需命令行）：
  main(kwargs) 或 main() + argparse
  kwargs: {project, track?, format?, sound_profile?}
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path

# 工程根：backend/skills/render_mscx/scripts -> 上三级
ROOT = Path(__file__).resolve().parents[4]
WORKSPACE = ROOT / "workspace" / "project"


def _musescore_exe() -> Path:
    env = os.getenv("MUSESCORE_EXE")
    if env:
        return Path(env)
    # 默认 Windows 安装路径
    return Path(r"C:\Program Files\MuseScore 4\bin\MuseScore4.exe")


def main(kwargs: dict = None):
    if kwargs:
        def norm(d):
            return {k.lstrip("-").replace("-", "_"): v for k, v in d.items()}
        args = argparse.Namespace(**norm(kwargs))
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument("--project", required=True)
        ap.add_argument("--track", default=None)
        ap.add_argument("--format", default="mp3")
        ap.add_argument("--sound-profile", dest="sound_profile", default="MuseSounds")
        args = ap.parse_args()

    project = getattr(args, "project", None)
    track = getattr(args, "track", None)
    fmt = (getattr(args, "format", "mp3") or "mp3").lower()
    profile = getattr(args, "sound_profile", "MuseSounds") or "MuseSounds"

    if not project:
        print("ERROR: 缺少 project", file=sys.stderr)
        sys.exit(1)

    pdir = WORKSPACE / project
    if not pdir.exists():
        print(f"ERROR: 工程不存在: {pdir}", file=sys.stderr)
        sys.exit(1)

    # 选定 mscx 源
    if track:
        mscx = pdir / "song_engineer" / "track" / f"{track}.mscx"
        base = track
    else:
        mscx = pdir / f"{project}.mscx"
        base = project
    if not mscx.exists():
        print(f"ERROR: 找不到 mscx: {mscx}（请先用工件 musescore-cooperate 生成乐谱）", file=sys.stderr)
        sys.exit(1)

    out_dir = pdir / "render"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{base}.{fmt}"

    exe = _musescore_exe()
    if not exe.exists():
        print(f"ERROR: MuseScore 可执行文件不存在: {exe}（请用 MUSESCORE_EXE 环境变量指定）", file=sys.stderr)
        sys.exit(1)

    cmd = [str(exe), "-f", "--sound-profile", profile, "-o", str(out_path), str(mscx)]
    print(f"$ {' '.join(cmd)}")
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600)
    except subprocess.TimeoutExpired:
        print("ERROR: MuseScore 渲染超时(600s)", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: 渲染失败: {e}", file=sys.stderr)
        sys.exit(1)

    if proc.returncode != 0:
        print(f"ERROR: MuseScore 退出码 {proc.returncode}", file=sys.stderr)
        if proc.stderr:
            print(proc.stderr[-1500:], file=sys.stderr)
        sys.exit(1)

    if not out_path.exists():
        print(f"ERROR: 渲染完成但未生成产物: {out_path}", file=sys.stderr)
        sys.exit(1)
    print(f"OK: 已渲染 -> {out_path} ({out_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
