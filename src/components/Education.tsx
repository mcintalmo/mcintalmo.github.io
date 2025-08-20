import { motion } from 'framer-motion';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useTouchGestures } from './hooks/useTouchGestures';
import { GraduationCap, Award, BookOpen, Trophy, Calendar, ExternalLink } from 'lucide-react';
import { SectionAnchor } from './SectionAnchor';
import type { ResumeCertificate, ResumeEducation, SiteConfigRoot } from '../lib/types';
import { formatRange, parseDate } from '../lib/mappers';

function EducationItem({
  edu,
  index,
  loading,
  config: _config,
}: {
  edu: any;
  index: number;
  loading: Record<number, boolean>;
  config: SiteConfigRoot;
}) {
  // Hook must be at top level of component, not inside parent map callback
  const { touchHandlers } = useTouchGestures({ threshold: 30 });
  const d = (edu as any)._dates;
  const futureEnd = (edu as any)._futureEnd as boolean | undefined;
  let period = '';
  if (d?.start) {
    if (d.end) period = `${d.start} - ${futureEnd ? `Expected ${d.end}` : d.end}`;
    else if (d.ongoing) period = `${d.start} - Present`;
    else period = d.start;
  } else if (d?.end) period = futureEnd ? `Expected ${d.end}` : d.end;
  return (
    <motion.div
      key={index}
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
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3>
                    {edu.studyType} in {edu.area}
                  </h3>
                  <p className="text-primary mt-1">{edu.institution}</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5 whitespace-nowrap">
                  <Calendar className="w-4 h-4" />
                  <span>{period}</span>
                </div>
              </div>
              {edu.score && <p className="text-xs text-muted-foreground mt-1">GPA: {edu.score}</p>}
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
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.15 + i * 0.07 }}
                    className="text-sm text-muted-foreground list-disc"
                  >
                    {h}
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
  const dateFormat = config.content?.['date-format'] || 'MMM yyyy';
  const certs = certificates.map((c) => ({
    ...c,
    _date: formatRange(c.date, undefined, dateFormat).start || c.date,
  }));
  const eduItems = education.map((e) => {
    const _dates = formatRange(e.startDate, e.endDate, dateFormat);
    const endParsed = parseDate(e.endDate);
    const _futureEnd = !!(endParsed && endParsed > new Date());
    return { ...e, _dates, _futureEnd } as any;
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
          className="text-center mb-16 group"
        >
          <h2 className="mb-4 inline-flex items-center gap-2">
            {config.sections?.education?.title || 'Education'}
            <SectionAnchor sectionId="education" />
          </h2>
          {config.sections?.education?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {config.sections.education.description}
            </p>
          )}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {eduItems.map((edu, index) => (
            <EducationItem
              key={index}
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
                    (config.sections?.certificates as any)?.['certifications-visible-count'] ??
                    (config.sections as any)?.['certifications-visible-count'] ??
                    5;
                  const hasHidden = certs.length > limit;
                  return (
                    <>
                      <div className="columns-1 sm:columns-2 gap-4 [column-fill:balance]">
                        {certs.map((cert, index) => {
                          const isHidden = !showAllCerts && index >= limit;
                          return (
                            <motion.div
                              key={(cert.name || '') + index}
                              layout
                              initial={false}
                              animate={
                                isHidden
                                  ? {
                                      opacity: 0,
                                      height: 0,
                                      marginBottom: 0,
                                      scale: 0.96,
                                    }
                                  : {
                                      opacity: 1,
                                      height: 'auto',
                                      marginBottom: 16,
                                      scale: 1,
                                    }
                              }
                              transition={{
                                duration: 0.45,
                                ease: [0.4, 0, 0.2, 1],
                              }}
                              style={{ overflow: 'hidden' }}
                              className="group break-inside-avoid"
                            >
                              <div className="p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-all">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm">{cert.name}</h4>
                                      <p className="text-xs text-muted-foreground">{cert.issuer}</p>
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
                          );
                        })}
                      </div>
                      {!showAllCerts && hasHidden && (
                        <div className="flex justify-center mt-2">
                          <Button variant="outline" onClick={() => setShowAllCerts(true)}>
                            Show all certifications ({certs.length - limit} more)
                          </Button>
                        </div>
                      )}
                      {showAllCerts && hasHidden && (
                        <div className="flex justify-center mt-6">
                          <Button variant="outline" onClick={() => setShowAllCerts(false)}>
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
