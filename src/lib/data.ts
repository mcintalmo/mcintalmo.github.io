import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ResumeRoot, SiteConfigRoot } from './types';

const contentDir = path.resolve(process.cwd(), 'src', 'content');

export type ValidationIssue = { path: string; message: string };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const resumeSchemaPath = path.resolve(process.cwd(), 'src', 'lib', 'schema', 'resume.v1.json');
const resumeSchema = JSON.parse(fs.readFileSync(resumeSchemaPath, 'utf-8'));
const validateResume = ajv.compile(resumeSchema as any);

function readYaml<T>(file: string): T {
  const full = path.resolve(contentDir, file);
  const text = fs.readFileSync(full, 'utf-8');
  // Using yaml for stricter parsing/line numbers
  return YAML.parse(text) as T;
}

export function loadSiteConfig(): SiteConfigRoot {
  const config = readYaml<SiteConfigRoot>('site.config.yaml');
  return config ?? {};
}

export function loadResume(strictSchema = false): { data: ResumeRoot; errors: ValidationIssue[] } {
  const data = readYaml<ResumeRoot>('resume.yaml');
  const errors: ValidationIssue[] = [];
  const ok = validateResume(data as any);
  if (!ok && validateResume.errors) {
    for (const err of validateResume.errors) {
      errors.push({ path: err.instancePath || '/', message: err.message || 'Invalid' });
    }
  }
  if (strictSchema && errors.length) {
    const details = errors.map(e => `- ${e.path}: ${e.message}`).join('\n');
    throw new Error(`JSON Resume validation failed:\n${details}`);
  }
  return { data, errors };
}


export function getSectionOrder(config: SiteConfigRoot): string[] {
  const explicit = (config.sections as any)?.order as string[] | undefined;
  const keys = Object.keys(config.sections ?? {});
  const defaultOrder = ['basics', 'work', 'education', 'projects', 'skills', 'blog', 'contact'];
  const seen = new Set<string>();
  const result: string[] = [];
  if (explicit?.length) {
    for (const k of explicit) {
      if (!seen.has(k)) { result.push(k); seen.add(k); }
    }
  }
  for (const k of [...keys, ...defaultOrder]) {
    if (!seen.has(k)) { result.push(k); seen.add(k); }
  }
  return result;
}

export function loadAll() {
  const config = loadSiteConfig();
  const strict = !!config.build?.["strict-schema"]; 
  const { data: resume, errors } = loadResume(strict);
  return { config, resume, errors };
}
