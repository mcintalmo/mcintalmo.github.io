import { Blog } from "../components/Blog";
import { Education } from "../components/Education";
import { Projects } from "../components/Projects";
import { Skills } from "../components/Skills";
import { Contact } from "./Contact";
import { Work } from "./Work";
import "../styles/globals.css";
import { getSectionOrder } from "../lib/mappers";
import type { ResumeRoot, SiteConfigRoot, SiteSectionsConfig } from "../lib/types";

type Props = { resume: ResumeRoot; config: SiteConfigRoot };

export default function PortfolioSections({ resume, config }: Props) {
  const sections = config.sections ?? {};
  const isEnabled = (key: string) =>
    (sections as SiteSectionsConfig)[key]?.enabled !== false;
  const basicsName = resume.basics?.name ?? "";
  const year = new Date().getFullYear();
  const order = getSectionOrder(config);

  const renderSection = (key: string) => {
    switch (key) {
      case "work":
        return <Work work={resume.work ?? []} config={config} />;
      case "education":
        return (
          <Education
            education={resume.education ?? []}
            certificates={resume.certificates ?? []}
            config={config}
          />
        );
      case "skills":
        return <Skills skills={resume.skills ?? []} config={config} />;
      case "projects":
        return <Projects projects={resume.projects ?? []} config={config} />;
      case "blog":
        return <Blog />;
      case "contact":
        return <Contact basics={resume.basics} config={config} />;
      default:
        return null;
    }
  };
  return (
    <div className="relative">
      <main className="relative">
        {order
          .filter(isEnabled)
          .filter((key) => key !== "basics")
          .map((key, index) => (
            <div key={key}>
              {index > 0 && <div className="section-divider" />}
              {renderSection(key)}
            </div>
          ))}
      </main>
      <footer className="glass-panel text-foreground py-12 pb-safe border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <p className="mb-4">
            © {year} {basicsName || ""}. All rights reserved.
          </p>
          <p className="text-sm opacity-80">
            Built with React, Tailwind CSS, and Motion. Powered by LiveKit and Nvidia
            NIM.
          </p>
        </div>
      </footer>
    </div>
  );
}
