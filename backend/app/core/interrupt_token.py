"""interrupt_token.py - 异步任务取消

通过 asyncio.Event 实现取消信号, 支持 callback 注册（用于 SIGKILL 子进程）
"""
import asyncio
from typing import Callable, List


class InterruptToken:
    def __init__(self):
        self._event = asyncio.Event()
        self._callbacks: List[Callable[[], None]] = []

    @property
    def is_cancelled(self) -> bool:
        return self._event.is_set()

    def cancel(self):
        """触发取消"""
        if self._event.is_set():
            return
        self._event.set()
        # 同步执行所有 callback (例如 SIGKILL 子进程)
        for cb in self._callbacks:
            try:
                cb()
            except Exception:
                pass

    def register_callback(self, cb: Callable[[], None]):
        """注册取消时的回调 (用于 kill 子进程)"""
        if cb not in self._callbacks:
            self._callbacks.append(cb)

    async def wait_cancelled(self):
        """异步等待取消信号"""
        await self._event.wait()