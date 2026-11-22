from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # API keys
    openai_api_key: str = ""
    groq_api_key: str = ""
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"

    # IBM watsonx.ai / Granite
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"
    watsonx_model_id: str = "ibm/granite-3-8b-instruct"

    # Backend selection
    stt_backend: str = "whisper_api"       # whisper_api | whisper_local
    llm_backend: str = "watsonx"           # openai | groq | watsonx
    tts_backend: str = "openai"            # openai | elevenlabs

    # Model names
    whisper_model: str = "base"
    llm_model_openai: str = "gpt-4o-mini"
    llm_model_groq: str = "llama-3.1-8b-instant"

    # Prompt
    system_prompt: str = (
        "You are a helpful, concise voice assistant. "
        "Keep responses under 3 sentences unless asked for more detail."
    )

    # SahayaVoice civic complaint engine
    sahaya_lang: str = "kannada"           # kannada | hindi | english
    sahaya_max_clarify: int = 3            # max clarification rounds

    # Server
    port: int = 8000
    log_level: str = "info"


@lru_cache
def get_settings() -> Settings:
    return Settings()
