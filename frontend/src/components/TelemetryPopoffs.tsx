import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type TelemetryEvent = {
  id: string;
  message: string;
  x: number;
  y: number;
};

export const TelemetryPopoffs = ({ events }: { events: TelemetryEvent[] }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: -80, filter: 'blur(4px)' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ left: event.x, top: event.y }}
            className="absolute font-mono text-xs text-accent-cyan font-semibold tracking-wider"
          >
            {event.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * Hook to trigger floating telemetry events.
 * Will be wired to AG-UI events in production; uses mock data for now.
 */
export const useTelemetry = () => {
  const [events, setEvents] = React.useState<TelemetryEvent[]>([]);

  const triggerTelemetry = React.useCallback(
    (message: string, clientX: number, clientY: number) => {
      const newEvent: TelemetryEvent = {
        id: Math.random().toString(36).substring(2),
        message,
        x: clientX,
        y: clientY,
      };
      setEvents((prev) => [...prev, newEvent]);

      // Cleanup after animation finishes
      setTimeout(() => {
        setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
      }, 1500);
    },
    [],
  );

  return { events, triggerTelemetry };
};
