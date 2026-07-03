import * as React from "react";
import { useTheme } from "./ThemeProvider";

/* ─────────── Types ─────────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  color: string;
}

/* ─────────── Constants ─────────── */
const PARTICLE_COUNT = 150;
const LINK_DISTANCE = 120;
const LINK_OPACITY_LIGHT = 0.1;
const LINK_OPACITY_DARK = 0.18;
const DOT_OPACITY_LIGHT = 0.35;
const DOT_OPACITY_DARK = 0.55;
const REPULSE_MAX_DIST = 180;
const REPULSE_STRENGTH = 600;
const PARALLAX_FACTOR = 0.8;

const COLORS_LIGHT = ["#6366F1", "#818CF8", "#38BDF8", "#0EA5E9"];
const COLORS_DARK = ["#818CF8", "#A5B4FC", "#22D3EE", "#67E8F9"];
const LINK_COLOR_LIGHT = "#64748B";
const LINK_COLOR_DARK = "#E2E8F0";

/* ─────────── Component ─────────── */
export const VectorBackground = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const mouseRef = React.useRef({ x: -9999, y: -9999 });
  const scrollYRef = React.useRef(0);
  const rafRef = React.useRef<number>(0);
  const { theme } = useTheme();
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    setPrefersReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  // Initialize particles across initial viewport region
  const initParticles = React.useCallback(
    (w: number, viewportH: number, scrollY: number) => {
      const colors = theme === "dark" ? COLORS_DARK : COLORS_LIGHT;
      const particles: Particle[] = [];
      const offset = scrollY * PARALLAX_FACTOR;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Slow upward motion: vy is always negative
        const vx = (Math.random() - 0.5) * 0.3; // -0.15 to +0.15 side drift
        const vy = -(0.08 + Math.random() * 0.14); // -0.08 to -0.22 upward flow
        particles.push({
          x: Math.random() * w,
          y: offset - 80 + Math.random() * (viewportH + 160),
          vx,
          vy,
          baseVx: vx,
          baseVy: vy,
          radius: 0.8 + Math.random() * 3.8, // 0.8 to 4.6 radius
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      return particles;
    },
    [theme],
  );

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to viewport height (stable layout)
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Initial size — delay slightly so DOM is laid out
    const initialResize = () => {
      resize();
      particlesRef.current = initParticles(
        window.innerWidth,
        window.innerHeight,
        window.scrollY,
      );
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

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resize);

    const isDark = theme === "dark";
    const linkColor = isDark ? LINK_COLOR_DARK : LINK_COLOR_LIGHT;
    const linkOp = isDark ? LINK_OPACITY_DARK : LINK_OPACITY_LIGHT;
    const dotOp = isDark ? DOT_OPACITY_DARK : DOT_OPACITY_LIGHT;

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;

      const w = window.innerWidth;
      const viewportH = window.innerHeight;
      const scrollY = scrollYRef.current;
      const offset = scrollY * PARALLAX_FACTOR;

      try {
        // Draw background color
        let bgColor = theme === "dark" ? "#030712" : "#ffffff";
        if (typeof document !== "undefined" && document.body) {
          const rawBg = getComputedStyle(document.body)
            .getPropertyValue("--background")
            .trim();
          if (rawBg) bgColor = rawBg;
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, viewportH);

        const particles = particlesRef.current;
        const mx = mouseRef.current.x;
        const myVirtual = mouseRef.current.y + offset;

        for (const p of particles) {
          if (!prefersReducedMotion) {
            // 1. Mouse Repulsion Force
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

            // 2. Smoothly return current velocity to base velocity (friction & return)
            p.vx += (p.baseVx - p.vx) * 0.04;
            p.vy += (p.baseVy - p.vy) * 0.04;

            // 3. Move particle
            p.x += p.vx;
            p.y += p.vy;

            // 4. Viewport Wrapping (Infinite Nodes)
            const buffer = 80;
            const topBound = offset - buffer;
            const bottomBound = offset + viewportH + buffer;
            const leftBound = -buffer;
            const rightBound = w + buffer;

            if (p.x < leftBound) {
              p.x = rightBound;
              p.y = topBound + Math.random() * (viewportH + 2 * buffer);
            } else if (p.x > rightBound) {
              p.x = leftBound;
              p.y = topBound + Math.random() * (viewportH + 2 * buffer);
            }

            if (p.y < topBound) {
              p.y = bottomBound + Math.random() * buffer;
              p.x = Math.random() * w;
            } else if (p.y > bottomBound) {
              p.y = topBound - Math.random() * buffer;
              p.x = Math.random() * w;
            }
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
      } catch (_err) {
        // Only log once to avoid flooding
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      clearTimeout(resizeTimer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
    };
  }, [theme, initParticles, prefersReducedMotion]);

  return (
    <canvas ref={canvasRef} className="fixed top-0 left-0 z-0 pointer-events-none" />
  );
};
