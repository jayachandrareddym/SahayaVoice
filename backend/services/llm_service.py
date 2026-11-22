"""
LLM service – calls the configured inference backend.

Supported backends (set via environment):
  LLM_BACKEND=ollama   → local Ollama  (default, model: llama3)
  LLM_BACKEND=openai   → OpenAI-compatible endpoint
  LLM_BACKEND=watsonx  → IBM watsonx.ai (stub, replace with SDK calls)

The system prompt instructs the model to act as SahayaVoice:
a multilingual civic complaint assistant that replies in the user's language
and formats output as a formal Kannada complaint letter when requested.
"""

import os
from typing import List

import httpx

LLM_BACKEND: str = os.getenv("LLM_BACKEND", "ollama")
LLM_API_URL: str = os.getenv("LLM_API_URL", "http://localhost:11434/api/chat")
LLM_MODEL: str = os.getenv("LLM_MODEL", "llama3")
LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")

SYSTEM_PROMPT = (
    "You are SahayaVoice, a multilingual civic complaint assistant for Bengaluru citizens. "
    "Your job is to:\n"
    "1. Understand the user's complaint in their language (Kannada, Hindi, Tamil, Telugu, English or Kanglish).\n"
    "2. Ask for any missing details (location, date, nature of issue) in the same language.\n"
    "3. When all details are available, generate a formal Kannada civic complaint letter "
    "   addressed to the BBMP (Bruhat Bengaluru Mahanagara Palike).\n"
    "4. Also provide an English translation of the letter.\n"
    "Always reply in the same language the user used unless generating the final letter."
)


async def generate_response(
    user_message: str,
    history: List[dict],
    lang_code: str,
) -> str:
    """
    Send *user_message* (plus conversation *history*) to the configured LLM
    and return the assistant's reply as a plain string.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    if LLM_BACKEND == "watsonx":
        return await _watsonx_generate(messages)
    return await _openai_compatible_generate(messages)


# ---------------------------------------------------------------------------
# Backend implementations
# ---------------------------------------------------------------------------

async def _openai_compatible_generate(messages: List[dict]) -> str:
    """Works with Ollama, OpenAI, and any OpenAI-compatible endpoint."""
    headers: dict = {"Content-Type": "application/json"}
    if LLM_API_KEY:
        headers["Authorization"] = f"Bearer {LLM_API_KEY}"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            LLM_API_URL,
            headers=headers,
            json={"model": LLM_MODEL, "messages": messages, "stream": False},
        )
        resp.raise_for_status()
        data = resp.json()
        # Ollama: data["message"]["content"]
        # OpenAI: data["choices"][0]["message"]["content"]
        if "message" in data:
            return data["message"]["content"]
        return data["choices"][0]["message"]["content"]


async def _watsonx_generate(messages: List[dict]) -> str:
    """
    IBM watsonx.ai stub.
    Replace with actual ibm-watsonx-ai SDK calls for production.
    """
    # TODO (Member 6): integrate ibm-watsonx-ai SDK here
    raise NotImplementedError(
        "watsonx.ai backend not yet implemented. "
        "Set LLM_BACKEND=ollama or LLM_BACKEND=openai, "
        "or implement this stub with the ibm-watsonx-ai SDK."
    )
