import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Calendar,
  ExternalLink,
  GraduationCap,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { formatRange, parseDate } from "../lib/mappers";
import { mdToInlineHtml } from "../lib/markdown";
import type { ResumeCertificate, ResumeEducation, SiteConfigRoot } from "../lib/types";
import { useTouchGestures } from "./hooks/useTouchGestures";
import { SectionAnchor } from "./SectionAnchor";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ExtendedEducation extends ResumeEducation {
  _dates?: { start?: string; end?: string; ongoing?: boolean };
  _futureEnd?: boolean;
}

function EducationItem({
  edu,
  index,
  loading,
  config: _config,
}: {
  edu: ExtendedEducation;
  index: number;
  loading: Record<number, boolean>;
  config: SiteConfigRoot;
}) {
  // Hook must be at top level of component, not inside parent map callback
  const { touchHandlers } = useTouchGestures({ threshold: 30 });
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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.15 }}
      viewport={{ once: true }}
      className="group"
    >
      <Card
        className="h-full hover:shadow-lg transition-all duration-300 group-hover:border-primary/20 touch-manipulation"
        {...touchHandlers}
      >
        <CardHeader>
          <div className="flex items-start gap-3">
            <GraduationCap className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <h3>
                    {edu.studyType} in {edu.area}
                  </h3>
                  <p className="text-primary mt-1">{edu.institution}</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground sm:mt-1 whitespace-nowrap">
                  <Calendar className="w-4 h-4" />
                  <span>{period}</span>
                </div>
              </div>
              {edu.score && (
                <p className="text-xs text-muted-foreground mt-1">GPA: {edu.score}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {edu.achievements && edu.achievements.length > 0 && (
            <div className="space-y-2 mb-6">
              <h4 className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-primary" />
                Achievements
              </h4>
              <ul className="space-y-1 ml-6">
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
            <div className="space-y-2 mb-4">
              <p className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4" />
                Key Courses
              </p>
              <div className="flex flex-wrap gap-2">
                {edu.courses.map((course: string) => (
                  <Badge key={course} variant="outline" className="text-xs">
                    {course}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {loading[index] && (
            <div>
              <span className="sr-only">Loading</span>
            </div>
          )}
        </CardContent>
      </Card>
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
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16 group glass-panel rounded-xl py-8 px-6"
        >
          <h2 className="mb-4 inline-flex items-center gap-2">
            {config.sections?.education?.title || "Education"}
            <SectionAnchor sectionId="education" />
          </h2>
          {config.sections?.education?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {config.sections.education.description}
            </p>
          )}
        </motion.div>

        <div className="flex flex-col gap-8 max-w-4xl mx-auto mb-16">
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

        {certs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-primary" />
                  Professional Certifications
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
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
                                        className="h-7 text-xs px-2 py-1 font-normal"
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
                            onClick={() => setShowAllCerts(false)}
                          >
                            Collapse certifications
                          </Button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </section>
  );
}
