---
name: render_mscx
description: agent core 专用 · 把 MuseScore 乐谱(mscx)渲染为音频(mp3/wav)。闭环"生成乐谱→出音频"的最后一步，让 ReAct 能自主把工程渲染成品。默认渲染工程总谱 {歌名}/{歌名}.mscx，输出到 {歌名}/render/。
executable: true
entry_script: "scripts/render_mscx.py"
params:
  project: {description: "工程名称(required)", type: string, required: true}
  track: {description: "可选，轨道ID(如 01_吉他)；指定则渲染该轨 mscx，否则渲染总谱", type: string, required: false}
  format: {description: "输出格式 mp3/wav(默认 mp3)", type: string, required: false}
  sound_profile: {description: "音源配置 MuseSounds / MuseScore Basic(默认 MuseSounds)", type: string, required: false}
agent_created: true
---

# render_mscx — 乐谱渲染（agent core 专用）

## 作用
调用 MuseScore 4 CLI 把 `.mscx` 乐谱渲染成音频文件，闭环"生成乐谱 → 出音频"的最后一步。

## 输入
- `project`（必填）：工程名
- `track`（可选）：轨道 ID；指定则渲染 `song_engineer/track/{tid}.mscx`（若存在），否则渲染工程总谱 `{歌名}/{歌名}.mscx`
- `format`（可选，默认 mp3）：mp3 / wav
- `sound_profile`（可选，默认 MuseSounds）：MuseSounds / MuseScore Basic

## 输出
- `{歌名}/render/{歌名}.{format}`（总谱）或 `{歌名}/render/{tid}.{format}`（单轨）
- 日志打印渲染命令与产物路径

## 命令形态（内部）
```
MuseScore4.exe -f --sound-profile MuseSounds -o out.mp3 in.mscx
```

## 注意
- MuseScore 路径默认 `C:\Program Files\MuseScore 4\bin\MuseScore4.exe`，可用环境变量 `MUSESCORE_EXE` 覆盖。
- 本技能为 agent core 专用（backend/skills），不出现在用户 技能面板。
