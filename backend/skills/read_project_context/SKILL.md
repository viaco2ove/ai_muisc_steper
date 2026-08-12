---
name: read_project_context
description: agent core 专用 · 读取工程 song_engineer.json 并输出紧凑摘要（基本信息/轨道状态/和弦骨架/段落结构/诊断待办）到 stdout，供 ReAct 多步推理自主取上下文，避免每次喂全量 JSON 撑爆上下文。
executable: true
entry_script: "scripts/read_context.py"
params:
  project: {description: "工程名称(required)", type: string, required: true}
agent_created: true
---

# read_project_context — 工程上下文摘要（agent core 专用）

## 作用
读 `workspace/project/{歌名}/song_engineer/song_engineer.json`，输出一份**紧凑、结构化**的工程现状摘要，供 ReAct 循环在多个推理步之间自主取用上下文。

## 输入
- `project`（必填）：工程名

## 输出（stdout，给 LLM 读）
- 基本信息：BPM / 调性 / Capo / 风格
- 轨道清单：名称 + 状态（草稿/定稿/不需要）
- 和弦骨架
- 段落结构（名称 + 小节范围）
- 诊断待办（若有 diagnosis 字段）

## 注意
- 本技能为 agent core 专用（backend/skills），不出现在用户 技能面板。
- 对缺失字段容忍，不会因 JSON 结构差异而崩溃。
