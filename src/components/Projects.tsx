import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ExternalLink } from 'lucide-react';
import { IconGitHub } from './icons/GitHub';
import { SectionAnchor } from './SectionAnchor';
import type { ResumeProject, SiteConfigRoot } from '../lib/types';
import { useState } from 'react';

export function Projects({
  projects,
  config,
}: {
  projects: ResumeProject[];
  config: SiteConfigRoot;
}) {
  const [showAll, setShowAll] = useState(false);
  const limit =
    (config.sections?.projects as any)?.['projects-visible-count'] ??
    (config.sections as any)?.['projects-visible-count'] ??
    6;
  const hasHidden = projects.length > limit;
  return (
    <section id="projects" className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16 group"
        >
          <h2 className="mb-4 inline-flex items-center gap-2">
            {config.sections?.projects?.title || 'Projects'}
            <SectionAnchor sectionId="projects" />
          </h2>
          {config.sections?.projects?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {config.sections.projects.description}
            </p>
          )}
        </motion.div>

        <div className="columns-1 lg:columns-2 xl:columns-3 gap-8 [column-fill:balance]">
          {projects.map((project, index) => {
            const isHidden = !showAll && index >= limit;
            return (
              <motion.div
                key={(project.name || '') + index}
                layout
                initial={{ opacity: 0, y: 50, rotateY: -15 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  rotateY: 0,
                  transition: {
                    duration: 0.8,
                    delay: index * 0.12,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  },
                }}
                viewport={{ once: true }}
                whileHover={{
                  y: -6,
                  scale: 1.015,
                  transition: { duration: 0.2 },
                }}
                animate={
                  isHidden
                    ? { opacity: 0, height: 0, marginBottom: 0, scale: 0.98 }
                    : { opacity: 1, height: 'auto', marginBottom: 32, scale: 1 }
                }
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                style={{ perspective: '1000px', overflow: 'hidden' }}
              >
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle>
                      <h3>{project.name}</h3>
                    </CardTitle>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {project.keywords?.map((kw) => (
                        <Badge key={kw} variant="outline" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                    {(project.url || project.codeUrl) && (
                      <div className="flex gap-2 pt-2">
                        {project.url && (
                          <Button size="sm" variant="outline" className="flex-1" asChild>
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${project.name} demo`}
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Demo</span>
                            </a>
                          </Button>
                        )}
                        {project.codeUrl && (
                          <Button size="sm" variant="outline" className="flex-1" asChild>
                            <a
                              href={project.codeUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${project.name} source code`}
                            >
                              <IconGitHub className="w-4 h-4" />
                              <span>Code</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        {!showAll && hasHidden && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setShowAll(true)}>
              Show all projects ({projects.length - limit} more)
            </Button>
          </div>
        )}
        {showAll && hasHidden && (
          <div className="flex justify-center mt-8">
            <Button variant="outline" onClick={() => setShowAll(false)}>
              Collapse projects
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
