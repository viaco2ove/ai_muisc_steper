"""context_manager.py - 上下文管理

组装 messages (System Prompt + 工程摘要 + 历史对话 + 用户输入)
"""
from typing import List, Dict, Any

from .utils.prompt_templates import SYSTEM_PROMPT_REACT
from ..core.project_manager import ProjectManager


class ContextManager:
    def __init__(self, project_manager: ProjectManager):
        self.pm = project_manager

    def build_initial_messages(
        self,
        user_prompt: str,
        project_name: str = "",
        history: List[Dict[str, str]] = None,
        audio_path: str = "",
    ) -> List[Dict[str, Any]]:
        """构造初始 messages 数组"""
        messages = [{"role": "system", "content": SYSTEM_PROMPT_REACT}]

        # 工程摘要
        if project_name:
            try:
                ctx = self.pm.summary(project_name)
                messages.append({"role": "system", "content": f"【当前工程上下文】\n{ctx}"})
            except Exception:
                pass

        # 历史对话 (滑动窗口 20)
        if history:
            for h in history[-20:]:
                role = h.get("role", "user")
                msg = h.get("msg", "")
                if role == "user":
                    messages.append({"role": "user", "content": msg})
                elif role == "assistant":
                    messages.append({"role": "assistant", "content": msg})

        # 用户本次输入
        user_content = f"【用户需求】\n{user_prompt}"
        if audio_path:
            user_content += f"\n【本地素材】\n音频: {audio_path}"
        messages.append({"role": "user", "content": user_content})

        return messages