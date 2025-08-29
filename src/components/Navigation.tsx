import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Toggle } from './ui/toggle';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { useTheme } from './ThemeProvider';
import { Menu, X, Sun, Moon } from 'lucide-react';
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

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Calculate scroll progress
      const totalScrollableHeight = documentHeight - windowHeight;
      const progress = Math.min(scrollPosition / totalScrollableHeight, 1) * 100;
      setScrollProgress(progress);

      setIsScrolled(scrollPosition > 50);

      // Determine active section based on scroll position
      const sections = navItems.map((item) => item.href.substring(1));
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

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const getThemeIcon = () => {
    return theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
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

          {/* Theme Toggle and Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <div>
              <Toggle
                pressed={theme === 'dark'}
                onPressedChange={toggleTheme}
                className="flex items-center gap-2 h-8 px-3"
                title={`Theme: ${theme === 'dark' ? 'Dark' : 'Light'}. Click to toggle`}
                aria-label="Toggle color theme"
              >
                {getThemeIcon()}
                <span className="hidden sm:inline text-xs font-medium text-muted-foreground w-12 text-left select-none">
                  {theme === 'light' && 'Light'}
                  {theme === 'dark' && 'Dark'}
                </span>
              </Toggle>
            </div>

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
                      <Toggle
                        pressed={theme === 'dark'}
                        onPressedChange={toggleTheme}
                        className="flex items-center gap-2 h-8 px-3"
                        title={`Theme: ${theme === 'dark' ? 'Dark' : 'Light'}. Click to toggle`}
                        aria-label="Toggle color theme"
                      >
                        {getThemeIcon()}
                        <span className="text-xs font-medium text-muted-foreground w-12 inline-block text-left select-none">
                          {theme === 'light' && 'Light'}
                          {theme === 'dark' && 'Dark'}
                        </span>
                      </Toggle>
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
  );
}
