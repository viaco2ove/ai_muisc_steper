#!/usr/bin/env python3
"""Detailed trace of WS messages"""
import asyncio
import json
import websockets

BACKEND_URL = "ws://127.0.0.1:8120/ws/chat"

async def test():
    async with websockets.connect(BACKEND_URL, ping_interval=None) as ws:
        await ws.send(json.dumps({"type": "ping"}))
        try:
            resp = await asyncio.wait_for(ws.recv(), timeout=5)
            print(f"[pong] {resp}")
        except:
            pass

        # 发送更简短的测试消息
        test_msg = {
            "type": "chat",
            "msg": "用 song_engineer 诊断工程 测试LLM工程",
            "project": "测试LLM工程"
        }
        await ws.send(json.dumps(test_msg))
        print(f"[发送] {test_msg['msg']}\n")

        step = 0
        while step < 100:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=120)
                data = json.loads(msg)
                step += 1

                t = data.get("type", "")
                if t == "reasoning":
                    content = data.get('content', '') or data.get('msg', '')
                    # 只打印前3条和关键条
                    if step <= 3 or step >= 33:
                        print(f"[{step:2d}] REASONING: {content[:100]}...")
                elif t == "tool_call":
                    print(f"[{step:2d}] TOOL_CALL: {json.dumps(data.get('tool_call', {}))[:150]}")
                elif t in ("action", "skill_done"):
                    tool = data.get('tool', 'unknown')
                    status = data.get('status', '?')
                    args = data.get('args', {})
                    print(f"[{step:2d}] ACTION: {tool} -> {status}")
                    if args:
                        print(f"        args: {json.dumps(args, ensure_ascii=False)[:100]}")
                elif t == "observation":
                    output = data.get('output', data.get('content', ''))
                    print(f"[{step:2d}] OBSERVATION: {output[:150]}...")
                elif t == "done":
                    print(f"[{step:2d}] DONE: {data.get('message', '')}")
                    break
                elif t == "error":
                    print(f"[{step:2d}] ERROR: {data}")
                    break
                elif t == "chain_done":
                    print(f"[{step:2d}] CHAIN_DONE: total={data.get('total')}, ok={data.get('ok')}, fail={data.get('fail')}")
                    break
                else:
                    print(f"[{step:2d}] OTHER: type={t}, keys={list(data.keys())}")

            except asyncio.TimeoutError:
                print(f"[TIMEOUT at step {step}]")
                break

        print(f"\n总共 {step} 条消息")

asyncio.run(test())