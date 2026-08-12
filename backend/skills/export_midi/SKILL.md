---
name: export_midi
description: agent core 专用 · 把工程分轨 JSON 导出为可播放 MIDI。委派 song_engineer 的 export_track_to_midi 实现，支持单轨(--track)或全部轨导出。用于 agent 自主把数据转成可听 MIDI 验证。
executable: true
entry_script: "scripts/export_midi.py"
params:
  project: {description: "工程名称(required)", type: string, required: true}
  track: {description: "可选，轨道ID(如 01_吉他)；指定只导出该轨，否则导出全部轨道", type: string, required: false}
agent_created: true
---

# export_midi — 分轨导出 MIDI（agent core 专用）

## 作用
把 `song_engineer/track/*.json` 转成 `.mid` 文件，供试听/验证数据准确性。委派 `.workbuddy/skills/song_engineer/scripts/export_track_to_midi.py` 实现，不重复造轮子。

## 输入
- `project`（必填）：工程名
- `track`（可选）：轨道 ID；省略则导出全部轨道

## 输出
- 每个轨道 JSON 同目录生成 `{tid}.mid`

## 注意
- 本技能为 agent core 专用（backend/skills），不出现在用户 技能面板。
