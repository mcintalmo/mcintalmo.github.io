import asyncio
import json
from pathlib import Path
from typing import Any

import httpx
import yaml
from bs4 import BeautifulSoup
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import Field, SecretStr
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

from common.config import YamlConfigSettingsSource
from common.paths import REPO_ROOT
from resume.build import compile_rendercv_artifacts

from .schema import JobPosting, TailorState


class TailorLlmSettings(BaseSettings):
    model: str = "google/gemini-2.5-flash"
    base_url: str = "https://openrouter.ai/api/v1"
    api_key: str = Field(default="", validation_alias="OPENROUTER_API_KEY")
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")
    temperature: float = 0.2
    max_tokens: int = 2048

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            env_settings,
            YamlConfigSettingsSource(settings_cls, "llm"),
            dotenv_settings,
        )


def get_llm() -> ChatOpenAI:
    settings = TailorLlmSettings()
    return ChatOpenAI(
        model=settings.model,
        base_url=settings.base_url,
        api_key=SecretStr(settings.api_key),
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
    )


def _parse_json_response(content: str) -> Any:
    content = content.strip()
    if "```json" in content:
        try:
            start = content.index("```json") + 7
            end = content.index("```", start)
            return json.loads(content[start:end].strip())
        except (ValueError, json.JSONDecodeError):
            pass

    if "```" in content:
        try:
            start = content.index("```") + 3
            end = content.index("```", start)
            return json.loads(content[start:end].strip())
        except (ValueError, json.JSONDecodeError):
            pass

    try:
        start_dict = content.find("{")
        start_list = content.find("[")
        if start_dict != -1 and (start_list == -1 or start_dict < start_list):
            start = start_dict
            end = content.rindex("}") + 1
        elif start_list != -1:
            start = start_list
            end = content.rindex("]") + 1
        else:
            raise ValueError("No JSON found")
        return json.loads(content[start:end].strip())
    except (ValueError, json.JSONDecodeError):
        pass

    return json.loads(content)


async def ingest_job_description(state: TailorState) -> dict[str, Any]:
    input_value = state["job_description_input"]
    allow_file_read = state.get("allow_file_read", False)

    if input_value.startswith("http://") or input_value.startswith("https://"):
        async with httpx.AsyncClient() as client:
            resp = await client.get(input_value)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for script in soup(["script", "style"]):
                script.extract()
            job_description_text = soup.get_text(separator=" ", strip=True)
    elif allow_file_read:
        try:
            path = Path(input_value).resolve()
            if path.is_file():

                def read_file(file_path: Path) -> str:
                    with open(file_path, encoding="utf-8") as f:
                        return f.read()

                job_description_text = await asyncio.to_thread(read_file, path)
            else:
                job_description_text = input_value
        except (OSError, ValueError):
            job_description_text = input_value
    else:
        job_description_text = input_value

    return {"job_description_text": job_description_text}


async def extract_schema(state: TailorState) -> dict[str, Any]:
    job_description_text = state.get("job_description_text")
    if not job_description_text:
        raise ValueError("Job description text is empty or not provided.")

    # Simple file-based caching
    import hashlib

    cache_dir = Path(__file__).parents[2] / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    text_hash = hashlib.sha256(job_description_text.encode("utf-8")).hexdigest()
    cache_file = cache_dir / f"{text_hash}.json"

    if cache_file.exists():

        def read_cache() -> dict[str, Any]:
            with open(cache_file) as f:
                res = json.load(f)
                assert isinstance(res, dict)
                return res

        data = await asyncio.to_thread(read_cache)
        return {"job_description_schema": data}

    llm = get_llm()
    structured_llm = llm.with_structured_output(JobPosting)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an expert HR recruiter. Extract the following job "
                "description into the schema.org JobPosting format. Ensure "
                "you extract the hiring organization, key responsibilities, "
                "requirements, and key technologies.",
            ),
            ("human", "{job_description}"),
        ]
    )

    chain = prompt | structured_llm
    from typing import cast

    result = cast(
        JobPosting, await chain.ainvoke({"job_description": job_description_text})
    )

    schema_dict = result.model_dump()

    def write_cache() -> None:
        with open(cache_file, "w") as f:
            json.dump(schema_dict, f, indent=2)

    await asyncio.to_thread(write_cache)

    return {"job_description_schema": schema_dict}


async def trim_resume(state: TailorState) -> dict[str, Any]:
    # Simple file-based caching
    import hashlib

    cache_dir = Path(__file__).parents[2] / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    job_posting_json = json.dumps(state["job_description_schema"], sort_keys=True)
    resume_json = json.dumps(state["base_resume"], sort_keys=True)
    combined_input = f"trim:{job_posting_json}:{resume_json}"
    input_hash = hashlib.sha256(combined_input.encode("utf-8")).hexdigest()
    cache_file = cache_dir / f"{input_hash}.trim.json"

    if cache_file.exists():

        def read_cache() -> dict[str, Any]:
            with open(cache_file, encoding="utf-8") as f:
                res = json.load(f)
                assert isinstance(res, dict)
                return res

        data = await asyncio.to_thread(read_cache)
        return {"draft_resume": data}

    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an AI resume tailor. Given the Golden Resume and the "
                "JobPosting schema, return a trimmed version of the Golden "
                "Resume. Remove ANY work experiences, projects, or skills "
                "that are irrelevant to the job posting. "
                "IMPORTANT: If the job is in a clearly different technical "
                "domain from the candidate's primary background (e.g., a "
                "Machine Learning engineer applying for a Frontend Developer "
                "role), aggressively remove domain-specific technical content "
                "from the unrelated domain — keep only transferable skills "
                "(e.g. software engineering fundamentals, CI/CD, testing). "
                "Do NOT rewrite the descriptions yet, ONLY trim the lists. "
                "Output valid JSON matching the provided JSON Resume "
                "schema structure. You must preserve the root-level structure "
                "and keys of the input resume (including 'basics', 'work', "
                "'education', 'projects', 'skills') even if some lists are empty.",
            ),
            ("human", "Job Posting:\n{job_posting}\n\nGolden Resume:\n{resume}"),
        ]
    )

    chain = prompt | llm
    result = await chain.ainvoke(
        {
            "job_posting": json.dumps(state["job_description_schema"], indent=2),
            "resume": json.dumps(state["base_resume"], indent=2),
        }
    )

    content = str(result.content)
    trimmed_resume = _parse_json_response(content)

    def write_cache() -> None:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(trimmed_resume, f, indent=2)

    await asyncio.to_thread(write_cache)

    return {"draft_resume": trimmed_resume}


