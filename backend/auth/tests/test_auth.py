import jwt
from fastapi.testclient import TestClient

from auth.main import app, get_settings
from common.config import AppSettings, LiveKitSettings

client = TestClient(app)


def test_get_token() -> None:
    response = client.get("/token?room_name=test_room&identity=test_user")
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "ws_url" in data
    assert isinstance(data["token"], str)
    assert len(data["token"]) > 0


def test_token_ttl_is_15_minutes() -> None:
    response = client.get("/token?room_name=test_room&identity=test_user")
    assert response.status_code == 200
    token = response.json()["token"]
    payload = jwt.decode(token, options={"verify_signature": False})
    ttl = payload["exp"] - payload["nbf"]
    assert ttl == 900


def test_cors_allowed_origin() -> None:
    headers = {"Origin": "https://www.alexandermcintosh.com"}
    response = client.get(
        "/token?room_name=test_room&identity=test_user", headers=headers
    )
    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin")
        == "https://www.alexandermcintosh.com"
    )
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_preflight_options() -> None:
    headers = {
        "Origin": "https://www.alexandermcintosh.com",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/token", headers=headers)
    assert response.status_code == 200
    assert (
        response.headers.get("access-control-allow-origin")
        == "https://www.alexandermcintosh.com"
    )
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_disallowed_origin() -> None:
    headers = {"Origin": "https://malicious-site.com"}
    response = client.get(
        "/token?room_name=test_room&identity=test_user", headers=headers
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") is None


def test_token_suppresses_local_ip_in_production() -> None:
    prod_settings = AppSettings(
        livekit=LiveKitSettings(url="wss://livekit.alexandermcintosh.com")
    )
    app.dependency_overrides[get_settings] = lambda: prod_settings
    try:
        response = client.get("/token?room_name=test_room&identity=test_user")
        assert response.status_code == 200
        data = response.json()
        assert data["local_ip"] is None
        assert data["ws_url"] == "wss://livekit.alexandermcintosh.com"
    finally:
        app.dependency_overrides.clear()


def test_health_check() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
