import yaml
import os
import copy
import logging
from google.adk import Agent
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.mcp_tool import McpToolset, StdioConnectionParams
from mcp import StdioServerParameters

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ResumeTailoringAgent(LlmAgent):
    """An ADK Agent acting on behalf of Alexander McIntosh to tailor his resume."""
    name: str = "resume_tailoring_agent"
    # Route securely through LiteLLM Proxy container
    model: str = os.getenv("ADK_MODEL", "openai/gemini-2.5-flash")
    
    instruction: str = (
        "You are an expert AI agent acting on behalf of Alexander McIntosh. Your primary goal is to tailor his golden resume for a specific job application, putting him in the best possible light without fabricating information.\n\n"
        "# Guidelines:\n"
        "1. Read the provided job description and understand the required skills and experience.\n"
        "2. Focus primarily on the 'work' array and the 'basics.summary'. Update the 'description' fields and highlight relevant bullet points to align with the job responsibilities.\n"
        "3. Do NOT make up new experience. Only rephrase existing experience to match the verbs and keywords in the JD.\n"
        "4. You may remove irrelevant skills or older roles if they distract from the JD requirements, using the `remove_item` tool.\n"
        "5. You may add an entirely new item (like an omitted skill) using `append_item` or `insert_item`.\n"
        "6. After making a set of edits, use the `evaluate_ats_score` tool to see how the resume scores. If the score is below 85/100, make more edits based on the ATS system's suggestions and evaluate again.\n"
        "7. Once you achieve a score >= 85/100, or you feel you've exhausted realistic adjustments, end the process by outputting a summary of the changes made and say 'Tailoring complete!'.\n"
    )
    
    
root_agent = ResumeTailoringAgent(
    tools=[
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="uv",
                    args=[
                        "run",
                        "--directory", 
                        os.path.abspath(os.path.join(os.path.dirname(__file__), "../mcp_server")),
                        "python", 
                        "server.py"
                    ],
                    env={**os.environ}
                )
            )
        )
    ]
)
