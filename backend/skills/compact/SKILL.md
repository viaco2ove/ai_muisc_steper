---
name: compact
description: agent core 专用 · 压缩对话上下文。当消息历史过长、token 接近上限时使用：把早期消息摘要后替换为占位符，保留最近 N 条完整消息。
executable: true
entry_script: "scripts/compact.py"
params:
  session_id: {description: "会话ID(required)", type: string, required: true}
  keep_last: {description: "保留最后N条消息(默认10)", type: number, required: false}
agent_created: true
---

# compact — 压缩会话上下文（agent core 专用）

## 作用
当会话历史消息过多时，把早期 N 条消息压缩成一段摘要，替换为占位符，保留最近的消息完整。

## 输入
- `session_id`（必填）：会话 ID
- `keep_last`（可选）：保留最近 N 条，默认 10

## 输出
- 压缩摘要 + 占位符替换后的消息列表
- 返回 `{summary, before_count, after_count, saved_tokens}`

## 注意
- 本技能为 agent core 专用（backend/skills），不出现在用户 技能面板
- 压缩摘要由 LLM 生成（可选）或简单拼接