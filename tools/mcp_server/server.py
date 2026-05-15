import yaml
import json
import copy
import logging
import textwrap
import os
from fastmcp import FastMCP
from google import genai

import sys
logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger(__name__)

mcp = FastMCP("resume_server")

# Global state hold the current resume being tailored
working_resume = {}

@mcp.tool()
def init_resume(resume_yaml: str) -> str:
    """Initializes the working resume context for the session. Call this before any editing tools.
    Args:
        resume_yaml: The full resume YAML string to start tailoring from.
    """
    global working_resume
    try:
        working_resume = yaml.safe_load(resume_yaml)
        return "Resume loaded successfully."
    except Exception as e:
        return f"Error loading resume: {str(e)}"

@mcp.tool()
def update_field(path: str, new_value: str) -> str:
    """Updates a text field in the resume at a given JSON path.
    Args:
        path: A dot-separated JSON path (e.g. 'work.0.description', 'basics.summary')
        new_value: The tailored text to replace the existing text.
    """
    global working_resume
    keys = path.split('.')
    d = working_resume
    try:
        for k in keys[:-1]:
            if isinstance(d, list):
                k = int(k)
            d = d[k]
        last_key = keys[-1]
        if isinstance(d, list):
            last_key = int(last_key)
        d[last_key] = new_value
        return f"Successfully updated {path}."
    except Exception as e:
        return f"Error updating {path}: {str(e)}"

@mcp.tool()
def remove_item(path: str) -> str:
    """Removes an item or field at the given JSON path.
    Args:
        path: A dot-separated JSON path (e.g. 'skills.2' or 'work.1')
    """
    global working_resume
    keys = path.split('.')
    d = working_resume
    try:
        for k in keys[:-1]:
            if isinstance(d, list):
                k = int(k)
            d = d[k]
        last_key = keys[-1]
        if isinstance(d, list):
            last_key = int(last_key)
        
        if isinstance(d, list):
            d.pop(last_key)
        else:
            del d[last_key]
        return f"Successfully removed {path}."
    except Exception as e:
        return f"Error removing {path}: {str(e)}"

@mcp.tool()
def append_item(path: str, new_object_json: str) -> str:
    """Appends a new item into a list/array at the specified path.
    Args:
        path: A dot-separated JSON path pointing to a list (e.g. 'skills' or 'work').
        new_object_json: The new dictionary/string to append, provided as a valid JSON string.
    """
    global working_resume
    d = working_resume
    try:
        if path and path != "root":
            keys = path.split('.')
            for k in keys:
                if isinstance(d, list):
                    k = int(k)
                d = d[k]
        
        if not isinstance(d, list):
            return f"Error appending item: {path} is not a list. Type is {type(d)}."
        
        obj = json.loads(new_object_json)
        d.append(obj)
        return f"Successfully appended new item to {path}."
    except Exception as e:
        return f"Error appending item to {path}: {str(e)}"

@mcp.tool()
def insert_item(path: str, index: int, new_object_json: str) -> str:
    """Inserts an item into a list at a specific index. Shifts subsequent items.
    Args:
        path: A dot-separated JSON path pointing to a list (e.g. 'work').
        index: The zero-based integer index to insert at.
        new_object_json: The new dictionary/string to insert, provided as a valid JSON string.
    """
    global working_resume
    d = working_resume
    try:
        if path and path != "root":
            keys = path.split('.')
            for k in keys:
                if isinstance(d, list):
                    k = int(k)
                d = d[k]
        
        if not isinstance(d, list):
            return f"Error inserting item: {path} is not a list."
            
        obj = json.loads(new_object_json)
        d.insert(index, obj)
        return f"Successfully inserted new item into {path} at index {index}."
    except Exception as e:
        return f"Error inserting item into {path} at index {index}: {str(e)}"

@mcp.tool()
def format_resume(path: str) -> str:
    """Returns the current state of the working resume at the path in YAML format. Use path 'root' or '' for the whole resume."""
    global working_resume
    keys = path.split('.')
    d = working_resume
    try:
        if path == "" or path == "root":
            return yaml.dump(d, sort_keys=False)
        for k in keys:
            if isinstance(d, list):
                k = int(k)
            d = d[k]
        return yaml.dump(d, sort_keys=False)
    except Exception as e:
        return f"Error fetching {path}: {str(e)}"

@mcp.tool()
def evaluate_ats_score(job_description: str) -> str:
    """Evaluates the candidate's current working resume against the job description and returns an ATS score (0-100) with suggestions.
    Args:
        job_description: The job description text.
    Returns:
        A report containing an ATS score and improvement suggestions based on the current internal state.
    """
    global working_resume
    client = genai.Client()
    current_resume_yaml = yaml.dump(working_resume, sort_keys=False)
    
    prompt = textwrap.dedent(f"""
    As an expert Applicant Tracking System (ATS), evaluate this resume against the job description.
    Provide a brief analysis of missing keywords or mismatched experiences.
    End your response with a final ATS Score out of 100 formatted as "SCORE: X/100".
    
    # Job Description
    {job_description}
    
    # Resume
    {current_resume_yaml}
    """)
    
    # Use Gemini model for the ATS evaluation
    res = client.models.generate_content(
        model=os.getenv("ADK_MODEL", "gemini-2.5-flash").replace("litellm/",""), 
        contents=prompt
    )
    return res.text

if __name__ == "__main__":
    mcp.run()
