#!/usr/bin/env python3
"""测试 song_engineer 技能 via WebSocket"""
import asyncio
import json
import websockets
import sys

BACKEND_URL = "ws://127.0.0.1:9120/ws/chat"


async def test():
    print("=" * 60)
    print("测试 song_engineer 技能 (Native Tool Calling)")
    print("=" * 60)

    async with websockets.connect(BACKEND_URL, ping_interval=None) as ws:
        # 发送 ping 测试连接
        await ws.send(json.dumps({"type": "ping"}))
        try:
            resp = await asyncio.wait_for(ws.recv(), timeout=5)
            print(f"[pong] {json.loads(resp)}")
        except:
            print("[无pong响应，继续]")

        # 发送测试消息 - 更明确的指令
        test_msg = {
            "type": "chat",
            "msg": "用 song_engineer 技能的 diagnose 命令诊断工程测试LLM工程",
            "project": "测试LLM工程"
        }
        await ws.send(json.dumps(test_msg))
        print(f"\n[发送] {test_msg['msg']}")

        # 收集响应
        tool_calls = []
        reasoning_events = []
        skill_done = None

        while True:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=60)
                data = json.loads(msg)
                event_type = data.get("type", "")

                if event_type == "error":
                    print(f"[错误] {data.get('error')}")
                    break

                elif event_type == "reasoning":
                    reasoning_events.append(data)
                    print(f"[推理] {data.get('content', '')[:100]}...")

                elif event_type in ("action", "skill_done"):
                    # AgentLoop 发出 action 事件 (映射到 skill_done)
                    tool_calls.append(data)
                    tool_name = data.get('tool', data.get('skill', 'unknown'))
                    call_id = data.get('call_id', 'N/A')
                    print(f"\n[工具执行] {tool_name}({call_id}) -> {data.get('status', 'running')}")
                    if data.get('status') == 'ok':
                        print(f"  文件: {data.get('files', [])[:2]}")
                    if data.get('error'):
                        print(f"  错误: {data.get('error')[:100]}")
                    if data.get('args'):
                        print(f"  参数: {data.get('args')}")

                elif event_type == "observation":
                    obs = data.get('output', data.get('content', ''))
                    print(f"\n[观察结果] {obs[:300]}...")
                    if data.get('status'):
                        print(f"  status: {data.get('status')}")

                elif event_type == "skill_done":
                    skill_done = data
                    print(f"\n[技能完成] {data.get('skill')}")
                    print(f"  结果: {json.dumps(data.get('result', {}), ensure_ascii=False)[:300]}")
                    break

                elif event_type == "done":
                    print(f"\n[完成] {data.get('message', '')}")
                    break

            except asyncio.TimeoutError:
                print("[超时]")
                break

        # 总结
        print("\n" + "=" * 60)
        print("测试结果:")
        print(f"  工具调用次数: {len(tool_calls)}")
        for tc in tool_calls:
            print(f"    - {tc.get('tool_call', {}).get('name')}: {tc.get('tool_call', {}).get('arguments')}")
        print(f"  推理事件: {len(reasoning_events)}")
        print(f"  技能完成: {'✅' if skill_done else '❌'}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test())