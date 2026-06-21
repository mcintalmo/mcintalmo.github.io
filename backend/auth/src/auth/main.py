import socket
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from pydantic import BaseModel

from common.config import AppSettings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Startup logic can go here
    yield
    # Shutdown logic can go here


app = FastAPI(lifespan=lifespan)

# Allow CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TokenResponse(BaseModel):
    token: str
    ws_url: str
    local_ip: str


def get_settings() -> AppSettings:
    return AppSettings()


def get_local_ip() -> str:
    # Try to find a real LAN IP using gethostbyname_ex to avoid point-to-point
    # VPN interfaces.
    try:
        hostname = socket.gethostname()
        _, _, ips = socket.gethostbyname_ex(hostname)
        valid_ips = []
        for ip in ips:
            if ip.startswith("127."):
                continue
            if ip.endswith(".0") or ip.endswith(".255"):
                continue
            valid_ips.append(ip)

        if valid_ips:
            # Prioritize standard Wi-Fi/Ethernet subnets, ignoring bridge interfaces
            for ip in valid_ips:
                is_standard = ip.startswith("192.168.")
                is_bridge = ip.startswith("192.168.139.") or ip.startswith(
                    "192.168.148."
                )
                if is_standard and not is_bridge:
                    return ip
            return valid_ips[-1]
    except Exception:
        pass

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't need to be reachable, just triggers local interface selection
        s.connect(("10.255.255.255", 1))
        ip = str(s.getsockname()[0])
        if not ip.startswith("10.2.0."):
            return ip
    except Exception:
        pass
    finally:
        s.close()
    return "127.0.0.1"


@app.get("/token", status_code=200)
async def get_token(
    room_name: str,
    identity: str,
    request: Request,
    settings: Annotated[AppSettings, Depends(get_settings)],
) -> TokenResponse:
    grant = api.VideoGrants(room=room_name, room_join=True)
    room_config = api.RoomConfiguration(
        agents=[api.RoomAgentDispatch(agent_name="portfolio-agent")]
    )
    access_token = (
        api.AccessToken(
            settings.livekit.api_key, settings.livekit.api_secret.get_secret_value()
        )
        .with_identity(identity)
        .with_name(identity)
        .with_grants(grant)
        .with_room_config(room_config)
    )

    token = access_token.to_jwt()

    if settings.livekit.url.startswith("wss://"):
        client_ws_url = settings.livekit.url
    else:
        # We replace 'livekit' docker hostname with 'localhost' or the client request's
        # host IP/domain if running the browser on the host.
        host = request.url.hostname or "localhost"
        if host in ("localhost", "127.0.0.1", "[::1]"):
            host = "127.0.0.1"

        client_ws_url = settings.livekit.url.replace("livekit", host).replace(
            "localhost", host
        )

    local_ip = get_local_ip()

    return TokenResponse(token=token, ws_url=client_ws_url, local_ip=local_ip)
