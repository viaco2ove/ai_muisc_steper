---
name: init_project
description: 初始化新歌曲工程。创建工程目录结构、骨架MD、轨道目录。触发词：新建工程、建立工程、创建工程、工程初始化、开始新项目。
agent_created: true
entry_script: "scripts/init_project.py"
params: {"name": "工程名称(required)", "style": "音乐风格(如民谣/摇滚/流行)", "bpm": "BPM速度", "key": "调性(如C/Am)"}
executable: true
---

# init_project — 新建歌曲工程

## 功能

创建规范化的歌曲工程目录结构：

```
workspace/project/{工程名}/
├── project.md              # 歌曲雏形骨架（人类可读写）
└── song_engineer/
    └── track/              # 分轨目录（后续聚合产物）
```

## 输入参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 工程名称 |
| style | string | 否 | 音乐风格，如民谣/摇滚/流行 |
| bpm | integer | 否 | BPM 速度，如 68/72/120 |
| key | string | 否 | 调性，如 C/Am/G |

## 输出

- 创建工程目录
- 生成 `project.md` 骨架文件（含基础信息、段落结构表、分轨规划区块）
- 返回 `{"name": "...", "path": "..."}`

## 使用场景

1. 用户说"新建工程 走在"或"建立工程 我的歌"
2. 用户说"开始一个新项目"
3. 用户想初始化一个空的歌曲工程
