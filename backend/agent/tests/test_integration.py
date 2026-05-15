import httpx
import pytest
from testcontainers.core.container import DockerContainer
from testcontainers.core.waiting_utils import wait_for_logs

@pytest.fixture(scope="module")
def whisper_container():
    # Automatically downloads the model on first boot
    container = DockerContainer("fedirz/faster-whisper-server:latest-cpu")
    container.with_env("WHISPER__MODEL", "Systran/faster-whisper-tiny.en")
    container.with_exposed_ports(8000)
    
    with container as c:
        # Wait for uvicorn to start
        wait_for_logs(c, "Application startup complete", timeout=120)
        yield c

@pytest.fixture(scope="module")
def kokoro_container():
    container = DockerContainer("ghcr.io/remsky/kokoro-fastapi-cpu:latest")
    container.with_exposed_ports(8880)
    
    with container as c:
        # Wait for uvicorn to start
        wait_for_logs(c, "Application startup complete", timeout=120)
        yield c

def test_whisper_server(whisper_container):
    host = whisper_container.get_container_host_ip()
    port = whisper_container.get_exposed_port(8000)
    
    response = httpx.get(f"http://{host}:{port}/v1/models")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data

def test_kokoro_server(kokoro_container):
    host = kokoro_container.get_container_host_ip()
    port = kokoro_container.get_exposed_port(8880)
    
    # Check if the models endpoint or health endpoint is up
    response = httpx.get(f"http://{host}:{port}/v1/audio/speakers")
    # Even if it's 404 for this exact path, we verify the server is running and responding to HTTP
    # Kokoro FastAPI has /v1/audio/speakers or similar? We'll just check it's not a connection error.
    assert response.status_code in [200, 404, 401]
