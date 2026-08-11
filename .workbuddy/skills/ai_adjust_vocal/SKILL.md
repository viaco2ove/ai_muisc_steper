---
name: ai_adjust_vocal
description: 后端 AI 人声演唱细节调整技能。对人声轨 JSON 设置 singer 配置(voicebank/tension/breath/gender)、音符级 singer_override、dynamics/velocity 力度、alignment 对齐方式。支持自然语言指令或结构化参数。
entry_script: "scripts/main.py"
params: {"project": "歌名(required)", "track": "轨id(required,人声轨)", "instruction": "自然语言(如'气声多一点'/'更紧张'/'换成女声'/'声库 拼接妹'/'力度加强')", "scope": "all|indices:i,j", "singer": "{voicebank,tension,breath,gender}", "alignment": "auto|snap|manual", "delta": "力度增减", "per_note": "true 时对选中音符写 singer_override"}
executable: true
---

# ai_adjust_vocal · 后端 AI 人声演唱细节

针对人声轨 JSON 做演唱细节调整并写回：

- **track 级 singer**：`voicebank` / `tension(-1~1)` / `breath(0~1)` / `gender(-1~1)`
- **音符级 singer_override**：单音覆盖轨级（导出 ustx 用，`per_note=true` 时作用于选中音符）
- **力度**：音符 `velocity` / `dynamics` 调整
- **对齐**：音符 `alignment`（auto/snap/manual）

## 自然语言映射

| 指令 | 效果 |
|------|------|
| 气声多一点 / breath | `breath += 0.2` |
| 更紧张 / tension | `tension += 0.2` |
| 放松 | `tension -= 0.2` |
| 换成女声 / 男声 | `gender = 0.6 / -0.6` |
| 声库 XXX | `voicebank = XXX` |
| 力度加强 / 轻一点 | `velocity ±15` |
| 对齐改手动 / 吸附 / 自动 | `alignment` |

## 调用

经 AgentCore：`run_skill("ai_adjust_vocal", {"project":"走在","track":"02_主唱","instruction":"气声多一点，力度加强","scope":"all"})`
stdout：`{status, project, track, singer, alignment, affected, changed, diff:[...]}`
