import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { LoadingSkeleton } from './ui/loading-skeleton';
import { useTouchGestures } from './hooks/useTouchGestures';
import { Calendar, MapPin, Download, ChevronDown, Trophy, Target, Tag } from 'lucide-react';
import { SectionAnchor } from './SectionAnchor';

import type { ResumeWork, SiteConfigRoot } from '../lib/types';
import { formatRange, parseDate } from '../lib/mappers';

type Props = { work: ResumeWork[]; config: SiteConfigRoot };

export function Work({ work, config }: Props) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [loadingItems, setLoadingItems] = useState<Record<number, boolean>>({});
  const [showFullHistory, setShowFullHistory] = useState(false);

  const experiences = useMemo(() => {
    const dateFormat = config.content?.['date-format'] || 'MMM yyyy';
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
          return (b.startDate || '').localeCompare(a.startDate || '');
        }
        // Both have end dates: parse and compare descending
        const aEndDate = parseDate(aEnd || '');
        const bEndDate = parseDate(bEnd || '');
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
        return (b.startDate || '').localeCompare(a.startDate || '');
      })
      .map((w) => ({
        ...w,
        _dates: formatRange(w.startDate, w.endDate, dateFormat),
      }));
  }, [work, config.content]);

  // Annotate experiences with hidden flag instead of slicing list (prevents large re-mount flashes)
  const { annotatedExperiences, hiddenCount } = useMemo(() => {
    const rawYears: any =
      (config.sections?.work as any)?.['history-visible-years'] ??
      (config.sections as any)?.['history-visible-years'];
    const years = typeof rawYears === 'string' ? parseInt(rawYears, 10) : rawYears;
    if (!years || years <= 0) {
      return {
        annotatedExperiences: experiences.map((e) => ({
          ...e,
          _hidden: false,
        })),
        hiddenCount: 0,
      };
    }
    const now = new Date();
    const cutoffYear = now.getFullYear() - years;
    let hiddenCounter = 0;
    const list = experiences.map((exp) => {
      const refDateStr = exp.endDate?.trim() || exp.startDate?.trim();
      let year: number | null = null;
      if (refDateStr) {
        const parsed = parseDate(refDateStr);
        if (parsed) year = parsed.getFullYear();
      }
      const tooOld = !(year === null || year >= cutoffYear); // null (unknown) treated as visible
      if (tooOld) hiddenCounter++;
      return { ...exp, _hidden: tooOld } as any;
    });
    return { annotatedExperiences: list, hiddenCount: hiddenCounter };
  }, [experiences, config.sections]);

  const toggleExpanded = (index: number) => {
    if (!expandedItems[index]) {
      // Show loading state when expanding
      setLoadingItems((prev) => ({ ...prev, [index]: true }));

      // Simulate content loading with a brief delay
      setTimeout(() => {
        setLoadingItems((prev) => ({ ...prev, [index]: false }));
        setExpandedItems((prev) => ({
          ...prev,
          [index]: !prev[index],
        }));
      }, 300);
    } else {
      // Collapse immediately
      setExpandedItems((prev) => ({
        ...prev,
        [index]: !prev[index],
      }));
    }
  };

  return (
    <section id="experience" className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16 group"
        >
          <h2 className="mb-4 inline-flex items-center gap-2">
            {config.sections?.work?.title || 'Work Experience'}
            <SectionAnchor sectionId="experience" />
          </h2>
          {config.sections?.work?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              {config.sections.work.description}
            </p>
          )}

          {/* Download Resume Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <a href="/downloads/McIntosh_Alexander_Resume.pdf" download tabIndex={-1}>
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Resume
              </Button>
            </a>
          </motion.div>
        </motion.div>

        {/* Expanded width to align with other sections (Skills, Contact) */}
        <div className="relative mx-auto max-w-5xl lg:max-w-6xl">
          {/* Cards + timeline wrapper so line does NOT include the toggle button height */}
          <div className="relative">
            <div className="absolute left-6 md:left-1/2 md:transform md:-translate-x-1/2 w-0.5 bg-border h-full" />

            {annotatedExperiences.map((exp: any, index: number) => {
              const hasDetails =
                (Array.isArray(exp.highlights) && exp.highlights.length > 0) ||
                (Array.isArray((exp as any).responsibilities) &&
                  (exp as any).responsibilities.length > 0) ||
                !!exp.summary;

              const d = (exp as any)._dates;
              const period = `${d.start || ''}${
                d.end ? ` - ${d.end}` : d.start && d.ongoing ? ' - Present' : ''
              }`;
              const key = `${exp.name || exp.position || 'role'}-${
                exp.startDate || ''
              }-${exp.endDate || ''}-${index}`;
              const isHidden = exp._hidden && !showFullHistory;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  animate={isHidden ? { opacity: 0, y: 20, height: 0 } : undefined}
                  transition={{
                    duration: 0.65,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: index * 0.08,
                  }}
                  className={
                    'relative overflow-hidden will-change-transform ' +
                    (isHidden ? 'mb-0' : 'mb-12 last:mb-0')
                  }
                >
                  {/* Timeline dot - positioned for mobile first, then desktop */}
                  <div className="absolute left-6 md:left-1/2 md:transform md:-translate-x-1/2 w-4 h-4 bg-primary border-4 border-background rounded-full z-10 shadow-sm transform -translate-x-1/2" />

                  {/* Mobile Layout: All items on the right side */}
                  <MobileExperienceCard
                    exp={exp}
                    index={index}
                    hasDetails={hasDetails}
                    expanded={expandedItems[index]}
                    loading={loadingItems[index]}
                    toggleExpanded={toggleExpanded}
                    period={period}
                  />

                  {/* Desktop Layout: Alternating sides */}
                  <div className="hidden md:flex md:items-center">
                    <div
                      className={`w-full flex ${
                        index % 2 === 0 ? 'justify-start pr-8' : 'justify-end pl-8'
                      }`}
                    >
                      {/* Slightly wider cards to use added horizontal space */}
                      <DesktopExperienceCard
                        exp={exp}
                        index={index}
                        hasDetails={hasDetails}
                        expanded={expandedItems[index]}
                        loading={loadingItems[index]}
                        toggleExpanded={toggleExpanded}
                        period={period}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {/* Toggle Button (no gradient) */}
          </div>
          {!showFullHistory && hiddenCount > 0 && (
            <div className="flex justify-center mt-0">
              <Button variant="outline" onClick={() => setShowFullHistory(true)}>
                Show full history ({hiddenCount} more {hiddenCount === 1 ? 'role' : 'roles'})
              </Button>
            </div>
          )}
          {showFullHistory && hiddenCount > 0 && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  // Scroll back to top of section smoothly when collapsing
                  const el = document.getElementById('experience');
                  setShowFullHistory(false);
                  if (el) {
                    setTimeout(() => {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  exp: any;
  index: number;
  hasDetails: boolean;
  expanded: boolean;
  loading: boolean;
  toggleExpanded: (i: number) => void;
  period: string;
};

function MobileExperienceCard({
  exp,
  index,
  hasDetails,
  expanded,
  loading,
  toggleExpanded,
  period,
}: ExperienceCardCommon) {
  const { touchHandlers } = useTouchGestures({
    onSwipeUp: () => !expanded && hasDetails && toggleExpanded(index),
    onSwipeDown: () => expanded && hasDetails && toggleExpanded(index),
    threshold: 30,
  });
  return (
    <div className="md:hidden ml-16">
      <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="group">
        <Collapsible
          open={hasDetails ? expanded : false}
          onOpenChange={() => hasDetails && toggleExpanded(index)}
        >
          <Card
            className={
              'hover:shadow-lg transition-all duration-300 group-hover:border-primary/20 touch-manipulation ' +
              (hasDetails ? 'cursor-pointer' : 'cursor-default')
            }
            onClick={() => hasDetails && !loading && toggleExpanded(index)}
            role={hasDetails ? 'button' : undefined}
            tabIndex={hasDetails ? 0 : -1}
            aria-expanded={hasDetails ? expanded : undefined}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${exp.position || 'role'} at ${
              exp.name || 'company'
            }`}
            onKeyDown={(e) => {
              if (hasDetails && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                if (!loading) toggleExpanded(index);
              }
            }}
            {...touchHandlers}
          >
            <CardHeader>
              <div className="flex justify-between items-start gap-4">
                <CardTitle>
                  {exp.position && <h3>{exp.position}</h3>}
                  {(exp.name || (exp as any).company) && (
                    <p className="text-primary mt-1">{exp.name || (exp as any).company}</p>
                  )}
                </CardTitle>
                <span className="flex items-center gap-1 text-sm text-muted-foreground mt-1 whitespace-nowrap">
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
              {exp.description && <p className="mb-4 text-muted-foreground">{exp.description}</p>}
              {hasDetails && (
                <div className="w-full flex items-center justify-between p-0 h-auto">
                  <span className="text-sm text-primary group-hover:text-primary/80 transition-colors">
                    {loading
                      ? 'Loading details...'
                      : expanded
                        ? 'Show less details'
                        : 'Show more details'}
                  </span>
                  <motion.div
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="text-muted-foreground group-hover:text-primary transition-colors duration-200"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </div>
              )}
              {hasDetails && loading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <LoadingSkeleton lines={4} showBadges={true} />
                </motion.div>
              )}
              {hasDetails && (
                <CollapsibleContent className="space-y-6 mt-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    className="space-y-6"
                  >
                    {exp.highlights && exp.highlights.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-sm font-medium">
                          <Trophy className="w-4 h-4 text-primary" />
                          Achievements
                        </h4>
                        <ul className="space-y-1 ml-6">
                          {exp.highlights.map((h: string, i: number) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.08 }}
                              className="text-sm text-muted-foreground list-disc"
                            >
                              {h}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(exp as any).responsibilities && (exp as any).responsibilities.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-sm font-medium">
                          <Target className="w-4 h-4 text-primary" />
                          Responsibilities
                        </h4>
                        <ul className="space-y-1 ml-6">
                          {(exp as any).responsibilities.map((r: string, i: number) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.06 }}
                              className="text-sm text-muted-foreground list-disc"
                            >
                              {r}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {exp.summary && (
                      <div className="space-y-2">
                        <h4 className="flex items-center gap-2 text-sm font-medium">Summary</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {exp.summary}
                        </p>
                      </div>
                    )}
                    {exp.keywords && exp.keywords.length > 0 && (
                      <div className="space-y-2">
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
                      </div>
                    )}
                  </motion.div>
                </CollapsibleContent>
              )}
            </CardContent>
          </Card>
        </Collapsible>
      </motion.div>
    </div>
  );
}

function DesktopExperienceCard({
  exp,
  index,
  hasDetails,
  expanded,
  loading,
  toggleExpanded,
  period,
}: ExperienceCardCommon) {
  const { touchHandlers } = useTouchGestures({
    onSwipeUp: () => !expanded && hasDetails && toggleExpanded(index),
    onSwipeDown: () => expanded && hasDetails && toggleExpanded(index),
    threshold: 30,
  });
  return (
    <motion.div
      className="w-[46%] group"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Collapsible
        open={hasDetails ? expanded : false}
        onOpenChange={() => hasDetails && toggleExpanded(index)}
      >
        <Card
          className={
            'hover:shadow-lg transition-all duration-300 group-hover:border-primary/20 touch-manipulation ' +
            (hasDetails ? 'cursor-pointer' : 'cursor-default')
          }
          onClick={() => hasDetails && !loading && toggleExpanded(index)}
          role={hasDetails ? 'button' : undefined}
          tabIndex={hasDetails ? 0 : -1}
          aria-expanded={hasDetails ? expanded : undefined}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${exp.position || 'role'} at ${
            exp.name || 'company'
          }`}
          onKeyDown={(e) => {
            if (hasDetails && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              if (!loading) toggleExpanded(index);
            }
          }}
          {...touchHandlers}
        >
          <CardHeader>
            <div className="flex justify-between items-start gap-6">
              <CardTitle>
                {exp.position && <h3>{exp.position}</h3>}
                {exp.name && <p className="text-primary mt-1">{exp.name}</p>}
              </CardTitle>
              <span className="flex items-center gap-1 text-sm text-muted-foreground mt-1 whitespace-nowrap">
                <Calendar className="w-4 h-4" />
                {period}
              </span>
            </div>
            {exp.location && (
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {exp.location}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {exp.description && <p className="mb-4 text-muted-foreground">{exp.description}</p>}
            {hasDetails && (
              <div className="w-full flex items-center justify-between p-0 h-auto">
                <span className="text-sm text-primary group-hover:text-primary/80 transition-colors">
                  {loading
                    ? 'Loading details...'
                    : expanded
                      ? 'Show less details'
                      : 'Show more details'}
                </span>
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="text-muted-foreground group-hover:text-primary transition-colors duration-200"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </div>
            )}
            {hasDetails && loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="mt-4"
              >
                <LoadingSkeleton lines={4} showBadges={true} />
              </motion.div>
            )}
            {hasDetails && (
              <CollapsibleContent className="space-y-6 mt-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className="space-y-6"
                >
                  {exp.highlights && exp.highlights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2 text-sm font-medium">
                        <Trophy className="w-4 h-4 text-primary" />
                        Achievements
                      </h4>
                      <ul className="space-y-1 ml-6">
                        {exp.highlights.map((h: string, i: number) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.08 }}
                            className="text-sm text-muted-foreground list-disc"
                          >
                            {h}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(exp as any).responsibilities && (exp as any).responsibilities.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2 text-sm font-medium">
                        <Target className="w-4 h-4 text-primary" />
                        Responsibilities
                      </h4>
                      <ul className="space-y-1 ml-6">
                        {(exp as any).responsibilities.map((r: string, i: number) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.06 }}
                            className="text-sm text-muted-foreground list-disc"
                          >
                            {r}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {exp.summary && (
                    <div className="space-y-2">
                      <h4 className="flex items-center gap-2 text-sm font-medium">Summary</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{exp.summary}</p>
                    </div>
                  )}
                  {exp.keywords && exp.keywords.length > 0 && (
                    <div className="space-y-2">
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
                    </div>
                  )}
                </motion.div>
              </CollapsibleContent>
            )}
          </CardContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
}
