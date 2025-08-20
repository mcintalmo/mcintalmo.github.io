import { ThemeProvider } from '../components/ThemeProvider';
import { AnimatedSection, SimpleAnimatedSection } from '../components/hooks/useScrollAnimation';
import { Navigation } from '../components/Navigation';
import { Home } from './Home';
import { Work } from './Work';
import { Education } from '../components/Education';
import { Skills } from '../components/Skills';
import { Projects } from '../components/Projects';
import { Blog } from '../components/Blog';
import { Contact } from './Contact';
import { BackToTop } from '../components/BackToTop';
import '../styles/globals.css';
import type { ResumeRoot, SiteConfigRoot } from '../lib/types';
import { getSectionOrder } from '../lib/mappers';

type Props = { resume: ResumeRoot; config: SiteConfigRoot };

export default function PortfolioSections({ resume, config }: Props) {
  const sections = config.sections ?? {};
  const isEnabled = (key: string) => (sections as any)[key]?.enabled !== false;
  const basicsName = resume.basics?.name ?? '';
  const year = new Date().getFullYear();
  const order = getSectionOrder(config);

  const renderSection = (key: string) => {
    switch (key) {
      case 'basics':
        return <Home basics={resume.basics} config={config} />;
      case 'work':
        return (
          <AnimatedSection delay={0.1}>
            <Work work={resume.work ?? []} config={config} />
          </AnimatedSection>
        );
      case 'education':
        return (
          <AnimatedSection delay={0.1}>
            <Education
              education={resume.education ?? []}
              certificates={resume.certificates ?? []}
              config={config}
            />
          </AnimatedSection>
        );
      case 'skills':
        return (
          <AnimatedSection delay={0.1}>
            <Skills skills={resume.skills ?? []} config={config} />
          </AnimatedSection>
        );
      case 'projects':
        return (
          <AnimatedSection delay={0.1}>
            <Projects projects={resume.projects ?? []} config={config} />
          </AnimatedSection>
        );
      case 'blog':
        return (
          <AnimatedSection delay={0.1}>
            <Blog />
          </AnimatedSection>
        );
      case 'contact':
        return (
          <SimpleAnimatedSection delay={0.1}>
            <Contact basics={resume.basics} config={config} />
          </SimpleAnimatedSection>
        );
      default:
        return null;
    }
  };
  return (
    <ThemeProvider defaultTheme="system" storageKey="portfolio-theme">
      <div className="min-h-screen bg-background">
        <Navigation config={config} basics={resume.basics} />
        <main className="relative">
          {order.filter(isEnabled).map((key) => (
            <div key={key}>{renderSection(key)}</div>
          ))}
        </main>
        <SimpleAnimatedSection delay={0.1}>
          <footer className="bg-primary text-primary-foreground py-12">
            <div className="container mx-auto px-6 text-center">
              <p className="mb-4">
                © {year} {basicsName || ''}. All rights reserved.
              </p>
              <p className="text-sm opacity-80">
                Built with React, Tailwind CSS, and Motion for delightful interactions
              </p>
            </div>
          </footer>
        </SimpleAnimatedSection>
        <BackToTop />
      </div>
    </ThemeProvider>
  );
}
