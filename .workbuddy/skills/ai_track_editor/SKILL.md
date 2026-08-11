---
name: ai_track_editor
description: 后端 AI 整轨/小节/音符 调整技能。对轨道 JSON 的 notes 做移调(transpose)/力度(velocity)/时值(duration)/反转(reverse)/插段(insert) 变换并写回。支持自然语言指令或结构化参数，scope 可限定整轨/小节区间/指定音符。
entry_script: "scripts/main.py"
params: {"project": "歌名(required)", "track": "轨id(required)", "instruction": "自然语言指令(如'升八度'/'力度加强'/'第20小节后插入4小节')", "scope": "all|bars:A-B|indices:i,j", "op": "transpose|velocity|duration|reverse|insert(可选覆盖)", "after_bar": "插段:起始小节", "bars": "插段:小节数", "semis": "移调半音数", "delta": "力度增减", "scale": "时值缩放"}
executable: true
---

# ai_track_editor · 后端 AI 轨道调整

在轨道 JSON 的**规范格式**上做变换并写回（mscx 生成器可直接消费）：

- `note.midi` 音高(0-127)
- `note.duration` 中文时值词（"4分"/"8分"/"16分"/"2分"/"1分"/"32分"）
- `note.beat_pos` "小节.拍.子拍"（子拍为半拍：1=0, 2=+0.5拍）
- `note.velocity` 力度(1-127)

## 能力（op）

| op | 说明 | 参数 |
|----|------|------|
| transpose | 移调 | `semis`(半音) 或指令"升八度"/"降八度"/"升2半音" |
| velocity | 力度增减 | `delta` 或指令"力度加强"/"轻一点" |
| duration | 时值缩放(离散对齐到最邻近时值词) | `scale` 或指令"时值缩短/拉长" |
| reverse | 反转音符顺序并重排 | — |
| insert | 在第 N 小节后插入 M 小节(复制前段模式) | `after_bar`,`bars` 或指令"第20小节后插入4小节" |

## scope（作用域）

- `all`（默认）：整轨
- `bars:A-B`：小节区间（含端点）
- `indices:i,j,k`：音符下标（前端选中音符时传）

## 调用

经 AgentCore：`run_skill("ai_track_editor", {"project":"走在","track":"13_轻贝斯","instruction":"升八度","scope":"all"})`
stdout 输出 JSON：`{status, project, track, op, scope, affected, changed, diff:[...]}`

> 后端 LLM(orcg) 接入后，自然语言由 LLM 解析为上述结构化参数；当前由脚本内置关键词兜底解析。
