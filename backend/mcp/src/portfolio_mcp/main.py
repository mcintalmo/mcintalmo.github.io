from pathlib import Path

import yaml
from fastmcp import FastMCP

# Initialize FastMCP
mcp = FastMCP("PortfolioTools")

# State for rate limiting
# In a real production scenario, this should be stored in a DB or Redis.
EMAIL_COUNT = 0
MAX_EMAILS_PER_DAY = 50


@mcp.tool()
def send_email(subject: str, message: str, sender_email: str) -> str:
    """
    Send an email to Alexander on behalf of the user.
    """
    global EMAIL_COUNT

    if EMAIL_COUNT >= MAX_EMAILS_PER_DAY:
        return "Failed: Email rate limit exceeded for today. Please try again tomorrow."

    EMAIL_COUNT += 1
    return (
        f"Successfully sent email to Alexander. "
        f"(Remaining quota: {MAX_EMAILS_PER_DAY - EMAIL_COUNT})"
    )


@mcp.tool()
def read_resume() -> str:
    """
    Read Alexander's resume data to answer questions about his experience.
    Returns the parsed YAML content as a string.
    """
    # Path resolution to resume/resume.yaml
    # __file__ is backend/mcp/src/portfolio_mcp/main.py
    base = Path(__file__).resolve().parents[4]
    resume_path = base / "resume" / "resume.yaml"
    try:
        with open(resume_path) as f:
            data = yaml.safe_load(f)
            return str(yaml.dump(data))
    except Exception as e:
        return f"Error reading resume: {e}"


if __name__ == "__main__":
    # Can be run via stdio or SSE depending on deployment needs
    mcp.run(transport="stdio")
