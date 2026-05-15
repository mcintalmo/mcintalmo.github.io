import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { useTheme } from './ThemeProvider';
import { Menu, X, Sun, Moon, Github, Linkedin, Mail } from 'lucide-react';
import type { ResumeBasics, SiteConfigRoot } from '../lib/types';

function buildNav(config?: SiteConfigRoot) {
  const sections = config?.sections ?? {};
  const entries: { name: string; href: string; enabled: boolean }[] = [
    {
      name: sections.basics?.['navigation-label'] || sections.basics?.title || 'Home',
      href: '#home',
      enabled: sections.basics?.enabled !== false,
    },
    {
      name: sections.work?.['navigation-label'] || sections.work?.title || 'Experience',
      href: '#experience',
      enabled: sections.work?.enabled !== false,
    },
    {
      name: sections.education?.['navigation-label'] || sections.education?.title || 'Education',
      href: '#education',
      enabled: sections.education?.enabled !== false,
    },
    {
      name: sections.projects?.['navigation-label'] || sections.projects?.title || 'Projects',
      href: '#projects',
      enabled: sections.projects?.enabled !== false,
    },
    {
      name: sections.skills?.['navigation-label'] || sections.skills?.title || 'Skills',
      href: '#skills',
      enabled: sections.skills?.enabled !== false,
    },
    {
      name: sections.blog?.['navigation-label'] || sections.blog?.title || 'Blog',
      href: '#blog',
      enabled: sections.blog?.enabled !== false,
    },
    {
      name: sections.contact?.['navigation-label'] || sections.contact?.title || 'Contact',
      href: '#contact',
      enabled: sections.contact?.enabled !== false,
    },
  ];
  return entries.filter((e) => e.enabled);
}

export function Navigation({ config, basics }: { config: SiteConfigRoot; basics?: ResumeBasics }) {
  const navItems = buildNav(config);
  const [activeSection, setActiveSection] = useState('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { theme, setTheme } = useTheme();
  const [sentinelRef, setSentinelRef] = useState<HTMLDivElement | null>(null);

  // Extract social links
  const email = basics?.email;
  const profiles = basics?.profiles || [];
  const github = profiles.find((p) => (p.network || '').toLowerCase() === 'github');
  const linkedin = profiles.find((p) => (p.network || '').toLowerCase() === 'linkedin');

  useEffect(() => {
    if (!sentinelRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: [0], rootMargin: '-10px 0px 0px 0px' }
    );

    observer.observe(sentinelRef);
    return () => observer.disconnect();
  }, [sentinelRef]);

  // Handle scroll progress separately if needed, but for isScrolled, the observer is better.
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const totalScrollableHeight = documentHeight - windowHeight;
      const progress = totalScrollableHeight > 0
        ? Math.min(scrollPosition / totalScrollableHeight, 1) * 100
        : 0;
      setScrollProgress(progress);

      // Determine active section based on scroll position
      const sections = navItemsRef.current.map((item) => item.href.substring(1));
      const current = sections.find((section) => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });

      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // Removed navItems from dependency array

  const navItemsRef = useRef(navItems);
  useEffect(() => {
    navItemsRef.current = navItems;
  }, [navItems]);

  const scrollToSection = (href: string) => {
    const element = document.getElementById(href.substring(1));
    if (element) {
      const offsetTop = element.offsetTop - 80; // Account for fixed header
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });
    }
    setIsOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      <div ref={setSentinelRef} className="absolute top-0 left-0 w-full h-px pointer-events-none" />
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{ willChange: 'opacity', pointerEvents: 'auto' }}
        className={`fixed top-0 left-0 right-0 z-50 duration-300 transition-colors ${
          isScrolled
            ? 'bg-background/95 backdrop-blur-sm border-b border-border shadow-sm'
            : 'bg-transparent'
        }`}
      >
        {/* Scroll Progress Bar (kept outside of opacity animation impact) */}
        <div className="pointer-events-none">
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-primary origin-left"
            style={{
              transform: `scaleX(${scrollProgress / 100})`,
              transformOrigin: '0%',
            }}
          />
        </div>

      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div>
            <button
              onClick={() => scrollToSection('#home')}
              className="text-lg font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {basics?.name || ''}
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <div key={item.name}>
                <a
                  href={item.href}
                  className={`relative text-sm transition-colors hover:text-primary ${
                    activeSection === item.href.substring(1)
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.name}
                  {activeSection === item.href.substring(1) && (
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full transition-all duration-200" />
                  )}
                </a>
              </div>
            ))}
          </nav>

          {/* Social Links, Theme Toggle, and Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Social Icons (desktop only) */}
            <div className="hidden md:flex items-center gap-1">
              {email && (
                <a href={`mailto:${email}`} aria-label="Email">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent-cyan">
                    <Mail className="h-4 w-4" />
                  </Button>
                </a>
              )}
              {github?.url && (
                <a href={github.url} target="_blank" rel="noreferrer" aria-label="GitHub">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent-cyan">
                    <Github className="h-4 w-4" />
                  </Button>
                </a>
              )}
              {linkedin?.url && (
                <a href={linkedin.url} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent-cyan">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                </a>
              )}
              <div className="w-px h-5 bg-border mx-1" />
            </div>

            {/* Theme Toggle — pill slider */}
            <button
              onClick={toggleTheme}
              title={`Theme: ${theme === 'dark' ? 'Dark' : 'Light'}. Click to toggle`}
              aria-label="Toggle color theme"
              className="relative flex items-center w-10 h-7 shrink-0 focus:outline-none focus:ring-2 focus:ring-accent-cyan rounded-full"
            >
              {/* Track (smaller than knob) */}
              <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3.5 rounded-full bg-secondary border border-border" />
              {/* Knob (larger, overlaps track) */}
              <span
                className={`relative flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background shadow-md transition-transform duration-300 ${
                  theme === 'dark' ? 'translate-x-[1.125rem]' : 'translate-x-0'
                }`}
              >
                {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              </span>
            </button>

            {/* Mobile Navigation */}
            <div className="md:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-lg font-medium">Menu</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleTheme}
                        title={`Theme: ${theme === 'dark' ? 'Dark' : 'Light'}. Click to toggle`}
                        aria-label="Toggle color theme"
                        className="relative flex items-center w-10 h-7 shrink-0 focus:outline-none focus:ring-2 focus:ring-accent-cyan rounded-full"
                      >
                        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3.5 rounded-full bg-secondary border border-border" />
                        <span
                          className={`relative flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background shadow-md transition-transform duration-300 ${
                            theme === 'dark' ? 'translate-x-[1.125rem]' : 'translate-x-0'
                          }`}
                        >
                          {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                        </span>
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <nav className="flex flex-col space-y-4">
                    {navItems.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className={`text-left py-2 px-3 rounded-lg transition-colors ${
                          activeSection === item.href.substring(1)
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {item.name}
                      </a>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
      </motion.header>
    </>
  );
}
