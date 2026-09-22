import { AnimatePresence, motion } from "framer-motion";
import { Award, BookOpen, Calendar, ExternalLink, Trophy } from "lucide-react";
import { useState } from "react";
import { formatRange, parseDate } from "../lib/mappers";
import { mdToInlineHtml } from "../lib/markdown";
import type { ResumeCertificate, ResumeEducation, SiteConfigRoot } from "../lib/types";
import { SectionAnchor } from "./SectionAnchor";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface ExtendedEducation extends ResumeEducation {
  _dates?: { start?: string; end?: string; ongoing?: boolean };
  _futureEnd?: boolean;
}

function EducationItem({
  edu,
  index,
  loading: _loading,
  config: _config,
}: {
  edu: ExtendedEducation;
  index: number;
  loading: Record<number, boolean>;
  config: SiteConfigRoot;
}) {
  const d = edu._dates;
  const futureEnd = edu._futureEnd;
  let period = "";
  if (d?.start) {
    if (d.end) period = `${d.start} - ${futureEnd ? `Expected ${d.end}` : d.end}`;
    else if (d.ongoing) period = `${d.start} - Present`;
    else period = d.start;
  } else if (d?.end) period = futureEnd ? `Expected ${d.end}` : d.end;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      viewport={{ once: true, margin: "100px 0px" }}
      className="relative py-3 mb-8 last:mb-0 group pointer-events-none pl-9 sm:pl-16 md:pl-24"
    >
      {/* Connector Line (Dashed) */}
      <div className="absolute top-[2.5625rem] h-0.5 border-t-2 border-dashed border-primary/20 group-hover:border-primary/50 transition-colors duration-300 left-4 w-5 sm:left-6 sm:w-10 md:left-8 md:w-16" />

      {/* Timeline dot */}
      <div className="absolute left-4 sm:left-6 md:left-8 w-4 h-4 sm:w-5 sm:h-5 bg-primary border-4 border-background rounded-full z-10 shadow-[0_0_10px_var(--color-primary)] transform -translate-x-1/2 top-8 group-hover:scale-125 group-hover:shadow-[0_0_18px_var(--color-primary)] transition-all duration-300 pointer-events-auto" />

      {/* Card Content */}
      <div className="pointer-events-auto p-5 sm:p-6 rounded-xl border border-border/70 bg-card/70 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
              {edu.studyType} in {edu.area}
            </h3>
            <p className="text-primary font-medium text-sm sm:text-base mt-0.5">
              {edu.institution}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground whitespace-nowrap sm:mt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{period}</span>
          </div>
        </div>

        {edu.score && (
          <p className="text-xs text-muted-foreground mb-3">GPA: {edu.score}</p>
        )}

        {edu.achievements && edu.achievements.length > 0 && (
          <div className="space-y-1.5 mb-4 mt-3">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              Achievements
            </h4>
            <ul className="space-y-1 ml-5">
              {edu.achievements.map((h: string, i: number) => (
                <motion.li
                  key={h}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: 0.15 + i * 0.07 }}
                  className="text-sm text-muted-foreground list-disc"
                >
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: rendering parsed inline markdown HTML is required for rich text formatting */}
                  <span dangerouslySetInnerHTML={{ __html: mdToInlineHtml(h) }} />
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {edu.courses && edu.courses.length > 0 && (
          <div className="space-y-1.5 mt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Key Courses
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {edu.courses.map((course: string) => (
                <Badge key={course} variant="outline" className="text-xs font-normal">
                  {course}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Education({
  education,
  certificates,
  config,
}: {
  education: ResumeEducation[];
  certificates: ResumeCertificate[];
  config: SiteConfigRoot;
}) {
  const dateFormat = config.content?.["date-format"] || "MMM yyyy";
  const certs = certificates.map((c) => ({
    ...c,
    _date: formatRange(c.date, undefined, dateFormat).start || c.date,
  }));
  const eduItems = education.map((e) => {
    const _dates = formatRange(e.startDate, e.endDate, dateFormat);
    const endParsed = parseDate(e.endDate);
    const _futureEnd = !!(endParsed && endParsed > new Date());
    return { ...e, _dates, _futureEnd } as ExtendedEducation;
  });

  const [loadingEducation] = useState<Record<number, boolean>>({});
  const [showAllCerts, setShowAllCerts] = useState(false);

  return (
    <section id="education" className="py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "100px 0px" }}
          className="text-center mb-12 group max-w-3xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 inline-flex items-center gap-2.5">
            {config.sections?.education?.title || "Education"}
            <SectionAnchor sectionId="education" />
          </h2>
          {config.sections?.education?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {config.sections.education.description}
            </p>
          )}
        </motion.div>

        {/* Vertical Single-Column Timeline Layout identical to Professional Experience */}
        <div className="relative mx-auto max-w-4xl mb-16">
          <div className="relative">
            {/* Left timeline line */}
            <div className="absolute left-4 sm:left-6 md:left-8 w-0.5 bg-border h-full" />

            {eduItems.map((edu, index) => (
              <EducationItem
                key={`${edu.institution || ""}-${edu.studyType || ""}-${edu.area || ""}`}
                edu={edu}
                index={index}
                loading={loadingEducation}
                config={config}
              />
            ))}
          </div>
        </div>

        {certs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: "100px 0px" }}
            className="max-w-4xl mx-auto mt-14"
          >
            <div className="flex items-center gap-2.5 mb-6 pb-2 border-b border-border/40">
              <Award className="w-5 h-5 text-primary" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                Professional Certifications
              </h3>
            </div>
            {(() => {
              const limit =
                config.sections?.certificates?.["certifications-visible-count"] ??
                ((config.sections as unknown as Record<string, unknown>)?.[
                  "certifications-visible-count"
                ] as number | undefined) ??
                5;
              const hasHidden = certs.length > limit;
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {certs.map((cert, index) => {
                      const isAlwaysVisible = index < limit;
                      return (
                        <AnimatePresence
                          key={`${cert.name || ""}-${cert.issuer || ""}-${cert.date || ""}`}
                          initial={false}
                        >
                          {(isAlwaysVisible || showAllCerts) && (
                            <motion.div
                              initial={
                                isAlwaysVisible
                                  ? false
                                  : {
                                      opacity: 0,
                                      height: 0,
                                      scale: 0.95,
                                    }
                              }
                              animate={{
                                opacity: 1,
                                height: "auto",
                                scale: 1,
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                                scale: 0.95,
                              }}
                              transition={{
                                duration: 0.45,
                                ease: [0.4, 0, 0.2, 1],
                              }}
                              style={{ overflow: "hidden" }}
                              className="group"
                            >
                              <div className="p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-all">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm">
                                        {cert.name}
                                      </h4>
                                      <p className="text-xs text-muted-foreground">
                                        {cert.issuer}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {cert._date}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {cert.keywords?.map((keyword, i) => (
                                    <motion.div
                                      key={keyword}
                                      initial={{ opacity: 0, scale: 0.85 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{
                                        duration: 0.25,
                                        delay: i * 0.04 + 0.15,
                                      }}
                                    >
                                      <Badge variant="secondary" className="text-xs">
                                        {keyword}
                                      </Badge>
                                    </motion.div>
                                  ))}
                                </div>
                                {cert.url && (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-11 sm:h-7 min-h-[44px] sm:min-h-0 text-xs px-3 sm:px-2 py-2 sm:py-1 font-normal"
                                  >
                                    <a
                                      href={cert.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`View credential for ${cert.name}`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>Credential</span>
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      );
                    })}
                  </div>
                  {!showAllCerts && hasHidden && (
                    <div className="flex justify-center mt-2">
                      <Button
                        variant="outline"
                        className="h-12 sm:h-10 min-h-[48px] sm:min-h-0 text-base sm:text-sm"
                        onClick={() => setShowAllCerts(true)}
                      >
                        Show all certifications ({certs.length - limit} more)
                      </Button>
                    </div>
                  )}
                  {showAllCerts && hasHidden && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        className="h-12 sm:h-10 min-h-[48px] sm:min-h-0 text-base sm:text-sm"
                        onClick={() => setShowAllCerts(false)}
                      >
                        Collapse certifications
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}
      </div>
    </section>
  );
}
