import { format, parse, isValid } from 'date-fns';
import type { DateRange, SiteConfigRoot } from './types';

// Helpers
export function parseDate(d?: string): Date | undefined {
  if (!d) return undefined;
  const candidates = ['yyyy-MM-dd', 'yyyy-MM', 'yyyy'];
  for (const fmt of candidates) {
    const parsed = parse(d, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }
  return undefined;
}

export function formatRange(start?: string, end?: string, fmt = 'MMM yyyy'): DateRange {
  const s = parseDate(start);
  const e = parseDate(end);
  return {
    start: s ? format(s, fmt) : undefined,
    end: e ? format(e, fmt) : undefined,
    ongoing: !!(s && !e),
  };
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
