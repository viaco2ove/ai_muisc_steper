---
name: diagnose_fix
description: agent core 专用 · 跑 song_engineer 诊断并自动应用优化建议（diagnose 后接 optimize）。让 ReAct 能半自动把半成品推近成品，无需逐步人工介入。委派 song_engineer 的 cmd_diagnose/cmd_optimize 实现。
executable: true
entry_script: "scripts/diagnose_fix.py"
params:
  project: {description: "工程名称(required)", type: string, required: true}
  target: {description: "优化方向 chords/lyrics/structure/track(可选,默认全量诊断不优化)", type: string, required: false}
agent_created: true
---

# diagnose_fix — 诊断并优化（agent core 专用）

## 作用
先跑 song_engineer 的 `diagnose`（五维诊断），若给了 `--target` 则接着跑 `optimize`（应用优化建议）。委派 song_engineer 技能实现，不重复造轮子。

## 输入
- `project`（必填）：工程名
- `target`（可选）：优化方向 `chords` / `lyrics` / `structure` / `track`。省略则只诊断不优化。

## 输出
- 诊断报告 +（若有 target）优化变更摘要，打印到 stdout。

## 注意
- 本技能为 agent core 专用（backend/skills），不出现在用户 技能面板。
