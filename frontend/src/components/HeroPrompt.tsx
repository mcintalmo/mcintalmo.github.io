import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

export const HeroPrompt = () => {
  const [submitted, setSubmitted] = React.useState(false);

  const handleStartVoiceChat = () => {
    setSubmitted(true);
    // Dispatch custom event so the sidebar can pick it up
    window.dispatchEvent(
      new CustomEvent('hero-prompt-submit', { detail: { mode: 'voice' } }),
    );
    setTimeout(() => setSubmitted(false), 300);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto z-10 mt-8">
      <div className="w-full relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-accent-indigo to-accent-cyan rounded-full blur opacity-50 group-hover:opacity-80 transition duration-1000 group-hover:duration-200" />
        <button
          onClick={handleStartVoiceChat}
          className="relative w-full flex items-center justify-center gap-3 bg-background border border-border rounded-full shadow-lg overflow-hidden p-4 text-foreground font-medium text-lg hover:bg-secondary/20 transition-colors"
        >
          <Mic className="h-6 w-6 text-accent-cyan" />
          <span>Start Live Voice Chat with AI Agent</span>
        </button>
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mt-4 text-xs font-sans text-accent-cyan"
          >
            Opening chat panel...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
