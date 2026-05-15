import * as React from 'react';
import { useTheme } from './ThemeProvider';

/* ─────────── Types ─────────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

/* ─────────── Constants ─────────── */
const PARTICLE_COUNT = 300;
const LINK_DISTANCE = 140;
const LINK_OPACITY_LIGHT = 0.10;
const LINK_OPACITY_DARK = 0.18;
const DOT_OPACITY_LIGHT = 0.35;
const DOT_OPACITY_DARK = 0.55;
const BROWNIAN_SPEED = 0.1;
const DRAG = 0.97;
const REPULSE_MAX_DIST = 180;
const REPULSE_STRENGTH = 800;
const PARALLAX_FACTOR = 0.8;

const COLORS_LIGHT = ['#6366F1', '#818CF8', '#38BDF8', '#0EA5E9'];
const COLORS_DARK = ['#818CF8', '#A5B4FC', '#22D3EE', '#67E8F9'];
const LINK_COLOR_LIGHT = '#64748B';
const LINK_COLOR_DARK = '#E2E8F0';

/* ─────────── Component ─────────── */
export const VectorBackground = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const mouseRef = React.useRef({ x: -9999, y: -9999 });
  const scrollYRef = React.useRef(0);
  const rafRef = React.useRef<number>(0);
  const canvasHeightRef = React.useRef(0);
  const { theme } = useTheme();
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    setPrefersReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Get full document height for canvas sizing
  const getDocHeight = () => {
    if (typeof document === 'undefined') return window.innerHeight * 3;
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight * 3 // minimum 3x viewport
    );
  };

  // Initialize particles across full page height
  const initParticles = React.useCallback((w: number, fullH: number) => {
    const colors = theme === 'dark' ? COLORS_DARK : COLORS_LIGHT;
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * fullH,
        vx: (Math.random() - 0.5) * BROWNIAN_SPEED * 2,
        vy: (Math.random() - 0.5) * BROWNIAN_SPEED * 2,
        radius: 1.5 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return particles;
  }, [theme]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to viewport height (stable layout)
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const fullH = getDocHeight();
      canvasHeightRef.current = fullH;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Initial size — delay slightly so DOM is laid out
    const initialResize = () => {
      resize();
      particlesRef.current = initParticles(window.innerWidth, canvasHeightRef.current);
    };
    initialResize();
    // Re-measure after content loads (fonts, images)
    const resizeTimer = setTimeout(resize, 1000);

    // Mouse tracking (viewport coordinates)
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    // Scroll tracking
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', resize);

    const isDark = theme === 'dark';
    const linkColor = isDark ? LINK_COLOR_DARK : LINK_COLOR_LIGHT;
    const linkOp = isDark ? LINK_OPACITY_DARK : LINK_OPACITY_LIGHT;
    const dotOp = isDark ? DOT_OPACITY_DARK : DOT_OPACITY_LIGHT;

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;
      
      const w = window.innerWidth;
      const viewportH = window.innerHeight;
      const fullH = canvasHeightRef.current;
      const scrollY = scrollYRef.current;
      const offset = scrollY * PARALLAX_FACTOR;

      try {
        // Draw background color since body is now transparent
        let bgColor = (theme === 'dark' ? '#030712' : '#ffffff');
        if (typeof document !== 'undefined' && document.body) {
          const rawBg = getComputedStyle(document.body).getPropertyValue('--background').trim();
          if (rawBg) bgColor = rawBg;
        }
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, viewportH);

        const particles = particlesRef.current;
        const mx = mouseRef.current.x;
        const myVirtual = mouseRef.current.y + offset;

        for (const p of particles) {
          if (!prefersReducedMotion) {
            p.vx += (Math.random() - 0.5) * BROWNIAN_SPEED * 0.3;
            p.vy += (Math.random() - 0.5) * BROWNIAN_SPEED * 0.3;

            const dx = p.x - mx;
            const dy = p.y - myVirtual;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);

            if (dist < REPULSE_MAX_DIST && dist > 1) {
              const force = REPULSE_STRENGTH / distSq;
              const nx = dx / dist;
              const ny = dy / dist;
              p.vx += nx * force;
              p.vy += ny * force;
            }

            p.vx *= DRAG;
            p.vy *= DRAG;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
            if (p.x > w) { p.x = w; p.vx = -Math.abs(p.vx); }
            if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
            if (p.y > fullH) { p.y = fullH; p.vy = -Math.abs(p.vy); }
          }

          const drawY = p.y - offset;
          if (drawY > -20 && drawY < viewportH + 20) {
            ctx.beginPath();
            ctx.arc(p.x, drawY, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = dotOp;
            ctx.fill();
          }
        }

        // Draw links
        ctx.globalAlpha = 1;
        for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];
          const drawY1 = p1.y - offset;
          if (drawY1 < -LINK_DISTANCE || drawY1 > viewportH + LINK_DISTANCE) continue;

          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const drawY2 = p2.y - offset;
            if (drawY2 < -LINK_DISTANCE || drawY2 > viewportH + LINK_DISTANCE) continue;

            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < LINK_DISTANCE) {
              const alpha = linkOp * (1 - dist / LINK_DISTANCE);
              ctx.beginPath();
              ctx.moveTo(p1.x, drawY1);
              ctx.lineTo(p2.x, drawY2);
              ctx.strokeStyle = linkColor;
              ctx.globalAlpha = alpha;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
      } catch (err) {
        // Only log once to avoid flooding
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      clearTimeout(resizeTimer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', resize);
    };
  }, [theme, initParticles, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 z-0 pointer-events-none"
    />
  );
};
