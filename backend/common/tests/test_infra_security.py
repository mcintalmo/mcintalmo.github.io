from typing import Any

import yaml

from common.paths import REPO_ROOT


def test_docker_compose_port_isolation() -> None:
    compose_path = REPO_ROOT / "infra" / "docker-compose.yaml"
    assert compose_path.is_file(), f"Missing {compose_path}"

    with open(compose_path, encoding="utf-8") as f:
        data: dict[str, Any] = yaml.safe_load(f)

    services: dict[str, Any] = data.get("services", {})
    assert services, "No services found in docker-compose.yaml"

    allowed_public_ports = {"7881:7881", "7882:7882/udp"}

    for service_name, service_cfg in services.items():
        ports = service_cfg.get("ports", [])
        for port_mapping in ports:
            if isinstance(port_mapping, str):
                if port_mapping in allowed_public_ports:
                    continue
                assert port_mapping.startswith("127.0.0.1:"), (
                    f"Service '{service_name}' exposes port '{port_mapping}' "
                    "without 127.0.0.1 host binding restriction!"
                )


def test_litellm_host_binding() -> None:
    compose_path = REPO_ROOT / "infra" / "docker-compose.yaml"
    with open(compose_path, encoding="utf-8") as f:
        data: dict[str, Any] = yaml.safe_load(f)

    litellm_cfg = data["services"]["litellm"]
    cmd: list[str] = litellm_cfg.get("command", [])
    assert "--host" in cmd, "litellm command missing '--host' argument"
    host_idx = cmd.index("--host")
    assert cmd[host_idx + 1] == "127.0.0.1", "litellm --host must be 127.0.0.1"


def test_auth_dockerfile_host_binding() -> None:
    dockerfile_path = REPO_ROOT / "backend" / "auth" / "Dockerfile"
    content = dockerfile_path.read_text(encoding="utf-8")
    assert '--host", "127.0.0.1"' in content or "--host 127.0.0.1" in content, (
        "auth Dockerfile must bind uvicorn to 127.0.0.1"
    )


def test_nginx_ssl_configuration() -> None:
    nginx_conf = REPO_ROOT / "infra" / "nginx" / "portfolio.conf"
    content = nginx_conf.read_text(encoding="utf-8")

    # Verify HTTPS listeners
    assert "listen 443 ssl" in content, (
        "Nginx portfolio.conf must contain 'listen 443 ssl' server blocks"
    )
    assert "server_name api.alexandermcintosh.com;" in content
    assert "server_name livekit.alexandermcintosh.com;" in content

    # Verify HTTP-to-HTTPS redirects
    assert "return 301 https://$host$request_uri;" in content, (
        "Nginx portfolio.conf must redirect HTTP port 80 to HTTPS"
    )

    # Verify certificate directives
    assert "ssl_certificate " in content
    assert "ssl_certificate_key " in content


def test_setup_script_no_insecure_ports() -> None:
    setup_script = REPO_ROOT / "infra" / "setup.sh"
    content = setup_script.read_text(encoding="utf-8")
    assert "ufw allow 7880" not in content, (
        "infra/setup.sh should not open port 7880/tcp publicly via UFW"
    )
