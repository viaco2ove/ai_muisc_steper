"""export_midi - 分轨 JSON 导出 MIDI（agent core 专用）

委派 .workbuddy/skills/song_engineer/scripts/export_track_to_midi.py。
用法：main(kwargs) 或 main() + argparse；kwargs: {project, track?}
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
WORKSPACE = ROOT / "workspace" / "project"
EXPORTER = ROOT / ".workbuddy" / "skills" / "song_engineer" / "scripts" / "export_track_to_midi.py"


def main(kwargs: dict = None):
    if kwargs:
        project = kwargs.get("project") or kwargs.get("--project")
        track = kwargs.get("track") or kwargs.get("--track")
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument("--project", required=True)
        ap.add_argument("--track", default=None)
        project, track = ap.parse_args().project, ap.parse_args().track

    if not project:
        print("ERROR: 缺少 project", file=sys.stderr)
        sys.exit(1)

    track_dir = WORKSPACE / project / "song_engineer" / "track"
    if not track_dir.exists():
        print(f"ERROR: 轨道目录不存在: {track_dir}（请先初始化工程聚合）", file=sys.stderr)
        sys.exit(1)

    if track:
        targets = [track_dir / f"{track}.json"]
    else:
        targets = sorted(track_dir.glob("*.json"))

    if not targets:
        print("ERROR: 未找到任何轨道 JSON", file=sys.stderr)
        sys.exit(1)

    if not EXPORTER.exists():
        print(f"ERROR: 导出器不存在: {EXPORTER}", file=sys.stderr)
        sys.exit(1)

    python = os.getenv("PYTHON_EXE") or str(ROOT / ".venv" / "python.exe")
    ok, fail = 0, 0
    for tj in targets:
        if not tj.exists():
            print(f"SKIP: 轨道 JSON 不存在: {tj}")
            fail += 1
            continue
        cmd = [python, "-X", "utf8", str(EXPORTER), str(tj)]
        print(f"$ {' '.join(cmd)}")
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True,
                                  encoding="utf-8", errors="replace", timeout=300)
        except Exception as e:
            print(f"FAIL: {tj.name}: {e}")
            fail += 1
            continue
        out = (proc.stdout or "") + (proc.stderr or "")
        print(out[-800:])
        if proc.returncode == 0:
            ok += 1
        else:
            fail += 1

    print(f"DONE: 成功 {ok} / 失败 {fail}")
    sys.exit(0 if fail == 0 else 1)


if __name__ == "__main__":
    main()
