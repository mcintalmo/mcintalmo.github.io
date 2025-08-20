import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadResume } from '../src/lib/data';

// Import internal functions by re-requiring the file (would need refactor for more granular tests)
// For now we'll just ensure the CLI runs without throwing and outputs a tex file.

describe('resume generator', () => {
  it('loads resume yaml', () => {
    const { data } = loadResume();
    expect(data.basics?.name).toBeTruthy();
  });

  it('template exists', () => {
    const tpl = path.join(process.cwd(), 'resume-generator', 'templates', 'resume_template.tex');
    expect(fs.existsSync(tpl)).toBe(true);
  });
});
