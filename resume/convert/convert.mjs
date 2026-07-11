#!/usr/bin/env node
/**
 * convert.mjs
 *
 * Converts a JSON Resume file (in YAML notation) to RenderCV YAML format.
 *
 * Usage:
 *   node convert.mjs <input.yaml> [output.yaml]
 *   node convert.mjs resume/resume.yaml > resume/rendercv/resume.yaml
 *
 * If no output path is given, writes to stdout.
 *
 * Mapping:
 *   basics          → cv.name, cv.email, cv.location, cv.social_networks
 *   work            → cv.sections.experience  (ExperienceEntry)
 *   education       → cv.sections.education   (EducationEntry)
 *   certificates    → cv.sections.certificates (NormalEntry)
 *   projects        → cv.sections.projects    (NormalEntry)
 *   skills          → cv.sections.<category>  (OneLineEntry, grouped by keywords[0])
 *
 * The design: block is intentionally NOT included here.
 * It lives in resume/themes/classic/design.yaml and is passed separately
 * to rendercv via the design_yaml_file argument.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

// ── Entry point ────────────────────────────────────────────────────────────────

const [, , inputArg, outputArg] = process.argv;

if (!inputArg) {
  console.error(
    "Usage: node convert.mjs <input-yaml> [output-yaml]\n" +
      "       node convert.mjs resume/resume.yaml > resume/rendercv/resume.yaml",
  );
  process.exit(1);
}

const inputPath = resolve(inputArg);
const source = readFileSync(inputPath, "utf8");
const resume = yaml.load(source);

const rendercv = convert(resume);
const output = yaml.dump(rendercv, {
  lineWidth: 120,
  noRefs: true,
  quotingType: '"',
  forceQuotes: false,
});

if (outputArg) {
  writeFileSync(resolve(outputArg), output, "utf8");
  console.error(`Written to ${outputArg}`);
} else {
  process.stdout.write(output);
}

// ── Conversion logic ───────────────────────────────────────────────────────────

/**
 * Main converter: JSON Resume object → RenderCV object.
 * @param {object} r - parsed JSON Resume
 * @returns {object} rendercv-compatible data object (cv: + no design:)
 */
function convert(r) {
  const basics = r.basics ?? {};
  const sections = {};

  // ── Summary ──────────────────────────────────────────────────────────────────
  if (basics.summary) {
    sections.summary = [basics.summary];
  }

  // ── Work Experience ───────────────────────────────────────────────────────────
  if (r.work?.length) {
    sections.experience = r.work.map((w) => {
      const entry = {
        company: w.name,
        position: w.position,
      };
      if (w.location) entry.location = w.location;
      if (w.startDate) entry.start_date = w.startDate;
      if (w.endDate) entry.end_date = w.endDate;
      else entry.end_date = "present";
      // Use description as summary if present
      if (w.summary) entry.summary = w.summary;
      else if (w.description) entry.summary = w.description;
      if (w.highlights?.length) entry.highlights = w.highlights;
      return entry;
    });
  }

  // ── Education ─────────────────────────────────────────────────────────────────
  if (r.education?.length) {
    sections.education = r.education.map((e) => {
      const entry = {
        institution: e.institution,
        area: e.area,
        degree: e.studyType,
      };
      if (e.url) entry.url = e.url;
      if (e.startDate) entry.start_date = e.startDate;
      if (e.endDate) entry.end_date = e.endDate;
      // Map courses to highlights; map achievements to highlights too
      const highlights = [...(e.achievements ?? []), ...(e.courses ?? [])];
      if (highlights.length) entry.highlights = highlights;
      return entry;
    });
  }

  // ── Certificates ──────────────────────────────────────────────────────────────
  if (r.certificates?.length) {
    sections.certifications = r.certificates.map((c) => {
      const entry = { name: c.name };
      if (c.date) {
        const dateObj = c.date;
        entry.date =
          dateObj instanceof Date
            ? dateObj.toISOString().slice(0, 7)
            : String(dateObj).slice(0, 7);
      }
      if (c.issuer) entry.location = c.issuer;
      if (c.url) entry.url = c.url;
      return entry;
    });
  }

  // ── Projects ──────────────────────────────────────────────────────────────────
  if (r.projects?.length) {
    sections.projects = r.projects.map((p) => {
      const entry = { name: p.name };
      if (p.url) entry.url = p.url;
      if (p.startDate) entry.date = p.startDate;
      // Build highlights from description + explicit highlights
      const highlights = [];
      if (p.description) highlights.push(p.description.trim());
      if (p.highlights?.length) highlights.push(...p.highlights);
      if (highlights.length) entry.highlights = highlights;
      return entry;
    });
  }

  // ── Skills (grouped by keywords[0] category tag) ──────────────────────────────
  if (r.skills?.length) {
    /** @type {Map<string, string[]>} category → skill names */
    const byCategory = new Map();

    for (const skill of r.skills) {
      const category = skill.keywords?.[0] ?? "Other";
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(skill.name);
    }

    for (const [category, names] of byCategory) {
      // Build a safe section key: lowercase, replace non-alphanumeric with _
      const key = category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      sections[key] = [
        {
          label: category,
          details: names.join(", "),
        },
      ];
    }
  }

  return {
    cv: {
      name: basics.name,
      // label is not a RenderCV field — we map it into a headline via the sections
      location: locationString(basics.location),
      email: basics.email ?? undefined,
      phone: basics.phone ?? undefined,
      website: basics.url ?? undefined,
      social_networks: (basics.profiles ?? []).map((p) => ({
        network: p.network,
        username: p.username,
      })),
      sections,
    },
  };
}

/**
 * Format a JSON Resume location object as a compact string.
 * @param {object|undefined} loc
 * @returns {string|undefined}
 */
function locationString(loc) {
  if (!loc) return undefined;
  const parts = [loc.city, loc.region, loc.countryCode].filter(Boolean);
  return parts.join(", ") || undefined;
}
