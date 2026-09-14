from pydantic import SecretStr

from common.config import AppSettings, CorsSettings, LiveKitSettings


def test_cors_settings_defaults() -> None:
    cors = CorsSettings()
    assert "https://www.alexandermcintosh.com" in cors.allowed_origins
    assert "https://alexandermcintosh.com" in cors.allowed_origins
    assert "http://localhost:4321" in cors.allowed_origins


def test_cors_settings_csv_parsing() -> None:
    cors = CorsSettings(
        allowed_origins="https://example.com, https://app.example.com"  # type: ignore[arg-type]
    )
    assert cors.allowed_origins == [
        "https://example.com",
        "https://app.example.com",
    ]


def test_app_settings_ttl_default() -> None:
    settings = AppSettings()
    assert settings.token_ttl_seconds == 900


def test_livekit_security_validation_warns_in_prod() -> None:
    # Weak secret in production (wss://) triggers warning without exception
    livekit = LiveKitSettings(
        api_key="devkey",
        api_secret=SecretStr("secret"),
        url="wss://livekit.alexandermcintosh.com",
    )
    livekit.validate_security()
