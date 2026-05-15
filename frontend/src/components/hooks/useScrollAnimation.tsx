import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, type Variants } from 'framer-motion';

export function useScrollAnimation(threshold = 0.1) {
  const controls = useAnimation();
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true);
          controls.start('visible');
        }
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [controls, threshold, isInView]);

  return { ref, controls };
}

// Animated section wrapper component
export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  [key: string]: any;
}) {
  const { ref, controls } = useScrollAnimation();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        delay,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Simple animated section with just slide and fade - less busy
export function SimpleAnimatedSection({
  children,
  className = '',
  delay = 0,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  [key: string]: any;
}) {
  const { ref, controls } = useScrollAnimation();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: 30,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
