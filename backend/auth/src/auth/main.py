from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from pydantic import BaseModel

from common.config import AppSettings


@asynccontextmanager
async def lifespan(app: FastAPI):
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


def get_settings() -> AppSettings:
    return AppSettings()


@app.get("/token", status_code=200)
async def get_token(
    room_name: str,
    identity: str,
    settings: Annotated[AppSettings, Depends(get_settings)],
) -> TokenResponse:
    grant = api.VideoGrants(room=room_name, room_join=True)
    access_token = api.AccessToken(
        settings.livekit.api_key, settings.livekit.api_secret.get_secret_value()
    )
    access_token.identity = identity
    access_token.name = identity
    access_token.grants = grant

    token = access_token.to_jwt()

    # We replace 'livekit' docker hostname with 'localhost' if running the browser on the host
    # Because the browser needs to hit localhost:7880, not livekit:7880
    client_ws_url = settings.livekit.url.replace("livekit", "localhost")

    return TokenResponse(token=token, ws_url=client_ws_url)
