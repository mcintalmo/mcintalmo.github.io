from fastapi.testclient import TestClient

from auth.main import app

client = TestClient(app)


def test_get_token() -> None:
    response = client.get("/token?room_name=test_room&identity=test_user")
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "ws_url" in data
    assert isinstance(data["token"], str)
    assert len(data["token"]) > 0
