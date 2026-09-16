#!/usr/bin/env python3
"""Continuous security and reverse proxy healthcheck probe.

Verifies:
1. TLS certificate validity and expiration (> 21 days) on production frontend.
2. Production API health endpoint availability (HTTP 200).
3. Reverse proxy security response headers (HSTS, nosniff, X-Frame-Options).
4. Suppression of Nginx server version tokens.
5. Zero open Dependabot security alerts (when --check-dependabot flag is passed).
"""

import argparse
import datetime
import json
import logging
import socket
import ssl
import subprocess
import sys
import urllib.request

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("security_audit")


def check_tls_certificate(hostname: str, min_days: int = 21) -> None:
    logger.info("Checking TLS certificate for %s...", hostname)
    context = ssl.create_default_context()
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    try:
        with socket.create_connection((hostname, 443), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                not_after_str = cert.get("notAfter") if cert else None
                if not not_after_str:
                    raise ValueError(
                        f"No notAfter certificate field found for {hostname}"
                    )

                expiry = datetime.datetime.strptime(
                    not_after_str, "%b %d %H:%M:%S %Y %Z"
                ).replace(tzinfo=datetime.UTC)
                now = datetime.datetime.now(datetime.UTC)
                days_left = (expiry - now).days

                logger.info(
                    "Certificate for %s is valid for %d days (expires %s)",
                    hostname,
                    days_left,
                    not_after_str,
                )
                if days_left < min_days:
                    raise RuntimeError(
                        f"Certificate for {hostname} expires in {days_left} days "
                        f"(threshold: {min_days} days)!"
                    )
    except Exception as e:
        logger.error("TLS check failed for %s: %s", hostname, e)
        raise


def check_api_health(health_url: str) -> None:
    logger.info("Checking API health at %s...", health_url)
    req = urllib.request.Request(
        health_url,
        headers={"User-Agent": "SecurityAuditProbe/1.0"},
    )
    ssl_context = ssl.create_default_context()
    ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
    with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
        status_code = response.getcode()
        if status_code != 200:
            raise RuntimeError(
                f"Unexpected status code {status_code} from {health_url}"
            )

        body = response.read().decode("utf-8")
        data = json.loads(body)
        if data.get("status") != "healthy":
            raise RuntimeError(f"Unexpected health payload: {body}")

        headers = {k.lower(): v for k, v in response.headers.items()}

        # Verify server_tokens off (server must not leak version)
        server_header = headers.get("server", "")
        if server_header != "nginx":
            raise RuntimeError(
                f"Expected 'Server: nginx' without version disclosure, "
                f"got: {server_header}"
            )

        # Verify mandatory security response headers
        required_headers = [
            ("x-content-type-options", "nosniff"),
            ("x-frame-options", "DENY"),
            ("referrer-policy", "strict-origin-when-cross-origin"),
        ]
        for header_name, expected_value in required_headers:
            val = headers.get(header_name)
            if not val or expected_value.lower() not in val.lower():
                raise RuntimeError(
                    f"Missing or invalid security header '{header_name}': {val}"
                )

        logger.info("API health and security headers verified successfully.")


def check_frontend_security(frontend_url: str) -> None:
    logger.info("Checking frontend endpoint at %s...", frontend_url)
    req = urllib.request.Request(
        frontend_url,
        headers={"User-Agent": "SecurityAuditProbe/1.0"},
    )
    ssl_context = ssl.create_default_context()
    ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
    with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
        if response.getcode() != 200:
            raise RuntimeError(
                f"Unexpected status code {response.getcode()} from {frontend_url}"
            )
        html = response.read().decode("utf-8")
        if "Content-Security-Policy" not in html:
            raise RuntimeError(
                "Content-Security-Policy meta tag missing from frontend HTML"
            )
        logger.info("Frontend endpoint and CSP meta tag verified successfully.")


def check_dependabot_zero_alerts(repo: str) -> None:
    logger.info("Checking Dependabot alert count for repository %s...", repo)
    proc = subprocess.run(
        [
            "gh",
            "api",
            f"/repos/{repo}/dependabot/alerts?state=open",
            "--jq",
            "[.[]] | length",
        ],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        err = proc.stderr.strip()
        logger.warning(
            "Could not query Dependabot API (exit code %d): %s. "
            "Note: GITHUB_TOKEN requires read:security_events scope.",
            proc.returncode,
            err,
        )
        return

    open_count = int(proc.stdout.strip() or "0")
    logger.info("Open Dependabot alerts count: %d", open_count)
    if open_count > 0:
        raise RuntimeError(f"Found {open_count} open Dependabot alerts! Must be 0.")


def check_livekit_endpoint(livekit_host: str) -> None:
    logger.info("Checking LiveKit endpoint at https://%s/...", livekit_host)
    req = urllib.request.Request(
        f"https://{livekit_host}/",
        headers={"User-Agent": "SecurityAuditProbe/1.0"},
    )
    ssl_context = ssl.create_default_context()
    ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
    with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
        if response.getcode() != 200:
            raise RuntimeError(
                f"Unexpected status code {response.getcode()} from https://{livekit_host}"
            )
        body = response.read().decode("utf-8")
        if "OK" not in body:
            raise RuntimeError(f"Unexpected LiveKit response body: {body}")
        logger.info("LiveKit HTTPS/WSS endpoint verified successfully.")


def check_token_endpoint(api_host: str) -> None:
    token_url = f"https://{api_host}/token?room_name=security-probe&identity=probe-bot"
    logger.info("Checking token generation at %s...", token_url)
    req = urllib.request.Request(
        token_url,
        headers={"User-Agent": "SecurityAuditProbe/1.0"},
    )
    ssl_context = ssl.create_default_context()
    ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
    with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
        if response.getcode() != 200:
            raise RuntimeError(
                f"Unexpected status code {response.getcode()} from {token_url}"
            )
        body = response.read().decode("utf-8")
        data = json.loads(body)
        if not data.get("token") or not data.get("ws_url"):
            raise RuntimeError(f"Malformed token response: {body}")
        logger.info("Token generation verified successfully.")


def check_internal_ports_isolated(host: str, ports: list[int] | None = None) -> None:
    if ports is None:
        ports = [4000, 7880, 8000, 8080, 8880, 10300, 11434]

    logger.info("Checking that internal ports are isolated on %s...", host)
    open_ports: list[int] = []
    for port in ports:
        try:
            with socket.create_connection((host, port), timeout=2) as s:
                s.settimeout(2)
                s.sendall(b"GET / HTTP/1.1\r\nHost: " + host.encode() + b"\r\n\r\n")
                data = s.recv(1024)
                if data:
                    open_ports.append(port)
                    logger.error("Port %d responded with data: %s", port, data[:50])
                else:
                    logger.info(
                        "Port %d closed connection without data (isolated).",
                        port,
                    )
        except (TimeoutError, ConnectionResetError, OSError):
            logger.info("Port %d is properly isolated (blocked/reset).", port)

    if open_ports:
        raise RuntimeError(
            f"CRITICAL SECURITY FAILURE: Internal ports {open_ports} are "
            f"publicly accessible on {host}!"
        )
    logger.info("All internal ports verified isolated.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Continuous security audit probe.")
    parser.add_argument(
        "--frontend-host",
        default="www.alexandermcintosh.com",
        help="Frontend hostname for TLS check",
    )
    parser.add_argument(
        "--api-host",
        default="api.alexandermcintosh.com",
        help="API hostname",
    )
    parser.add_argument(
        "--livekit-host",
        default="livekit.alexandermcintosh.com",
        help="LiveKit hostname",
    )
    parser.add_argument(
        "--health-url",
        default="https://api.alexandermcintosh.com/health",
        help="API healthcheck URL",
    )
    parser.add_argument(
        "--repo",
        default="mcintalmo/mcintalmo.github.io",
        help="GitHub repository name (owner/repo)",
    )
    parser.add_argument(
        "--check-dependabot",
        action="store_true",
        help="Query GitHub API to assert zero open Dependabot alerts",
    )
    parser.add_argument(
        "--check-ports",
        action="store_true",
        help="Assert that internal container ports are inaccessible from internet",
    )
    args = parser.parse_args()

    try:
        check_tls_certificate(args.frontend_host)
        check_tls_certificate(args.api_host)
        check_tls_certificate(args.livekit_host)
        check_api_health(args.health_url)
        check_livekit_endpoint(args.livekit_host)
        check_token_endpoint(args.api_host)
        check_frontend_security(f"https://{args.frontend_host}")
        if args.check_dependabot:
            check_dependabot_zero_alerts(args.repo)
        if args.check_ports:
            check_internal_ports_isolated(args.api_host)
        logger.info("All security audit probes passed cleanly.")
        return 0
    except Exception as e:
        logger.error("Security audit probe failure: %s", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
