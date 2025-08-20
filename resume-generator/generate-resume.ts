#!/usr/bin/env tsx
/**
 * CLI: generate-resume
 * Reads src/content/resume.yaml (+ optional resume-generator/pdf.config.yaml) and emits
 * - resume-generator/output/resume.tex
 * - resume-generator/output/resume.html
 * - public/downloads/<Name>_Resume.pdf
 * Uses pandoc if available for HTML/PDF; otherwise only LaTeX is produced.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
import { loadResume } from '../src/lib/data';
import type { ResumeRoot } from '../src/lib/types';

interface SectionConfig {
  title?: string;
  enabled?: boolean;
  // Per-section limits
  'work-history-years'?: number; // work
  'max-skills'?: number; // skills
  'max-projects'?: number; // projects
  'max-certifications'?: number; // certificates
  'show-courework'?: boolean; // education: toggle coursework line (intentional spelling per config)
  parent?: string; // optional parent section key (e.g., certificates parent: education)
}

interface PdfConfig {
  mainfont?: string;
  fonts?: { main?: string[] };
  margin?: string; // single margin shorthand
  topmargin?: string;
  bottommargin?: string;
  leftmargin?: string;
  rightmargin?: string;
  'section-order'?: string[];
  sections?: Record<string, SectionConfig>;
  output?: { tex?: string; html?: string; pdf?: string };
  metadata?: { title?: string; author?: string };
  pdfEngine?: string; // xelatex | lualatex | pdflatex
  dateFormat?: string; // e.g. 'MMM YYYY'
}

const projectRoot = process.cwd();
const generatorDir = path.join(projectRoot, 'resume-generator');
const templatePath = path.join(generatorDir, 'templates', 'resume_template.tex');
const pdfConfigPathLocal = path.join(generatorDir, 'pdf.config.yaml');
const pdfConfigPathContent = path.join(projectRoot, 'src', 'content', 'pdf.config.yaml');
const outputDir = path.join(generatorDir, 'output');
const publicDownloads = path.join(projectRoot, 'public', 'downloads');

function readPdfConfig(): PdfConfig {
  const candidate = [pdfConfigPathLocal, pdfConfigPathContent].find(p => fs.existsSync(p));
  if (candidate) {
    return YAML.parse(fs.readFileSync(candidate, 'utf-8')) as PdfConfig;
  }
  return {};
}


export function formatDate(date?: string, pattern: string = 'MMM YYYY', includeExpected = true): string {
  if (!date) return '';
  // Expect ISO like YYYY-MM or YYYY-MM-DD
  const [y, m] = date.split('-');
  if (!y || !m) return date; // fallback
  const monthIdx = parseInt(m, 10) - 1;
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return date;
  const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const longMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const replacements: Record<string,string> = {
    'MMM': shortMonths[monthIdx],
    'MMMM': longMonths[monthIdx],
    'YYYY': y,
    'YY': y.slice(-2),
  };
  // Order matters (longer tokens first)
  let out = pattern;
  ['MMMM','MMM','YYYY','YY'].forEach(tok => { out = out.replace(tok, replacements[tok]); });
  if (includeExpected) {
    const now = new Date();
    const nowYM = now.getFullYear() * 100 + (now.getMonth() + 1);
    const dateYM = parseInt(y,10) * 100 + (monthIdx + 1);
    if (dateYM > nowYM && !/^Expected\s/i.test(out)) {
      out = `Expected ${out}`;
    }
  }
  return out;
}

export function formatDateRange(start?: string, end?: string, pattern: string = 'MMM YYYY'): string {
  if (!start && !end) return '';
  const startFmt = start ? formatDate(start, pattern) : '';
  if (start && !end) return `${startFmt}–Present`;
  if (!start && end) return `${formatDate(end, pattern)}`;
  if (start && end) {
    const endIsFuture = (() => {
      const [ey, em] = end.split('-');
      if (!ey || !em) return false;
      const now = new Date();
      const nowYM = now.getFullYear() * 100 + (now.getMonth() + 1);
      const endYM = parseInt(ey,10) * 100 + parseInt(em,10);
      return endYM > nowYM;
    })();
    const endFmt = endIsFuture ? formatDate(end, pattern, true) : formatDate(end, pattern, false);
    return endIsFuture ? `${startFmt}–${endFmt}` : `${startFmt}–${endFmt}`;
  }
  return '';
}

export function escapeLatex(str?: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([#$%&_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}
// Escape URL for use in \href{url}{text}
export function escapeLatexUrl(url?: string): string {
  if (!url) return '';
  return url
  // Do NOT escape '_' so that URLs containing underscores remain readable and tests expecting 'a_b' pass.
  // It's generally safe inside \href's first argument (handled by hyperref). Still escape other specials.
  .replace(/([#$%&{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function simpleTemplate(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/{{([^}]+)}}/g, (_, raw) => ctx[raw.trim()] ?? '');
}

export function buildContext(resume: ResumeRoot, cfg: PdfConfig): Record<string, string> {
  const b = resume.basics || {};
  const name = escapeLatex(b.name);
  // Build interactive contact line with hyperlinks
  const emailDisplay = b.email ? `\\href{mailto:${escapeLatexUrl(b.email)}}{${escapeLatex(b.email)}}` : '';
  const siteDisplay = b.url ? `\\href{${escapeLatexUrl(b.url)}}{${escapeLatex(b.url.replace(/^https?:\/\//, ''))}}` : '';
  // Detect LinkedIn profile in basics.profiles where network case-insensitive equals 'LinkedIn'
  interface BasicProfile { network?: string; url?: string }
  const linkedinProfile = (b as { profiles?: BasicProfile[] } | undefined)?.profiles?.find((p: BasicProfile) => typeof p?.network === 'string' && p.network.toLowerCase() === 'linkedin');
  const linkedinDisplay = linkedinProfile?.url ? (() => {
    const disp = String(linkedinProfile.url)
      .replace(/^https?:\/\//,'')
      .replace(/^www\./,'')
      .replace(/\/$/,'');
    return `\\href{${linkedinProfile.url}}{${escapeLatex(disp)}}`;
  })() : '';
  const locationDisplay = [b.location?.city, b.location?.region].filter(Boolean).join(', ');
  const contactParts = [emailDisplay, siteDisplay, linkedinDisplay, escapeLatex(locationDisplay)].filter(Boolean);
  const contactLine = contactParts.join(' \\textbullet{} ');

  const datePattern = cfg.dateFormat || 'MMM YYYY';
  const sectionsCfgAll = cfg.sections || {};
  const limitYears = sectionsCfgAll.work?.['work-history-years'];
  const nowYear = new Date().getFullYear();
  // Filter work entries by years back if limit specified (keep entries whose endYear or startYear within window)
  let workEntries = (resume.work || []);
  if (limitYears && limitYears > 0) {
    workEntries = workEntries.filter(w => {
      const end = w.endDate || '';
      const start = w.startDate || '';
      const endYear = parseInt(end.substring(0,4)) || nowYear; // current if ongoing
      const startYear = parseInt(start.substring(0,4)) || endYear;
      return (nowYear - endYear) < limitYears || (nowYear - startYear) < limitYears;
    });
  }

  let educationBlock = (resume.education || []).map(e => {
    const degree = [e.studyType, e.area].filter(Boolean).join(' in ');
    const date = e.endDate ? formatDate(e.endDate, datePattern) : '';
    const showCoursework = sectionsCfgAll.education?.['show-courework'];
    const achievementsList = (e.achievements || []).map(a => escapeLatex(a));
    const courseworkPart = (showCoursework && (e.courses || []).length)
      ? `\\textit{Coursework:} ${escapeLatex((e.courses || []).join(', '))}`
      : '';
    const inlineItems: string[] = [];
    if (achievementsList.length) inlineItems.push(...achievementsList);
    if (courseworkPart) inlineItems.push(courseworkPart);
    const inlineLine = inlineItems.length ? `{\\small ${inlineItems.join(' \\textbullet{} ')}}` : '';
    return [
      `\\entry{${escapeLatex(e.institution)}}{${escapeLatex(degree)}}{${escapeLatex(date)}}{`,
      inlineLine,
      `}`
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const experienceBlock = workEntries.map(w => {
    const range = formatDateRange(w.startDate, w.endDate, datePattern);
    const headerLine = `\\entry{${escapeLatex(w.name || '')}}{${escapeLatex(w.position || '')}}{${escapeLatex(range)}}{`;
    const bulletsArr = [...(w.highlights || []), ...(w.responsibilities || [])];
    const bullets = bulletsArr.length ? ['\\begin{itemize}[leftmargin=*]', ...bulletsArr.map(h => `\\item ${escapeLatex(h)}`), '\\end{itemize}'].join('\n') : '';
    return [headerLine, bullets, '}'].filter(Boolean).join('\n');
  }).join('\n\n');

  let projectEntries = (resume.projects || []);
  if (sectionsCfgAll.projects?.['max-projects'] && sectionsCfgAll.projects['max-projects']! > 0) {
    projectEntries = projectEntries.slice(0, sectionsCfgAll.projects['max-projects']!);
  }
  const projectsBlock = projectEntries.map(p => {
    const bullets = (p.highlights || []).map(h => `\\item ${escapeLatex(h)}`).join('\n');
    const nameLinked = p.url ? `\\href{${p.url}}{${escapeLatex(p.name || '')}}` : escapeLatex(p.name || '');
    return [
      `\\entry{${nameLinked}}{}{${''}}{`,
      escapeLatex(p.description || ''),
      bullets ? `\\begin{itemize}[leftmargin=*]\n${bullets}\n\\end{itemize}` : '',
      '}'
    ].join('\n');
  }).join('\n\n');

  let skillsList = (resume.skills || []);
  if (sectionsCfgAll.skills?.['max-skills'] && sectionsCfgAll.skills['max-skills']! > 0) {
    skillsList = skillsList.slice(0, sectionsCfgAll.skills['max-skills']!);
  }
  const skillsBlock = skillsList.map(s => escapeLatex(s.name)).join(' \\textbullet{} ');

  let certList = (resume.certificates || []);
  if (sectionsCfgAll.certificates?.['max-certifications'] && sectionsCfgAll.certificates['max-certifications']! > 0) {
    certList = certList.slice(0, sectionsCfgAll.certificates['max-certifications']!);
  }
  const certsBlock = certList.map(c => {
    const date = formatDate(c.date, datePattern);
    const nameLinked = c.url ? `\\href{${c.url}}{${escapeLatex(c.name || '')}}` : escapeLatex(c.name || '');
    // Swap parameters so certification name (bold via #2) appears before issuer (italic via #1)
    return `\\entry{${escapeLatex(c.issuer || '')}}{${nameLinked}}{${escapeLatex(date)}}{}`;
  }).join('\n');

  // If certificates parent is education, append certificates after education entries and suppress separate section
  const certsParent = sectionsCfgAll.certificates?.parent;
  if (certsParent === 'education' && sectionsCfgAll.education?.enabled && sectionsCfgAll.certificates?.enabled) {
    const combined = [educationBlock, certsBlock].filter(Boolean).join('\n\n');
    educationBlock = combined;
    // Clear certsBlock so standalone section builder sees empty and/or logic can skip
  }

  // Section metadata
  const sectionsCfg = sectionsCfgAll;
  const declaredOrder = sectionsCfg ? Object.keys(sectionsCfg) : [];
  const sectionTitle = (key: string, fallback: string) => escapeLatex(sectionsCfg[key]?.title || fallback);
  const hasAnySectionConfig = Object.keys(sectionsCfg).length > 0;
  const sectionEnabled = (key: string) => {
    if (hasAnySectionConfig) {
      return !!(sectionsCfg[key] && sectionsCfg[key]!.enabled !== false && sectionsCfg[key]!.enabled);
    }
    switch (key) {
      case 'education': return (resume.education || []).length > 0 || (resume.certificates||[]).length>0;
      case 'work': return (resume.work || []).length > 0;
      case 'projects': return (resume.projects || []).length > 0;
      case 'skills': return (resume.skills || []).length > 0;
      case 'certificates': return (resume.certificates || []).length > 0;
      default: return true;
    }
  };

  const ordered = declaredOrder.length
    ? declaredOrder
    : (cfg['section-order'] && cfg['section-order']!.length ? cfg['section-order']! : ['education','work','projects','skills','certificates']);

  // Build dynamic sections content string for insertion if desired later (not yet used in template)
  const dynamicSections = ordered
    .filter(k => sectionEnabled(k))
    .map(k => {
      switch (k) {
        case 'education': return educationBlock ? `\\section*{${sectionTitle('education','Education')}}\n${educationBlock}` : '';
        case 'work': return experienceBlock ? `\\section*{${sectionTitle('work','Experience')}}\n${experienceBlock}` : '';
        case 'projects': return projectsBlock ? `\\section*{${sectionTitle('projects','Projects')}}\n${projectsBlock}` : '';
        case 'skills': return skillsBlock ? `\\section*{${sectionTitle('skills','Skills')}}\n{\\small ${skillsBlock}}` : '';
        case 'certificates': {
          // Skip if nested under education
          if (sectionsCfgAll.certificates?.parent === 'education') return '';
          return certsBlock ? `\\section*{${sectionTitle('certificates','Certifications')}}\n${certsBlock}` : '';
        }
        default: return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');

  const ctx: Record<string,string> = {
    name,
    label: escapeLatex(b.label),
    contactLine,
    educationBlock,
    experienceBlock,
    projectsBlock,
    skillsBlock,
    certsBlock,
    dynamicSections,
    educationTitle: sectionTitle('education','Education'),
    experienceTitle: sectionTitle('work','Experience'),
    projectsTitle: sectionTitle('projects','Projects'),
    skillsTitle: sectionTitle('skills','Skills'),
    certsTitle: sectionTitle('certificates','Certifications'),
  showEducation: sectionEnabled('education') ? '1' : '',
  showExperience: sectionEnabled('work') ? '1' : '',
  showProjects: sectionEnabled('projects') ? '1' : '',
  showSkills: sectionEnabled('skills') ? '1' : '',
  showCerts: sectionEnabled('certificates') ? '1' : '',
  metaTitle: escapeLatex(b.name ? `${b.name} – Resume` : 'Resume'),
  metaAuthor: escapeLatex(b.name || 'Anonymous'),
    topmargin: cfg.topmargin || '',
    bottommargin: cfg.bottommargin || '',
    leftmargin: cfg.leftmargin || '',
    rightmargin: cfg.rightmargin || '',
    mainfont: cfg.mainfont || 'Latin Modern Roman',
    fontCascadeCode: buildFontCascade(
      (cfg.fonts?.main && cfg.fonts.main.length)
        ? cfg.fonts.main.map(f => f.trim()).filter(Boolean)
        : [cfg.mainfont, 'TeX Gyre Pagella', 'Latin Modern Roman'].filter(Boolean)
    ),
  };
  return ctx;
}

export function buildFontCascade(fonts: (string | undefined)[]): string {
  const cleaned = fonts.filter((f): f is string => !!f && f.trim().length > 0);
  if (!cleaned.length) return '\\setmainfont{Latin Modern Roman}';
  function nest(list: string[]): string {
    if (!list.length) return '\\setmainfont{Latin Modern Roman}';
    const [head, ...rest] = list;
    if (!rest.length) return `\\IfFontExistsTF{${head}}{\\setmainfont{${head}}}{\\setmainfont{Latin Modern Roman}}`;
    return `\\IfFontExistsTF{${head}}{\\setmainfont{${head}}}{${nest(rest)}}`;
  }
    return nest(cleaned);
}

// (Loop expansion removed in refactor; all sections pre-rendered.)

export function generateLatex(resume: ResumeRoot, cfg: PdfConfig): string {
  const template = fs.readFileSync(templatePath, 'utf-8');
  const ctx = buildContext(resume, cfg);
  let latex = simpleTemplate(template, ctx);
  // Sanitize: in rare cases leading backslashes in \titleformat / \titlespacing lines have been
  // observed to disappear (possibly due to an editor or encoding issue). Force-correct them.
  latex = latex.replace(/(^|\n)\s*itleformat/g, '$1\\titleformat');
  latex = latex.replace(/(^|\n)\s*itlespacing/g, '$1\\titlespacing');
  latex = latex.replace(/\s+$/g, '');
  return latex;
}

function writeFileSafe(p: string, data: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data, 'utf-8');
}

function runPandocHtml(inputTex: string, htmlOut: string) {
  const r = spawnSync('pandoc', [inputTex, '-o', htmlOut], { stdio: 'inherit' });
  if (r.error) console.warn('pandoc not available for HTML generation');
}

function detectLatexEngine(preferred?: string): string | undefined {
  const candidates = preferred ? [preferred, 'xelatex', 'lualatex', 'pdflatex'] : ['xelatex', 'lualatex', 'pdflatex'];
  for (const c of candidates) {
    const r = spawnSync(c, ['-version'], { stdio: 'ignore' });
    if (!r.error && r.status === 0) return c;
  }
  return undefined;
}

function buildPdfWithLatex(engine: string, texPath: string, outPdfPath: string) {
  const outDir = path.dirname(texPath);
  const baseName = path.basename(texPath, path.extname(texPath));
  // Run twice for references (e.g., LastPage)
  for (let i = 0; i < 2; i++) {
    const r = spawnSync(engine, [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-file-line-error',
      texPath,
    ], { cwd: outDir, stdio: 'inherit' });
    if (r.error || r.status !== 0) {
      console.warn(`${engine} run ${i + 1} failed; aborting PDF compile.`);
      return false;
    }
  }
  const generatedPdf = path.join(outDir, `${baseName}.pdf`);
  if (fs.existsSync(generatedPdf)) {
    fs.mkdirSync(path.dirname(outPdfPath), { recursive: true });
    fs.copyFileSync(generatedPdf, outPdfPath);
    return true;
  }
  return false;
}

function main() {
  const cfg = readPdfConfig();
  const { data: resume } = loadResume();
  const latex = generateLatex(resume, cfg);
  const texName = cfg.output?.tex || 'resume.tex';
  const htmlName = cfg.output?.html || 'resume.html';
  const pdfName = cfg.output?.pdf || `${resume.basics?.name?.replace(/\s+/g, '_') || 'Resume'}.pdf`;
  const texPath = path.join(outputDir, texName);
  try {
    writeFileSafe(texPath, latex);
    console.log('Wrote LaTeX to', texPath);
  } catch (e) {
    console.error('Failed writing LaTeX', e);
  }
  // HTML via pandoc (best effort)
  try {
    runPandocHtml(texPath, path.join(outputDir, htmlName));
  } catch (err) {
    // Swallow pandoc HTML generation errors (non-fatal); PDF still attempted
    console.warn('pandoc HTML generation failed (continuing)', (err as Error)?.message);
  }
  // PDF via native LaTeX engine if available
  const pdfTarget = path.join(publicDownloads, pdfName);
  const engine = detectLatexEngine(cfg.pdfEngine);
  if (engine) {
    const ok = buildPdfWithLatex(engine, texPath, pdfTarget);
    if (ok) {
      console.log(`PDF generated with ${engine}: ${pdfTarget}`);
    } else {
      console.warn('Falling back to pandoc PDF (engine compile failed).');
      spawnSync('pandoc', [texPath, '-o', pdfTarget, '--pdf-engine=xelatex'], { stdio: 'inherit' });
    }
  } else {
    console.warn('No LaTeX engine detected (xelatex/lualatex/pdflatex). Using pandoc fallback.');
    spawnSync('pandoc', [texPath, '-o', pdfTarget, '--pdf-engine=xelatex'], { stdio: 'inherit' });
  }
  console.log('Done');
}

// tsx may not set import.meta.url matching pattern on Windows; invoke directly.
main();
