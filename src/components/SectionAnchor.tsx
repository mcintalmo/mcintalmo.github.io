import { Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from './ui/utils';

interface SectionAnchorProps {
  sectionId: string; // must match the wrapping <section id>
  className?: string;
  size?: number;
  copyOnClick?: boolean;
}

/**
 * Renders a small link icon that links (and optionally copies) the section URL.
 * Appears on hover/focus of the heading container (parent should have group class).
 */
export function SectionAnchor({
  sectionId,
  className,
  size = 16,
  copyOnClick = true,
}: SectionAnchorProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const href = `#${sectionId}`;

  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center text-muted-foreground/60 hover:text-primary focus:text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        className
      )}
      aria-label={`Direct link to ${sectionId} section`}
      onClick={(_) => {
        if (!copyOnClick) return;
        try {
          const url = window.location.origin + window.location.pathname + href;
          navigator.clipboard.writeText(url).catch(() => {});
          setCopied(true);
        } catch {
          /* no-op */
        }
      }}
      title={copied ? 'Copied!' : 'Copy link'}
    >
      <Link2 size={size} strokeWidth={1.75} />
    </a>
  );
}
