import logging

from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.adk.apps import App

from agent import root_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Interactive Resume Tailor API (AG-UI)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

adk_app = App(name="portfolio_tailor", root_agent=root_agent)

# Create an AG-UI compatible ADKAgent
ag_ui_agent = ADKAgent.from_app(adk_app, user_id="default-user")

# Bind the AG-UI endpoint to the FastAPI app
add_adk_fastapi_endpoint(app, ag_ui_agent, path="/agui")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
