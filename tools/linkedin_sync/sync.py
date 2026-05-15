import argparse
import yaml
import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import pandas as pd
import json

def pull_from_linkedin(output_file: str, csv_path: str = "Profile.csv"):
    """
    Parses an official LinkedIn Data Export CSV and writes the basic details to the Golden Resume Schema.
    Requires user to manually download the 'Profile.csv' archive.
    """
    logger.info("Initializing LinkedIn CSV Migration...")
    if not os.path.exists(csv_path):
        logger.error(f"Could not find LinkedIn archive at {csv_path}. Please download it from LinkedIn settings.")
        return
        
    try:
        df = pd.read_csv(csv_path)
        if df.empty:
            logger.warning("CSV is empty.")
            return
            
        # LinkedIn CSVs typically have Name, Headline, Summary, Title, Company fields
        first_row = df.iloc[0]
        name = f"{first_row.get('First Name', '')} {first_row.get('Last Name', '')}".strip()
        headline = str(first_row.get('Headline', ''))
        summary = str(first_row.get('Summary', ''))
        
        # Load existing
        resume = {}
        if os.path.exists(output_file):
            with open(output_file, 'r') as f:
                resume = yaml.safe_load(f) or {}
                
        if 'basics' not in resume:
            resume['basics'] = {}
            
        resume['basics']['name'] = name if name else resume['basics'].get('name', 'Name')
        resume['basics']['label'] = headline if headline else resume['basics'].get('label', '')
        resume['basics']['summary'] = summary if summary else resume['basics'].get('summary', '')

        with open(output_file, 'w') as f:
            yaml.dump(resume, f, sort_keys=False)
            
        logger.info(f"Successfully migrated LinkedIn standard profile fields to {output_file}.")
        
    except Exception as e:
        logger.error(f"Failed to parse LinkedIn CSV: {str(e)}")

import os

def push_to_linkedin(input_file: str):
    """
    Generates CSV exports modeled after LinkedIn's native data export formats (Profile.csv, Positions.csv)
    for manual bulk-updating or 3rd-party integration.
    """
    logger.info(f"Reading Golden Resume from {input_file}...")
    with open(input_file, 'r') as f:
        golden_resume = yaml.safe_load(f)
        
    logger.info("Formatting LinkedIn CSV Exports...")
    
    # Generate Profile_export.csv
    basics = golden_resume.get('basics', {})
    name_parts = basics.get('name', 'User Name').split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    
    profile_df = pd.DataFrame([{
        'First Name': first_name,
        'Last Name': last_name,
        'Headline': basics.get('label', ''),
        'Summary': basics.get('summary', '')
    }])
    
    out_dir = os.path.dirname(input_file)
    profile_csv_path = os.path.join(out_dir, "Profile_export.csv")
    profile_df.to_csv(profile_csv_path, index=False)
    logger.info(f"Exported {profile_csv_path}")

    # Generate Positions_export.csv
    work_items = golden_resume.get('work', [])
    if work_items:
        positions = []
        for w in work_items:
            positions.append({
                'Company Name': w.get('name', ''),
                'Title': w.get('position', ''),
                'Description': w.get('summary', '') or w.get('description', ''),
                'Location': w.get('location', ''),
                'Started On': w.get('startDate', ''),
                'Finished On': w.get('endDate', 'Present')
            })
        pos_df = pd.DataFrame(positions)
        pos_csv_path = os.path.join(out_dir, "Positions_export.csv")
        pos_df.to_csv(pos_csv_path, index=False)
        logger.info(f"Exported {pos_csv_path} with {len(positions)} work experiences.")

def main():
    parser = argparse.ArgumentParser(description="Bidirectional sync for LinkedIn and Golden Resume.")
    parser.add_argument('--direction', type=str, choices=['push', 'pull'], required=True, 
                        help="Direction of sync: 'push' to LinkedIn, 'pull' from LinkedIn")
    parser.add_argument('--file', type=str, default="../../src/content/resume.yaml", 
                        help="Path to the resume.yaml file")
    
    args = parser.parse_args()
    
    if args.direction == 'pull':
        pull_from_linkedin(args.file)
    else:
        push_to_linkedin(args.file)

if __name__ == "__main__":
    main()
