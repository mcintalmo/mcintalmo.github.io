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


def test_cors_allowed_origins_environment_filtering() -> None:
    cors = CorsSettings()
    dev_origins = cors.get_allowed_origins("development")
    assert "http://localhost:4321" in dev_origins
    assert "https://www.alexandermcintosh.com" in dev_origins

    prod_origins = cors.get_allowed_origins("production")
    assert "https://www.alexandermcintosh.com" in prod_origins
    assert "https://alexandermcintosh.com" in prod_origins
    assert "https://mcintalmo.github.io" in prod_origins
    assert "http://localhost:4321" not in prod_origins
    assert "http://127.0.0.1:4321" not in prod_origins


def test_app_settings_ttl_default() -> None:
    settings = AppSettings()
    assert settings.token_ttl_seconds == 900


def test_cors_origin_regex() -> None:
    import re

    cors = CorsSettings()
    regex_dev = cors.get_origin_regex("development")
    assert regex_dev is not None

    pattern = re.compile(regex_dev)
    assert pattern.match("http://localhost:4321")
    assert pattern.match("http://127.0.0.1:3000")
    assert pattern.match("http://192.168.1.50:4321")
    assert pattern.match("http://10.0.0.2:8000")
    assert pattern.match("http://172.16.1.1:4321")
    assert not pattern.match("http://attacker.com")
    assert not pattern.match("http://8.8.8.8:4321")

    # In production, default regex is None
    assert cors.get_origin_regex("production") is None


def test_livekit_security_validation_warns_in_prod() -> None:
    # Weak secret in production (wss://) triggers warning without exception
    livekit = LiveKitSettings(
        api_key="devkey",
        api_secret=SecretStr("secret"),
        url="wss://livekit.alexandermcintosh.com",
    )
    livekit.validate_security()
