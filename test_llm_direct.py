#!/usr/bin/env python3
"""Direct LLM test to see if tool_calls are generated"""
import sys
import json
sys.path.insert(0, 'backend')

from pathlib import Path
from app.core.tool_registry import ToolRegistry
from app.core.llm_client import get_llm

tr = ToolRegistry(Path('.workbuddy/skills'))
tools = tr.get_openai_tools_schema()

# Find song_engineer schema
for t in tools:
    if t['function']['name'] == 'song_engineer':
        print("song_engineer schema:")
        print(json.dumps(t, indent=2, ensure_ascii=False))
        break

print("\n" + "=" * 60)

llm = get_llm("skill_ai")

messages = [
    {"role": "system", "content": "你是AI助手"},
    {"role": "user", "content": "用 song_engineer 的 diagnose 命令诊断工程 测试LLM工程"}
]

print("Calling LLM...")
tool_calls_found = []
content_found = []

import asyncio
async def test():
    global tool_calls_found, content_found
    async for kind, payload in llm.chat_stream(messages, tools=tools):
        if kind == "reasoning":
            pass  # skip
        elif kind == "content":
            content_found.append(payload)
        elif kind == "tool_calls":
            tool_calls_found.extend(payload)
            print(f"[tool_calls] {json.dumps(payload, ensure_ascii=False)[:200]}")

    print(f"\nTotal tool_calls: {len(tool_calls_found)}")
    print(f"Content: {''.join(content_found)[:300]}")

    if tool_calls_found:
        print("\nFirst tool_call:")
        print(json.dumps(tool_calls_found[0], indent=2, ensure_ascii=False))

asyncio.run(test())