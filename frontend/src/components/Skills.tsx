import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Brain,
  Cloud,
  Code,
  Database,
  Layers3,
  Server,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import * as React from "react";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import type { ResumeSkill, SiteConfigRoot } from "../lib/types";
import { SectionAnchor } from "./SectionAnchor";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface SkillCategory {
  key: string;
  title: string;
  icon: LucideIcon;
  subtitle?: string;
  featured?: boolean;
  skills: ResumeSkill[];
}

interface CategoryStyle {
  border: string;
  glow: string;
  iconColor: string;
  dotColor: string;
  badge: string;
  spanClass: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  "llm-agents": {
    border: "border-accent-cyan/40 hover:border-accent-cyan/80",
    glow: "from-accent-cyan/15 via-accent-cyan/5 to-transparent",
    iconColor: "text-accent-cyan",
    dotColor: "bg-accent-cyan",
    badge: "border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan",
    spanClass: "md:col-span-12 lg:col-span-7",
  },
  "languages-frameworks": {
    border: "border-sky-500/30 hover:border-sky-500/70",
    glow: "from-sky-500/10 via-sky-500/5 to-transparent",
    iconColor: "text-sky-400",
    dotColor: "bg-sky-400",
    badge: "border-sky-500/40 bg-sky-500/10 text-sky-400",
    spanClass: "md:col-span-12 lg:col-span-5",
  },
  "machine-learning-ai": {
    border: "border-violet-500/30 hover:border-violet-500/70",
    glow: "from-violet-500/10 via-violet-500/5 to-transparent",
    iconColor: "text-violet-400",
    dotColor: "bg-violet-400",
    badge: "border-violet-500/40 bg-violet-500/10 text-violet-400",
    spanClass: "md:col-span-6 lg:col-span-4",
  },
  "data-engineering-analytics": {
    border: "border-emerald-500/30 hover:border-emerald-500/70",
    glow: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    iconColor: "text-emerald-400",
    dotColor: "bg-emerald-400",
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    spanClass: "md:col-span-6 lg:col-span-4",
  },
  "production-mlops": {
    border: "border-amber-500/30 hover:border-amber-500/70",
    glow: "from-amber-500/10 via-amber-500/5 to-transparent",
    iconColor: "text-amber-400",
    dotColor: "bg-amber-400",
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    spanClass: "md:col-span-12 lg:col-span-4",
  },
};

const DEFAULT_STYLE: CategoryStyle = {
  border: "border-border/50 hover:border-primary/40",
  glow: "from-primary/10 via-primary/5 to-transparent",
  iconColor: "text-primary",
  dotColor: "bg-primary",
  badge: "border-border bg-muted text-muted-foreground",
  spanClass: "md:col-span-6 lg:col-span-4",
};

function getIconByName(iconName: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    bot: Bot,
    sparkles: Sparkles,
    code: Code,
    brain: Brain,
    layers3: Layers3,
    database: Database,
    cloud: Cloud,
    server: Server,
    terminal: Terminal,
    wrench: Wrench,
  };
  return iconMap[iconName.toLowerCase()] || Wrench;
}

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
        subtitle: configCat.subtitle,
        featured: configCat.featured,
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
            icon: Wrench,
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
      map[key] = {
        key,
        title: label,
        icon: Wrench,
        skills: [],
      };
      order.push(key);
    }
    map[key].skills.push(skill);
  }
  return order.map((k) => map[k]);
}

function CategoryCard({
  category,
  index,
  isDimmed,
  isHighlighted,
}: {
  category: SkillCategory;
  index: number;
  isDimmed: boolean;
  isHighlighted: boolean;
}) {
  const { ref, controls } = useScrollAnimation();
  const style = CATEGORY_STYLES[category.key] || DEFAULT_STYLE;

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
      className={`h-full transition-all duration-300 ${
        isDimmed ? "opacity-35 scale-[0.98]" : "opacity-100"
      } ${
        isHighlighted
          ? "ring-2 ring-primary shadow-xl shadow-primary/10 scale-[1.01]"
          : ""
      }`}
    >
      <Card className="h-full flex flex-col bg-card/70 border border-border/70 hover:border-primary/40 transition-all duration-300 relative overflow-hidden group shadow-2xs hover:shadow-md">
        <CardHeader className="pb-3 border-b border-border/40 relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <category.icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
              <CardTitle className="text-base sm:text-lg font-semibold tracking-tight leading-snug">
                {category.title}
              </CardTitle>
            </div>

            <span className="text-xs font-mono text-muted-foreground font-normal px-2 py-0.5 rounded-full bg-muted/60 shrink-0 mt-0.5">
              {category.skills.length}
            </span>
          </div>

          {category.subtitle && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-sans font-normal">
              {category.subtitle}
            </p>
          )}
        </CardHeader>

        <CardContent className="pt-4 flex-1 relative z-10">
          <div className="flex flex-wrap gap-2">
            {category.skills.map((skill, skillIndex) => (
              <motion.span
                // biome-ignore lint/suspicious/noArrayIndexKey: fallback to index is required if skill name is missing
                key={(skill.name || "skill") + skillIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: skillIndex * 0.02 }}
                className="group/chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-background/60 hover:bg-background/90 hover:border-primary/40 transition-all duration-200 text-xs sm:text-sm font-medium text-foreground/90 shadow-2xs cursor-default"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${style.dotColor} opacity-75 group-hover/chip:opacity-100 transition-opacity`}
                />
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
  const categories = React.useMemo(
    () => buildCategories(skills, config),
    [skills, config],
  );
  const [activeFilter, setActiveFilter] = React.useState<string>("all");

  const filterOptions = React.useMemo(() => {
    return [
      { key: "all", label: "All Systems" },
      ...categories.map((c) => ({ key: c.key, label: c.title })),
    ];
  }, [categories]);

  return (
    <section id="skills" className="py-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "100px 0px" }}
          className="text-center mb-10 group max-w-3xl mx-auto"
        >
          <h2 className="mb-3 inline-flex items-center gap-2">
            {config.sections?.skills?.title || "Skills & Technologies"}
            <SectionAnchor sectionId="skills" />
          </h2>
          {config.sections?.skills?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {config.sections.skills.description}
            </p>
          )}
        </motion.div>

        {/* Quick Filter Pills */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-4xl mx-auto">
            {filterOptions.map((opt) => {
              const isActive = activeFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() =>
                    setActiveFilter(isActive && opt.key !== "all" ? "all" : opt.key)
                  }
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40"
                  }`}
                  aria-pressed={isActive}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Asymmetric Architectural Bento Grid */}
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6">
          {categories.map((cat, i) => {
            const style = CATEGORY_STYLES[cat.key] || DEFAULT_STYLE;
            const isDimmed = activeFilter !== "all" && activeFilter !== cat.key;
            const isHighlighted = activeFilter === cat.key;

            return (
              <div key={cat.key} className={style.spanClass}>
                <CategoryCard
                  category={cat}
                  index={i}
                  isDimmed={isDimmed}
                  isHighlighted={isHighlighted}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
