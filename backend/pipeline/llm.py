"""
Async LLM adapter for the SahayaVoice (`pipeline.sahaya`) modules.

The sahaya package was written against an async `complete()` helper that was
dropped when `llm_agent.py` was rewritten. This shim restores that interface on
top of the current synchronous provider router in `llm_agent._llm_call`.
"""

from __future__ import annotations

import asyncio

from .llm_agent import _llm_call


async def complete(
    prompt: str,
    system_override: str | None = None,
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> str:
    """Return the full completion text for `prompt` (runs the blocking call in a thread)."""
    system_prompt = system_override or "You are SahayaVoice, a helpful civic assistant for Bengaluru."
    return await asyncio.to_thread(_llm_call, system_prompt, prompt)
