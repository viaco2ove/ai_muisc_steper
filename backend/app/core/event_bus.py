"""event_bus.py - 事件总线

简单的 pub/sub, AgentLoop yield AgentEvent → EventBus.publish() → WS 转发
支持同步/异步订阅
"""
import asyncio
from typing import Callable, Dict, List, Awaitable, Union
from .schemas.events import AgentEvent, EventType


class EventBus:
    def __init__(self):
        self._subscribers: Dict[EventType, List[Callable]] = {}
        self._global_subscribers: List[Callable] = []

    def subscribe(self, event_type: EventType, callback: Callable[[AgentEvent], Union[None, Awaitable[None]]]):
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    def subscribe_all(self, callback: Callable[[AgentEvent], Union[None, Awaitable[None]]]):
        """订阅所有事件"""
        self._global_subscribers.append(callback)

    async def publish(self, event: AgentEvent):
        """发布事件 (异步支持)"""
        callbacks = self._subscribers.get(event.type, []) + self._global_subscribers
        for cb in callbacks:
            try:
                result = cb(event)
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                pass