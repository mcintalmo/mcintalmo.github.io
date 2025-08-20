import { motion, useReducedMotion } from 'framer-motion';
import profileImg from '../assets/profile.png';
import { Button } from './ui/button';
import { ArrowDown, Mail } from 'lucide-react';
import { IconGitHub } from './icons/GitHub';
import { IconLinkedIn } from './icons/LinkedIn';
import type { ResumeBasics, SiteConfigRoot } from '../lib/types';

export function Home({ basics }: { basics?: ResumeBasics; config: SiteConfigRoot }) {
  const name = basics?.name || '';
  const label = basics?.label || '';
  const imgObj = profileImg as { src?: string; width?: number; height?: number } | string;
  const importedSrc: string | undefined =
    (typeof imgObj === 'object' && 'src' in imgObj ? imgObj.src : undefined) ||
    (typeof profileImg === 'string' ? profileImg : undefined);
  const width = typeof imgObj === 'object' && 'width' in imgObj ? imgObj.width : undefined;
  const height = typeof imgObj === 'object' && 'height' in imgObj ? imgObj.height : undefined;
  const yamlImage = basics?.image;
  const useYamlDirect = yamlImage && /^(https?:)?\/\//.test(yamlImage);
  const image = useYamlDirect ? yamlImage! : importedSrc || yamlImage;
  const email = basics?.email;
  const profiles = basics?.profiles || [];
  const github = profiles.find((p) => (p.network || '').toLowerCase() === 'github');
  const linkedin = profiles.find((p) => (p.network || '').toLowerCase() === 'linkedin');
  const prefersReduced = useReducedMotion();
  // Basic sanitization: allow a small whitelist of tags and strip others
  const sanitizeSummary = (html?: string) => {
    if (!html) return '';
    const allowed = ['b', 'strong', 'i', 'em', 'p', 'br', 'ul', 'ol', 'li', 'code', 'span'];
    return html
      .replace(/<([^>\s/]+)([^>]*)>/g, (full, tag) => {
        const t = String(tag).toLowerCase();
        return allowed.includes(t) ? `<${t}>` : '';
      })
      .replace(/<\/(?!b|strong|i|em|p|br|ul|ol|li|code|span)[^>]+>/g, '');
  };
  const safeSummary = sanitizeSummary(basics?.summary);
  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 pt-16"
    >
      <div className="container mx-auto px-6 text-center relative z-10">
        <motion.div
          className="max-w-4xl mx-auto"
          initial={prefersReduced ? undefined : { opacity: 0, y: 0 }}
          animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          {/* Professional Headshot */}
          <div className="mb-12">
            <div className="relative mx-auto w-48 h-48 sm:w-56 sm:h-56">
              {/* Pulse rings (expand + fade out) */}
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-primary/40"
                animate={{
                  scale: [0.85, 1.25],
                  opacity: [0.45, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
              {/* Subtle static inner ring for definition */}
              <div
                className="absolute inset-2 rounded-full border border-primary/15 pointer-events-none"
                aria-hidden
              />

              {/* Profile image container */}
              <div className="absolute inset-4 rounded-full overflow-hidden border-4 border-background shadow-2xl">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full"
                >
                  <img
                    src={image}
                    width={width}
                    height={height}
                    loading="lazy"
                    decoding="async"
                    alt={name || 'Profile photo'}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 640px) 192px, 224px"
                  />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div>
            {name && (
              <h1 className="text-4xl sm:text-5xl font-medium mb-6">
                Hi, I'm <span className="text-primary font-bold">{name}</span>
              </h1>
            )}
            {label && <h2 className="mb-8 text-muted-foreground">{label}</h2>}
            <div>
              {safeSummary && (
                <div
                  className="prose prose-invert max-w-2xl mx-auto mb-8 text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: safeSummary }}
                />
              )}

              <div className="flex justify-center gap-4 mb-12">
                {email && (
                  <a href={`mailto:${email}`} aria-label="Email">
                    <Button className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Get In Touch
                    </Button>
                  </a>
                )}
                {github?.url && (
                  <a href={github.url} target="_blank" rel="noreferrer" aria-label="GitHub profile">
                    <Button variant="outline" className="flex items-center gap-2">
                      <IconGitHub className="w-4 h-4" />
                      GitHub
                    </Button>
                  </a>
                )}
                {linkedin?.url && (
                  <a
                    href={linkedin.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn profile"
                  >
                    <Button variant="outline" className="flex items-center gap-2">
                      <IconLinkedIn className="w-4 h-4" />
                      LinkedIn
                    </Button>
                  </a>
                )}
              </div>

              {!prefersReduced && (
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex justify-center"
                  aria-hidden
                >
                  <ArrowDown className="w-6 h-6 text-muted-foreground" />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
