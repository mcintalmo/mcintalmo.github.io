from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

from common.config import YamlConfigSettingsSource


class SttSettings(BaseSettings):
    model: str = "Systran/faster-whisper-tiny.en"
    base_url: str = "http://localhost:10300/v1"
    ws_url: str = "ws://localhost:10300/v1/audio/transcriptions"
    api_key: str = "local-key"
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"), extra="ignore"
    )


class LlmSettings(BaseSettings):
    model: str = "portfolio-llm"
    base_url: str = "http://localhost:4000/v1"
    api_key: str = "local-key"
    model_config = SettingsConfigDict(
        env_prefix="LITELLM_",
        env_file=(".env", ".env.local", "../.env", "../.env.local"),
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            env_settings,
            YamlConfigSettingsSource(settings_cls, "llm"),
            dotenv_settings,
        )


class TtsSettings(BaseSettings):
    model: str = "kokoro"
    base_url: str = "http://localhost:8880/v1"
    api_key: str = "local-key"
    voice: str = "af_heart"
    response_format: str = "wav"
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"), extra="ignore"
    )


class CartesiaTtsSettings(BaseSettings):
    api_key: str = ""
    # sonic-3.5: best quality/latency balance. sonic-turbo: lowest latency.
    model: str = "sonic-3.5"
    # "Reflective" - clear, professional male voice
    voice: str = "a0e99841-438c-4a64-b679-ae501e7d6091"
    language: str = "en"
    model_config = SettingsConfigDict(
        env_prefix="CARTESIA_",
        env_file=(".env", ".env.local", "../.env", "../.env.local"),
        extra="ignore",
    )


class AgentSessionSettings(BaseSettings):
    # Set TTS_PROVIDER=kokoro to fall back to self-hosted Kokoro
    tts_provider: str = "cartesia"
    stt_provider: str = "whisper-stream"  # "whisper-stream" or "whisper"
    stt: SttSettings = SttSettings()
    llm: LlmSettings = LlmSettings()
    tts: TtsSettings = TtsSettings()
    cartesia_tts: CartesiaTtsSettings = CartesiaTtsSettings()
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"), extra="ignore"
    )
