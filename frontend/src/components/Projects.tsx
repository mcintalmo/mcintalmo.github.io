import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import type { ResumeProject, SiteConfigRoot } from "../lib/types";
import Markdown from "./Markdown";
import { SectionAnchor } from "./SectionAnchor";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Github } from "./ui/icons";

export function Projects({
  projects,
  config,
}: {
  projects: ResumeProject[];
  config: SiteConfigRoot;
}) {
  const [showAll, setShowAll] = useState(false);
  const limit =
    config.sections?.projects?.["projects-visible-count"] ??
    ((config.sections as unknown as Record<string, unknown>)?.[
      "projects-visible-count"
    ] as number | undefined) ??
    6;
  const hasHidden = projects.length > limit;
  return (
    <section id="projects" className="py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "100px 0px" }}
          className="text-center mb-12 group max-w-3xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 inline-flex items-center gap-2.5">
            {config.sections?.projects?.title || "Projects"}
            <SectionAnchor sectionId="projects" />
          </h2>
          {config.sections?.projects?.description && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {config.sections.projects.description}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => {
            const isHidden = !showAll && index >= limit;
            return (
              <motion.div
                key={`project-${project.name || ""}`}
                layout
                initial={{ opacity: 0, y: 30 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.6,
                    delay: index * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  },
                }}
                viewport={{ once: true, margin: "100px 0px" }}
                whileHover={{
                  y: -6,
                  scale: 1.015,
                  transition: { duration: 0.2 },
                }}
                animate={
                  isHidden
                    ? {
                        opacity: 0,
                        height: 0,
                        overflow: "hidden",
                        display: "none",
                        scale: 0.98,
                      }
                    : {
                        opacity: 1,
                        height: "auto",
                        overflow: "visible",
                        display: "flex",
                        scale: 1,
                      }
                }
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                className="h-full flex flex-col"
              >
                <Card className="h-full flex flex-col overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <CardHeader className="flex-1">
                    <CardTitle>
                      <h3>{project.name}</h3>
                    </CardTitle>
                    {project.description && (
                      <div className="text-muted-foreground mt-2">
                        <Markdown className="prose prose-invert prose-sm">
                          {project.description}
                        </Markdown>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4 mt-auto">
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-12 sm:h-9 min-h-[48px] sm:min-h-0"
                            asChild
                          >
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-12 sm:h-9 min-h-[48px] sm:min-h-0"
                            asChild
                          >
                            <a
                              href={project.codeUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${project.name} source code`}
                            >
                              <Github className="w-4 h-4" />
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
            <Button
              variant="outline"
              className="h-12 sm:h-10 min-h-[48px] sm:min-h-0"
              onClick={() => setShowAll(true)}
            >
              Show all projects ({projects.length - limit} more)
            </Button>
          </div>
        )}
        {showAll && hasHidden && (
          <div className="flex justify-center mt-8">
            <Button
              variant="outline"
              className="h-12 sm:h-10 min-h-[48px] sm:min-h-0"
              onClick={() => setShowAll(false)}
            >
              Collapse projects
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
