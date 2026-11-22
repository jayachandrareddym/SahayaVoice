"""
LLM module — supports:
  - OpenAI GPT       (gpt-4o-mini by default — cheap & fast)
  - Groq             (llama-3.1-8b-instant — ~10× faster, free tier)
  - IBM watsonx.ai   (granite-3-8b-instruct — SahayaVoice primary backend)

Both streaming and non-streaming paths are exposed.
"""
from __future__ import annotations

import logging
from typing import AsyncIterator

from .config import get_settings

logger = logging.getLogger(__name__)


async def stream_completion(
    user_message: str,
    history: list[dict] | None = None,
    system_override: str | None = None,
) -> AsyncIterator[str]:
    """
    Yield text chunks as they stream from the LLM.
    history: list of {"role": "user"|"assistant", "content": str}
    system_override: replace the default system prompt for this call.
    """
    cfg = get_settings()

    if cfg.llm_backend == "openai":
        async for chunk in _stream_openai(user_message, history or [], system_override):
            yield chunk
    elif cfg.llm_backend == "groq":
        async for chunk in _stream_groq(user_message, history or [], system_override):
            yield chunk
    elif cfg.llm_backend == "watsonx":
        async for chunk in _stream_watsonx(user_message, history or [], system_override):
            yield chunk
    else:
        raise ValueError(f"Unknown LLM backend: {cfg.llm_backend!r}")


async def complete(
    prompt: str,
    system_override: str | None = None,
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> str:
    """
    Non-streaming completion — collects and returns full response text.
    Used by the SahayaVoice intent/clarification pipeline.
    """
    chunks: list[str] = []
    async for chunk in stream_completion(
        prompt,
        history=None,
        system_override=system_override,
    ):
        chunks.append(chunk)
    return "".join(chunks)


def _build_messages(
    user_message: str,
    history: list[dict],
    system_override: str | None = None,
) -> list[dict]:
    cfg = get_settings()
    system_content = system_override if system_override is not None else cfg.system_prompt
    messages = [{"role": "system", "content": system_content}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return messages


# ── OpenAI ───────────────────────────────────────────────────────────────────

async def _stream_openai(
    user_message: str,
    history: list[dict],
    system_override: str | None = None,
) -> AsyncIterator[str]:
    from openai import AsyncOpenAI

    cfg = get_settings()
    client = AsyncOpenAI(api_key=cfg.openai_api_key)
    messages = _build_messages(user_message, history, system_override)

    logger.info("LLM [openai/%s] streaming...", cfg.llm_model_openai)
    stream = await client.chat.completions.create(
        model=cfg.llm_model_openai,
        messages=messages,
        stream=True,
        temperature=0.7,
        max_tokens=512,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


# ── Groq ─────────────────────────────────────────────────────────────────────

async def _stream_groq(
    user_message: str,
    history: list[dict],
    system_override: str | None = None,
) -> AsyncIterator[str]:
    from groq import AsyncGroq  # type: ignore

    cfg = get_settings()
    client = AsyncGroq(api_key=cfg.groq_api_key)
    messages = _build_messages(user_message, history, system_override)

    logger.info("LLM [groq/%s] streaming...", cfg.llm_model_groq)
    stream = await client.chat.completions.create(
        model=cfg.llm_model_groq,
        messages=messages,
        stream=True,
        temperature=0.7,
        max_tokens=512,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


# ── IBM watsonx.ai / Granite ─────────────────────────────────────────────────

async def _stream_watsonx(
    user_message: str,
    history: list[dict],
    system_override: str | None = None,
) -> AsyncIterator[str]:
    """
    Calls IBM watsonx.ai text generation endpoint using the ibm-watsonx-ai SDK.
    The SDK does not natively yield async chunks, so we request the full
    response and yield it as a single chunk (token-by-token simulation).
    """
    import asyncio
    from ibm_watsonx_ai import APIClient, Credentials  # type: ignore
    from ibm_watsonx_ai.foundation_models import ModelInference  # type: ignore
    from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams  # type: ignore

    cfg = get_settings()

    # Build the prompt from message history (Granite instruction format)
    messages = _build_messages(user_message, history, system_override)
    prompt_text = _messages_to_granite_prompt(messages)

    logger.info("LLM [watsonx/%s] generating...", cfg.watsonx_model_id)

    credentials = Credentials(
        url=cfg.watsonx_url,
        api_key=cfg.watsonx_api_key,
    )
    client = APIClient(credentials=credentials)

    model = ModelInference(
        model_id=cfg.watsonx_model_id,
        api_client=client,
        project_id=cfg.watsonx_project_id,
        params={
            GenParams.MAX_NEW_TOKENS: 1024,
            GenParams.TEMPERATURE: 0.2,
            GenParams.STOP_SEQUENCES: ["<|endoftext|>"],
        },
    )

    # Run blocking SDK call in executor to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: model.generate_text(prompt=prompt_text),
    )

    generated = result if isinstance(result, str) else result.get("results", [{}])[0].get("generated_text", "")
    # Yield word-by-word so downstream TTS sentence-buffer logic works
    words = generated.split(" ")
    for i, word in enumerate(words):
        yield word if i == len(words) - 1 else word + " "


def _messages_to_granite_prompt(messages: list[dict]) -> str:
    """
    Convert OpenAI-style message list to IBM Granite chat prompt format.
    Granite-3 uses the <|system|>, <|user|>, <|assistant|> template.
    """
    parts: list[str] = []
    for msg in messages:
        role = msg["role"]
        content = msg["content"]
        if role == "system":
            parts.append(f"<|system|>\n{content}")
        elif role == "user":
            parts.append(f"<|user|>\n{content}")
        elif role == "assistant":
            parts.append(f"<|assistant|>\n{content}")
    parts.append("<|assistant|>")
    return "\n".join(parts)
