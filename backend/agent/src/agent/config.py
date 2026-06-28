import os
from pathlib import Path
from typing import Any

from pydantic.fields import FieldInfo
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)


class YamlConfigSettingsSource(PydanticBaseSettingsSource):
    def __init__(self, settings_cls: type[BaseSettings], section: str = "llm"):
        super().__init__(settings_cls)
        self.section = section

    def get_field_value(
        self, field: FieldInfo, field_name: str
    ) -> tuple[Any, str, bool]:
        return None, field_name, False

    def __call__(self) -> dict[str, Any]:
        config_env = os.environ.get("CONFIG_FILE")
        paths = []
        if config_env:
            paths.append(Path(config_env))
        paths.extend(
            [
                Path("config.yaml"),
                Path("agent.yaml"),
                Path("../config.yaml"),
                Path("../agent.yaml"),
                Path("../../config.yaml"),
                Path("backend/config.yaml"),
                Path("backend/agent/config.yaml"),
                Path("backend/tailor/config.yaml"),
            ]
        )

        yaml_path = None
        for p in paths:
            if p.exists():
                yaml_path = p
                break

        if not yaml_path:
            return {}

        import yaml

        try:
            with open(yaml_path, encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if isinstance(data, dict):
                    section_data = data.get(self.section)
                    if isinstance(section_data, dict):
                        return section_data
        except Exception:
            pass

        return {}


class SttSettings(BaseSettings):
    model: str = "whisper"
    base_url: str = "http://localhost:10300/v1"
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
    response_format: str = "mp3"
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"), extra="ignore"
    )


class AgentSessionSettings(BaseSettings):
    stt: SttSettings = SttSettings()
    llm: LlmSettings = LlmSettings()
    tts: TtsSettings = TtsSettings()
