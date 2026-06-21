from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class LiveKitSettings(BaseSettings):
    api_key: str = "devkey"
    api_secret: SecretStr = SecretStr("secret")
    url: str = "ws://localhost:7880"

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"),
        env_file_encoding="utf-8",
        env_prefix="LIVEKIT_",
        extra="ignore",
    )


class AppSettings(BaseSettings):
    livekit: LiveKitSettings = LiveKitSettings()

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )
