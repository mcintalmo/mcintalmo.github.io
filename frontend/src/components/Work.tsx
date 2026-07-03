import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronDown, Download, MapPin, Tag, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatRange, parseDate } from "../lib/mappers";
import { mdToInlineHtml } from "../lib/markdown";
import type { DateRange, ResumeWork, SiteConfigRoot } from "../lib/types";
import { useTouchGestures } from "./hooks/useTouchGestures";
import { Markdown } from "./Markdown";
import { SectionAnchor } from "./SectionAnchor";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Collapsible, CollapsibleContent } from "./ui/collapsible";

interface ExtendedExperience extends ResumeWork {
  _dates: DateRange;
  _hidden: boolean;
}

type Props = { work: ResumeWork[]; config: SiteConfigRoot };

export function Work({ work, config }: Props) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [showFullHistory, setShowFullHistory] = useState(false);

  const experiences = useMemo(() => {
    const dateFormat = config.content?.["date-format"] || "MMM yyyy";
    return [...(work || [])]
      .slice()
      .sort((a, b) => {
        const aEnd = a.endDate?.trim();
        const bEnd = b.endDate?.trim();
        const aOngoing = !aEnd; // treat missing end as ongoing/current
        const bOngoing = !bEnd;
        if (aOngoing && !bOngoing) return -1; // ongoing first
        if (!aOngoing && bOngoing) return 1;
        if (aOngoing && bOngoing) {
          // both ongoing: sort by startDate desc
          return (b.startDate || "").localeCompare(a.startDate || "");
        }
        // Both have end dates: parse and compare descending
        const aEndDate = parseDate(aEnd || "");
        const bEndDate = parseDate(bEnd || "");
        if (aEndDate && bEndDate) {
          if (bEndDate.getTime() !== aEndDate.getTime()) {
            return bEndDate.getTime() - aEndDate.getTime();
          }
        } else if (aEndDate && !bEndDate) {
          return -1; // valid dates before invalid
        } else if (!aEndDate && bEndDate) {
          return 1;
        }
        // fallback: startDate desc
        return (b.startDate || "").localeCompare(a.startDate || "");
      })
      .map((w) => ({
        ...w,
        _dates: formatRange(w.startDate, w.endDate, dateFormat),
      }));
  }, [work, config.content]);

  // Annotate experiences with hidden flag instead of slicing list (prevents large re-mount flashes)
  const { annotatedExperiences, hiddenCount } = useMemo(() => {
    const rawYears =
      config.sections?.work?.["history-visible-years"] ??
      (config.sections as Record<string, unknown> | undefined)?.[
        "history-visible-years"
      ];
    const years =
      typeof rawYears === "string"
        ? parseInt(rawYears, 10)
        : typeof rawYears === "number"
          ? rawYears
          : undefined;
    if (!years || years <= 0) {
      const list: ExtendedExperience[] = experiences.map((e) => ({
        ...e,
        _hidden: false,
      }));
      return {
        annotatedExperiences: list,
        hiddenCount: 0,
      };
    }
    const now = new Date();
    const cutoffYear = now.getFullYear() - years;
    let hiddenCounter = 0;
    const list: ExtendedExperience[] = experiences.map((exp) => {
      const refDateStr = exp.endDate?.trim() || exp.startDate?.trim();
      let year: number | null = null;
      if (refDateStr) {
        const parsed = parseDate(refDateStr);
        if (parsed) year = parsed.getFullYear();
      }
      const tooOld = !(year === null || year >= cutoffYear); // null (unknown) treated as visible
      if (tooOld) hiddenCounter++;
      return { ...exp, _hidden: tooOld };
    });
    return { annotatedExperiences: list, hiddenCount: hiddenCounter };
  }, [experiences, config.sections]);

  const visibleCount = useMemo(() => {
    return annotatedExperiences.filter((exp) => !exp._hidden).length;
  }, [annotatedExperiences]);

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <section id="experience" className="py-20">
      <div className="container mx-auto px-6">
        {/* Banner layout for Header + Download Resume Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 glass-panel rounded-xl py-6 px-8 gap-4 text-left"
        >
          <div>
            <h2 className="mb-2 inline-flex items-center gap-2">
              {config.sections?.work?.title || "Work Experience"}
              <SectionAnchor sectionId="experience" />
            </h2>
            {config.sections?.work?.description && (
              <p className="text-muted-foreground max-w-2xl">
                {config.sections.work.description}
              </p>
            )}
          </div>

          <a href="/downloads/McIntosh_Alexander_Resume.pdf" download tabIndex={-1} className="flex-shrink-0">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg w-full md:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Resume
            </Button>
          </a>
        </motion.div>

        {/* Vertical Single-Column Timeline Layout */}
        <div className="relative mx-auto max-w-4xl">
          {/* Cards + timeline wrapper so line does NOT include the toggle button height */}
          <div className="relative">
            {/* Left timeline line */}
            <div className="absolute left-6 md:left-8 w-0.5 bg-border h-full" />

            {/* Always visible cards */}
            {annotatedExperiences
              .filter((exp) => !exp._hidden)
              .map((exp: ExtendedExperience, index: number) => {
                const hasDetails =
                  (Array.isArray(exp.highlights) && exp.highlights.length > 0) ||
                  !!exp.summary;

                const d = exp._dates;
                const period = `${d.start || ""}${
                  d.end ? ` - ${d.end}` : d.start && d.ongoing ? " - Present" : ""
                }`;
                const key = `${exp.name || exp.position || "role"}-${
                  exp.startDate || ""
                }-${exp.endDate || ""}-${index}`;

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{
                      duration: 0.8,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="relative py-3 will-change-transform mb-8 last:mb-0 group pointer-events-none pl-16 md:pl-24"
                  >
                    {/* Connector Line (Dashed) */}
                    <div className="absolute top-[2.5625rem] h-0.5 border-t-2 border-dashed border-primary/20 group-hover:border-primary/50 transition-colors duration-300 left-6 w-10 md:left-8 md:w-16" />

                    {/* Timeline dot */}
                    <div className="absolute left-6 md:left-8 w-5 h-5 bg-primary border-4 border-background rounded-full z-10 shadow-[0_0_10px_var(--color-primary)] transform -translate-x-1/2 top-8 group-hover:scale-125 group-hover:shadow-[0_0_18px_var(--color-primary)] transition-all duration-300 pointer-events-auto" />

                    <ExperienceCard
                      exp={exp}
                      index={index}
                      hasDetails={hasDetails}
                      expanded={expandedItems[index]}
                      toggleExpanded={toggleExpanded}
                      period={period}
                    />
                  </motion.div>
                );
              })}

            {/* History cards container */}
            <AnimatePresence initial={false}>
              {showFullHistory && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
                  transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1] }}
                  className="overflow-hidden relative w-full"
                >
                  {annotatedExperiences
                    .filter((exp) => exp._hidden)
                    .map((exp: ExtendedExperience, localIndex: number) => {
                      const index = visibleCount + localIndex;
                      const hasDetails =
                        (Array.isArray(exp.highlights) && exp.highlights.length > 0) ||
                        !!exp.summary;

                      const d = exp._dates;
                      const period = `${d.start || ""}${
                        d.end ? ` - ${d.end}` : d.start && d.ongoing ? " - Present" : ""
                      }`;
                      const key = `${exp.name || exp.position || "role"}-${
                        exp.startDate || ""
                      }-${exp.endDate || ""}-${index}`;

                      return (
                        <div
                          key={key}
                          className="relative py-3 will-change-transform mb-8 last:mb-0 group pointer-events-none pl-16 md:pl-24"
                        >
                          {/* Connector Line (Dashed) */}
                          <motion.div
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            transition={{
                              duration: 0.4,
                              ease: [0.25, 1, 0.5, 1],
                              delay: localIndex * 0.35 + 0.15,
                            }}
                            style={{ originX: 0 }}
                            className="absolute top-[2.5625rem] h-0.5 border-t-2 border-dashed border-primary/20 group-hover:border-primary/50 transition-colors duration-300 left-6 w-10 md:left-8 md:w-16"
                          />

                          {/* Timeline dot */}
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 200,
                              damping: 15,
                              delay: localIndex * 0.35,
                            }}
                            className="absolute left-6 md:left-8 w-5 h-5 bg-primary border-4 border-background rounded-full z-10 shadow-[0_0_10px_var(--color-primary)] transform -translate-x-1/2 top-8 group-hover:scale-125 group-hover:shadow-[0_0_18px_var(--color-primary)] transition-all duration-300 pointer-events-auto"
                          />

                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.6,
                              ease: "easeOut",
                              delay: localIndex * 0.35 + 0.2,
                            }}
                          >
                            <ExperienceCard
                              exp={exp}
                              index={index}
                              hasDetails={hasDetails}
                              expanded={expandedItems[index]}
                              toggleExpanded={toggleExpanded}
                              period={period}
                            />
                          </motion.div>
                        </div>
                      );
                    })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!showFullHistory && hiddenCount > 0 && (
            <div className="flex justify-center mt-0">
              <Button variant="outline" onClick={() => setShowFullHistory(true)}>
                Show full history ({hiddenCount} more{" "}
                {hiddenCount === 1 ? "role" : "roles"})
              </Button>
            </div>
          )}
          {showFullHistory && hiddenCount > 0 && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  // Scroll back to top of section smoothly when collapsing
                  const el = document.getElementById("experience");
                  setShowFullHistory(false);
                  if (el) {
                    setTimeout(() => {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }
                }}
              >
                Collapse history
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Child components to keep hooks at top level and satisfy rules-of-hooks
type ExperienceCardCommon = {
  exp: ExtendedExperience;
  index: number;
  hasDetails: boolean;
  expanded: boolean;
  toggleExpanded: (i: number) => void;
  period: string;
};

function getCompanyLogo(companyUrl?: string): string | null {
  if (companyUrl) {
    try {
      const url = new URL(companyUrl);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
    } catch {
      // ignore
    }
  }
  return null;
}

function ExperienceCard({
  exp,
  index,
  hasDetails,
  expanded,
  toggleExpanded,
  period,
}: ExperienceCardCommon) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { touchHandlers } = useTouchGestures({
    onSwipeUp: () => !expanded && hasDetails && toggleExpanded(index),
    onSwipeDown: () => expanded && hasDetails && toggleExpanded(index),
    threshold: 30,
  });

  useEffect(() => {
    if (expanded && cardRef.current) {
      const timer = setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 150); // delay to let height transition begin
      return () => clearTimeout(timer);
    }
  }, [expanded]);

  const logoUrl = getCompanyLogo(exp.url);
  return (
    <div ref={cardRef} className="pointer-events-auto w-full">
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className="group"
      >
        <Collapsible
          open={hasDetails ? !!expanded : false}
          onOpenChange={() => hasDetails && toggleExpanded(index)}
        >
          <Card
            className={
              "hover:shadow-lg transition-all duration-300 group-hover:border-primary/20 touch-manipulation " +
              (hasDetails ? "cursor-pointer" : "cursor-default")
            }
            onClick={() => hasDetails && toggleExpanded(index)}
            role={hasDetails ? "button" : undefined}
            tabIndex={hasDetails ? 0 : -1}
            aria-expanded={hasDetails ? !!expanded : undefined}
            aria-label={`${expanded ? "Collapse" : "Expand"} details for ${exp.position || "role"} at ${
              exp.name || "company"
            }`}
            onKeyDown={(e) => {
              if (hasDetails && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                toggleExpanded(index);
              }
            }}
            {...touchHandlers}
          >
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex gap-4 items-start">
                  {logoUrl && (
                    <div className="w-12 h-12 rounded-lg bg-white border border-border/80 flex items-center justify-center overflow-hidden flex-shrink-0 p-1.5 shadow-sm">
                      <img
                        src={logoUrl}
                        alt={`${exp.name || "Company"} logo`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  <CardTitle>
                    {exp.position && <h3>{exp.position}</h3>}
                    {exp.name && <p className="text-primary mt-1">{exp.name}</p>}
                  </CardTitle>
                </div>
                <span className="flex items-center gap-1 text-sm text-muted-foreground sm:mt-1 whitespace-nowrap">
                  <Calendar className="w-4 h-4" />
                  {period}
                </span>
              </div>
              {exp.location && (
                <CardDescription className="flex items-center gap-1 mt-2">
                  <MapPin className="w-4 h-4" />
                  {exp.location}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {exp.description && (
                <div className="mb-4 text-muted-foreground">
                  <Markdown>{exp.description}</Markdown>
                </div>
              )}
              {hasDetails && (
                <div className="w-full flex items-center justify-between p-0 h-auto">
                  <span className="text-sm text-primary group-hover:text-primary/80 transition-colors">
                    {expanded ? "Show less details" : "Show more details"}
                  </span>
                  <motion.div
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="text-muted-foreground group-hover:text-primary transition-colors duration-200"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </div>
              )}
              {hasDetails && (
                <CollapsibleContent forceMount>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                        className="overflow-hidden space-y-6 mt-4 pt-2"
                      >
                        {exp.highlights && exp.highlights.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="space-y-2"
                          >
                            <h4 className="flex items-center gap-2 text-sm font-medium">
                              <Trophy className="w-4 h-4 text-primary" />
                              Achievements
                            </h4>
                            <ul className="space-y-1 ml-6">
                              {exp.highlights.map((h: string, i: number) => {
                                return (
                                  <motion.li
                                    key={h}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                      duration: 0.3,
                                      delay: 0.2 + i * 0.05,
                                    }}
                                    className="text-sm text-muted-foreground list-disc"
                                  >
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: mdToInlineHtml(h),
                                      }}
                                    />
                                  </motion.li>
                                );
                              })}
                            </ul>
                          </motion.div>
                        )}
                        {exp.summary && (
                          <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="space-y-2"
                          >
                            <h4 className="flex items-center gap-2 text-sm font-medium">
                              Summary
                            </h4>
                            <div className="text-sm text-muted-foreground leading-relaxed">
                              <Markdown>{exp.summary}</Markdown>
                            </div>
                          </motion.div>
                        )}
                        {exp.keywords && exp.keywords.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                            className="space-y-2"
                          >
                            <h4 className="flex items-center gap-2 text-sm font-medium">
                              <Tag className="w-4 h-4 text-primary" />
                              Technologies
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {exp.keywords.map((kw: string) => (
                                <Badge key={kw} variant="outline" className="text-xs">
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CollapsibleContent>
              )}
            </CardContent>
          </Card>
        </Collapsible>
      </motion.div>
    </div>
  );
}

