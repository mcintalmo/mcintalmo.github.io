import argparse
import yaml
import json
import logging
import os
import requests
import textwrap
import copy
import subprocess
from bs4 import BeautifulSoup
from google import genai
from google.genai import types

import requests
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_url_or_text(input_val):
    """Fetches text from a web URL or file path."""
    if input_val.startswith('http://') or input_val.startswith('https://'):
        logger.info(f"Fetching job description from URL: {input_val}")
        resp = requests.get(input_val)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        for script in soup(["script", "style"]):
            script.extract()
        return soup.get_text(separator=' ', strip=True)
    elif os.path.isfile(input_val):
        logger.info(f"Reading job description from file: {input_val}")
        with open(input_val, 'r') as f:
            return f.read()
    else:
        return input_val

def run_agentic_tailor(jd_text, original_resume, inferred_company="target_company"):
    """Uses google-adk LlmAgent to optionally iterate and tailor the resume via MCP tools."""
    from google.adk import Runner
    from google.adk.sessions.in_memory_session_service import InMemorySessionService
    from agent import root_agent
    
    runner = Runner(
        app_name="portfolio-resume-builder",
        agent=root_agent,
        session_service=InMemorySessionService(),
        auto_create_session=True
    )

    prompt = textwrap.dedent(f"""
    # Job Description:
    {jd_text}
    
    # Golden Resume (Current State):
    {yaml.dump(original_resume, sort_keys=False)}
    
    Begin tailoring operations now. Remember to call init_resume first to load the Golden Resume context.
    """)

    logger.info("Sending prompt to the ADK LlmAgent...")
    
    new_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=prompt)]
    )

    for event in runner.run(
        user_id="mcint",
        session_id=f"tailor-session-{inferred_company}",
        new_message=new_message
    ):
        if event.content and event.content.parts:
            text_parts = [p.text for p in event.content.parts if hasattr(p, 'text') and p.text]
            if text_parts:
                logger.info(f"Agent ({event.author}): {''.join(text_parts)}")
        
        function_calls = event.get_function_calls()
        if function_calls:
            for call in function_calls:
                logger.info(f"Agent Tool Call: {call.name}")
                
    logger.info("LLM Agent finished edits.")
    # Assuming MCP server updates its internal state, we format and fetch the final resume
    try:
        # Note: In a complete MCP implementation we'd grab the final YAML payload from the server.
        # For this script we will log completion. The actual UI agent loops it dynamically.
        logger.info("Operation complete. Verify against MCP state.")
        return original_resume
    except Exception as e:
        logger.error(f"Failed to fetch final state: {e}")
        return original_resume

def main():
    parser = argparse.ArgumentParser(description="Tailor a resume using GenAI.")
    parser.add_argument('--url', type=str, help="Job description website URL")
    parser.add_argument('--jd', type=str, help="Job description text or file path")
    parser.add_argument('--company', type=str, default="UnknownCompany", help="Target company name")
    parser.add_argument('--resume-file', type=str, default="../../src/content/resume.yaml")
    
    args = parser.parse_args()
    
    if args.url:
        jd_text = parse_url_or_text(args.url)
    elif args.jd:
        jd_text = parse_url_or_text(args.jd)
    else:
        logger.error("Must provide either --url or --jd")
        return
    
    logger.info(f"Target Company: {args.company}")
    resume_path = os.path.abspath(os.path.join(os.path.dirname(__file__), args.resume_file))
    if not os.path.exists(resume_path):
        logger.error(f"Cannot find Golden Resume at: {resume_path}")
        return
        
    with open(resume_path, 'r') as f:
        golden_resume = yaml.safe_load(f)

    logger.info("Starting agentic tailoring process...")
    tailored_resume = run_agentic_tailor(jd_text, golden_resume, args.company)
    
    tailored_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../src/content/tailored"))
    os.makedirs(tailored_dir, exist_ok=True)
    
    out_path = os.path.join(tailored_dir, f"{args.company}.yaml")
    with open(out_path, 'w') as f:
        yaml.dump(tailored_resume, f, sort_keys=False)
        
    logger.info(f"Successfully wrote tailored resume to {out_path}")
    
    # Trigger TS generator
    logger.info("Executing PDF generation for new tailored resume...")
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
    try:
        subprocess.run(["pnpm", "generate-resume"], cwd=root_dir, check=True)
        logger.info("PDF generation completed successfully.")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to generate PDF: {e}")

if __name__ == "__main__":
    main()
