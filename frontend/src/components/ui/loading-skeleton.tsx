import { motion } from "framer-motion";
import { useMemo } from "react";

interface LoadingSkeletonProps {
  lines?: number;
  showBadges?: boolean;
  className?: string;
}

export function LoadingSkeleton({
  lines = 3,
  showBadges = false,
  className = "",
}: LoadingSkeletonProps) {
  const shimmerIds = useMemo(
    () => Array.from({ length: lines }, (_, i) => `shimmer-${i}`),
    [lines],
  );
  const badgeIds = useMemo(() => Array.from({ length: 3 }, (_, i) => `badge-${i}`), []);
  const cardIds = useMemo(() => Array.from({ length: 2 }, (_, i) => `card-${i}`), []);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Loading shimmer animation */}
      <div className="space-y-2">
        {shimmerIds.map((key, i) => {
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className={`h-4 bg-muted rounded ${
                i === 0 ? "w-3/4" : i === lines - 1 ? "w-1/2" : "w-full"
              }`}
            />
          );
        })}
      </div>

      {showBadges && (
        <div className="flex gap-2 mt-3">
          {badgeIds.map((key, i) => {
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2 + 0.3,
                }}
                className="h-6 w-16 bg-muted rounded-full"
              />
            );
          })}
        </div>
      )}

      {/* Project cards skeleton */}
      <div className="space-y-2 ml-6">
        {cardIds.map((key, i) => {
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3 + 0.5,
              }}
              className="p-3 bg-muted/30 rounded-lg space-y-2"
            >
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-2 bg-muted rounded w-full" />
              <div className="flex gap-1">
                <div className="h-4 w-12 bg-muted rounded-full" />
                <div className="h-4 w-14 bg-muted rounded-full" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
