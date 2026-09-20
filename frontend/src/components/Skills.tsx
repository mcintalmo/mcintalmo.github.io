import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Brain, Cloud, Code, Layers3, Wrench } from "lucide-react";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import type { ResumeSkill, SiteConfigRoot } from "../lib/types";
import { SectionAnchor } from "./SectionAnchor";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
  if (/(data engineering|data\b|pipeline|etl|observability)/.test(l)) return Layers3;
  if (/(cloud|infrastructure)/.test(l)) return Cloud;
  if (/(tool|productivity|git)/.test(l)) return Wrench;
  return Wrench;
}

function getIconByName(iconName: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    code: Code,
    brain: Brain,
    layers3: Layers3,
    cloud: Cloud,
    wrench: Wrench,
  };
  return iconMap[iconName.toLowerCase()] || Wrench;
}

// Build categories from config or fallback to keyword-based grouping
function buildCategories(
  skills: ResumeSkill[],
  config: SiteConfigRoot,
): SkillCategory[] {
  const configCategories = config.sections?.skills?.categories;

  if (configCategories && Array.isArray(configCategories)) {
    const categoryMap: Record<string, SkillCategory> = {};
    const order: string[] = [];

    for (const configCat of configCategories) {
      const category: SkillCategory = {
        key: configCat.key,
        title: configCat.title,
        icon: getIconByName(configCat.icon),
        skills: [],
      };
      categoryMap[configCat.key] = category;
      order.push(configCat.key);
    }

    for (const skill of skills) {
      const skillKeywords = skill.keywords || [];
      let assigned = false;

      for (const configCat of configCategories) {
        const categoryKeywords = configCat.keywords || [];
        if (skillKeywords.some((sk) => categoryKeywords.includes(sk))) {
          categoryMap[configCat.key].skills.push(skill);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        const otherKey = "other";
        if (!categoryMap[otherKey]) {
          categoryMap[otherKey] = {
            key: otherKey,
            title: "Other Technologies",
            icon: chooseIcon("Other"),
            skills: [],
          };
          order.push(otherKey);
        }
        categoryMap[otherKey].skills.push(skill);
      }
    }

    return order.map((k) => categoryMap[k]).filter((cat) => cat.skills.length > 0);
  }

  const order: string[] = [];
  const map: Record<string, SkillCategory> = {};
  for (const skill of skills) {
    const rawLabel = skill.keywords?.[0] || "Other";
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

function CategoryCard({ category, index }: { category: SkillCategory; index: number }) {
  const { ref, controls } = useScrollAnimation();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            delay: index * 0.08,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      className="h-full"
    >
      <Card className="h-full flex flex-col glass-panel hover:border-primary/30 transition-colors duration-300">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg font-semibold tracking-tight">
            <span className="flex items-center gap-2.5">
              <category.icon className="w-5 h-5 text-primary" />
              {category.title}
            </span>
            <span className="text-xs font-mono text-muted-foreground font-normal px-2 py-0.5 rounded-full bg-muted/60">
              {category.skills.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex-1">
          <div className="flex flex-wrap gap-2">
            {category.skills.map((skill, skillIndex) => (
              <motion.span
                // biome-ignore lint/suspicious/noArrayIndexKey: fallback to index is required if skill name is missing
                key={(skill.name || "skill") + skillIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: skillIndex * 0.03 }}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 text-xs sm:text-sm font-medium text-foreground/90 shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan/70 group-hover:bg-primary transition-colors" />
                <span>{skill.name}</span>
              </motion.span>
            ))}
          </div>
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
  const categories = buildCategories(skills, config);

  return (
    <section id="skills" className="py-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "100px 0px" }}
          className="text-center mb-12 group glass-panel rounded-xl py-6 sm:py-8 px-4 sm:px-6 max-w-4xl mx-auto"
        >
          <h2 className="mb-4 inline-flex items-center gap-2">
            {config.sections?.skills?.title || "Skills & Technologies"}
            <SectionAnchor sectionId="skills" />
          </h2>
          {config.sections?.skills?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {config.sections.skills.description}
            </p>
          )}
        </motion.div>

        {/* Bento Grid layout */}
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat, i) => (
            <div key={cat.key}>
              <CategoryCard category={cat} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
