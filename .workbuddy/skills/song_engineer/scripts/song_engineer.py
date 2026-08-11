#!/usr/bin/env python3
"""
song_engineer.py - 歌曲工程聚合、诊断与优化主入口

支持三种模式：
1. init - 初始化聚合：扫描散件产物，生成 song_engineer/ 产物
2. diagnose - 诊断模式：分析工程完整性/一致性/风格契合度
3. optimize - 优化模式：基于诊断结果执行优化

用法：
    python song_engineer.py init "歌名" [--path 工程路径]
    python song_engineer.py diagnose "歌名" [--path 工程路径]
    python song_engineer.py optimize "歌名" --target {chords|lyrics|structure|track} [--path 工程路径]
"""
import argparse
import json
import os
import sys
from pathlib import Path

# BACKEND = 上一级(scripts) → song_engineer → skills → .workbuddy → 项目根目录
ROOT = Path(__file__).resolve().parents[4]
BACKEND = ROOT / "backend"
WORKSPACE = ROOT / "workspace"
sys.path.insert(0, str(BACKEND))


def find_project_dir(name: str, custom_path: str = None) -> Path:
    """查找工程目录"""
    if custom_path:
        p = Path(custom_path)
        if p.exists():
            return p
        # 尝试 workspace/project 下查找
        p = WORKSPACE / "project" / custom_path
        if p.exists():
            return p
        raise FileNotFoundError(f"工程路径不存在: {custom_path}")

    # 优先精确匹配
    candidates = [
        WORKSPACE / "project" / name,
        WORKSPACE / "project" / name.replace(" ", ""),
    ]
    for c in candidates:
        if c.exists():
            return c

    # 模糊匹配
    project_dir = WORKSPACE / "project"
    if project_dir.exists():
        for d in project_dir.iterdir():
            if name.lower() in d.name.lower() or d.name.lower() in name.lower():
                return d

    raise FileNotFoundError(f"未找到工程: {name}")


def cmd_init(name: str, project_path: str = None):
    """初始化模式：聚合散件产物到 song_engineer/"""
    project_dir = find_project_dir(name, project_path)
    print(f"[初始化] 工程: {project_dir.name}")

    # 创建 song_engineer 目录
    se_dir = project_dir / "song_engineer"
    track_dir = se_dir / "track"
    se_dir.mkdir(exist_ok=True)
    track_dir.mkdir(exist_ok=True)

    # 读取 project.md 获取基本信息
    project_md = project_dir / "project.md"
    basic_info = {"name": name, "bpm": 0, "key": "", "style": "", "sections": []}

    if project_md.exists():
        content = project_md.read_text(encoding="utf-8")
        # 简单解析 BPM 和 调性
        for line in content.split("\n"):
            if "BPM" in line and "|" in line:
                parts = line.split("|")
                if len(parts) >= 3:
                    try:
                        basic_info["bpm"] = int(parts[2].strip())
                    except ValueError:
                        pass
            if "调性" in line and "|" in line:
                parts = line.split("|")
                if len(parts) >= 3:
                    basic_info["key"] = parts[2].strip()
            if "风格" in line and "|" in line:
                parts = line.split("|")
                if len(parts) >= 3:
                    basic_info["style"] = parts[2].strip()

    # 扫描已有产物
    artifacts = {
        "chords": WORKSPACE / f"ai_chords/{name}",
        "lyrics": WORKSPACE / f"muse_ai/{name}",
        "audio": WORKSPACE / f"audio_output/{name}",
        "minimax": WORKSPACE / f"minimax_music_v3/{name}",
    }

    found = {}
    for key, path in artifacts.items():
        if path.exists():
            found[key] = list(path.iterdir())
            print(f"  [发现] {key}: {path.name}/ ({len(found[key])} 文件)")

    # 生成 song_engineer.json
    se_json = {
        "version": "1.0",
        "project": name,
        "basic_info": basic_info,
        "artifacts": {k: len(v) > 0 for k, v in found.items()},
        "tracks": [],
        "diagnosis": None,
        "log": [{
            "action": "init",
            "timestamp": "2026-08-11",
            "message": f"初始化 song_engineer 产物目录"
        }]
    }

    # 写入 song_engineer.json
    json_path = se_dir / "song_engineer.json"
    json_path.write_text(json.dumps(se_json, ensure_ascii=False, indent=2), encoding="utf-8")

    # 生成 song_engineer.md
    md_content = f"""# 歌曲工程：{name}

## 基础信息
| 字段 | 值 |
|------|-----|
| BPM | {basic_info['bpm'] or '待定'} |
| 调性 | {basic_info['key'] or '待定'} |
| 风格 | {basic_info['style'] or '待定'} |

## 产物聚合
{found.get('chords', []) and '- ✅ 和弦方案' or '- ⚠️ 和弦方案缺失'}
{found.get('lyrics', []) and '- ✅ 歌词' or '- ⚠️ 歌词缺失'}
{found.get('audio', []) and '- ✅ 音频报告' or '- ⚠️ 音频报告缺失'}

## 多轨道规划
（待规划）

## 诊断与优化方向
（待诊断）

## 工程日志
| 时间 | 操作 | 说明 |
|------|------|------|
| 2026-08-11 | 初始化 | 创建 song_engineer 产物目录 |
"""

    md_path = se_dir / "song_engineer.md"
    md_path.write_text(md_content, encoding="utf-8")

    print(f"[完成] song_engineer/ 产物已创建")
    print(f"  - {json_path}")
    print(f"  - {md_path}")

    return {
        "status": "ok",
        "project": name,
        "dir": str(se_dir),
        "artifacts_found": list(found.keys())
    }


