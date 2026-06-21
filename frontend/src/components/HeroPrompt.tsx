import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Mic } from "lucide-react";
import * as React from "react";
import type { SuggestedQuestion } from "../lib/types";

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onend: () => void;
  onerror: (e: unknown) => void;
  onresult: (event: {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: {
        isFinal: boolean;
        length: number;
        [index: number]: { transcript: string };
      };
    };
  }) => void;
  start: () => void;
  stop: () => void;
}

interface HeroPromptProps {
  recommendedQuestions?: SuggestedQuestion[];
}

export const HeroPrompt = ({ recommendedQuestions }: HeroPromptProps) => {
  const [submitted, setSubmitted] = React.useState(false);
  const [isDictating, setIsDictating] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = ((window as unknown as Record<string, unknown>)
        .SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as
        | (new () => SpeechRecognitionInstance)
        | undefined;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsDictating(true);
        };

        rec.onend = () => {
          setIsDictating(false);
        };

        rec.onerror = (e) => {
          console.error("Speech recognition error", e);
          setIsDictating(false);
        };

        rec.onresult = (event) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (inputRef.current) {
            const baseText = inputRef.current.getAttribute("data-base-text") || "";
            inputRef.current.value = baseText + finalTranscript + interimTranscript;
          }
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  const toggleDictation = React.useCallback(() => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isDictating) {
      recognitionRef.current.stop();
    } else {
      if (inputRef.current) {
        inputRef.current.setAttribute("data-base-text", inputRef.current.value);
      }
      recognitionRef.current.start();
    }
  }, [isDictating]);

  const handleStartVoiceChat = () => {
    if (recognitionRef.current && isDictating) {
      recognitionRef.current.stop();
    }
    setSubmitted(true);
    // Dispatch custom event so the sidebar can pick it up
    window.dispatchEvent(
      new CustomEvent("hero-prompt-submit", { detail: { mode: "voice" } }),
    );
    setTimeout(() => setSubmitted(false), 300);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (recognitionRef.current && isDictating) {
      recognitionRef.current.stop();
    }
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
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto z-10 mt-8">
      <div className="flex flex-row items-center gap-3 w-full">
        {/* Chat input form */}
        <form
          onSubmit={handleSendText}
          className="relative flex-1 flex items-center gap-2 group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-accent-indigo to-accent-cyan rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />
          <div className="relative flex-grow flex items-center">
            <input
              id="hero-ai-prompt"
              name="prompt"
              ref={inputRef}
              type="text"
              placeholder="Ask Alex's AI Agent..."
              className="w-full pr-10 rounded-xl border border-input bg-background/80 backdrop-blur-md px-4 py-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-md outline-none"
              onInput={(ev) => ev.stopPropagation()}
              onKeyDown={(ev) => ev.stopPropagation()}
              onKeyUp={(ev) => ev.stopPropagation()}
            />
            <button
              type="button"
              onClick={toggleDictation}
              className={`absolute right-2.5 p-1.5 rounded-full hover:bg-muted transition-colors ${
                isDictating
                  ? "text-red-500 animate-pulse bg-red-500/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={isDictating ? "Stop Dictation" : "Dictate text"}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
          <button
            type="submit"
            className="relative bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl text-sm font-medium transition-colors shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            Send
          </button>
        </form>

        {/* Circular voice button */}
        <div className="relative group shrink-0">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent-indigo to-accent-cyan rounded-full blur opacity-50 group-hover:opacity-80 transition duration-1000" />
          <button
            type="button"
            onClick={handleStartVoiceChat}
            title="Start Live Voice Chat with AI Agent"
            aria-label="Start Live Voice Chat"
            className="relative w-12 h-12 flex items-center justify-center bg-background border border-border rounded-full shadow-lg hover:bg-secondary/20 transition-colors cursor-pointer text-accent-cyan hover:text-accent-indigo"
          >
            <AudioLines className="h-5 w-5" />
          </button>
        </div>
      </div>

      {recommendedQuestions && recommendedQuestions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-lg">
          {recommendedQuestions.map((q) => (
            <button
              key={q.prompt}
              type="button"
              onClick={() => handleSuggestionClick(q.prompt)}
              className="px-3.5 py-1.5 text-xs rounded-full border border-border/40 bg-background/50 hover:bg-accent-indigo/5 hover:border-accent-indigo/20 transition-all duration-200 text-muted-foreground hover:text-foreground cursor-pointer shadow-xs active:scale-95 font-sans font-medium"
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
