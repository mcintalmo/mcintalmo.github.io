import asyncio
from pathlib import Path
from typing import Any

import uvicorn
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .graph import create_graph

app = FastAPI(
    title="Resume Tailor API",
    description="LangGraph pipeline for agentic resume tailoring",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Expose generated artifacts (PDFs) to frontend
output_dir_path = Path(__file__).parents[2] / "output"
output_dir_path.mkdir(parents=True, exist_ok=True)
app.mount("/output", StaticFiles(directory=str(output_dir_path)), name="output")


class TailorRequest(BaseModel):
    job_description: str


class TailorResponse(BaseModel):
    score: int
    output_dir: str
    final_resume: dict[str, Any]


@app.post("/api/tailor", response_model=TailorResponse)
async def tailor_resume(req: TailorRequest) -> TailorResponse:
    repo_root = Path(__file__).parents[4]
    resume_path = repo_root / "resume" / "resume.yaml"

    if not resume_path.exists():
        raise HTTPException(status_code=500, detail="Golden resume not found.")

    def read_yaml() -> dict[str, Any]:
        with open(resume_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
            assert isinstance(data, dict)
            return data

    base_resume = await asyncio.to_thread(read_yaml)

    initial_state = {
        "job_description_input": req.job_description,
        "base_resume": base_resume,
    }

    workflow = create_graph()

    final_state = await workflow.ainvoke(initial_state)

    score = final_state.get("evaluation_score", 0)
    output_dir = final_state.get("output_dir", "")
    final_resume = final_state.get("final_resume", {})

    return TailorResponse(
        score=score if score is not None else 0,
        output_dir=output_dir if output_dir is not None else "",
        final_resume=final_resume if final_resume is not None else {},
    )


def start() -> None:
    uvicorn.run("tailor.server:app", host="0.0.0.0", port=8001, reload=True)
