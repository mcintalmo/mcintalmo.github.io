import json
from pathlib import Path
from typing import Any

from livekit.agents import RunContext, llm

from common.events import NavigateEvent, NavigationTarget


def _load_portfolio() -> dict:
    portfolio_path = Path(__file__).parent / "portfolio_content.json"
    if portfolio_path.exists():
        try:
            with portfolio_path.open(encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def observe_tool(func):
    import functools
    import json

    from livekit.agents import RunContext

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        ctx = None
        for arg in args:
            if isinstance(arg, RunContext):
                ctx = arg
                break
        if ctx is None:
            for k, v in kwargs.items():
                if isinstance(v, RunContext):
                    ctx = v
                    break

        tool_name = func.__name__
        tool_args = {}
        for k, v in kwargs.items():
            if not isinstance(v, RunContext):
                try:
                    json.dumps(v)
                    tool_args[k] = v
                except Exception:
                    tool_args[k] = str(v)
        pos_idx = 0
        for arg in args:
            if not isinstance(arg, RunContext):
                try:
                    json.dumps(arg)
                    tool_args[f"arg_{pos_idx}"] = arg
                except Exception:
                    tool_args[f"arg_{pos_idx}"] = str(arg)
                pos_idx += 1

        if ctx:
            try:
                room = ctx.session.room_io.room
                payload = {
                    "type": "tool_start",
                    "tool": tool_name,
                    "arguments": tool_args,
                }
                await room.local_participant.publish_data(
                    json.dumps(payload).encode("utf-8"),
                    reliable=True,
                    topic="agent.observability",
                )
            except Exception:
                pass

        try:
            result = await func(*args, **kwargs)
        except Exception as e:
            result = f"Error: {e}"
            raise e
        finally:
            if ctx:
                try:
                    room = ctx.session.room_io.room
                    payload = {
                        "type": "tool_end",
                        "tool": tool_name,
                        "result": str(result),
                    }
                    await room.local_participant.publish_data(
                        json.dumps(payload).encode("utf-8"),
                        reliable=True,
                        topic="agent.observability",
                    )
                except Exception:
                    pass
        return result

    return wrapper


def make_portfolio_tools() -> list[llm.Tool | llm.Toolset]:
    @llm.function_tool(
        description="Navigate the portfolio to a specific section. "
        "Call this whenever the user asks to see, view, navigate to, "
        "or show any section of the portfolio, or asks questions about "
        "skills, work experience, education, projects, or contact. "
        "DO NOT call this tool for general greetings or chit-chat."
    )
    @observe_tool
    async def navigate_to(
        ctx: RunContext[Any],
        target: NavigationTarget,
    ) -> str:
        """Navigate the frontend to a portfolio section.

        Args:
            target: The section to navigate to (e.g. skills, projects,
                work, education, contact).
        """
        target_name = target.replace("-", " ")

        try:
            room = ctx.session.room_io.room
            remote_participants = room.remote_participants
            if remote_participants:
                recipient_identity = list(remote_participants.keys())[0]
                await room.local_participant.perform_rpc(
                    destination_identity=recipient_identity,
                    method="navigate_to",
                    payload=json.dumps({"target": target}),
                )
            else:
                event = NavigateEvent(target=target)
                await room.local_participant.publish_data(
                    json.dumps(event.model_dump()).encode(),
                    reliable=True,
                )
        except RuntimeError, AttributeError, Exception:
            # Gracefully handle console mode where AgentSession lacks a room connection
            pass
        return f"Successfully navigated to the {target_name} section"

    @llm.function_tool(
        description="Get detailed work experience highlights and bullet points. "
        "Use this when the user asks for detailed summaries, achievements, "
        "highlights, or technologies used at specific companies "
        "(e.g. Pioneer, Optum, Constelleum)."
    )
    @observe_tool
    async def get_work_experience_details(
        ctx: RunContext[Any],
        company: str = "",
    ) -> str:
        """Get detailed work experience at a specific company or all companies.

        Args:
            company: Optional company name to filter by (e.g. 'Optum', 'Pioneer').
        """
        portfolio = _load_portfolio()
        work = portfolio.get("work", [])
        if not work:
            return "No work experience details available."

        if company:
            matches = [
                w for w in work if company.lower() in w.get("company", "").lower()
            ]
            if matches:
                return json.dumps(matches, indent=2)
            return f"No work experience found matching '{company}'."

        return json.dumps(work, indent=2)

    @llm.function_tool(
        description="Get detailed education history, university coursework, and "
        "degree details. Use this when the user asks for specific courses, "
        "majors, achievements, or minors about Georgia Tech, "
        "Saint John's University, or MITx."
    )
    @observe_tool
    async def get_education_details(
        ctx: RunContext[Any],
        institution: str = "",
    ) -> str:
        """Get detailed education history at a specific institution or all institutions.

        Args:
            institution: Optional institution name to filter by
                (e.g. 'Georgia Tech', 'MITx', 'Saint John').
        """
        portfolio = _load_portfolio()
        edu = portfolio.get("education", [])
        if not edu:
            return "No education details available."

        if institution:
            matches = [
                e
                for e in edu
                if institution.lower() in e.get("institution", "").lower()
            ]
            if matches:
                return json.dumps(matches, indent=2)
            return f"No education history found matching '{institution}'."

        return json.dumps(edu, indent=2)

    @llm.function_tool(
        description="Get detailed list of professional certifications and licenses. "
        "Use this when the user asks for certificates or credentials "
        "(e.g. Snowflake, AWS, Databricks, Fabric)."
    )
    @observe_tool
    async def get_certificates_details(
        ctx: RunContext[Any],
        name: str = "",
    ) -> str:
        """Get detailed certification records.

        Args:
            name: Optional name of the certificate to search for
                (e.g. 'Azure', 'Fabric', 'Databricks', 'SnowPro').
        """
        portfolio = _load_portfolio()
        certs = portfolio.get("certificates", [])
        if not certs:
            return "No certification details available."

        if name:
            matches = [
                c
                for c in certs
                if name.lower() in c.get("name", "").lower()
                or name.lower() in c.get("issuer", "").lower()
            ]
            if matches:
                return json.dumps(matches, indent=2)
            return f"No certificates found matching '{name}'."

        return json.dumps(certs, indent=2)

    @llm.function_tool(
        description="Get details about Alex's key projects, including descriptions, "
        "tech stack, and URLs. Use this when the user asks about specific "
        "portfolio projects."
    )
    @observe_tool
    async def get_project_details(
        ctx: RunContext[Any],
        name: str = "",
    ) -> str:
        """Get project details.

        Args:
            name: Optional project name to search for
                (e.g. 'Portfolio', 'SimLM', 'ARC AGI').
        """
        portfolio = _load_portfolio()
        projects = portfolio.get("projects", [])
        if not projects:
            return "No project details available."

        if name:
            matches = [p for p in projects if name.lower() in p.get("name", "").lower()]
            if matches:
                return json.dumps(matches, indent=2)
            return f"No projects found matching '{name}'."

        return json.dumps(projects, indent=2)

    @llm.function_tool(
        description="Highlight a specific piece of text on the web-page to draw the "
        "user's attention. Call this whenever you reference a specific achievement, "
        "credential, course, skill, or project, or when the user asks you to "
        "highlight something specific on the page."
    )
    @observe_tool
    async def highlight_text(
        ctx: RunContext[Any],
        text: str,
    ) -> str:
        """Highlight a specific text string on the webpage.

        Args:
            text: The exact text snippet or keyword to highlight on the page.
        """
        text_clean = text.strip()
        try:
            room = ctx.session.room_io.room
            remote_participants = room.remote_participants
            if remote_participants:
                recipient_identity = list(remote_participants.keys())[0]
                await room.local_participant.perform_rpc(
                    destination_identity=recipient_identity,
                    method="highlight_text",
                    payload=json.dumps({"text": text_clean}),
                )
        except RuntimeError, AttributeError, Exception:
            pass
        return f"Successfully highlighted '{text_clean}' on the page"

    @llm.function_tool(
        description="Expand a specific work experience card to show achievements "
        "and details. Call this when the user asks for details about a specific "
        "role or company (e.g. Optum, Pioneer, etc.), or when you are describing "
        "a specific work experience item."
    )
    @observe_tool
    async def expand_experience_card(
        ctx: RunContext[Any],
        company: str,
    ) -> str:
        """Expand a specific work experience card.

        Args:
            company: The name of the company or organization
                (e.g. Optum, Pioneer, Constelleum).
        """
        company_clean = company.strip()
        try:
            room = ctx.session.room_io.room
            remote_participants = room.remote_participants
            if remote_participants:
                recipient_identity = list(remote_participants.keys())[0]
                await room.local_participant.perform_rpc(
                    destination_identity=recipient_identity,
                    method="expand_experience_card",
                    payload=json.dumps({"company": company_clean}),
                )
        except RuntimeError, AttributeError, Exception:
            pass
        return f"Successfully expanded the experience card for '{company_clean}'"

    return [
        navigate_to,
        get_work_experience_details,
        get_education_details,
        get_certificates_details,
        get_project_details,
        highlight_text,
        expand_experience_card,
    ]
