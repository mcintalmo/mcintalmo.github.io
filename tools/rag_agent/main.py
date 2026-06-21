import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit import api

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag-agent-main")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/token")
async def get_token(room_name: str = "my-room", identity: str = "user"):
    api_key = os.getenv("LIVEKIT_API_KEY", "devkey")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "secret")

    if not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit API Key/Secret missing")

    grant = api.VideoGrants(room_join=True, room=room_name)
    token = api.AccessToken(api_key, api_secret)
    token = token.with_identity(identity).with_name(identity).with_grants(grant)

    jwt = token.to_jwt()
    ws_url = os.getenv("LIVEKIT_WS_URL", "ws://127.0.0.1:7880")

    return {"token": jwt, "ws_url": ws_url}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("UVICORN_HOST", "0.0.0.0")
    port = int(os.environ.get("UVICORN_PORT", "8000"))
    uvicorn.run(app, host=host, port=port)
