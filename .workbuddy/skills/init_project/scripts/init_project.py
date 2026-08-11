"""init_project.py - 创建新歌曲工程"""
import sys
import json
import argparse
from pathlib import Path

# BACKEND = 上一级(scripts) → init_project → skills → .workbuddy → 项目根目录
# parents[4] = 项目根目录 (D:\Users\viaco\PycharmProjects\ai_muice_steper)
ROOT = Path(__file__).resolve().parents[4]
BACKEND = ROOT / "backend"
WORKSPACE = ROOT / "workspace" / "project"
sys.path.insert(0, str(BACKEND))


def main():
    parser = argparse.ArgumentParser(description="初始化歌曲工程")
    parser.add_argument("name", help="工程名称")
    parser.add_argument("--style", default="", help="音乐风格")
    parser.add_argument("--bpm", type=int, default=0, help="BPM速度")
    parser.add_argument("--key", default="", help="调性")
    args = parser.parse_args()

    pdir = WORKSPACE / args.name
    pdir.mkdir(parents=True, exist_ok=True)
    (pdir / "song_engineer" / "track").mkdir(parents=True, exist_ok=True)

    pm = pdir / "project.md"
    if not pm.exists():
        skeleton = f"""# 歌曲工程：{args.name}

## 基础信息
| 字段 | 值 |
|------|-----|
| 调性 | {args.key or '待定'} |
| BPM | {args.bpm or '待定'} |
| 风格 | {args.style or '待定'} |
| 情绪 | |
| 创作日期 | |

## 段落结构总览
| 段落 | 小节 | 和弦进行 | 备注 |
|------|------|----------|------|
| 前奏 | 1-4 | | |
| 主歌A | 5-12 | | |
| 副歌 | 13-20 | | |

## 分轨规划
（待规划）

## 创作笔记
（新建工程）
"""
        pm.write_text(skeleton, encoding="utf-8")

    result = {"name": args.name, "path": str(pdir)}
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
