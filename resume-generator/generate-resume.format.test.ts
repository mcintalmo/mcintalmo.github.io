import { describe, it, expect } from 'vitest';
// Re-import functions by requiring the built script file (direct import since TSX executed via ts-node style)
import { buildContext } from './generate-resume';
import type { ResumeRoot } from '../src/lib/types';

function minimalResume(): ResumeRoot {
  return {
    basics: { name: 'Test User', label: 'Engineer', email: 'test@example.com' },
    work: [
      { name: 'Company', position: 'Role', startDate: '2024-01', endDate: '2024-06' },
      { name: 'FutureCo', position: 'Intern', startDate: '2025-05', endDate: '2025-08' }
    ],
    education: [ { institution: 'School', studyType: 'BSc', area: 'CS', endDate: '2022-05' } ],
    projects: [ { name: 'Proj', description: 'Desc', url: 'https://example.com' } ],
    skills: [ { name: 'SkillA' } ],
    certificates: [ { name: 'Cert', issuer: 'Org', date: '2023-01-01', url: 'https://certs.example/cert' } ]
  };
}

describe('buildContext defaults', () => {
  it('enables sections when no pdf config provided', () => {
    const resume = minimalResume();
    const ctx = buildContext(resume, {});
    expect(ctx.showExperience).toBe('1');
    expect(ctx.showEducation).toBe('1');
    expect(ctx.showProjects).toBe('1');
    expect(ctx.showSkills).toBe('1');
    expect(ctx.showCerts).toBe('1');
  });
});
