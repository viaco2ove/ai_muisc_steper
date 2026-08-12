"""read_project_context - 输出工程紧凑摘要（agent core 专用）

用法：main(kwargs) 或 main() + argparse；kwargs: {project}
读 workspace/project/{歌名}/song_engineer/song_engineer.json，
输出紧凑摘要到 stdout 供 ReAct 取上下文。
"""
import sys
import json
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
WORKSPACE = ROOT / "workspace" / "project"


def _get(d, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
        if cur is None:
            return default
    return cur or default


def main(kwargs: dict = None):
    if kwargs:
        project = kwargs.get("project") or kwargs.get("--project")
    else:
        ap = argparse.ArgumentParser()
        ap.add_argument("--project", required=True)
        project = ap.parse_args().project

    if not project:
        print("ERROR: 缺少 project", file=sys.stderr)
        sys.exit(1)

    json_path = WORKSPACE / project / "song_engineer" / "song_engineer.json"
    if not json_path.exists():
        # 退化：列目录结构，仍给最小上下文
        print(f"工程 {project} 尚未初始化 song_engineer 产物（{json_path} 不存在）。")
        pdir = WORKSPACE / project
        if pdir.exists():
            tracks = sorted(p.name for p in (pdir / "song_engineer" / "track").glob("*.json")) if (pdir / "song_engineer" / "track").exists() else []
            print(f"轨道 JSON 文件: {tracks}")
        sys.exit(0)

    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"ERROR: 解析 {json_path} 失败: {e}", file=sys.stderr)
        sys.exit(1)

    lines = []
    lines.append(f"# 工程上下文: {project}")
    meta = _get(data, "meta", default={}) or {}
    info = _get(data, "basic_info", default={}) or {}
    if not isinstance(meta, dict):
        meta = {}
    if not isinstance(info, dict):
        info = {}
    bpm = meta.get("bpm", info.get("bpm", "?"))
    style = meta.get("style", info.get("play_style", "?"))
    key = meta.get("key", info.get("actual_key", "?"))
    capo = info.get("capo", meta.get("capo", "?"))
    lines.append(f"- 基本信息: BPM={bpm} 调性={key} Capo={capo} 风格={style}")

    tracks = _get(data, "tracks", default=[]) or []
    if tracks:
        lines.append(f"- 轨道({len(tracks)}):")
        for t in tracks:
            if isinstance(t, dict):
                lines.append(f"    · {t.get('name','?')} [{t.get('status','?')}]")
            else:
                lines.append(f"    · {t}")
    else:
        lines.append("- 轨道: (无)")

    chords = _get(data, "chord_skeleton", default=[]) or _get(data, "chords", default=[])
    if chords:
        cs = chords if isinstance(chords, list) else [chords]
        lines.append(f"- 和弦骨架: {' '.join(str(c) for c in cs[:24])}"
                     + (" ..." if len(cs) > 24 else ""))

    sections = _get(data, "structure", default=[]) or _get(data, "sections", default=[])
    if sections:
        lines.append("- 段落结构:")
        for s in sections:
            if isinstance(s, dict):
                lines.append(f"    · {s.get('name','?')} {s.get('bars','')}")
            else:
                lines.append(f"    · {s}")

    diag = _get(data, "diagnosis", default={}) or {}
    if diag and isinstance(diag, dict):
        lines.append("- 诊断待办:")
        for dim, content in diag.items():
            if isinstance(content, str) and content.strip():
                snippet = content.strip().splitlines()[0][:80]
                lines.append(f"    · [{dim}] {snippet}")

    print("\n".join(lines))


if __name__ == "__main__":
    main()
