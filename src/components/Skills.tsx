import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useScrollAnimation } from "./hooks/useScrollAnimation";
import type { ResumeSkill, SiteConfigRoot } from "../lib/types";
import type { LucideIcon } from "lucide-react";
import { Code, Brain, Cloud, Wrench, Layers3 } from "lucide-react";
import { SectionAnchor } from "./SectionAnchor";

// Mapping of (normalized) level -> filled slot count
const skillLevels: Record<string, number> = {
  expert: 5,
  advanced: 4,
  intermediate: 3,
  proficient: 3,
  beginner: 2,
  novice: 1,
};

const MAX_SLOTS = 5;

function normalizeLevel(level?: string): number | null {
  if (!level) return null;
  const key = level.trim().toLowerCase();
  return skillLevels[key] ?? null;
}

function SkillSlots({ level }: { level?: string }) {
  const filled = normalizeLevel(level) ?? 0;
  return (
    <div
      className="flex gap-1"
      aria-label={level ? `Level: ${level}` : undefined}
    >
      {Array.from({ length: MAX_SLOTS }).map((_, i) => (
        <div
          key={i}
          className={
            "h-1.5 w-4 rounded-full transition-colors " +
            (i < filled ? "bg-primary" : "bg-muted")
          }
        />
      ))}
    </div>
  );
}

interface SkillCategory {
  key: string;
  title: string;
  icon: LucideIcon;
  skills: ResumeSkill[];
}

function chooseIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (/(language|framework)/.test(l)) return Code;
  if (/(machine learning|ml|ai|deep|nlp|model)/.test(l)) return Brain;
  if (/(data engineering|data\b|pipeline|etl|observability)/.test(l))
    return Layers3;
  if (/(cloud|infrastructure)/.test(l)) return Cloud;
  if (/(tool|productivity|git)/.test(l)) return Wrench;
  return Wrench;
}

// Build categories dynamically: first keyword of each skill (or "Other" if none)
function buildCategories(skills: ResumeSkill[]): SkillCategory[] {
  const order: string[] = [];
  const map: Record<string, SkillCategory> = {};
  for (const skill of skills) {
    const rawLabel = (skill.keywords && skill.keywords[0]) || "Other";
    const label = rawLabel.trim();
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!map[key]) {
      map[key] = { key, title: label, icon: chooseIcon(label), skills: [] };
      order.push(key);
    }
    map[key].skills.push(skill);
  }
  return order.map((k) => map[k]);
}

// With single-keyword categorization we have no extra keywords; keep function for future extension.
function deriveTools(
  _skills: ResumeSkill[],
  _categorized: SkillCategory[]
): string[] {
  return [];
}

function CategoryCard({
  category,
  index,
}: {
  category: SkillCategory;
  index: number;
}) {
  const { ref, controls } = useScrollAnimation();
  return (
    <motion.div
      ref={ref as any}
      initial={{ opacity: 0, y: 30, rotateX: -15 }}
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 30, rotateX: -15 },
        visible: {
          opacity: 1,
          y: 0,
          rotateX: 0,
          transition: {
            duration: 0.8,
            delay: index * 0.15,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      style={{ perspective: "1000px" }}
    >
      {/* Remove h-full so cards shrink to content; grid will no longer stretch items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <category.icon className="w-6 h-6 text-primary" />
            {category.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {category.skills.map((skill, skillIndex) => (
            <motion.div
              key={(skill.name || "skill") + skillIndex}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.15 + skillIndex * 0.08,
              }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 py-0.5">
                <span
                  className="text-sm font-medium flex-1 truncate"
                  title={skill.name}
                >
                  {skill.name}
                </span>
                <div className="w-28 flex justify-start">
                  <SkillSlots level={skill.level} />
                </div>
                {skill.level ? (
                  <span className="w-20 text-[10px] font-medium tracking-wide text-muted-foreground whitespace-nowrap capitalize text-right">
                    {skill.level}
                  </span>
                ) : (
                  <span className="w-20" />
                )}
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function Skills({
  skills,
  config,
}: {
  skills: ResumeSkill[];
  config: SiteConfigRoot;
}) {
  const categories = buildCategories(skills);
  const tools = deriveTools(skills, categories);

  return (
    <section id="skills" className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-12 group"
        >
          <h2 className="mb-4 inline-flex items-center gap-2">
            {config.sections?.skills?.title || "Skills & Technologies"}
            <SectionAnchor sectionId="skills" />
          </h2>
          {config.sections?.skills?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              {config.sections.skills.description}
            </p>
          )}
        </motion.div>

        {/* Category Grid (constrained width) */}
        <div className="mx-auto max-w-5xl columns-1 md:columns-2 gap-8 mb-16 [column-fill:balance]">
          {categories.map((cat, i) => (
            <div key={cat.key} className="mb-8 break-inside-avoid">
              <CategoryCard category={cat} index={i} />
            </div>
          ))}
        </div>

        {/* Tools & Platforms */}
        {tools.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Wrench className="w-6 h-6 text-primary" />
                  Tools & Platforms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {tools.map((tool, index) => (
                    <motion.div
                      key={tool}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                      viewport={{ once: true }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Badge variant="secondary" className="cursor-default">
                        {tool}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </section>
  );
}
