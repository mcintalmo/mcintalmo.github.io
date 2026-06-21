import argparse
import asyncio
from pathlib import Path
from typing import Any

import yaml

from .graph import create_graph


async def _run_pipeline(jd_input: str, resume_path: Path) -> None:
    def read_yaml() -> dict[str, Any]:
        with open(resume_path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
            assert isinstance(data, dict)
            return data

    base_resume = await asyncio.to_thread(read_yaml)

    initial_state = {"job_description_input": jd_input, "base_resume": base_resume}

    print("Initializing LangGraph pipeline...")
    app = create_graph()

    print("Executing pipeline...")
    final_state = await app.ainvoke(initial_state)

    print("Tailoring complete!")
    print(f"Evaluation Score: {final_state.get('evaluation_score')}")
    print(f"Artifacts generated at: {final_state.get('output_dir')}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the resume tailoring LangGraph pipeline."
    )
    parser.add_argument(
        "--jd",
        type=str,
        required=True,
        help="Job description URL, text, or file path.",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default="../../resume/resume.yaml",
        help="Path to the Golden Resume JSON/YAML file.",
    )

    args = parser.parse_args()

    repo_root = Path(__file__).parents[4]
    resume_path = repo_root / "resume" / "resume.yaml"
    if args.resume != "../../resume/resume.yaml":
        resume_path = Path(args.resume)

    asyncio.run(_run_pipeline(args.jd, resume_path))


if __name__ == "__main__":
    main()