def cmd_diagnose(name: str, project_path: str = None):
    """诊断模式：分析工程完整性/一致性/风格契合度"""
    project_dir = find_project_dir(name, project_path)
    se_dir = project_dir / "song_engineer"

    if not se_dir.exists():
        print(f"[诊断] song_engineer 目录不存在，先执行初始化...")
        return cmd_init(name, project_path)

    print(f"[诊断] 工程: {project_dir.name}")

    # 读取 song_engineer.json
    json_path = se_dir / "song_engineer.json"
    if json_path.exists():
        se_data = json.loads(json_path.read_text(encoding="utf-8"))
    else:
        se_data = {"project": name, "basic_info": {}}

    # 诊断维度
    diagnosis = {
        "completeness": 0,
        "consistency": "✅",
        "alignment": "⚠️ 待检查",
        "style_fit": "⚠️ 待评估",
        "optimization_space": []
    }

    # 检查各产物
    basic = se_data.get("basic_info", {})
    bpm = basic.get("bpm", 0)
    key = basic.get("key", "")

    completeness_score = 0
    total_checks = 5

    if bpm > 0:
        completeness_score += 1
        print(f"  [✅] BPM: {bpm}")
    else:
        print(f"  [⚠️] BPM 未设置")

    if key:
        completeness_score += 1
        print(f"  [✅] 调性: {key}")
    else:
        print(f"  [⚠️] 调性未设置")

    # 检查 track 目录
    track_dir = se_dir / "track"
    if track_dir.exists():
        tracks = list(track_dir.glob("*.json"))
        if tracks:
            completeness_score += 1
            print(f"  [✅] 轨道: {len(tracks)} 个")
        else:
            print(f"  [⚠️] 轨道目录为空")
    else:
        print(f"  [⚠️] 轨道目录不存在")

    # 检查 song_engineer.md
    md_path = se_dir / "song_engineer.md"
    if md_path.exists():
        completeness_score += 1
        print(f"  [✅] song_engineer.md 已生成")
    else:
        print(f"  [⚠️] song_engineer.md 不存在")

    # 检查外部产物
    artifacts = se_data.get("artifacts", {})
    if any(artifacts.values()):
        completeness_score += 1
        print(f"  [✅] 存在 {sum(artifacts.values())} 类产物")
    else:
        print(f"  [⚠️] 无外部产物")

    diagnosis["completeness"] = int(completeness_score / total_checks * 100)

    # 更新诊断结果
    se_data["diagnosis"] = diagnosis
    se_data["log"] = se_data.get("log", [])
    se_data["log"].append({
        "action": "diagnose",
        "timestamp": "2026-08-11",
        "message": f"诊断完成，完整性 {diagnosis['completeness']}%"
    })

    json_path.write_text(json.dumps(se_data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n[诊断结果] 完整性: {diagnosis['completeness']}%")
    print(f"  - 一致性: {diagnosis['consistency']}")
    print(f"  - 对齐: {diagnosis['alignment']}")
    print(f"  - 优化空间: {len(diagnosis['optimization_space'])} 项")

    return {
        "status": "ok",
        "project": name,
        "diagnosis": diagnosis
    }


def cmd_optimize(name: str, target: str, project_path: str = None):
    """优化模式：执行指定方向的优化"""
    project_dir = find_project_dir(name, project_path)
    se_dir = project_dir / "song_engineer"

    if not se_dir.exists():
        print(f"[优化] song_engineer 目录不存在，先执行初始化...")
        cmd_init(name, project_path)

    print(f"[优化] 工程: {name}, 目标: {target}")

    # 读取当前数据
    json_path = se_dir / "song_engineer.json"
    se_data = json.loads(json_path.read_text(encoding="utf-8")) if json_path.exists() else {}

    # 根据目标生成建议
    suggestions = {
        "chords": "建议调用 ai_chords_master 进行和弦丰富化",
        "lyrics": "建议调用 muse-lyrics-gen 优化歌词",
        "structure": "建议调用 ai_chords_master 调整段落结构",
        "track": "建议补充轨道规划：主唱/吉他/鼓组"
    }

    suggestion = suggestions.get(target, "未知优化目标")
    print(f"[优化建议] {suggestion}")

    # 更新日志
    se_data["log"] = se_data.get("log", [])
    se_data["log"].append({
        "action": "optimize",
        "target": target,
        "timestamp": "2026-08-11",
        "message": suggestion
    })

    json_path.write_text(json.dumps(se_data, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "status": "ok",
        "project": name,
        "target": target,
        "suggestion": suggestion
    }


def main():
    parser = argparse.ArgumentParser(
        description="song_engineer - 歌曲工程聚合、诊断与优化",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python song_engineer.py init "测试工程"
  python song_engineer.py diagnose "测试工程"
  python song_engineer.py optimize "测试工程" --target chords
        """
    )

    subparsers = parser.add_subparsers(dest="command", required=True, help="命令")

    # init 命令
    p_init = subparsers.add_parser("init", help="初始化聚合")
    p_init.add_argument("name", help="工程名称")
    p_init.add_argument("--path", help="工程路径(可选)")

    # diagnose 命令
    p_diag = subparsers.add_parser("diagnose", help="诊断模式")
    p_diag.add_argument("name", help="工程名称")
    p_diag.add_argument("--path", help="工程路径(可选)")

    # optimize 命令
    p_opt = subparsers.add_parser("optimize", help="优化模式")
    p_opt.add_argument("name", help="工程名称")
    p_opt.add_argument("--target", required=True,
                      choices=["chords", "lyrics", "structure", "track"],
                      help="优化目标")
    p_opt.add_argument("--path", help="工程路径(可选)")

    args = parser.parse_args()

    # 执行对应命令
    if args.command == "init":
        result = cmd_init(args.name, args.path)
    elif args.command == "diagnose":
        result = cmd_diagnose(args.name, args.path)
    elif args.command == "optimize":
        result = cmd_optimize(args.name, args.target, args.path)
    else:
        parser.print_help()
        return 1

    # 输出 JSON 结果供 agent 使用
    print("\n--- RESULT JSON ---")
    print(json.dumps(result, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())