async def rewrite_resume(state: TailorState) -> dict[str, Any]:
    # Simple file-based caching
    import hashlib

    cache_dir = Path(__file__).parents[2] / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    job_posting_json = json.dumps(state["job_description_schema"], sort_keys=True)
    draft_resume_json = json.dumps(state["draft_resume"], sort_keys=True)
    combined_input = f"rewrite:{job_posting_json}:{draft_resume_json}"
    input_hash = hashlib.sha256(combined_input.encode("utf-8")).hexdigest()
    cache_file = cache_dir / f"{input_hash}.rewrite.json"

    if cache_file.exists():

        def read_cache() -> dict[str, Any]:
            with open(cache_file, encoding="utf-8") as f:
                res = json.load(f)
                assert isinstance(res, dict)
                return res

        data = await asyncio.to_thread(read_cache)
        return {"final_resume": data}

    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an AI resume writer. You are given a trimmed resume "
                "and a JobPosting. Rewrite the 'description' bullet points in "
                "the 'work' and 'projects' sections to better highlight the "
                "skills and technologies required by the JobPosting. Use "
                "action verbs and include metrics where applicable. Do not "
                "invent new experiences. "
                "IMPORTANT: You must return the COMPLETE resume JSON. Do NOT "
                "return just the updated sections or single experience objects. "
                "The output must be the full JSON document containing all "
                "root-level keys ('basics', 'work', 'education', 'projects', 'skills') "
                "and all of their unchanged/rewritten contents.",
            ),
            ("human", "Job Posting:\n{job_posting}\n\nTrimmed Resume:\n{resume}"),
        ]
    )

    chain = prompt | llm
    result = await chain.ainvoke(
        {
            "job_posting": json.dumps(state["job_description_schema"], indent=2),
            "resume": json.dumps(state["draft_resume"], indent=2),
        }
    )

    content = str(result.content)
    final_resume = _parse_json_response(content)

    def write_cache() -> None:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(final_resume, f, indent=2)

    await asyncio.to_thread(write_cache)

    return {"final_resume": final_resume}


async def evaluate_resume(state: TailorState) -> dict[str, Any]:
    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an ATS (Applicant Tracking System). Evaluate the following "
                "resume against the JobPosting. Give it a score out of 100 based on "
                "keyword match, relevance of experience, and clear impact. Output ONLY "
                "a valid JSON object with a single key 'score' mapping to the integer "
                "score.",
            ),
            ("human", "Job Posting:\n{job_posting}\n\nTailored Resume:\n{resume}"),
        ]
    )

    chain = prompt | llm
    result = await chain.ainvoke(
        {
            "job_posting": json.dumps(state["job_description_schema"], indent=2),
            "resume": json.dumps(state["final_resume"], indent=2),
        }
    )

    content = str(result.content)
    try:
        score_dict = _parse_json_response(content)
        score = int(score_dict.get("score", 0))
    except (json.JSONDecodeError, ValueError, KeyError):
        score = 80  # fallback

    return {"evaluation_score": score}


def _blocking_generate_artifacts(
    final_resume: dict[str, Any], schema: dict[str, Any] | None
) -> str:
    company_name = "Tailored"
    if (
        schema
        and "hiringOrganization" in schema
        and schema["hiringOrganization"].get("name")
    ):
        company_name = "".join(
            c for c in schema["hiringOrganization"]["name"] if c.isalnum()
        )
        if not company_name:
            company_name = "Tailored"

    repo_root = REPO_ROOT
    tailored_dir = repo_root / "frontend" / "src" / "content" / "tailored"
    tailored_dir.mkdir(parents=True, exist_ok=True)

    yaml_path = tailored_dir / f"{company_name}.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(final_resume, f, sort_keys=False)

    output_dir = Path(__file__).resolve().parents[2] / "output" / company_name
    compile_rendercv_artifacts(
        resume_yaml_data_or_path=final_resume,
        output_dir=output_dir,
        pdf_filename=f"{company_name}_Resume.pdf",
        markdown_filename=f"{company_name}_Resume.md",
        generate_pdf=True,
    )

    return str(output_dir)


async def generate_artifacts(state: TailorState) -> dict[str, Any]:
    final_resume = state.get("final_resume")
    if final_resume is None:
        raise ValueError("final_resume is required but missing.")
    schema = state.get("job_description_schema")
    output_dir = await asyncio.to_thread(
        _blocking_generate_artifacts, final_resume, schema
    )

    return {"output_dir": output_dir}
