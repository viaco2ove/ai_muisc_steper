---
name: project_manage
description: 项目管理技能。用于删除、重命名、列出工程。触发词：删除工程、删掉项目、重命名工程、改名、列出项目、工程列表、查看所有工程。
agent_created: true
entry_script: "scripts/project_manage.py"
params:
  command: {description: "操作命令", type: string, required: true, enum: [delete, rename, list]}
  name: {description: "工程名称(delete/rename时必填)", type: string, required: false}
  new_name: {description: "新工程名称(rename时必填)", type: string, required: false}
executable: true
---

# project_manage - 项目管理技能

## 功能

1. **删除工程** - 删除指定工程目录及其所有文件
2. **重命名工程** - 修改工程目录名称
3. **列出工程** - 查看所有工程的概要信息

## 使用示例

```
# 删除工程
project_manage delete "测试工程"

# 重命名工程
project_manage rename "旧名称" "新名称"

# 列出所有工程
project_manage list
```
