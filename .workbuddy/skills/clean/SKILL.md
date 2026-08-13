---
name: clean
description: 清理会话/缓存。包括清空对话历史、清理临时文件、清理过期记忆。仅操作 session/cache，不删工程。
executable: true
entry_script: "scripts/clean.py"
params:
  session_id: {description: "会话ID(required)", type: string, required: true}
  target: {description: "清理目标 messages/cache/all(默认all)", type: string, required: false}
---

# clean — 清理会话/缓存

## 作用
清空会话消息、清理临时缓存、清理过期记忆。仅操作 session/cache 范围，不影响工程文件。

## 输入
- `session_id`（必填）：会话 ID
- `target`（可选）：
  - `messages` - 仅清空消息
  - `cache` - 仅清理临时缓存
  - `all` - 两者都清（默认）

## 输出
- `{status, cleared: [list of cleaned items]}`
- 操作可逆（cache 和 messages 可重新生成）