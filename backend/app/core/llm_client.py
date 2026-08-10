"""llm_client.py - LLM 客户端 v2

支持:
- 流式 chat
- Native Tool Calling (OpenAI Function Calling)
- Reasoning/Thinking 标签
- 模型级配置 (models.json)
"""
import httpx
from typing import AsyncIterator, Optional, List, Dict, Any
from ..config import config


class LLMClient:
    def __init__(self, base_url: str = None, api_key: str = None, model: str = None):
        self.base_url = (base_url or config.llm_base_url).rstrip("/")
        if self.base_url.endswith("/chat/completions"):
            self.base_url = self.base_url[: -len("/chat/completions")]
        self.api_key = api_key or config.llm_api_key
        self.model = model or config.llm_model

    async def chat(self, messages: list, tools: Optional[List[dict]] = None,
                   stream: bool = False, temperature: float = 0.3) -> str:
        """非流式: 返回完整文本"""
        if not self.api_key:
            return ""
        payload = {"model": self.model, "messages": messages, "stream": False, "temperature": temperature}
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        async with httpx.AsyncClient(timeout=120) as c:
            r = await c.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"].get("content", "")

    async def chat_stream(self, messages: list, tools: Optional[List[dict]] = None,
                          temperature: float = 0.3) -> AsyncIterator[tuple]:
        """流式: yield (kind, text) 元组
        kind: 'reasoning' | 'content' | 'tool_calls'

        tool_calls delta 格式 (OpenAI):
        {
          "index": 0,
          "id": "call_xxx",
          "type": "function",
          "function": {"name": "...", "arguments": "..."}  # arguments 是流式 JSON 字符串
        }
        """
        if not self.api_key:
            return
        payload = {"model": self.model, "messages": messages, "stream": True, "temperature": temperature}
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        # 累积 tool_calls
        tool_calls_acc: Dict[int, Dict[str, str]] = {}

        async with httpx.AsyncClient(timeout=180) as c:
            async with c.stream(
                "POST", f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
            ) as r:
                async for line in r.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    chunk = line[6:]
                    if chunk.strip() == "[DONE]":
                        break
                    try:
                        import json
                        d = json.loads(chunk)
                        delta = d["choices"][0].get("delta", {})

                        # 思考过程
                        reasoning = delta.get("reasoning_content") or delta.get("reasoning")
                        if reasoning:
                            yield ("reasoning", reasoning)

                        # 正文
                        content = delta.get("content")
                        if content:
                            yield ("content", content)

                        # 工具调用 (累积)
                        tc_delta = delta.get("tool_calls")
                        if tc_delta:
                            for tc in tc_delta:
                                idx = tc.get("index", 0)
                                if idx not in tool_calls_acc:
                                    tool_calls_acc[idx] = {
                                        "id": tc.get("id", ""),
                                        "type": "function",
                                        "function": {"name": "", "arguments": ""},
                                    }
                                if tc.get("id"):
                                    tool_calls_acc[idx]["id"] = tc["id"]
                                fn = tc.get("function", {})
                                if fn.get("name"):
                                    tool_calls_acc[idx]["function"]["name"] = fn["name"]
                                if fn.get("arguments"):
                                    tool_calls_acc[idx]["function"]["arguments"] += fn["arguments"]
                    except Exception:
                        pass

        # 流结束后 yield 累积的 tool_calls
        if tool_calls_acc:
            ordered = [tool_calls_acc[k] for k in sorted(tool_calls_acc.keys())]
            yield ("tool_calls", ordered)


class LLMRegistry:
    """按 skill 名解析对应 LLMClient"""

    def __init__(self):
        self.cfg = config.models_config
        self.models = {m["id"]: m for m in self.cfg.get("models", [])}
        self._cache = {}

    def _default_model_id(self) -> Optional[str]:
        return self.cfg.get("skill_ai", {}).get("model")

    def get_model_id_for(self, skill: str) -> Optional[str]:
        if skill and skill != "skill_ai":
            ov = self.cfg.get(skill, {}).get("model")
            if ov and ov in self.models:
                return ov
        return self._default_model_id()

    def get_client(self, skill: str = None) -> LLMClient:
        mid = self.get_model_id_for(skill)
        if mid in self._cache:
            return self._cache[mid]
        m = self.models.get(mid)
        if not m:
            c = LLMClient()
        else:
            c = LLMClient(
                base_url=m.get("url"),
                api_key=m.get("apiKey"),
                model=m.get("model") or m.get("id"),
            )
        self._cache[mid] = c
        return c


llm_client = LLMClient()
registry = LLMRegistry()


def get_llm(skill: str = None) -> LLMClient:
    return registry.get_client(skill)