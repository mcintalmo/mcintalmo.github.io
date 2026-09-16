import structlog
from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = structlog.get_logger(__name__)

DEFAULT_ALLOWED_ORIGINS: list[str] = [
    "https://www.alexandermcintosh.com",
    "https://alexandermcintosh.com",
    "https://mcintalmo.github.io",
    "http://localhost:4321",
    "http://localhost:3000",
    "http://127.0.0.1:4321",
    "http://127.0.0.1:3000",
]

PRODUCTION_ALLOWED_ORIGINS: list[str] = [
    "https://www.alexandermcintosh.com",
    "https://alexandermcintosh.com",
    "https://mcintalmo.github.io",
]


LOCAL_ORIGIN_REGEX: str = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$"


class CorsSettings(BaseSettings):
    allowed_origins: list[str] = DEFAULT_ALLOWED_ORIGINS
    allow_origin_regex: str | None = None

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    def get_allowed_origins(self, environment: str = "development") -> list[str]:
        if self.allowed_origins != DEFAULT_ALLOWED_ORIGINS:
            return self.allowed_origins
        if environment == "production":
            return PRODUCTION_ALLOWED_ORIGINS
        return self.allowed_origins

    def get_origin_regex(self, environment: str = "development") -> str | None:
        if self.allow_origin_regex is not None:
            return self.allow_origin_regex
        if environment != "production":
            return LOCAL_ORIGIN_REGEX
        return None

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"),
        env_file_encoding="utf-8",
        env_prefix="CORS_",
        extra="ignore",
    )


class LiveKitSettings(BaseSettings):
    api_key: str = "devkey"
    api_secret: SecretStr = SecretStr("secret")
    url: str = "ws://localhost:7880"

    def validate_security(self) -> None:
        secret_val = self.api_secret.get_secret_value()
        if secret_val in ("secret", "") or len(secret_val) < 16:
            if self.url.startswith("wss://"):
                logger.warning(
                    "Insecure LiveKit API secret in production (wss://). "
                    "Please set LIVEKIT_API_SECRET to a strong secret."
                )
        if (
            self.api_key == "devkey"  # pragma: allowlist secret
            and self.url.startswith("wss://")
        ):
            logger.warning(
                "Insecure LiveKit API key in production (wss://). "
                "Please set LIVEKIT_API_KEY."
            )

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"),
        env_file_encoding="utf-8",
        env_prefix="LIVEKIT_",
        extra="ignore",
    )


class AppSettings(BaseSettings):
    livekit: LiveKitSettings = LiveKitSettings()
    cors: CorsSettings = CorsSettings()
    environment: str = "development"
    token_ttl_seconds: int = 900

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", "../.env", "../.env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )
