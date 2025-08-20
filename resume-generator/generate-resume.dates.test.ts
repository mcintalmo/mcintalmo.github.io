import { describe, it, expect } from 'vitest';
import { formatDate, formatDateRange, escapeLatexUrl } from './generate-resume';

describe('date formatting', () => {
  it('formats standard month-year', () => {
    expect(formatDate('2024-07')).toMatch(/Jul 2024|Expected Jul 2024/);
  });
  it('adds Expected for future dates', () => {
    const futureYear = new Date().getFullYear() + 1;
    const date = `${futureYear}-01`;
    expect(formatDate(date)).toMatch(/^Expected/);
  });
  it('handles malformed date gracefully', () => {
    expect(formatDate('2024')).toBe('2024');
  });
  it('formats range ongoing', () => {
    expect(formatDateRange('2024-01')).toBe('Jan 2024–Present');
  });
});

describe('URL escaping', () => {
  it('escapes special chars', () => {
    expect(escapeLatexUrl('https://ex.com/a_b%20c#frag')).toContain('a_b');
  expect(escapeLatexUrl('https://ex.com/a_b%20c#frag')).toMatch(/#/);
  });
});
