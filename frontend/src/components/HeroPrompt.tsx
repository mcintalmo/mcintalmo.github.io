import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Mic } from "lucide-react";
import * as React from "react";
import { useDictation } from "../hooks/useDictation";
import type { SuggestedQuestion } from "../lib/types";

interface HeroPromptProps {
  recommendedQuestions?: SuggestedQuestion[];
}

export const HeroPrompt = ({ recommendedQuestions }: HeroPromptProps) => {
  const [submitted, setSubmitted] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { isDictating, toggleDictation, stopDictation } = useDictation({ inputRef });

  const handleStartVoiceChat = () => {
    stopDictation();
    setSubmitted(true);
    // Dispatch custom event so the sidebar can pick it up
    window.dispatchEvent(
      new CustomEvent("hero-prompt-submit", { detail: { mode: "voice" } }),
    );
    setTimeout(() => setSubmitted(false), 300);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    stopDictation();
    const inputEl = inputRef.current;
    if (inputEl?.value.trim()) {
      const text = inputEl.value.trim();
      inputEl.value = "";
      setSubmitted(true);
      window.dispatchEvent(
        new CustomEvent("hero-prompt-submit", { detail: { message: text } }),
      );
      setTimeout(() => setSubmitted(false), 300);
    }
  };

  const handleSuggestionClick = (question: string) => {
    setSubmitted(true);
    window.dispatchEvent(
      new CustomEvent("hero-prompt-submit", { detail: { message: question } }),
    );
    setTimeout(() => setSubmitted(false), 300);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto z-10 mt-6 sm:mt-8">
      {/* Unified AI Prompt Capsule */}
      <form
        onSubmit={handleSendText}
        className="w-full relative flex items-center rounded-2xl border border-border/80 bg-background/80 backdrop-blur-md p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all group"
      >
        <input
          id="hero-ai-prompt"
          name="prompt"
          ref={inputRef}
          type="text"
          placeholder="Ask Alexander's AI Assistant about consulting or systems..."
          className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          onInput={(ev) => ev.stopPropagation()}
          onKeyDown={(ev) => ev.stopPropagation()}
          onKeyUp={(ev) => ev.stopPropagation()}
        />

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleDictation}
            className={`w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors ${
              isDictating
                ? "text-red-500 animate-pulse bg-red-500/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={isDictating ? "Stop Dictation" : "Voice dictation"}
            aria-label={isDictating ? "Stop voice dictation" : "Start voice dictation"}
          >
            <Mic className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleStartVoiceChat}
            title="Start live interactive voice session"
            aria-label="Start live interactive voice session"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <AudioLines className="h-4 w-4" />
          </button>

          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 rounded-xl text-xs font-medium transition-colors shadow-xs active:scale-95 cursor-pointer flex items-center justify-center"
          >
            Send
          </button>
        </div>
      </form>

      {/* Suggested Inquiries */}
      {recommendedQuestions && recommendedQuestions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-3 max-w-lg">
          {recommendedQuestions.map((q) => (
            <button
              key={q.prompt}
              type="button"
              onClick={() => handleSuggestionClick(q.prompt)}
              className="px-3.5 py-1.5 text-xs rounded-full border border-border/50 bg-background/40 hover:bg-muted/80 hover:border-border transition-all duration-200 text-muted-foreground hover:text-foreground cursor-pointer shadow-xs active:scale-95 font-sans"
            >
              {q.title}
            </button>
          ))}
        </div>
      )}

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
