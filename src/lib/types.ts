// Types for JSON Resume v1.0.0 (subset used by the site) and site config

export interface ResumeBasicsProfile {
  network?: string;
  username?: string;
  url?: string;
  keywords?: string[];
}

export interface ResumeBasicsLocation {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
}

export interface ResumeBasics {
  name?: string;
  label?: string;
  image?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string; // may contain HTML
  location?: ResumeBasicsLocation;
  profiles?: ResumeBasicsProfile[];
}

export interface ResumeWork {
  name?: string; // company
  position?: string;
  url?: string;
  startDate?: string; // YYYY-MM or YYYY-MM-DD
  endDate?: string; // optional
  summary?: string;
  highlights?: string[];
  location?: string;
  description?: string;
  keywords?: string[];
  responsibilities?: string[];
}

export interface ResumeEducation {
  institution?: string;
  studyType?: string;
  area?: string;
  startDate?: string;
  endDate?: string;
  score?: string; // GPA or similar
  url?: string;
  summary?: string; // may contain HTML
  location?: { city?: string; region?: string; countryCode?: string };
  achievements?: string[]; // list of achievements
  courses?: string[];
  keywords?: string[];
}

export interface ResumeCertificate {
  name?: string;
  issuer?: string;
  date?: string;
  url?: string;
  keywords?: string[];
}

export interface ResumeProject {
  name?: string;
  description?: string;
  url?: string;
  // Optional URL pointing to the source code repository (e.g., GitHub). Used for the "Code" button.
  codeUrl?: string;
  highlights?: string[];
  keywords?: string[];
}

export interface ResumeSkill {
  name?: string;
  level?: string; // Freeform per JSON Resume
  keywords?: string[];
}

export interface ResumeRoot {
  basics?: ResumeBasics;
  work?: ResumeWork[];
  education?: ResumeEducation[];
  certificates?: ResumeCertificate[];
  projects?: ResumeProject[];
  skills?: ResumeSkill[];
}

// Site config types
export type SectionKey =
  | "basics"
  | "work"
  | "education"
  | "certificates"
  | "projects"
  | "skills"
  | "awards"
  | "blog"
  | "contact";

export interface SkillCategory {
  key: string;
  title: string;
  icon: string;
  keywords: string[];
}

export interface SectionConfig {
  title?: string;
  description?: string;
  enabled?: boolean;
  "navigation-label"?: string;
  parent?: SectionKey;
  /** Number of years of work history to show by default before requiring expansion. */
  "history-visible-years"?: number;
  /** Number of certification items to show by default. */
  "certifications-visible-count"?: number;
  /** Number of project items to show by default. */
  "projects-visible-count"?: number;
  /** Skill categories configuration for the skills section. */
  categories?: SkillCategory[];
}

export interface SiteSectionsConfig {
  [key: string]: SectionConfig | undefined;
}

export interface SEOConfig {
  title?: string;
  description?: string;
}

export interface AnalyticsConfig {
  provider?: string;
  "tracking-id"?: string;
}

export interface ContentConfig {
  "date-format"?: string; // e.g., "MMM yyyy"
  "show-relative-duration"?: boolean;
}

export interface BuildConfig {
  "strict-schema"?: boolean;
  "placeholder-policy"?: "hide" | "show";
}

export interface SiteConfigRoot {
  sections?: SiteSectionsConfig & { order?: string[] };
  seo?: SEOConfig;
  analytics?: AnalyticsConfig;
  content?: ContentConfig;
  build?: BuildConfig;
}

// Optional helper type retained for date utilities (not a separate view model layer)
export interface DateRange {
  start?: string;
  end?: string;
  ongoing?: boolean;
}
